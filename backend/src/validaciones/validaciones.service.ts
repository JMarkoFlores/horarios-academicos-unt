import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { DiaActivo } from "../entities/dia-activo.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";

type ResultadoValidacion = {
  valido: boolean;
  motivo?: string;
};

@Injectable()
export class ValidacionesService {
  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
    @InjectRepository(TurnoHorario)
    private readonly turnoHorarioRepo: Repository<TurnoHorario>,
    @InjectRepository(DiaActivo)
    private readonly diaActivoRepo: Repository<DiaActivo>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
  ) {}

  async verificarCruceDocente(
    docenteId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodoId: number | string,
    excludeHorarioId?: number,
  ): Promise<ResultadoValidacion> {
    return this.verificarCruce(
      "docente_id",
      docenteId,
      dia,
      horaInicio,
      horaFin,
      periodoId,
      excludeHorarioId,
      "Cruce de docente",
    );
  }

  async verificarCruceAmbiente(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodoId: number | string,
    excludeHorarioId?: number,
  ): Promise<ResultadoValidacion> {
    return this.verificarCruce(
      "ambiente_id",
      ambienteId,
      dia,
      horaInicio,
      horaFin,
      periodoId,
      excludeHorarioId,
      "El ambiente ya está ocupado en ese intervalo.",
    );
  }

  async verificarCruceGrupo(
    grupoId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodoId: number | string,
    excludeHorarioId?: number,
  ): Promise<ResultadoValidacion> {
    // Primero obtenemos el ciclo del grupo que estamos intentando asignar
    const grupo = await this.horarioRepo.manager
      .getRepository("Grupo")
      .findOne({ where: { id: grupoId } });

    if (!grupo) {
      return {
        valido: false,
        motivo: "El grupo no existe.",
      };
    }

    const periodoCodigo = await this.resolverPeriodoCodigo(periodoId);

    if (!periodoCodigo) {
      return {
        valido: false,
        motivo: "El período académico indicado no existe.",
      };
    }

    if (this.aMinutos(horaInicio) >= this.aMinutos(horaFin)) {
      return {
        valido: false,
        motivo: "La hora de inicio debe ser menor que la hora de fin.",
      };
    }

    // Consulta: solo buscamos horarios de grupos en el MISMO ciclo
    const qb = this.horarioRepo
      .createQueryBuilder("h")
      .innerJoin("h.grupo", "grupo")
      .where("grupo.ciclo = :ciclo", { ciclo: grupo.ciclo })
      .andWhere("h.dia = :dia", { dia })
      .andWhere("h.periodo = :periodoCodigo", { periodoCodigo })
      .andWhere("h.hora_inicio < CAST(:horaFin AS TIME)", { horaFin })
      .andWhere("h.hora_fin > CAST(:horaInicio AS TIME)", { horaInicio });

    if (excludeHorarioId !== undefined) {
      qb.andWhere("h.id != :excludeHorarioId", { excludeHorarioId });
    }

    const existeCruce = (await qb.getCount()) > 0;

    return existeCruce
      ? { valido: false, motivo: "El grupo ya tiene otro horario asignado en ese intervalo." }
      : { valido: true };
  }

  async verificarDisponibilidadDocente(
    docenteId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodoId?: number | string,
  ): Promise<ResultadoValidacion> {
    const periodoCodigo =
      periodoId !== undefined
        ? await this.resolverPeriodoCodigo(periodoId)
        : null;

    if (periodoId !== undefined && !periodoCodigo) {
      return {
        valido: false,
        motivo: "El período académico indicado no existe.",
      };
    }

    const qb = this.disponibilidadRepo
      .createQueryBuilder("d")
      .innerJoin("d.docente", "docente")
      .where("docente.id = :docenteId", { docenteId })
      .andWhere("d.dia_semana = :dia", { dia })
      .andWhere("d.hora_inicio < CAST(:horaFin AS TIME)", { horaFin })
      .andWhere("d.hora_fin > CAST(:horaInicio AS TIME)", { horaInicio })
      .andWhere("d.disponible = false");

    if (periodoCodigo) {
      qb.andWhere("d.periodo_academico = :periodoCodigo", { periodoCodigo });
    }

    const existeBloqueNoDisponible = (await qb.getCount()) > 0;

    if (existeBloqueNoDisponible) {
      return {
        valido: false,
        motivo: "El docente marcó ese bloque como no disponible.",
      };
    }

    return { valido: true };
  }

  async verificarFranjaInstitucional(
    dia: number,
    horaInicio: string,
    horaFin: string,
  ): Promise<ResultadoValidacion> {
    if (this.aMinutos(horaInicio) >= this.aMinutos(horaFin)) {
      return {
        valido: false,
        motivo: "La hora de inicio debe ser menor que la hora de fin.",
      };
    }

    const diaActivo = await this.diaActivoRepo
      .createQueryBuilder("dia_activo")
      .where("dia_activo.dia_semana = :dia", { dia })
      .andWhere("dia_activo.activo = true")
      .getCount();

    if (diaActivo === 0) {
      return {
        valido: false,
        motivo: "El día seleccionado no está habilitado institucionalmente.",
      };
    }

    const turnoValido = await this.turnoHorarioRepo
      .createQueryBuilder("turno")
      .where("turno.activo = true")
      .andWhere("turno.hora_inicio <= CAST(:horaInicio AS TIME)", {
        horaInicio,
      })
      .andWhere("turno.hora_fin >= CAST(:horaFin AS TIME)", { horaFin })
      .getCount();

    if (turnoValido === 0) {
      return {
        valido: false,
        motivo:
          "El bloque solicitado cae fuera de la franja institucional activa.",
      };
    }

    return { valido: true };
  }

  private async verificarCruce(
    campo: "docente_id" | "ambiente_id" | "grupo_id",
    valorId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodoId: number | string,
    excludeHorarioId: number | undefined,
    motivo: string,
  ): Promise<ResultadoValidacion> {
    const periodoCodigo = await this.resolverPeriodoCodigo(periodoId);

    if (!periodoCodigo) {
      return {
        valido: false,
        motivo: "El período académico indicado no existe.",
      };
    }

    if (this.aMinutos(horaInicio) >= this.aMinutos(horaFin)) {
      return {
        valido: false,
        motivo: "La hora de inicio debe ser menor que la hora de fin.",
      };
    }

    const qb = this.horarioRepo
      .createQueryBuilder("h")
      .where(`h.${campo} = :valorId`, { valorId })
      .andWhere("h.dia = :dia", { dia })
      .andWhere("h.periodo = :periodoCodigo", { periodoCodigo })
      .andWhere("h.hora_inicio < CAST(:horaFin AS TIME)", { horaFin })
      .andWhere("h.hora_fin > CAST(:horaInicio AS TIME)", { horaInicio });

    if (excludeHorarioId !== undefined) {
      qb.andWhere("h.id != :excludeHorarioId", { excludeHorarioId });
    }

    const existeCruce = (await qb.getCount()) > 0;

    return existeCruce ? { valido: false, motivo } : { valido: true };
  }

  private async resolverPeriodoCodigo(
    periodoId: number | string,
  ): Promise<string | null> {
    const periodo = await this.periodoRepo
      .createQueryBuilder("periodo")
      .where(
        typeof periodoId === "number" || /^\d+$/.test(String(periodoId))
          ? "periodo.id = :periodoId"
          : "periodo.codigo = :periodoCodigo",
        typeof periodoId === "number" || /^\d+$/.test(String(periodoId))
          ? { periodoId: Number(periodoId) }
          : { periodoCodigo: String(periodoId) },
      )
      .getOne();

    return periodo?.codigo ?? null;
  }

  private aMinutos(hora: string): number {
    const [horas, minutos] = hora.split(":").map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  }
}
