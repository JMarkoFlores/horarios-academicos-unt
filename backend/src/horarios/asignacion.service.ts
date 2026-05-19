import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { Ambiente } from "../entities/ambiente.entity";
import { AuditoriaHorario } from "../entities/auditoria-horario.entity";
import { Curso } from "../entities/curso.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { Grupo } from "../entities/grupo.entity";
import { Preasignacion } from "../entities/preasignacion.entity";
import { DocentesService } from "../docentes/docentes.service";
import { ReasignarHorarioDto } from "./dto/reasignar-horario.dto";
import { ValidadorHorarioService } from "./validador-horario.service";
import { AuditoriaService } from "../modules/auditoria/auditoria.service";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";

type DocenteJerarquia = {
  id: number;
  [key: string]: unknown;
};

type DetalleConflicto = {
  curso_id: number;
  tipo_clase: TipoClase;
  motivo: string;
};

type SlotEncontrado = {
  dia: number;
  hora_inicio: string;
  hora_fin: string;
  ambiente: Ambiente;
};

@Injectable()
export class AsignacionService {
  private static readonly MAX_HORAS_DOCENTE = 20;

  private horasAsignadasMap = new Map<number, number>();
  private habilitacionDocenteMap = new Map<string, Set<number>>();
  private disponibilidadMap = new Map<number, Set<string>>();
  private docentesPreferentesPorCurso = new Map<number, number>();
  private slotsPreasignadosPorAmbiente = new Map<number, Set<string>>();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    private readonly auditoriaService: AuditoriaService,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
    @InjectRepository(DocenteCurso)
    private readonly docenteCursoRepo: Repository<DocenteCurso>,
    @InjectRepository(Preasignacion)
    private readonly preasignacionRepo: Repository<Preasignacion>,
    private readonly docentesService: DocentesService,
    private readonly validadorHorarioService: ValidadorHorarioService,
  ) {}

  encontrarDocenteElegible(
    docentes: DocenteJerarquia[],
    curso: Curso,
    asignacionesActuales: HorarioAsignado[],
    periodo: string,
    tipoClase: TipoClase = TipoClase.TEORIA,
  ): DocenteJerarquia | null {
    if (this.horasAsignadasMap.size === 0) {
      for (const asignacion of asignacionesActuales) {
        const actual = this.horasAsignadasMap.get(asignacion.docente_id) ?? 0;
        this.horasAsignadasMap.set(
          asignacion.docente_id,
          actual +
            this.calcularDuracionHoras(
              asignacion.hora_inicio,
              asignacion.hora_fin,
            ),
        );
      }
    }

    const preferenteId = this.docentesPreferentesPorCurso.get(curso.id);
    const docentesOrdenados = [...docentes];
    if (preferenteId) {
      const preferente = docentesOrdenados.find(
        (docente) => docente.id === preferenteId,
      );
      if (preferente) {
        const resto = docentesOrdenados.filter(
          (docente) => docente.id !== preferenteId,
        );
        docentesOrdenados.splice(
          0,
          docentesOrdenados.length,
          preferente,
          ...resto,
        );
      }
    }

    const claveTipo = `${tipoClase}`;
    for (const docente of docentesOrdenados) {
      const cursosHabilitados = this.habilitacionDocenteMap.get(
        `${docente.id}_${claveTipo}`,
      );
      if (!cursosHabilitados || !cursosHabilitados.has(curso.id)) {
        continue;
      }

      const horasAsignadas = this.horasAsignadasMap.get(docente.id) ?? 0;
      if (horasAsignadas >= AsignacionService.MAX_HORAS_DOCENTE) {
        continue;
      }

      return docente;
    }

    return null;
  }

  async buscarSlotLibre(
    docente: DocenteJerarquia,
    curso: Curso,
    ambientes: Ambiente[],
    tipoClase: TipoClase,
    periodo: string,
    grupoId: number,
    asignacionesActuales: HorarioAsignado[] = [],
  ): Promise<SlotEncontrado | null> {
    for (let dia = 1; dia <= 5; dia++) {
      for (let hora = 7; hora <= 21; hora++) {
        const horaInicio = `${hora.toString().padStart(2, "0")}:00`;
        const horaFin = `${(hora + 1).toString().padStart(2, "0")}:00`;
        const claveDisponibilidad = `${dia}_${horaInicio}`;

        const slotsDisponibles = this.disponibilidadMap.get(docente.id);
        if (!slotsDisponibles || !slotsDisponibles.has(claveDisponibilidad)) {
          continue;
        }

        for (const ambiente of ambientes) {
          const slotsAmbientePreasignados =
            this.slotsPreasignadosPorAmbiente.get(ambiente.id);
          if (slotsAmbientePreasignados?.has(claveDisponibilidad)) {
            continue;
          }

          if (
            this.tieneCruceEnMemoria(
              asignacionesActuales,
              docente.id,
              grupoId,
              ambiente.id,
              periodo,
              dia,
              horaInicio,
              horaFin,
            )
          ) {
            continue;
          }

          const resultado = await this.validadorHorarioService.validarSlot({
            docente_id: docente.id,
            grupo_id: grupoId,
            ambiente_id: ambiente.id,
            laboratorio_ambiente_id:
              tipoClase === TipoClase.LABORATORIO ? ambiente.id : undefined,
            periodo,
            dia,
            hora_inicio: horaInicio,
            hora_fin: horaFin,
            tipo_clase: tipoClase,
            fecha: this.construirFechaDesdeDia(periodo, dia),
          });

          if (resultado.valido) {
            return {
              dia,
              hora_inicio: horaInicio,
              hora_fin: horaFin,
              ambiente,
            };
          }
        }
      }
    }

    return null;
  }

  async generarHorario(periodo: string): Promise<{
    asignaciones_creadas: number;
    conflictos: number;
    detalle_conflictos: DetalleConflicto[];
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Cargar datos maestros
      const docentesOrdenados =
        await this.docentesService.findOrdenadosPorJerarquia(periodo);
      const cursos = await this.cursoRepo.find({
        where: { activo: true },
        relations: ["ambientes"],
      });
      const ambientesActivos = await this.ambienteRepo.find({
        where: { activo: true },
      });
      const grupos = await this.grupoRepo.find({
        where: { periodo_academico: { codigo: periodo } },
        relations: ["curso"],
      });
      const disponibilidades = await this.disponibilidadRepo.find({
        where: { periodo_academico: periodo, disponible: true },
        relations: ["docente"],
      });
      const habilitaciones = await this.docenteCursoRepo.find();

      // 2. Inicializar rastreo en memoria (dia, hora)
      // slots[id][dia][hora] = true si ocupado
      const docenteOcupado = new Map<number, boolean[][]>();
      const ambienteOcupado = new Map<number, boolean[][]>();
      const grupoOcupado = new Map<number, boolean[][]>();

      const initSlots = () => {
        const d = [];
        for (let i = 0; i <= 6; i++) {
          d[i] = new Array(24).fill(false);
        }
        return d;
      };

      // Pre-llenar ocupación de docentes basada en disponibilidad (si no está disponible, está ocupado)
      docentesOrdenados.forEach((doc) => {
        const slots = initSlots();
        for (let dia = 1; dia <= 5; dia++) {
          for (let h = 7; h < 22; h++) {
            slots[dia][h] = true; // Asumir ocupado
          }
        }
        docenteOcupado.set(doc.id, slots);
      });

      disponibilidades.forEach((disp) => {
        const slots = docenteOcupado.get(disp.docente.id);
        if (slots) {
          const hInicio = parseInt(disp.hora_inicio.split(":")[0], 10);
          slots[disp.dia_semana][hInicio] = false; // Marcar como libre
        }
      });

      ambientesActivos.forEach((amb) => {
        ambienteOcupado.set(amb.id, initSlots());
      });

      grupos.forEach((gru) => {
        grupoOcupado.set(gru.id, initSlots());
      });

      // 3. Mapear habilitaciones
      const habilitacionMap = new Map<string, Set<number>>();
      habilitaciones.forEach((h) => {
        const key = `${h.docenteId}_${h.tipo_clase}`;
        if (!habilitacionMap.has(key)) habilitacionMap.set(key, new Set());
        habilitacionMap.get(key).add(h.cursoId);
      });

      const asignacionesCreadas: HorarioAsignado[] = [];
      const detalleConflictos: DetalleConflicto[] = [];
      const entidadesConflictos: ConflictoAsignacion[] = [];
      const horasAsignadas = new Map<number, number>();

      // 4. Proceso de asignación
      for (const curso of cursos) {
        const grupo = grupos.find((g) => g.curso.id === curso.id);
        if (!grupo) {
          const c = new ConflictoAsignacion();
          c.descripcion = `No existe grupo para el curso ${curso.codigo} (${curso.nombre}).`;
          c.tipo_conflicto = "GRUPO_NO_ENCONTRADO";
          c.periodo_academico = periodo;
          entidadesConflictos.push(c);

          detalleConflictos.push({
            curso_id: curso.id,
            tipo_clase: TipoClase.TEORIA,
            motivo: "No existe grupo para el curso.",
          });
          continue;
        }

        // --- ASIGNAR TEORÍA ---
        let horasPendientesTeoria = curso.horas_teoria;
        while (horasPendientesTeoria > 0) {
          const duracion = Math.min(2, horasPendientesTeoria); // Intentar bloques de 2 horas
          const docente = this.buscarDocenteElegible(
            docentesOrdenados,
            curso.id,
            TipoClase.TEORIA,
            habilitacionMap,
            horasAsignadas,
            duracion,
          );

          if (!docente) {
            const c = new ConflictoAsignacion();
            c.descripcion = `No hay docente habilitado con carga disponible para Teoría de ${curso.codigo}.`;
            c.tipo_conflicto = "DOCENTE_NO_HABILITADO_O_CARGA_EXCEDIDA";
            c.periodo_academico = periodo;
            entidadesConflictos.push(c);

            detalleConflictos.push({
              curso_id: curso.id,
              tipo_clase: TipoClase.TEORIA,
              motivo: "No hay docente habilitado o carga excedida.",
            });
            break;
          }

          const slot = this.buscarSlotEnMemoria(
            duracion,
            docenteOcupado.get(docente.id),
            grupoOcupado.get(grupo.id),
            ambientesActivos.filter((a) => a.tipo === TipoAmbiente.AULA),
            ambienteOcupado,
          );

          if (slot) {
            const nuevaAsig = this.horarioRepo.create({
              docente_id: docente.id,
              curso_id: curso.id,
              grupo_id: grupo.id,
              ambiente_id: slot.ambienteId,
              periodo,
              dia: slot.dia,
              hora_inicio: this.fmtHora(slot.hora),
              hora_fin: this.fmtHora(slot.hora + duracion),
              tipo_clase: TipoClase.TEORIA,
              estado: EstadoHorario.BORRADOR,
            });
            asignacionesCreadas.push(nuevaAsig);
            this.marcarOcupado(
              slot.dia,
              slot.hora,
              duracion,
              docenteOcupado.get(docente.id),
              grupoOcupado.get(grupo.id),
              ambienteOcupado.get(slot.ambienteId),
            );
            
            // Incrementar carga horaria del docente
            const cargaActual = horasAsignadas.get(docente.id) ?? 0;
            horasAsignadas.set(docente.id, cargaActual + duracion);
            
            horasPendientesTeoria -= duracion;
          } else {
            const c = new ConflictoAsignacion();
            c.descripcion = `No se encontró slot de ${duracion}h para Teoría de ${curso.codigo}.`;
            c.tipo_conflicto = "SIN_HORARIO_DISPONIBLE";
            c.periodo_academico = periodo;
            c.docente = docente;
            entidadesConflictos.push(c);

            detalleConflictos.push({
              curso_id: curso.id,
              tipo_clase: TipoClase.TEORIA,
              motivo: `No se encontró slot de ${duracion}h.`,
            });
            break;
          }
        }

        // --- ASIGNAR LABORATORIO ---
        if (curso.tiene_laboratorio && curso.horas_laboratorio > 0) {
          let horasPendientesLab = curso.horas_laboratorio;
          while (horasPendientesLab > 0) {
            const duracion = Math.min(3, horasPendientesLab); // Labs suelen ser de 2-3h
            const docente = this.buscarDocenteElegible(
              docentesOrdenados,
              curso.id,
              TipoClase.LABORATORIO,
              habilitacionMap,
              horasAsignadas,
              duracion,
            );

            if (!docente) {
              const c = new ConflictoAsignacion();
              c.descripcion = `No hay docente habilitado con carga disponible para Lab de ${curso.codigo}.`;
              c.tipo_conflicto = "DOCENTE_NO_HABILITADO_O_CARGA_EXCEDIDA";
              c.periodo_academico = periodo;
              entidadesConflictos.push(c);

              detalleConflictos.push({
                curso_id: curso.id,
                tipo_clase: TipoClase.LABORATORIO,
                motivo: "No hay docente habilitado o carga excedida.",
              });
              break;
            }

            const slot = this.buscarSlotEnMemoria(
              duracion,
              docenteOcupado.get(docente.id),
              grupoOcupado.get(grupo.id),
              ambientesActivos.filter((a) => a.tipo === TipoAmbiente.LABORATORIO),
              ambienteOcupado,
            );

            if (slot) {
              const nuevaAsig = this.horarioRepo.create({
                docente_id: docente.id,
                curso_id: curso.id,
                grupo_id: grupo.id,
                ambiente_id: slot.ambienteId,
                periodo,
                dia: slot.dia,
                hora_inicio: this.fmtHora(slot.hora),
                hora_fin: this.fmtHora(slot.hora + duracion),
                tipo_clase: TipoClase.LABORATORIO,
                estado: EstadoHorario.BORRADOR,
              });
              asignacionesCreadas.push(nuevaAsig);
              this.marcarOcupado(
                slot.dia,
                slot.hora,
                duracion,
                docenteOcupado.get(docente.id),
                grupoOcupado.get(grupo.id),
                ambienteOcupado.get(slot.ambienteId),
              );

              // Incrementar carga horaria del docente
              const cargaActual = horasAsignadas.get(docente.id) ?? 0;
              horasAsignadas.set(docente.id, cargaActual + duracion);

              horasPendientesLab -= duracion;
            } else {
              const c = new ConflictoAsignacion();
              c.descripcion = `No se encontró slot de lab de ${duracion}h para ${curso.codigo}.`;
              c.tipo_conflicto = "SIN_HORARIO_DISPONIBLE";
              c.periodo_academico = periodo;
              c.docente = docente;
              entidadesConflictos.push(c);

              detalleConflictos.push({
                curso_id: curso.id,
                tipo_clase: TipoClase.LABORATORIO,
                motivo: `No se encontró slot de lab de ${duracion}h.`,
              });
              break;
            }
          }
        }
      }

      // 5. Guardar todo
      await queryRunner.manager.save(HorarioAsignado, asignacionesCreadas);
      if (entidadesConflictos.length > 0) {
        await queryRunner.manager.save(ConflictoAsignacion, entidadesConflictos);
      }
      await queryRunner.commitTransaction();

      return {
        asignaciones_creadas: asignacionesCreadas.length,
        conflictos: detalleConflictos.length,
        detalle_conflictos: detalleConflictos,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private buscarDocenteElegible(
    docentes: any[],
    cursoId: number,
    tipo: TipoClase,
    habilitacionMap: Map<string, Set<number>>,
    horasAsignadas: Map<number, number>,
    duracion: number,
  ) {
    return docentes.find((d) => {
      const key = `${d.id}_${tipo}`;
      const tieneHabilitacion = habilitacionMap.get(key)?.has(cursoId);
      if (!tieneHabilitacion) return false;

      // Verificar carga horaria
      const cargaActual = horasAsignadas.get(d.id) ?? 0;
      if (cargaActual + duracion > AsignacionService.MAX_HORAS_DOCENTE) {
        return false;
      }

      return true;
    });
  }

  private buscarSlotEnMemoria(
    duracion: number,
    docenteSlots: boolean[][],
    grupoSlots: boolean[][],
    ambientes: Ambiente[],
    ambienteOcupado: Map<number, boolean[][]>,
  ) {
    for (let dia = 1; dia <= 5; dia++) {
      for (let h = 7; h <= 22 - duracion; h++) {
        // Verificar si docente y grupo están libres el bloque completo
        let bloqueLibre = true;
        for (let k = 0; k < duracion; k++) {
          if (docenteSlots[dia][h + k] || grupoSlots[dia][h + k]) {
            bloqueLibre = false;
            break;
          }
        }

        if (!bloqueLibre) continue;

        // Buscar ambiente libre
        for (const amb of ambientes) {
          const aSlots = ambienteOcupado.get(amb.id);
          let ambLibre = true;
          for (let k = 0; k < duracion; k++) {
            if (aSlots[dia][h + k]) {
              ambLibre = false;
              break;
            }
          }
          if (ambLibre) {
            return { dia, hora: h, ambienteId: amb.id };
          }
        }
      }
    }
    return null;
  }

  private marcarOcupado(
    dia: number,
    hora: number,
    duracion: number,
    d: boolean[][],
    g: boolean[][],
    a: boolean[][],
  ) {
    for (let k = 0; k < duracion; k++) {
      d[dia][hora + k] = true;
      g[dia][hora + k] = true;
      a[dia][hora + k] = true;
    }
  }

  private fmtHora(h: number): string {
    return `${h.toString().padStart(2, "0")}:00:00`;
  }

  async limpiarHorario(periodo: string): Promise<{ eliminados: number }> {
    const result = await this.horarioRepo.delete({
      periodo,
      estado: In([EstadoHorario.BORRADOR, EstadoHorario.CONFLICTO]),
    });
    return { eliminados: result.affected ?? 0 };
  }

  async reasignarManual(
    id: number,
    dto: ReasignarHorarioDto,
  ): Promise<HorarioAsignado> {
    const horario = await this.horarioRepo.findOne({ where: { id } });
    if (!horario) {
      throw new NotFoundException(`Horario ${id} no encontrado`);
    }

    const ambienteAnterior = horario.ambiente_id;
    const datosAnteriores = {
      dia: horario.dia,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      ambiente_id: horario.ambiente_id,
      estado: horario.estado,
    };

    const nuevoDia = dto.dia_semana ?? horario.dia;
    const nuevaHoraInicio = dto.hora_inicio ?? horario.hora_inicio;
    const nuevaHoraFin = dto.hora_fin ?? horario.hora_fin;
    const nuevoAmbienteId = dto.ambiente_id ?? horario.ambiente_id;
    const resultado = await this.validadorHorarioService.validarSlot({
      docente_id: horario.docente_id,
      grupo_id: horario.grupo_id,
      ambiente_id: nuevoAmbienteId,
      laboratorio_ambiente_id:
        horario.tipo_clase === TipoClase.LABORATORIO
          ? nuevoAmbienteId
          : undefined,
      periodo: horario.periodo,
      dia: nuevoDia,
      hora_inicio: nuevaHoraInicio,
      hora_fin: nuevaHoraFin,
      tipo_clase: horario.tipo_clase,
      fecha: this.construirFechaDesdeDia(horario.periodo, nuevoDia),
    });

    if (!resultado.valido) {
      throw new BadRequestException({
        message: "No se pudo reasignar el horario",
        errores: resultado.errores,
      });
    }

    horario.dia = nuevoDia;
    horario.hora_inicio = nuevaHoraInicio;
    horario.hora_fin = nuevaHoraFin;
    horario.ambiente_id = nuevoAmbienteId;
    horario.estado = EstadoHorario.BORRADOR;

    const actualizado = await this.horarioRepo.save(horario);

    await this.auditoriaService.registrar({
      horario_id: id,
      usuario_id: dto.usuario_id ?? 1,
      accion: "reasignar",
      datos_anteriores: datosAnteriores,
      datos_nuevos: {
        dia: actualizado.dia,
        hora_inicio: actualizado.hora_inicio,
        hora_fin: actualizado.hora_fin,
        ambiente_id: actualizado.ambiente_id,
        estado: actualizado.estado,
      },
      ip: dto.ip ?? "desconocida",
      motivo: dto.motivo ?? null,
    });

    await this.validadorHorarioService.invalidarCacheAmbiente(
      ambienteAnterior,
      actualizado.periodo,
    );
    if (nuevoAmbienteId !== ambienteAnterior) {
      await this.validadorHorarioService.invalidarCacheAmbiente(
        nuevoAmbienteId,
        actualizado.periodo,
      );
    }

    return actualizado;
  }

  private construirDisponibilidadMap(
    disponibilidades: DisponibilidadDocente[],
  ): Map<number, Set<string>> {
    const map = new Map<number, Set<string>>();
    for (const disponibilidad of disponibilidades) {
      const docenteId = disponibilidad.docente?.id;
      if (!docenteId) {
        continue;
      }

      const slots = map.get(docenteId) ?? new Set<string>();
      slots.add(
        `${disponibilidad.dia_semana}_${disponibilidad.hora_inicio.substring(0, 5)}`,
      );
      map.set(docenteId, slots);
    }
    return map;
  }

  private aplicarPreasignaciones(preasignaciones: Preasignacion[]): void {
    this.docentesPreferentesPorCurso = new Map<number, number>();
    this.slotsPreasignadosPorAmbiente = new Map<number, Set<string>>();

    for (const preasignacion of preasignaciones) {
      const tienePreferenciaDocenteCurso =
        typeof preasignacion.docente_id === "number" &&
        typeof preasignacion.curso_id === "number" &&
        preasignacion.dia == null &&
        preasignacion.hora_inicio == null &&
        preasignacion.ambiente_id == null;

      if (tienePreferenciaDocenteCurso) {
        this.docentesPreferentesPorCurso.set(
          preasignacion.curso_id,
          preasignacion.docente_id,
        );
      }

      const tieneSlotBloqueado =
        typeof preasignacion.docente_id === "number" &&
        typeof preasignacion.dia === "number" &&
        typeof preasignacion.hora_inicio === "string" &&
        typeof preasignacion.ambiente_id === "number";

      if (!tieneSlotBloqueado) {
        continue;
      }

      const slots = this.disponibilidadMap.get(preasignacion.docente_id);
      if (!slots) {
        continue;
      }

      const clave = `${preasignacion.dia}_${preasignacion.hora_inicio.substring(0, 5)}`;
      slots.delete(clave);

      const slotsAmbiente =
        this.slotsPreasignadosPorAmbiente.get(preasignacion.ambiente_id) ??
        new Set<string>();
      slotsAmbiente.add(clave);
      this.slotsPreasignadosPorAmbiente.set(
        preasignacion.ambiente_id,
        slotsAmbiente,
      );
    }
  }

  private construirHabilitacionesMap(
    habilitaciones: DocenteCurso[],
  ): Map<string, Set<number>> {
    const map = new Map<string, Set<number>>();
    for (const habilitacion of habilitaciones) {
      const key = `${habilitacion.docenteId}_${habilitacion.tipo_clase}`;
      const cursos = map.get(key) ?? new Set<number>();
      cursos.add(habilitacion.cursoId);
      map.set(key, cursos);
    }
    return map;
  }

  private filtrarAmbientesCompatibles(
    ambientes: Ambiente[],
    tipoClase: TipoClase,
  ): Ambiente[] {
    const tipoRequerido =
      tipoClase === TipoClase.TEORIA
        ? TipoAmbiente.AULA
        : TipoAmbiente.LABORATORIO;
    return ambientes.filter((ambiente) => ambiente.tipo === tipoRequerido);
  }

  private obtenerAmbientesParaCurso(
    ambientesCurso: Ambiente[],
    ambientesActivos: Ambiente[],
  ): Ambiente[] {
    return ambientesCurso.length > 0 ? ambientesCurso : ambientesActivos;
  }

  private tieneCruceEnMemoria(
    asignaciones: HorarioAsignado[],
    docenteId: number,
    grupoId: number,
    ambienteId: number,
    periodo: string,
    dia: number,
    horaInicio: string,
    horaFin: string,
  ): boolean {
    return asignaciones.some((asignacion) => {
      if (asignacion.periodo !== periodo || asignacion.dia !== dia) {
        return false;
      }

      const mismoRecurso =
        asignacion.docente_id === docenteId ||
        asignacion.grupo_id === grupoId ||
        asignacion.ambiente_id === ambienteId;

      return (
        mismoRecurso &&
        this.solapan(
          asignacion.hora_inicio,
          asignacion.hora_fin,
          horaInicio,
          horaFin,
        )
      );
    });
  }

  private solapan(
    inicioA: string,
    finA: string,
    inicioB: string,
    finB: string,
  ): boolean {
    const inicioAMinutos = this.aMinutos(inicioA);
    const finAMinutos = this.aMinutos(finA);
    const inicioBMinutos = this.aMinutos(inicioB);
    const finBMinutos = this.aMinutos(finB);

    return (
      inicioAMinutos < finBMinutos &&
      finAMinutos > inicioBMinutos
    );
  }

  private aMinutos(hora: string): number {
    const [horas, minutos] = hora.split(":").map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  }

  private incrementarHorasAsignadas(
    docenteId: number,
    horaInicio: string,
    horaFin: string,
  ): void {
    const acumulado = this.horasAsignadasMap.get(docenteId) ?? 0;
    this.horasAsignadasMap.set(
      docenteId,
      acumulado + this.calcularDuracionHoras(horaInicio, horaFin),
    );
  }

  private calcularDuracionHoras(horaInicio: string, horaFin: string): number {
    const [h1, m1] = horaInicio.split(":").map(Number);
    const [h2, m2] = horaFin.split(":").map(Number);
    const inicio = (h1 || 0) * 60 + (m1 || 0);
    const fin = (h2 || 0) * 60 + (m2 || 0);
    return Math.max((fin - inicio) / 60, 0);
  }

  private construirFechaDesdeDia(periodo: string, dia: number): string {
    const base = new Date();
    const day = base.getDay() === 0 ? 7 : base.getDay();
    const monday = new Date(base);
    monday.setDate(base.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);

    const fecha = new Date(monday);
    fecha.setDate(monday.getDate() + (dia - 1));

    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");

    // Mantiene estabilidad por período para caché y validación de días no laborables.
    void periodo;
    return `${yyyy}-${mm}-${dd}`;
  }
}
