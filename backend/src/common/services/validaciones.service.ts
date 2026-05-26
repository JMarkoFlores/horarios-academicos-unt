import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { DisponibilidadDocente } from "../../entities/disponibilidad-docente.entity";
import { DiaNoLaborable } from "../../entities/dia-no-laborable.entity";
import { RestriccionInstitucional } from "../../entities/restriccion-institucional.entity";
import { Ambiente } from "../../entities/ambiente.entity";
import { Curso } from "../../entities/curso.entity";
import { Grupo } from "../../entities/grupo.entity";
import { Docente } from "../../entities/docente.entity";
import { ParametrosCarga } from "../../entities/parametros-carga.entity";

@Injectable()
export class ValidacionesService {
  private readonly logger = new Logger(ValidacionesService.name);
  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
    @InjectRepository(DiaNoLaborable)
    private readonly diaNoLaborableRepo: Repository<DiaNoLaborable>,
    @InjectRepository(RestriccionInstitucional)
    private readonly restriccionRepo: Repository<RestriccionInstitucional>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(ParametrosCarga)
    private readonly parametrosCargaRepo: Repository<ParametrosCarga>,
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
      .andWhere("h.dia = :diaSemana", { diaSemana })
      .andWhere("h.periodo = :periodo", { periodo })
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
      .andWhere("h.dia = :diaSemana", { diaSemana })
      .andWhere("h.periodo = :periodo", { periodo })
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
      .andWhere("h.dia = :diaSemana", { diaSemana })
      .andWhere("h.periodo = :periodo", { periodo })
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
    return inicioMin >= 7 * 60 && finMin <= 23 * 60 && inicioMin < finMin;
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
    if (
      restriccion &&
      restriccion.valor &&
      typeof restriccion.valor === "object"
    ) {
      const valor = restriccion.valor as Record<string, any>;
      if (typeof valor.max_horas === "number") {
        maxHoras = valor.max_horas;
      }
    }

