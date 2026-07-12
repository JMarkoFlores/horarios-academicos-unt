import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In, IsNull, Not } from "typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { Docente } from "../entities/docente.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Grupo } from "../entities/grupo.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { AsignacionLectiva } from "../entities/asignacion-lectiva.entity";
import { CursoPlanEstudios } from "../entities/curso-plan-estudios.entity";
import { DiaActivo } from "../entities/dia-activo.entity";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { ModoAsignacion } from "../common/enums/modo-asignacion.enum";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { EstadoAsignacionLectiva } from "../common/enums/estado-asignacion-lectiva.enum";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";

export interface SlotHorario {
  dia: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface ResultadoGeneracion {
  totalDocentes: number;
  docentesAtendidos: number;
  horariosGenerados: number;
  conflictos: string[];
  detallePorDocente: DetalleDocente[];
  horasSinAsignar: number;
}

export interface DetalleDocente {
  docenteId: number;
  nombre: string;
  horariosGenerados: number;
  horariosPendientes: number;
  horasAsignadas: number;
  horasPendientes: number;
  errores: string[];
}

interface DocenteConCarga {
  docente: Docente;
  parametro: ParametrosCarga | null;
  horasSemanales: number;
  cursosAsignados: Set<number>;
  asignacionesLectivas: AsignacionLectiva[];
}

interface CursoConDetalle {
  cursoPlan: CursoPlanEstudios;
  curso: Curso;
  tipoClase: TipoClase;
  horasRequeridas: number;
  grupos: Grupo[];
  ambientesCompatibles: Ambiente[];
}

@Injectable()
export class GeneracionAutomaticaService {
  private readonly logger = new Logger(GeneracionAutomaticaService.name);
  private readonly HORAS_INICIO = [
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ];
  private readonly DURACION_BLOQUE = 2;

  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(DocenteCurso)
    private readonly docenteCursoRepo: Repository<DocenteCurso>,
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
    @InjectRepository(ParametrosCarga)
    private readonly parametrosCargaRepo: Repository<ParametrosCarga>,
    @InjectRepository(AsignacionLectiva)
    private readonly asignacionLectivaRepo: Repository<AsignacionLectiva>,
    @InjectRepository(CursoPlanEstudios)
    private readonly cursoPlanRepo: Repository<CursoPlanEstudios>,
    @InjectRepository(DiaActivo)
    private readonly diasActivosRepo: Repository<DiaActivo>,
    private readonly dataSource: DataSource,
  ) {}

