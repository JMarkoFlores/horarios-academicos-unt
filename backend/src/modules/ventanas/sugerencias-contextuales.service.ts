import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, MoreThan } from "typeorm";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { Ambiente } from "../../entities/ambiente.entity";
import { Curso } from "../../entities/curso.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { RestriccionesValidacionService } from "./restricciones-validacion.service";
import { EstadoHorario } from "../../common/enums/estado-horario.enum";
import { TipoClase } from "../../common/enums/tipo-clase.enum";
import { TipoAmbiente } from "../../common/enums/tipo-ambiente.enum";

export interface AmbienteAlternativo {
  ambiente_id: number;
  ambiente_codigo: string;
  ambiente_nombre: string;
  tipo: string;
  capacidad: number;
  disponible: boolean;
  razon: string;
}

export interface BloqueAlternativo {
  dia: number;
  dia_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  ambiente_id: number;
  ambiente_nombre: string;
  disponible: boolean;
  motivo: string;
  preferencia: "IDEAL" | "ACEPTABLE" | "ULTIMA_OPCION";
}

export interface ReasignacionSugerida {
  horario_id: number;
  alternativas: BloqueAlternativo[];
  impacto: {
    cambios_necesarios: number;
    grupos_afectados: number[];
    docentes_afectados: number[];
  };
}

@Injectable()
export class SugestionesContextualesService {
  private diasNombres = [
    "",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  constructor(
    @InjectRepository(HorarioAsignado)
    private horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(Ambiente)
    private ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Curso)
    private cursoRepo: Repository<Curso>,
    @InjectRepository(PeriodoAcademico)
    private periodoRepo: Repository<PeriodoAcademico>,
    private restriccionesService: RestriccionesValidacionService,
  ) {}

