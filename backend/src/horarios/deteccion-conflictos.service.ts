import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { TipoConflicto } from "../common/enums/tipo-conflicto.enum";

export interface ResultadoDeteccion {
  tieneConflictos: boolean;
  conflictos: ConflictoDetectado[];
}

export interface ConflictoDetectado {
  tipo: TipoConflicto;
  descripcion: string;
  horarioId?: number;
  docenteId?: number;
  ambienteId?: number;
  gravedad: "ALTA" | "MEDIA" | "BAJA";
}

export interface ValidacionAsignacion {
  valido: boolean;
  conflictos: ConflictoDetectado[];
}

@Injectable()
export class DeteccionConflictosService {
  private readonly logger = new Logger(DeteccionConflictosService.name);

  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(ConflictoAsignacion)
    private readonly conflictoRepo: Repository<ConflictoAsignacion>,
  ) {}

  /**
   * Detecta conflictos en un horario específico antes de asignarlo
   */
  async validarAsignacion(
    docenteId: number,
    ambienteId: number,
    grupoId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<ValidacionAsignacion> {
    const conflictos: ConflictoDetectado[] = [];

    // 1. Verificar cruce de docente
    const cruceDocente = await this.verificarCruceDocente(
      docenteId,
      dia,
      horaInicio,
      horaFin,
      periodo,
    );
    if (cruceDocente) {
      conflictos.push({
        tipo: TipoConflicto.CRUCE_DOCENTE,
        descripcion: "El docente tiene otro horario asignado en este slot",
        docenteId,
        gravedad: "ALTA",
      });
    }

    // 2. Verificar cruce de ambiente
    const cruceAmbiente = await this.verificarCruceAmbiente(
      ambienteId,
      dia,
      horaInicio,
      horaFin,
      periodo,
    );
    if (cruceAmbiente) {
      conflictos.push({
        tipo: TipoConflicto.CRUCE_AMBIENTE,
        descripcion: "El ambiente ya está ocupado en este slot",
        ambienteId,
        gravedad: "ALTA",
      });
    }

    // 3. Verificar cruce de grupo
    const cruceGrupo = await this.verificarCruceGrupo(
      grupoId,
      dia,
      horaInicio,
      horaFin,
      periodo,
    );
    if (cruceGrupo) {
      conflictos.push({
        tipo: TipoConflicto.CRUCE_GRUPO,
        descripcion: "El grupo tiene otro horario asignado en este slot",
        gravedad: "ALTA",
      });
    }

    return {
      valido: conflictos.length === 0,
      conflictos,
    };
  }

  /**
   * Detecta conflictos de carga horaria para un docente
   */
  async validarCargaDocente(
    docenteId: number,
    horasAsignadas: number,
    horasRequeridas: number,
    periodo: string,
  ): Promise<ValidacionAsignacion> {
    const conflictos: ConflictoDetectado[] = [];

    if (horasAsignadas < horasRequeridas) {
      conflictos.push({
        tipo: TipoConflicto.CARGA_INSUFICIENTE,
        descripcion: `Carga insuficiente: ${horasAsignadas}h asignadas de ${horasRequeridas}h requeridas`,
        docenteId,
        gravedad: "MEDIA",
      });
    }

    // Aquí se podría agregar validación de carga máxima contra ParametrosCarga
    // Por ahora es un placeholder para integración futura

    return {
      valido: conflictos.length === 0,
      conflictos,
    };
  }

  /**
   * Analiza todos los horarios de un período y detecta conflictos
   */
  async analizarPeriodo(periodo: string): Promise<ResultadoDeteccion> {
    this.logger.log(`Analizando conflictos para período ${periodo}`);

    const horarios = await this.horarioRepo.find({
      where: { periodo },
      relations: ["docente", "ambiente", "grupo"],
    });

    const conflictos: ConflictoDetectado[] = [];

    // Detectar horarios sin docente
    const sinDocente = horarios.filter((h) => !h.docente);
    sinDocente.forEach((h) => {
      conflictos.push({
        tipo: TipoConflicto.SIN_DOCENTE,
        descripcion: `Horario ${h.id} sin docente asignado`,
        horarioId: h.id,
        gravedad: "ALTA",
      });
    });

    // Detectar horarios sin ambiente
    const sinAmbiente = horarios.filter((h) => !h.ambiente);
    sinAmbiente.forEach((h) => {
      conflictos.push({
        tipo: TipoConflicto.SIN_AMBIENTE,
        descripcion: `Horario ${h.id} sin ambiente asignado`,
        horarioId: h.id,
        gravedad: "ALTA",
      });
    });

    // Detectar cruces de docente
    for (const horario of horarios) {
      if (!horario.docente) continue;

      const cruces = horarios.filter(
        (h) =>
          h.docente_id === horario.docente_id &&
          h.id !== horario.id &&
          h.dia === horario.dia &&
          this.haySolapamiento(
            h.hora_inicio,
            h.hora_fin,
            horario.hora_inicio,
            horario.hora_fin,
          ),
      );

      cruces.forEach((cruce) => {
        conflictos.push({
          tipo: TipoConflicto.CRUCE_DOCENTE,
          descripcion: `Docente ${horario.docente.apellidos} tiene cruce entre horarios ${horario.id} y ${cruce.id}`,
          docenteId: horario.docente_id,
          horarioId: horario.id,
          gravedad: "ALTA",
        });
      });
    }

    // Detectar cruces de ambiente
    for (const horario of horarios) {
      if (!horario.ambiente) continue;

      const cruces = horarios.filter(
        (h) =>
          h.ambiente_id === horario.ambiente_id &&
          h.id !== horario.id &&
          h.dia === horario.dia &&
          this.haySolapamiento(
            h.hora_inicio,
            h.hora_fin,
            horario.hora_inicio,
            horario.hora_fin,
          ),
      );

      cruces.forEach((cruce) => {
        conflictos.push({
          tipo: TipoConflicto.CRUCE_AMBIENTE,
          descripcion: `Ambiente ${horario.ambiente.nombre} tiene cruce entre horarios ${horario.id} y ${cruce.id}`,
          ambienteId: horario.ambiente_id,
          horarioId: horario.id,
          gravedad: "ALTA",
        });
      });
    }

    // Detectar cruces de grupo
    for (const horario of horarios) {
      if (!horario.grupo) continue;

      const cruces = horarios.filter(
        (h) =>
          h.grupo_id === horario.grupo_id &&
          h.id !== horario.id &&
          h.dia === horario.dia &&
          this.haySolapamiento(
            h.hora_inicio,
            h.hora_fin,
            horario.hora_inicio,
            horario.hora_fin,
          ),
      );

      cruces.forEach((cruce) => {
        conflictos.push({
          tipo: TipoConflicto.CRUCE_GRUPO,
          descripcion: `Grupo ${horario.grupo.nombre} tiene cruce entre horarios ${horario.id} y ${cruce.id}`,
          horarioId: horario.id,
          gravedad: "ALTA",
        });
      });
    }

    // Guardar conflictos detectados en base de datos
    await this.guardarConflictos(conflictos, periodo);

    this.logger.log(
      `Análisis completado: ${conflictos.length} conflictos detectados`,
    );

    return {
      tieneConflictos: conflictos.length > 0,
      conflictos,
    };
  }

  /**
   * Guarda los conflictos detectados en la base de datos
   */
  private async guardarConflictos(
    conflictos: ConflictoDetectado[],
    periodo: string,
  ): Promise<void> {
    // Limpiar conflictos previos del período
    await this.conflictoRepo.delete({ periodo_academico: periodo });

    // Guardar nuevos conflictos
    for (const conflicto of conflictos) {
      await this.conflictoRepo.save({
        descripcion: conflicto.descripcion,
        tipo_conflicto: conflicto.tipo,
        periodo_academico: periodo,
        resuelto: false,
        docente: conflicto.docenteId
          ? ({ id: conflicto.docenteId } as Docente)
          : null,
        ambiente: conflicto.ambienteId
          ? ({ id: conflicto.ambienteId } as Ambiente)
          : null,
      });
    }
  }

  private async verificarCruceDocente(
    docenteId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<boolean> {
    const cruce = await this.horarioRepo.findOne({
      where: {
        docente_id: docenteId,
        dia,
        periodo,
      },
    });

    if (!cruce) return false;

    return this.haySolapamiento(
      cruce.hora_inicio,
      cruce.hora_fin,
      horaInicio,
      horaFin,
    );
  }

  private async verificarCruceAmbiente(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<boolean> {
    const cruce = await this.horarioRepo.findOne({
      where: {
        ambiente_id: ambienteId,
        dia,
        periodo,
      },
    });

    if (!cruce) return false;

    return this.haySolapamiento(
      cruce.hora_inicio,
      cruce.hora_fin,
      horaInicio,
      horaFin,
    );
  }

  private async verificarCruceGrupo(
    grupoId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<boolean> {
    const cruce = await this.horarioRepo.findOne({
      where: {
        grupo_id: grupoId,
        dia,
        periodo,
      },
    });

    if (!cruce) return false;

    return this.haySolapamiento(
      cruce.hora_inicio,
      cruce.hora_fin,
      horaInicio,
      horaFin,
    );
  }

  private haySolapamiento(
    inicio1: string,
    fin1: string,
    inicio2: string,
    fin2: string,
  ): boolean {
    const minutosInicio1 = this.aMinutos(inicio1);
    const minutosFin1 = this.aMinutos(fin1);
    const minutosInicio2 = this.aMinutos(inicio2);
    const minutosFin2 = this.aMinutos(fin2);

    return minutosInicio1 < minutosFin2 && minutosFin1 > minutosInicio2;
  }

  private aMinutos(hora: string): number {
    const [horas, minutos] = hora.split(":").map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  }
}