  async generarHorarios(periodoCodigo: string): Promise<ResultadoGeneracion> {
    this.logger.log(`[Generación] Iniciando para período ${periodoCodigo}`);

    const periodo = await this.periodoRepo.findOne({
      where: { codigo: periodoCodigo },
    });
    if (!periodo)
      throw new NotFoundException(`Período ${periodoCodigo} no encontrado`);

    if (periodo.modo_asignacion === ModoAsignacion.VENTANAS) {
      throw new BadRequestException(
        "Este período está configurado solo para ventanas de atención",
      );
    }

    // Limpiar horarios auto-generados previos
    const previos = await this.horarioRepo.find({
      where: {
        periodo: periodoCodigo,
        origen: OrigenHorario.GENERACION_AUTOMATICA,
      },
    });
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (previos.length > 0) {
        this.logger.log(
          `[Generación] Eliminando ${previos.length} horarios auto-generados previos`,
        );
        await queryRunner.manager.remove(previos);
      }

      const resultado: ResultadoGeneracion = {
        totalDocentes: 0,
        docentesAtendidos: 0,
        horariosGenerados: 0,
        conflictos: [],
        detallePorDocente: [],
        horasSinAsignar: 0,
      };

      // 1. Obtener días activos del período
      const diasActivos = await this.diasActivosRepo.find({
        where: { activo: true },
        order: { dia_semana: "ASC" },
      });
      const DIAS_SEMANA = diasActivos.map((d) => d.dia_semana);
      if (DIAS_SEMANA.length === 0) {
        throw new BadRequestException(
          "No hay días activos configurados para el período",
        );
      }

      // 2. Obtener docentes activos con su jerarquía y parámetros de carga
      const docentes = await this.docenteRepo.find({
        where: { activo: true },
        order: { categoria: "ASC", tipo_contrato: "ASC", fecha_ingreso: "ASC" },
      });
      resultado.totalDocentes = docentes.length;

      // 3. Obtener asignaciones lectivas CONFIRMADAS del período (fuente de verdad)
      const asignacionesLectivas = await this.asignacionLectivaRepo.find({
        where: {
          periodo_id: periodo.id,
          estado: In([
            EstadoAsignacionLectiva.CONFIRMADO,
            EstadoAsignacionLectiva.PENDIENTE,
          ]),
        },
        relations: ["docente", "curso_plan", "curso_plan.curso", "grupo"],
      });

      // 4. Obtener grupos del período
      const grupos = await this.grupoRepo.find({
        where: { periodo_academico: { id: periodo.id } },
        relations: ["curso"],
      });

      // 5. Obtener disponibilidades del período
      const disponibilidades = await this.disponibilidadRepo.find({
        where: { periodo_academico: periodoCodigo },
        relations: ["docente"],
      });

      // 6. Obtener horarios existentes (para evitar cruces con horarios manuales)
      const horariosExistentes = await this.horarioRepo.find({
        where: { periodo: periodoCodigo },
        relations: ["docente", "ambiente", "grupo"],
      });

      // 7. Cargar parámetros de carga
      const parametrosCarga = await this.parametrosCargaRepo.find({
        where: { periodo_academico: periodoCodigo },
      });
      const parametrosMap = new Map<string, ParametrosCarga>();
      for (const p of parametrosCarga) {
        parametrosMap.set(
          `${p.tipo_docente}_${p.categoria}_${p.modalidad ?? ""}`,
          p,
        );
      }

      // 8. Obtener habilitaciones docente-curso
      const habilitaciones = await this.docenteCursoRepo.find({
        where: { periodoId: periodo.id },
      });
      const habilitacionMap = new Map<string, Set<number>>();
      for (const h of habilitaciones) {
        const key = `${h.docenteId}_${h.tipo_clase}`;
        if (!habilitacionMap.has(key)) habilitacionMap.set(key, new Set());
        habilitacionMap.get(key).add(h.cursoId);
      }

      // 9. Obtener ambientes activos
      const ambientesActivos = await this.ambienteRepo.find({
        where: { activo: true },
      });
      const ambientesPorTipo = {
        [TipoAmbiente.AULA]: ambientesActivos.filter(
          (a) => a.tipo === TipoAmbiente.AULA,
        ),
        [TipoAmbiente.LABORATORIO]: ambientesActivos.filter(
          (a) => a.tipo === TipoAmbiente.LABORATORIO,
        ),
        [TipoAmbiente.AUDITORIO]: ambientesActivos.filter(
          (a) => a.tipo === TipoAmbiente.AUDITORIO,
        ),
        [TipoAmbiente.SEMINARIO]: ambientesActivos.filter(
          (a) => a.tipo === TipoAmbiente.SEMINARIO,
        ),
      };

      // 10. Construir mapa de cursos requeridos por docente (desde AsignacionLectiva)
      const docentesConCarga = new Map<number, DocenteConCarga>();
      for (const docente of docentes) {
        const pKey = `${docente.tipo_docente}_${docente.categoria}_${docente.modalidad ?? ""}`;
        const parametro = parametrosMap.get(pKey) ?? null;
        const asignaciones = asignacionesLectivas.filter(
          (a) => a.docente_id === docente.id,
        );
        docentesConCarga.set(docente.id, {
          docente,
          parametro,
          horasSemanales: 0,
          cursosAsignados: new Set(),
          asignacionesLectivas: asignaciones,
        });
      }

      // 11. Procesar cada docente
      for (const docente of docentes) {
        const carga = docentesConCarga.get(docente.id)!;
        const detalle: DetalleDocente = {
          docenteId: docente.id,
          nombre: `${docente.apellidos}, ${docente.nombres}`,
          horariosGenerados: 0,
          horariosPendientes: 0,
          horasAsignadas: 0,
          horasPendientes: 0,
          errores: [],
        };

        if (carga.asignacionesLectivas.length === 0) {
          detalle.errores.push(
            "No tiene asignaciones lectivas confirmadas/pendientes",
          );
          resultado.detallePorDocente.push(detalle);
          continue;
        }

        // Agrupar asignaciones por cursoPlan + tipoClase
        const cursosPorTipo = new Map<string, CursoConDetalle[]>();
        for (const al of carga.asignacionesLectivas) {
          const cursoPlan = al.curso_plan;
          const curso = cursoPlan.curso;
          const key = `${cursoPlan.id}_${al.tipo_clase}`;
          if (!cursosPorTipo.has(key)) {
            // Obtener ambientes compatibles para este curso
            const cursoConAmbientes = await this.cursoRepo.findOne({
              where: { id: curso.id },
              relations: ["ambientes"],
            });
            const cursoAmbientes = (cursoConAmbientes?.ambientes ?? []).map(
              (a) => ({ ambiente: a }),
            );

            // Filtrar ambientes por tipo según tipo_clase
            const tipoAmbienteRequerido = this.getTipoAmbienteRequerido(
              al.tipo_clase,
            );
            const ambientesCompatibles =
              ambientesPorTipo[tipoAmbienteRequerido] ?? [];

            // Obtener grupos de este curso en el período
            const gruposCurso = grupos.filter((g) => g.curso.id === curso.id);

            cursosPorTipo.set(key, [
              {
                cursoPlan,
                curso,
                tipoClase: al.tipo_clase,
                horasRequeridas: al.horas_asignadas,
                grupos: gruposCurso,
                ambientesCompatibles,
              },
            ]);
          } else {
            // Sumar horas si ya existe
            const existing = cursosPorTipo.get(key)[0];
            existing.horasRequeridas += al.horas_asignadas;
          }
        }

        // 12. Para cada curso, asignar bloques
        for (const [, cursos] of cursosPorTipo) {
          for (const cursoDetalle of cursos) {
            const {
              curso,
              tipoClase,
              horasRequeridas,
              grupos,
              ambientesCompatibles,
            } = cursoDetalle;

            if (grupos.length === 0) {
              detalle.errores.push(
                `Curso ${curso.nombre} (${tipoClase}): sin grupos en este período`,
              );
              detalle.horasPendientes += horasRequeridas;
              resultado.horasSinAsignar += horasRequeridas;
              continue;
            }
            if (ambientesCompatibles.length === 0) {
              detalle.errores.push(
                `Curso ${curso.nombre} (${tipoClase}): sin ambientes ${this.getTipoAmbienteRequerido(tipoClase)}`,
              );
              detalle.horasPendientes += horasRequeridas;
              resultado.horasSinAsignar += horasRequeridas;
              continue;
            }

            // Verificar habilitación docente-curso
            const habKey = `${docente.id}_${tipoClase}`;
            const cursosHabilitados = habilitacionMap.get(habKey);
            if (!cursosHabilitados || !cursosHabilitados.has(curso.id)) {
              detalle.errores.push(
                `Curso ${curso.nombre} (${tipoClase}): docente no habilitado`,
              );
              detalle.horasPendientes += horasRequeridas;
              resultado.horasSinAsignar += horasRequeridas;
              continue;
            }

            // Asignar bloques a grupos (round-robin si hay múltiples grupos)
            let horasPendientes = horasRequeridas;
            let grupoIndex = 0;

            while (horasPendientes > 0) {
              const duracion = Math.min(this.DURACION_BLOQUE, horasPendientes);
              const grupo = grupos[grupoIndex % grupos.length];
              grupoIndex++;

              // Verificar límites de carga
              const maxHoras = carga.parametro?.horas_max_semanal ?? 999;
              if (carga.horasSemanales + duracion > maxHoras) {
                detalle.errores.push(
                  `Límite horas semanales (${maxHoras}h) alcanzado para ${curso.nombre}`,
                );
                detalle.horasPendientes += horasPendientes;
                resultado.horasSinAsignar += horasPendientes;
                horasPendientes = 0;
                break;
              }

              const maxCursos = carga.parametro?.cursos_max_docente ?? 999;
              const esCursoNuevo = !carga.cursosAsignados.has(curso.id);
              if (esCursoNuevo && carga.cursosAsignados.size >= maxCursos) {
                detalle.errores.push(`Límite cursos (${maxCursos}) alcanzado`);
                detalle.horasPendientes += horasPendientes;
                resultado.horasSinAsignar += horasPendientes;
                horasPendientes = 0;
                break;
              }

              // Buscar slot libre
              const slot = await this.buscarSlotLibre(
                docente.id,
                grupo.id,
                ambientesCompatibles,
                duracion,
                DIAS_SEMANA,
                horariosExistentes,
                disponibilidades,
                carga.horasSemanales,
              );

              if (slot) {
                const nuevoHorario = queryRunner.manager.create(
                  HorarioAsignado,
                  {
                    docente_id: docente.id,
                    curso_id: curso.id,
                    grupo_id: grupo.id,
                    ambiente_id: slot.ambiente.id,
                    periodo: periodoCodigo,
                    dia: slot.dia,
                    hora_inicio: slot.hora_inicio,
                    hora_fin: slot.hora_fin,
                    tipo_clase: tipoClase,
                    estado: EstadoHorario.BORRADOR,
                    origen: OrigenHorario.GENERACION_AUTOMATICA,
                  },
                );

                const guardado = await queryRunner.manager.save(nuevoHorario);
                horariosExistentes.push(guardado as any);

                carga.horasSemanales += duracion;
                carga.cursosAsignados.add(curso.id);
                detalle.horariosGenerados++;
                detalle.horasAsignadas += duracion;
                resultado.horariosGenerados++;
                horasPendientes -= duracion;
              } else {
                // No se encontró slot, intentar siguiente grupo o siguiente día
                // Si se agotaron todos los grupos para este bloque, registrar pendiente
                if (grupoIndex >= grupos.length * 3) {
                  // max 3 intentos por grupo
                  detalle.errores.push(
                    `Curso ${curso.nombre} (${tipoClase}): no hay slots libres (${horasPendientes}h pendientes)`,
                  );
                  detalle.horasPendientes += horasPendientes;
                  resultado.horasSinAsignar += horasPendientes;
                  break;
                }
              }
            }
          }
        }

        if (detalle.horariosGenerados > 0) {
          resultado.docentesAtendidos++;
        }
        resultado.detallePorDocente.push(detalle);
      }

      this.logger.log(
        `[Generación] Finalizado: ${resultado.horariosGenerados} horarios para ${resultado.docentesAtendidos} docentes, ${resultado.horasSinAsignar}h sin asignar`,
      );

      await queryRunner.commitTransaction();
      return resultado;
    } catch (txError) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[Generación] Error en transacción: ${txError.message}`,
      );
      throw txError;
    } finally {
      await queryRunner.release();
    }
  }

  private getTipoAmbienteRequerido(tipoClase: TipoClase): string {
    switch (tipoClase) {
      case TipoClase.TEORIA:
        return TipoAmbiente.AULA;
      case TipoClase.PRACTICA:
        return TipoAmbiente.AULA; // Prácticas en aula
      case TipoClase.LABORATORIO:
        return TipoAmbiente.LABORATORIO;
      default:
        return TipoAmbiente.AULA;
    }
  }

  private async buscarSlotLibre(
    docenteId: number,
    grupoId: number,
    ambientes: Ambiente[],
    duracion: number,
    diasSemana: number[],
    horariosExistentes: HorarioAsignado[],
    disponibilidades: DisponibilidadDocente[],
    horasActualesDocente: number,
  ): Promise<{
    dia: number;
    hora_inicio: string;
    hora_fin: string;
    ambiente: Ambiente;
  } | null> {
    for (const dia of diasSemana) {
      for (const hora of this.HORAS_INICIO) {
        const horaFin = this.sumarHoras(hora, duracion);

        // 1. Validar franja institucional (no almuerzo, no fuera de horario)
        if (!this.esFranjaValida(hora, horaFin)) continue;

        // 2. Validar disponibilidad docente
        if (
          !this.docenteDisponible(
            docenteId,
            dia,
            hora,
            horaFin,
            disponibilidades,
          )
        )
          continue;

        // 3. Validar límite horas semanales (ya verificado antes, pero double-check)
        if (horasActualesDocente + duracion > 999) continue; // fallback

        // 4. Validar cruce docente
        if (
          this.hayCruceDocente(
            docenteId,
            dia,
            hora,
            horaFin,
            horariosExistentes,
          )
        )
          continue;

        // 5. Validar cruce grupo
        if (this.hayCruceGrupo(grupoId, dia, hora, horaFin, horariosExistentes))
          continue;

        // 6. Buscar ambiente libre
        for (const ambiente of ambientes) {
          if (
            !this.hayCruceAmbiente(
              ambiente.id,
              dia,
              hora,
              horaFin,
              horariosExistentes,
            )
          ) {
            return { dia, hora_inicio: hora, hora_fin: horaFin, ambiente };
          }
        }
      }
    }
    return null;
  }

  private esFranjaValida(horaInicio: string, horaFin: string): boolean {
    const [hIni] = horaInicio.split(":").map(Number);
    const [hFin] = horaFin.split(":").map(Number);
    // Bloquear almuerzo 12:00-14:00
    if (hIni < 14 && hFin > 12) return false;
    // Horario institucional 7:00-22:00
    if (hIni < 7 || hFin > 22) return false;
    return true;
  }

  private docenteDisponible(
    docenteId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    disponibilidades: DisponibilidadDocente[],
  ): boolean {
    const dispDocente = disponibilidades.filter(
      (d) => d.docente.id === docenteId,
    );
    if (dispDocente.length === 0) return true; // Sin restricciones = disponible todo el día

    return dispDocente.some(
      (d) =>
        d.dia_semana === dia &&
        d.hora_inicio <= horaInicio &&
        d.hora_fin >= horaFin &&
        d.disponible,
    );
  }

  private hayCruceDocente(
    docenteId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    horarios: HorarioAsignado[],
  ): boolean {
    return horarios.some(
      (h) =>
        h.docente_id === docenteId &&
        h.dia === dia &&
        h.hora_inicio < horaFin &&
        h.hora_fin > horaInicio,
    );
  }

  private hayCruceGrupo(
    grupoId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    horarios: HorarioAsignado[],
  ): boolean {
    return horarios.some(
      (h) =>
        h.grupo_id === grupoId &&
        h.dia === dia &&
        h.hora_inicio < horaFin &&
        h.hora_fin > horaInicio,
    );
  }

  private hayCruceAmbiente(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    horarios: HorarioAsignado[],
  ): boolean {
    return horarios.some(
      (h) =>
        h.ambiente_id === ambienteId &&
        h.dia === dia &&
        h.hora_inicio < horaFin &&
        h.hora_fin > horaInicio,
    );
  }

  private sumarHoras(hora: string, horas: number): string {
    const [h, m] = hora.split(":").map(Number);
    const total = (h || 0) + horas;
    return `${total.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }

  async publicarHorariosAutoGenerados(
    periodoCodigo: string,
  ): Promise<{ publicados: number }> {
    const result = await this.horarioRepo.update(
      {
        periodo: periodoCodigo,
        origen: OrigenHorario.GENERACION_AUTOMATICA,
        estado: EstadoHorario.BORRADOR,
      },
      { estado: EstadoHorario.PUBLICADO },
    );
    return { publicados: result.affected || 0 };
  }
}