  async sugerirAmbientesAlternos(
    cursoId: number,
    tipoClase: string,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<AmbienteAlternativo[]> {
    const curso = await this.cursoRepo
      .createQueryBuilder("c")
      .leftJoinAndSelect("c.ambientes", "a")
      .where("c.id = :cursoId", { cursoId })
      .getOne();

    if (!curso || !curso.ambientes) {
      return [];
    }

    const ambientesCompatibles = curso.ambientes.filter((a) => {
      if (tipoClase === TipoClase.LABORATORIO) {
        return a.tipo === TipoAmbiente.LABORATORIO && a.estado === "ACTIVO";
      }
      if (tipoClase === TipoClase.PRACTICA || tipoClase === TipoClase.TEORIA) {
        return a.tipo === TipoAmbiente.AULA && a.estado === "ACTIVO";
      }
      return a.estado === "ACTIVO";
    });

    const alternativas: AmbienteAlternativo[] = [];

    for (const ambiente of ambientesCompatibles) {
      // Verificar disponibilidad en ese slot
      const ocupado = await this.horarioRepo.findOne({
        where: {
          ambiente_id: ambiente.id,
          periodo,
          dia,
          estado: EstadoHorario.CONFIRMADO,
        },
      });

      const disponible =
        !ocupado ||
        !this.hayTraslape(
          ocupado.hora_inicio,
          ocupado.hora_fin,
          horaInicio,
          horaFin,
        );

      alternativas.push({
        ambiente_id: ambiente.id,
        ambiente_codigo: ambiente.codigo,
        ambiente_nombre: ambiente.nombre,
        tipo: ambiente.tipo,
        capacidad: ambiente.capacidad,
        disponible,
        razon: disponible
          ? "Disponible en este slot"
          : "Ocupado en este horario",
      });
    }

    // Ordenar: disponibles primero, luego por cercanía al original
    return alternativas.sort((a, b) => {
      if (a.disponible !== b.disponible) {
        return a.disponible ? -1 : 1;
      }
      return 0;
    });
  }

  async sugerirBloquesAlternos(
    docenteId: number,
    cursoId: number,
    tipoClase: string,
    periodo: string,
    periodoId: number,
  ): Promise<BloqueAlternativo[]> {
    const restricciones =
      await this.restriccionesService.obtenerRestriccionesPeriodo(periodoId);
    const alternativas: BloqueAlternativo[] = [];

    const duracionMinutos = 120; // Asumir 2 horas por defecto
    const horasPermitidas = this.generarHorasPermitidas(
      restricciones.franja_inicio,
      restricciones.franja_fin,
      duracionMinutos,
    );

    // Iterar sobre días hábiles
    for (const dia of restricciones.dias_habiles) {
      for (const horario of horasPermitidas) {
        // Verificar si docente y ambiente están libres
        const cruceDocente = await this.horarioRepo.findOne({
          where: {
            docente_id: docenteId,
            periodo,
            dia,
            estado: EstadoHorario.CONFIRMADO,
          },
        });

        if (
          cruceDocente &&
          this.hayTraslape(
            cruceDocente.hora_inicio,
            cruceDocente.hora_fin,
            horario.inicio,
            horario.fin,
          )
        ) {
          continue;
        }

        // Obtener ambiente disponible
        const ambiente = await this.obtenerAmbienteDisponible(
          cursoId,
          tipoClase,
          dia,
          horario.inicio,
          horario.fin,
          periodo,
        );

        if (ambiente) {
          const preferencia = this.calcularPreferencia(
            dia,
            horario.inicio,
            restricciones.dias_habiles,
            restricciones.permitir_sabado,
          );

          alternativas.push({
            dia,
            dia_nombre: this.diasNombres[dia],
            hora_inicio: horario.inicio,
            hora_fin: horario.fin,
            ambiente_id: ambiente.id,
            ambiente_nombre: ambiente.nombre,
            disponible: true,
            motivo: `${this.diasNombres[dia]} ${horario.inicio}-${horario.fin}`,
            preferencia,
          });
        }
      }
    }

    // Ordenar por preferencia
    return alternativas.sort((a, b) => {
      const preferenciaPriority = { IDEAL: 0, ACEPTABLE: 1, ULTIMA_OPCION: 2 };
      return (
        preferenciaPriority[a.preferencia] - preferenciaPriority[b.preferencia]
      );
    });
  }

  async sugerirReasignaciones(
    horarioId: number,
    motivo: string,
  ): Promise<ReasignacionSugerida> {
    const horarioActual = await this.horarioRepo.findOne({
      where: { id: horarioId },
      relations: ["docente", "curso", "grupo", "ambiente"],
    });

    if (!horarioActual) {
      return null;
    }

    // Buscar bloques alternativos para reasignar este horario
    const periodoEntity = await this.periodoRepo.findOne({
      where: { codigo: horarioActual.periodo },
    });
    const periodoId = periodoEntity?.id;
    const alternativas = periodoId
      ? await this.sugerirBloquesAlternos(
          horarioActual.docente_id,
          horarioActual.curso_id,
          horarioActual.tipo_clase,
          horarioActual.periodo,
          periodoId,
        )
      : [];

    // Analizar impacto de cambio
    const impacto = await this.analizarImpactoReasignacion(
      horarioActual,
      alternativas,
    );

    return {
      horario_id: horarioId,
      alternativas,
      impacto,
    };
  }

  private async obtenerAmbienteDisponible(
    cursoId: number,
    tipoClase: string,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<Ambiente> {
    const curso = await this.cursoRepo
      .createQueryBuilder("c")
      .leftJoinAndSelect("c.ambientes", "a")
      .where("c.id = :cursoId", { cursoId })
      .getOne();

    if (!curso || !curso.ambientes) {
      return null;
    }

    for (const ambiente of curso.ambientes) {
      if (
        tipoClase === TipoClase.LABORATORIO &&
        ambiente.tipo !== TipoAmbiente.LABORATORIO
      ) {
        continue;
      }

      const ocupado = await this.horarioRepo.findOne({
        where: {
          ambiente_id: ambiente.id,
          dia,
          periodo,
          estado: EstadoHorario.CONFIRMADO,
        },
      });

      if (
        !ocupado ||
        !this.hayTraslape(
          ocupado.hora_inicio,
          ocupado.hora_fin,
          horaInicio,
          horaFin,
        )
      ) {
        return ambiente;
      }
    }

    return null;
  }

  private generarHorasPermitidas(
    franjaInicio: string,
    franjaFin: string,
    duracionMinutos: number,
  ): Array<{ inicio: string; fin: string }> {
    const horas: Array<{ inicio: string; fin: string }> = [];
    const inicio = this.stringAMinutos(franjaInicio);
    const fin = this.stringAMinutos(franjaFin);

    for (let m = inicio; m + duracionMinutos <= fin; m += 30) {
      horas.push({
        inicio: this.minutosAString(m),
        fin: this.minutosAString(m + duracionMinutos),
      });
    }

    return horas;
  }

  private calcularPreferencia(
    dia: number,
    horaInicio: string,
    diasHabiles: number[],
    permitirSabado: boolean,
  ): "IDEAL" | "ACEPTABLE" | "ULTIMA_OPCION" {
    if (dia === 6 && !permitirSabado) {
      return "ULTIMA_OPCION";
    }
    if (dia === 6) {
      return "ACEPTABLE";
    }
    if (dia >= 1 && dia <= 5) {
      const horaNum = this.stringAMinutos(horaInicio);
      const franjaPrefActual = this.stringAMinutos("13:00"); // después de almuerzo
      if (horaNum >= franjaPrefActual) {
        return "IDEAL";
      }
    }
    return "ACEPTABLE";
  }

  private async analizarImpactoReasignacion(
    horarioActual: HorarioAsignado,
    alternativas: BloqueAlternativo[],
  ): Promise<{
    cambios_necesarios: number;
    grupos_afectados: number[];
    docentes_afectados: number[];
  }> {
    const grupos_afectados: Set<number> = new Set();
    const docentes_afectados: Set<number> = new Set();

    // Buscar otros horarios del mismo grupo que puedan ser afectados
    const otrosHorarios = await this.horarioRepo.find({
      where: {
        grupo_id: horarioActual.grupo_id,
        periodo: horarioActual.periodo,
        estado: EstadoHorario.CONFIRMADO,
      },
    });

    for (const h of otrosHorarios) {
      if (h.id !== horarioActual.id) {
        grupos_afectados.add(h.grupo_id);
        docentes_afectados.add(h.docente_id);
      }
    }

    return {
      cambios_necesarios: otrosHorarios.length - 1,
      grupos_afectados: Array.from(grupos_afectados),
      docentes_afectados: Array.from(docentes_afectados),
    };
  }

  private hayTraslape(
    inicio1: string,
    fin1: string,
    inicio2: string,
    fin2: string,
  ): boolean {
    const i1 = this.stringAMinutos(inicio1);
    const f1 = this.stringAMinutos(fin1);
    const i2 = this.stringAMinutos(inicio2);
    const f2 = this.stringAMinutos(fin2);

    return i1 < f2 && i2 < f1;
  }

  private stringAMinutos(hora: string): number {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
  }

  private minutosAString(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
}
