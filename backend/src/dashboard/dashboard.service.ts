import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";

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
  ) {}

  async getKPIs(periodo: string) {
    const [
      totalDocentes,
      totalAulas,
      totalLaboratorios,
      totalCursos,
      conflictosActivos,
      horarios,
      docentes,
    ] = await Promise.all([
      this.docenteRepo.count({ where: { activo: true } }),
      this.ambienteRepo.count({
        where: { tipo: TipoAmbiente.AULA, activo: true },
      }),
      this.ambienteRepo.count({
        where: { tipo: TipoAmbiente.LABORATORIO, activo: true },
      }),
      this.cursoRepo.count({ where: { activo: true } }),
      this.conflictoRepo.count({ where: { periodo_academico: periodo, resuelto: false } }),
      this.horarioRepo
        .createQueryBuilder('horario')
        .leftJoinAndSelect('horario.docente', 'docente')
        .leftJoinAndSelect('horario.curso', 'curso')
        .leftJoinAndSelect('horario.ambiente', 'ambiente')
        .where('horario.periodo_academico = :periodo', { periodo })
        .cache(`horarios_periodo_${periodo}_dashboard_kpis`, 60000)
        .getMany(),
      this.docenteRepo.find({ where: { activo: true } }),
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

    const horasMap = new Map<number, number>();
    for (const h of horarios) {
      if (!h.docente?.id) continue;
      const [hi, mi] = h.hora_inicio.split(":").map(Number);
      const [hf, mf] = h.hora_fin.split(":").map(Number);
      const dur = (hf * 60 + mf - hi * 60 - mi) / 60;
      horasMap.set(h.docente.id, (horasMap.get(h.docente.id) ?? 0) + dur);
    }

    const horasArr = [...horasMap.values()];
    const horasPromedio =
      horasArr.length > 0
        ? horasArr.reduce((a, b) => a + b, 0) / horasArr.length
        : 0;

    const distribucionCategoria = [
      ...new Set(docentes.map((d) => d.categoria)),
    ].map((cat) => {
      const grupo = docentes.filter((d) => d.categoria === cat);
      const conHorario = grupo.filter((d) => horasMap.has(d.id)).length;
      return { categoria: cat, total: grupo.length, con_horario: conHorario };
    });

    const progresoSemanal = this.calcularProgresoSemanal(horarios);

    return {
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
      distribucion_por_categoria: distribucionCategoria,
      progreso_semanal: progresoSemanal,
    };
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
      if (h.dia_semana >= 1 && h.dia_semana <= 5 && h.curso?.id) {
        porDia[h.dia_semana].add(h.curso.id);
      }
    }

    return Object.entries(porDia).map(([dia, cursos]) => ({
      semana: diasNombre[Number(dia)],
      cursos_asignados: cursos.size,
    }));
  }
}