    const horarios = await this.horarioRepo.find({
      where: {
        docente_id: docenteId,
        dia,
        periodo,
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

  async verificarHorasCurso(
    cursoId: number,
    tipoClase: string,
    duracionHoras: number,
    periodo: string,
    docenteId?: number,
    grupoId?: number,
  ): Promise<{
    valido: boolean;
    horasAsignadas: number;
    horasRequeridas: number;
  }> {
    this.logger.debug(
      `[verificarHorasCurso] cursoId=${cursoId}, tipoClase=${tipoClase}, grupoId=${grupoId}`,
    );

    const curso = await this.cursoRepo.findOne({ where: { id: cursoId } });
    if (!curso) return { valido: false, horasAsignadas: 0, horasRequeridas: 0 };

    const horasRequeridas =
      tipoClase === "TEORIA" ? curso.horas_teoria : curso.horas_laboratorio;

    this.logger.debug(
      `[verificarHorasCurso] horasRequeridas=${horasRequeridas}`,
    );

    if (horasRequeridas === 0) {
      return { valido: true, horasAsignadas: 0, horasRequeridas: 0 }; // Permitir si no hay restricción de horas
    }

    const query = this.horarioRepo
      .createQueryBuilder("h")
      .where("h.curso_id = :cursoId", { cursoId })
      .andWhere("h.tipo_clase = :tipoClase", { tipoClase })
      .andWhere("h.periodo = :periodo", { periodo });

    if (docenteId) {
      query.andWhere("h.docente_id = :docenteId", { docenteId });
    }

    // Filtrar por grupo_id si se proporciona (para laboratorio o práctica)
    if (grupoId && (tipoClase === "LABORATORIO" || tipoClase === "PRACTICA")) {
      query.andWhere("h.grupo_id = :grupoId", { grupoId });
      this.logger.debug(
        `[verificarHorasCurso] Filtrando por grupo_id=${grupoId}`,
      );
    }

    const horarios = await query.getMany();

    let horasAsignadas = 0;
    const toMinutes = (t: string): number => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    for (const h of horarios) {
      horasAsignadas += (toMinutes(h.hora_fin) - toMinutes(h.hora_inicio)) / 60;
    }

    return {
      valido: horasAsignadas + duracionHoras <= horasRequeridas,
      horasAsignadas,
      horasRequeridas,
    };
  }

  async verificarCapacidadAmbiente(
    ambienteId: number,
    grupoId: number,
  ): Promise<{ valido: boolean; capacidad: number; cupo: number }> {
    const ambiente = await this.ambienteRepo.findOne({
      where: { id: ambienteId },
    });
    const grupo = await this.grupoRepo.findOne({ where: { id: grupoId } });

    if (!ambiente || !grupo) return { valido: false, capacidad: 0, cupo: 0 };

    return {
      valido: ambiente.capacidad >= grupo.cupo_maximo,
      capacidad: ambiente.capacidad,
      cupo: grupo.cupo_maximo,
    };
  }

  async verificarDescansoMinimoDocente(
    docenteId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<{ valido: boolean; descansoMin: number }> {
    const descansoMin = 60; // minutos

    const horarios = await this.horarioRepo.find({
      where: { docente_id: docenteId, dia, periodo },
    });

    const toMin = (t: string): number => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const ini = toMin(horaInicio);
    const fin = toMin(horaFin);

    for (const h of horarios) {
      const hIni = toMin(h.hora_inicio);
      const hFin = toMin(h.hora_fin);

      // Si el nuevo slot termina justo donde empieza otro (o antes)
      if (Math.abs(ini - hFin) < descansoMin && ini >= hFin) {
        continue; // ok, descanso suficiente
      }
      // Si el nuevo slot empieza justo donde termina otro (o después)
      if (Math.abs(hIni - fin) < descansoMin && hIni >= fin) {
        continue; // ok
      }
      // Si se solapan
      if (ini < hFin && fin > hIni) {
        return { valido: false, descansoMin };
      }
      // Si el descanso entre ellos es menor al mínimo
      if (ini >= hFin && ini - hFin < descansoMin) {
        return { valido: false, descansoMin };
      }
      if (hIni >= fin && hIni - fin < descansoMin) {
        return { valido: false, descansoMin };
      }
    }

    return { valido: true, descansoMin };
  }

  async verificarCargaHorariaSemanalDocente(
    docenteId: number,
    duracionHoras: number,
    periodo: string,
  ): Promise<{ valido: boolean; horasSemana: number; maxSemanal: number }> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) return { valido: false, horasSemana: 0, maxSemanal: 0 };

    const parametro = await this.parametrosCargaRepo.findOne({
      where: {
        periodo_academico: periodo,
        tipo_docente: docente.tipo_docente,
        categoria: docente.categoria,
        modalidad: docente.modalidad || "",
      },
    });

    // Si no hay parámetro definido, permitir sin restricción
    const maxSemanal = parametro?.horas_max_semanal ?? 999;
    const minSemanal = parametro?.horas_min_semanal ?? 0;

    const horarios = await this.horarioRepo.find({
      where: { docente_id: docenteId, periodo },
    });

    let horasSemana = 0;
    const toMin = (t: string): number => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    for (const h of horarios) {
      horasSemana += (toMin(h.hora_fin) - toMin(h.hora_inicio)) / 60;
    }

    // Solo validamos máximo en asignación individual; el mínimo se verifica al completar
    const valido = horasSemana + duracionHoras <= maxSemanal;
    return { valido, horasSemana, maxSemanal };
  }

  async verificarCursosDocente(
    docenteId: number,
    periodo: string,
    cursoId?: number,
  ): Promise<{ valido: boolean; cursosAsignados: number; maxCursos: number }> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) return { valido: false, cursosAsignados: 0, maxCursos: 0 };

    const parametro = await this.parametrosCargaRepo.findOne({
      where: {
        periodo_academico: periodo,
        tipo_docente: docente.tipo_docente,
        categoria: docente.categoria,
        modalidad: docente.modalidad || "",
      },
    });

    // Si no hay parámetro definido, permitir sin restricción
    const maxCursos = parametro?.cursos_max_docente ?? 999;

    const horarios = await this.horarioRepo
      .createQueryBuilder("h")
      .select("DISTINCT h.curso_id", "curso_id")
      .where("h.docente_id = :docenteId", { docenteId })
      .andWhere("h.periodo = :periodo", { periodo })
      .getRawMany();

    const cursosUnicos = new Set(horarios.map((h) => h.curso_id));
    const yaTieneCurso = cursoId ? cursosUnicos.has(cursoId) : false;
    const cursosAsignados =
      cursosUnicos.size + (cursoId && !yaTieneCurso ? 1 : 0);
    const valido = cursosAsignados <= maxCursos;
    return { valido, cursosAsignados, maxCursos };
  }
}
