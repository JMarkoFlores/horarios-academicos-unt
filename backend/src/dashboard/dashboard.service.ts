import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(ConflictoAsignacion)
    private readonly conflictoRepo: Repository<ConflictoAsignacion>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Curso) private readonly cursoRepo: Repository<Curso>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getKPIs(periodo: string) {
    const cacheKey = `dashboard_kpis_${periodo}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const [
      totalDocentes,
      totalAulas,
      totalLaboratorios,
      totalCursos,
      conflictosActivos,
      horarios,
      docentes,
      ambientes,
    ] = await Promise.all([
      this.docenteRepo.count({ where: { activo: true } }),
      this.ambienteRepo.count({
        where: { tipo: TipoAmbiente.AULA, activo: true },
      }),
      this.ambienteRepo.count({
        where: { tipo: TipoAmbiente.LABORATORIO, activo: true },
      }),
      this.cursoRepo.count({ where: { activo: true } }),
      this.conflictoRepo.count({
        where: { periodo_academico: periodo, resuelto: false },
      }),
      this.horarioRepo
        .createQueryBuilder("horario")
        .leftJoinAndSelect("horario.docente", "docente")
        .leftJoinAndSelect("horario.curso", "curso")
        .leftJoinAndSelect("horario.ambiente", "ambiente")
        .leftJoinAndSelect("horario.grupo", "grupo")
        .where("horario.periodo = :periodo", { periodo })
        .cache(`horarios_periodo_${periodo}_dashboard_kpis`, 60000)
        .getMany(),
      this.docenteRepo.find({ where: { activo: true } }),
      this.ambienteRepo.find({ where: { activo: true } }),
    ]);

    const docentesConHorario = new Set(
      horarios.map((h) => h.docente?.id).filter(Boolean),
    ).size;
    const cursosAsignados = new Set(
      horarios.map((h) => h.curso?.id).filter(Boolean),
    ).size;

    const aulasOcupadas = new Set(
      horarios
        .filter((h) => h.ambiente?.tipo === TipoAmbiente.AULA)
        .map((h) => h.ambiente?.id),
    ).size;
    const laboratoriosOcupados = new Set(
      horarios
        .filter((h) => h.ambiente?.tipo === TipoAmbiente.LABORATORIO)
        .map((h) => h.ambiente?.id),
    ).size;

    // Horas por docente
    const horasMap = new Map<number, number>();
    for (const h of horarios) {
      if (!h.docente?.id) continue;
      const dur = this.calcularDuracion(h.hora_inicio, h.hora_fin);
      horasMap.set(h.docente.id, (horasMap.get(h.docente.id) ?? 0) + dur);
    }

    const horasArr = [...horasMap.values()];
    const horasPromedio =
      horasArr.length > 0
        ? horasArr.reduce((a, b) => a + b, 0) / horasArr.length
        : 0;
    const horasMediana = this.calcularMediana(horasArr);

    // Distribución por categoría con modalidad
    const categorias = [...new Set(docentes.map((d) => d.categoria))];
    const distribucionCategoria = categorias.map((cat) => {
      const grupo = docentes.filter((d) => d.categoria === cat);
      const conHorario = grupo.filter((d) => horasMap.has(d.id)).length;
      const modalidades = [...new Set(grupo.map((d) => d.tipo_contrato))];
      const porcentaje =
        grupo.length > 0 ? Math.round((conHorario / grupo.length) * 100) : 0;
      return {
        categoria: cat,
        modalidad: modalidades.join(", "),
        total: grupo.length,
        con_horario: conHorario,
        porcentaje,
      };
    });

    // Top docentes carga
    const docentesCarga = docentes
      .map((d) => ({
        nombre: `${d.apellidos}, ${d.nombres}`,
        categoria: d.categoria,
        horas: horasMap.get(d.id) ?? 0,
      }))
      .sort((a, b) => b.horas - a.horas);

    const topMayor = docentesCarga.slice(0, 5);
    const topMenor = [...docentesCarga]
      .sort((a, b) => a.horas - b.horas)
      .slice(0, 5);

    // Ocupación por ambiente
    const MAX_HOURS = 75; // 15h/día * 5 días
    const ocupacionAmbiente = ambientes
      .map((a) => {
        const horasAmb = horarios
          .filter((h) => h.ambiente?.id === a.id)
          .reduce(
            (sum, h) => sum + this.calcularDuracion(h.hora_inicio, h.hora_fin),
            0,
          );
        const pct = Math.round((horasAmb / MAX_HOURS) * 100);
        return {
          codigo: a.codigo,
          tipo: a.tipo,
          capacidad: a.capacidad,
          porcentaje_ocupacion: pct,
        };
      })
      .sort((a, b) => b.porcentaje_ocupacion - a.porcentaje_ocupacion);

    // Mapa de calor
    const diasNombre: Record<number, string> = {
      1: "Lunes",
      2: "Martes",
      3: "Miércoles",
      4: "Jueves",
      5: "Viernes",
    };
    const mapaCalor: any[] = [];
    for (let dia = 1; dia <= 5; dia++) {
      for (let hora = 7; hora <= 21; hora++) {
        const hStr = `${String(hora).padStart(2, "0")}:00`;
        const siguienteHora = `${String(hora + 1).padStart(2, "0")}:00`;
        const asignaciones = horarios.filter(
          (h) =>
            h.dia === dia && h.hora_inicio < siguienteHora && h.hora_fin > hStr,
        );
        const totalHoras = asignaciones.reduce(
          (sum, h) => sum + this.calcularDuracion(h.hora_inicio, h.hora_fin),
          0,
        );
        const tipoClase = asignaciones.some(
          (h) => h.tipo_clase === TipoClase.LABORATORIO,
        )
          ? "LABORATORIO"
          : asignaciones.length > 0
            ? "TEORIA"
            : null;
        mapaCalor.push({
          dia: diasNombre[dia],
          hora: hStr,
          intensidad: Math.min(100, Math.round(totalHoras * 20)),
          tipo_clase: tipoClase,
        });
      }
    }

    // Actividad reciente (últimos horarios creados)
    const actividadReciente = horarios
      .sort(
        (a, b) =>
          (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0),
      )
      .slice(0, 10)
      .map((h) => ({
        timestamp: h.created_at ?? new Date(),
        descripcion: `Asignación: ${h.curso?.nombre || "Curso"} - ${h.docente?.apellidos || "Docente"} (${h.ambiente?.codigo || "Ambiente"})`,
        tipo: h.tipo_clase === TipoClase.LABORATORIO ? "LABORATORIO" : "TEORIA",
      }));

    const progresoSemanal = this.calcularProgresoSemanal(horarios);

    const result = {
      total_docentes: totalDocentes,
      docentes_con_horario: docentesConHorario,
      docentes_pendientes: totalDocentes - docentesConHorario,
      porcentaje_docentes_asignados:
        totalDocentes > 0
          ? Math.round((docentesConHorario / totalDocentes) * 100)
          : 0,
      total_aulas: totalAulas,
      aulas_ocupadas: aulasOcupadas,
      porcentaje_ocupacion_aulas:
        totalAulas > 0 ? Math.round((aulasOcupadas / totalAulas) * 100) : 0,
      total_laboratorios: totalLaboratorios,
      laboratorios_ocupados: laboratoriosOcupados,
      porcentaje_ocupacion_laboratorios:
        totalLaboratorios > 0
          ? Math.round((laboratoriosOcupados / totalLaboratorios) * 100)
          : 0,
      total_cursos: totalCursos,
      cursos_asignados: cursosAsignados,
      conflictos_activos: conflictosActivos,
      horas_promedio_por_docente: Math.round(horasPromedio * 10) / 10,
      horas_mediana_por_docente: Math.round(horasMediana * 10) / 10,
      distribucion_por_categoria: distribucionCategoria,
      top_docentes_mayor_carga: topMayor,
      top_docentes_menor_carga: topMenor,
      ocupacion_por_ambiente: ocupacionAmbiente,
      mapa_calor: mapaCalor,
      actividad_reciente: actividadReciente,
      progreso_semanal: progresoSemanal,
    };

    await this.cacheManager.set(cacheKey, result, 60000);

    return result;
  }

  private calcularDuracion(inicio: string, fin: string): number {
    const [hi, mi] = inicio.split(":").map(Number);
    const [hf, mf] = fin.split(":").map(Number);
    return (hf * 60 + mf - hi * 60 - mi) / 60;
  }

  private calcularMediana(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calcularProgresoSemanal(horarios: HorarioAsignado[]) {
    const diasNombre: Record<number, string> = {
      1: "Lunes",
      2: "Martes",
      3: "Miércoles",
      4: "Jueves",
      5: "Viernes",
    };
    const porDia: Record<number, Set<number>> = {
      1: new Set(),
      2: new Set(),
      3: new Set(),
      4: new Set(),
      5: new Set(),
    };

    for (const h of horarios) {
      if (h.dia >= 1 && h.dia <= 5 && h.curso?.id) {
        porDia[h.dia].add(h.curso.id);
      }
    }

    return Object.entries(porDia).map(([dia, cursos]) => ({
      semana: diasNombre[Number(dia)],
      cursos_asignados: cursos.size,
    }));
  }
}
