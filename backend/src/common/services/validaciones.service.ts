import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { DisponibilidadDocente } from "../../entities/disponibilidad-docente.entity";
import { DiaNoLaborable } from "../../entities/dia-no-laborable.entity";
import { RestriccionInstitucional } from "../../entities/restriccion-institucional.entity";

@Injectable()
export class ValidacionesService {
  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
    @InjectRepository(DiaNoLaborable)
    private readonly diaNoLaborableRepo: Repository<DiaNoLaborable>,
    @InjectRepository(RestriccionInstitucional)
    private readonly restriccionRepo: Repository<RestriccionInstitucional>,
  ) {}

  async verificarCruceDocente(
    docenteId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
    excluirId?: number,
  ): Promise<boolean> {
    const qb = this.horarioRepo
      .createQueryBuilder("h")
      .innerJoin("h.docente", "d")
      .where("d.id = :docenteId", { docenteId })
      .andWhere("h.dia_semana = :diaSemana", { diaSemana })
      .andWhere("h.periodo_academico = :periodo", { periodo })
      .andWhere("h.hora_inicio < CAST(:horaFin AS TIME)", { horaFin })
      .andWhere("h.hora_fin > CAST(:horaInicio AS TIME)", { horaInicio });

    if (excluirId) {
      qb.andWhere("h.id != :excluirId", { excluirId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  async verificarCruceAmbiente(
    ambienteId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
    excluirId?: number,
  ): Promise<boolean> {
    const qb = this.horarioRepo
      .createQueryBuilder("h")
      .innerJoin("h.ambiente", "a")
      .where("a.id = :ambienteId", { ambienteId })
      .andWhere("h.dia_semana = :diaSemana", { diaSemana })
      .andWhere("h.periodo_academico = :periodo", { periodo })
      .andWhere("h.hora_inicio < CAST(:horaFin AS TIME)", { horaFin })
      .andWhere("h.hora_fin > CAST(:horaInicio AS TIME)", { horaInicio });

    if (excluirId) {
      qb.andWhere("h.id != :excluirId", { excluirId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  async verificarCruceGrupo(
    grupoId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
    excluirId?: number,
  ): Promise<boolean> {
    const qb = this.horarioRepo
      .createQueryBuilder("h")
      .innerJoin("h.grupo", "g")
      .where("g.id = :grupoId", { grupoId })
      .andWhere("h.dia_semana = :diaSemana", { diaSemana })
      .andWhere("h.periodo_academico = :periodo", { periodo })
      .andWhere("h.hora_inicio < CAST(:horaFin AS TIME)", { horaFin })
      .andWhere("h.hora_fin > CAST(:horaInicio AS TIME)", { horaInicio });

    if (excluirId) {
      qb.andWhere("h.id != :excluirId", { excluirId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  async verificarDisponibilidadDocente(
    docenteId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<boolean> {
    const toMinutes = (t: string): number => {
      const parts = t.split(":");
      const h = parseInt(parts[0] || "0", 10);
      const m = parseInt(parts[1] || "0", 10);
      return h * 60 + m;
    };

    const inicioMin = toMinutes(horaInicio);
    const finMin = toMinutes(horaFin);

    if (inicioMin >= finMin) return false;

    // Obtener todos los slots declarados como disponibles para el docente, día y periodo
    const disponibilidades = await this.disponibilidadRepo
      .createQueryBuilder("d")
      .innerJoin("d.docente", "doc")
      .where("doc.id = :docenteId", { docenteId })
      .andWhere("d.dia_semana = :diaSemana", { diaSemana })
      .andWhere("d.periodo_academico = :periodo", { periodo })
      .andWhere("d.disponible = true")
      .getMany();

    // Mapear slots a minutos y ordenarlos por hora de inicio
    const slots = disponibilidades
      .map((d) => ({
        inicio: toMinutes(d.hora_inicio),
        fin: toMinutes(d.hora_fin),
      }))
      .sort((a, b) => a.inicio - b.inicio);

    // Verificar cobertura continua
    let currentCovered = inicioMin;
    for (const slot of slots) {
      if (slot.inicio <= currentCovered && slot.fin > currentCovered) {
        currentCovered = Math.max(currentCovered, slot.fin);
      }
    }

    return currentCovered >= finMin;
  }

  verificarFranjaInstitucional(horaInicio: string, horaFin: string): boolean {
    const toMinutes = (t: string): number => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const inicioMin = toMinutes(horaInicio);
    const finMin = toMinutes(horaFin);
    return inicioMin >= 7 * 60 && finMin <= 22 * 60 && inicioMin < finMin;
  }

  async verificarDiaNoLaborable(
    fecha: Date | string,
    periodo: string,
  ): Promise<boolean> {
    let fechaStr: string;

    if (typeof fecha === "string") {
      if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
        fechaStr = fecha.substring(0, 10);
      } else {
        const fechaDate = new Date(fecha);
        const year = fechaDate.getFullYear();
        const month = String(fechaDate.getMonth() + 1).padStart(2, "0");
        const day = String(fechaDate.getDate()).padStart(2, "0");
        fechaStr = `${year}-${month}-${day}`;
      }
    } else {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, "0");
      const day = String(fecha.getDate()).padStart(2, "0");
      fechaStr = `${year}-${month}-${day}`;
    }

    const count = await this.diaNoLaborableRepo
      .createQueryBuilder("d")
      .where("d.fecha = :fechaStr", { fechaStr })
      .andWhere("d.periodo_academico = :periodo", { periodo })
      .getCount();

    return count > 0;
  }

  async verificarMaxHorasDocente(
    docenteId: number,
    dia: number,
    duracion: number,
    periodo: string,
  ): Promise<boolean> {
    const restriccion = await this.restriccionRepo.findOne({
      where: {
        tipo_restriccion: "MAX_HORAS_DIA",
        periodo_academico: periodo,
        activo: true,
      },
    });

    let maxHoras = 8; // Fallback por defecto si no existe una restricción específica
    if (restriccion && restriccion.valor && typeof restriccion.valor === "object") {
      const valor = restriccion.valor as Record<string, any>;
      if (typeof valor.max_horas === "number") {
        maxHoras = valor.max_horas;
      }
    }

    const horarios = await this.horarioRepo.find({
      where: {
        docente: { id: docenteId },
        dia_semana: dia,
        periodo_academico: periodo,
      },
    });

    let totalHoras = 0;
    const toMinutes = (t: string): number => {
      const parts = t.split(":").map(Number);
      const h = parts[0] || 0;
      const m = parts[1] || 0;
      return h * 60 + m;
    };

    for (const h of horarios) {
      const inicioMin = toMinutes(h.hora_inicio);
      const finMin = toMinutes(h.hora_fin);
      totalHoras += (finMin - inicioMin) / 60;
    }

    return totalHoras + duracion <= maxHoras;
  }
}
