import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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
import { DocentesService } from "../docentes/docentes.service";
import { ReasignarHorarioDto } from "./dto/reasignar-horario.dto";
import { ValidadorHorarioService } from "./validador-horario.service";

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

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(AuditoriaHorario)
    private readonly auditoriaRepo: Repository<AuditoriaHorario>,
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
        this.horasAsignadasMap.set(asignacion.docente_id, actual + this.calcularDuracionHoras(asignacion.hora_inicio, asignacion.hora_fin));
      }
    }

    const claveTipo = `${tipoClase}`;
    for (const docente of docentes) {
      const cursosHabilitados = this.habilitacionDocenteMap.get(`${docente.id}_${claveTipo}`);
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
            return { dia, hora_inicio: horaInicio, hora_fin: horaFin, ambiente };
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
      const docentesOrdenados = await this.docentesService.findOrdenadosPorJerarquia(periodo);
      const cursos = await this.cursoRepo.find({
        where: { activo: true },
        relations: ["ambientes"],
      });
      const grupos = await this.grupoRepo.find({
        where: { periodo_academico: { codigo: periodo } },
        relations: ["curso", "periodo_academico"],
      });
      const disponibilidades = await this.disponibilidadRepo.find({
        where: { periodo_academico: periodo, disponible: true },
        relations: ["docente"],
      });
      const habilitaciones = await this.docenteCursoRepo.find();

      const docenteMap = new Map<number, DocenteJerarquia>(
        docentesOrdenados.map((docente) => [docente.id, docente]),
      );
      const cursoAmbientesMap = new Map<number, Ambiente[]>(
        cursos.map((curso) => [curso.id, curso.ambientes ?? []]),
      );
      this.disponibilidadMap = this.construirDisponibilidadMap(disponibilidades);
      this.habilitacionDocenteMap = this.construirHabilitacionesMap(habilitaciones);
      this.horasAsignadasMap = new Map<number, number>();

      const gruposPorCurso = new Map<number, Grupo[]>();
      for (const grupo of grupos) {
        const list = gruposPorCurso.get(grupo.curso.id) ?? [];
        list.push(grupo);
        gruposPorCurso.set(grupo.curso.id, list);
      }

      const asignacionesActuales: HorarioAsignado[] = [];
      const detalleConflictos: DetalleConflicto[] = [];

      for (const curso of cursos) {
        const grupo = gruposPorCurso.get(curso.id)?.[0];
        if (!grupo) {
          detalleConflictos.push({
            curso_id: curso.id,
            tipo_clase: TipoClase.TEORIA,
            motivo: "No existe grupo configurado para el curso y período.",
          });
          continue;
        }

        const docenteTeoria = this.encontrarDocenteElegible(
          [...docenteMap.values()],
          curso,
          asignacionesActuales,
          periodo,
          TipoClase.TEORIA,
        );

        if (!docenteTeoria) {
          detalleConflictos.push({
            curso_id: curso.id,
            tipo_clase: TipoClase.TEORIA,
            motivo: "No se encontró docente habilitado disponible.",
          });
          continue;
        }

        const ambientesTeoria = this.filtrarAmbientesCompatibles(
          cursoAmbientesMap.get(curso.id) ?? [],
          TipoClase.TEORIA,
        );
        const slotTeoria = await this.buscarSlotLibre(
          docenteTeoria,
          curso,
          ambientesTeoria,
          TipoClase.TEORIA,
          periodo,
          grupo.id,
        );

        if (!slotTeoria) {
          detalleConflictos.push({
            curso_id: curso.id,
            tipo_clase: TipoClase.TEORIA,
            motivo: "No se encontró slot libre para teoría.",
          });
          continue;
        }

        const horarioTeoria = this.horarioRepo.create({
          docente_id: docenteTeoria.id,
          curso_id: curso.id,
          grupo_id: grupo.id,
          ambiente_id: slotTeoria.ambiente.id,
          periodo,
          dia: slotTeoria.dia,
          hora_inicio: slotTeoria.hora_inicio,
          hora_fin: slotTeoria.hora_fin,
          tipo_clase: TipoClase.TEORIA,
          estado: EstadoHorario.BORRADOR,
        });

        await queryRunner.manager.save(HorarioAsignado, horarioTeoria);
        await this.validadorHorarioService.invalidarCacheAmbiente(
          slotTeoria.ambiente.id,
          periodo,
        );
        asignacionesActuales.push(horarioTeoria);
        this.incrementarHorasAsignadas(docenteTeoria.id, slotTeoria.hora_inicio, slotTeoria.hora_fin);

        if (curso.tiene_laboratorio) {
          const docenteLab = this.encontrarDocenteElegible(
            [...docenteMap.values()],
            curso,
            asignacionesActuales,
            periodo,
            TipoClase.LABORATORIO,
          );
          const ambientesLab = this.filtrarAmbientesCompatibles(
            cursoAmbientesMap.get(curso.id) ?? [],
            TipoClase.LABORATORIO,
          );
          const slotLab =
            docenteLab &&
            (await this.buscarSlotLibre(
              docenteLab,
              curso,
              ambientesLab,
              TipoClase.LABORATORIO,
              periodo,
              grupo.id,
            ));

          if (!docenteLab || !slotLab) {
            detalleConflictos.push({
              curso_id: curso.id,
              tipo_clase: TipoClase.LABORATORIO,
              motivo: !docenteLab
                ? "No se encontró docente habilitado para laboratorio."
                : "No se encontró slot libre para laboratorio.",
            });
          } else {
            const horarioLab = this.horarioRepo.create({
              docente_id: docenteLab.id,
              curso_id: curso.id,
              grupo_id: grupo.id,
              ambiente_id: slotLab.ambiente.id,
              periodo,
              dia: slotLab.dia,
              hora_inicio: slotLab.hora_inicio,
              hora_fin: slotLab.hora_fin,
              tipo_clase: TipoClase.LABORATORIO,
              estado: EstadoHorario.BORRADOR,
            });

            await queryRunner.manager.save(HorarioAsignado, horarioLab);
            await this.validadorHorarioService.invalidarCacheAmbiente(
              slotLab.ambiente.id,
              periodo,
            );
            asignacionesActuales.push(horarioLab);
            this.incrementarHorasAsignadas(docenteLab.id, slotLab.hora_inicio, slotLab.hora_fin);
          }
        }
      }

      await queryRunner.commitTransaction();
      return {
        asignaciones_creadas: asignacionesActuales.length,
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

  async limpiarHorario(periodo: string): Promise<{ eliminados: number }> {
    const result = await this.horarioRepo.delete({
      periodo,
      estado: In([EstadoHorario.BORRADOR, EstadoHorario.CONFLICTO]),
    });
    return { eliminados: result.affected ?? 0 };
  }

  async reasignarManual(id: number, dto: ReasignarHorarioDto): Promise<HorarioAsignado> {
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

    const nuevoAmbienteId = dto.ambiente_id ?? horario.ambiente_id;
    const resultado = await this.validadorHorarioService.validarSlot({
      docente_id: horario.docente_id,
      grupo_id: horario.grupo_id,
      ambiente_id: nuevoAmbienteId,
      laboratorio_ambiente_id:
        horario.tipo_clase === TipoClase.LABORATORIO ? nuevoAmbienteId : undefined,
      periodo: horario.periodo,
      dia: dto.dia_semana,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      tipo_clase: horario.tipo_clase,
      fecha: this.construirFechaDesdeDia(horario.periodo, dto.dia_semana),
    });

    if (!resultado.valido) {
      throw new BadRequestException({
        message: "No se pudo reasignar el horario",
        errores: resultado.errores,
      });
    }

    horario.dia = dto.dia_semana;
    horario.hora_inicio = dto.hora_inicio;
    horario.hora_fin = dto.hora_fin;
    horario.ambiente_id = nuevoAmbienteId;
    horario.estado = EstadoHorario.BORRADOR;

    const actualizado = await this.horarioRepo.save(horario);

    await this.auditoriaRepo.save(
      this.auditoriaRepo.create({
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
      }),
    );

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
      slots.add(`${disponibilidad.dia_semana}_${disponibilidad.hora_inicio.substring(0, 5)}`);
      map.set(docenteId, slots);
    }
    return map;
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
      tipoClase === TipoClase.TEORIA ? TipoAmbiente.AULA : TipoAmbiente.LABORATORIO;
    return ambientes.filter((ambiente) => ambiente.tipo === tipoRequerido);
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
