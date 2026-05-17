import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private dataSource: DataSource,
    @InjectRepository(HorarioAsignado)
    private horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(ConflictoAsignacion)
    private conflictoRepo: Repository<ConflictoAsignacion>,
    @InjectRepository(Docente)
    private docenteRepo: Repository<Docente>,
    @InjectRepository(Ambiente)
    private ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Curso)
    private cursoRepo: Repository<Curso>,
  ) {}

  async getKPIMetrics(periodo: string) {
    const totalAsignaciones = await this.horarioRepo.count({
      where: { periodo_academico: periodo },
    });
    const totalConflictos = await this.conflictoRepo.count({
      where: { periodo_academico: periodo },
    });
    const totalCursos = await this.cursoRepo.count();

    // Eficiencia: (Cursos con al menos una asignación / Total Cursos)
    const cursosAsignados = await this.dataSource.query(
      `
      SELECT COUNT(DISTINCT curso_id) as count 
      FROM horario_asignado 
      WHERE periodo_academico = $1
    `,
      [periodo],
    );

    const eficiencia =
      totalCursos > 0
        ? (Number(cursosAsignados[0].count) / totalCursos) * 100
        : 0;

    return {
      totalAsignaciones,
      totalConflictos,
      totalCursos,
      eficiencia: Math.round(eficiencia * 100) / 100,
    };
  }

  async getDocenteSaturation(periodo: string) {
    return this.dataSource.query(
      `
      SELECT 
        d.id, 
        d.nombres || ' ' || d.apellidos as nombre, 
        COUNT(h.id) as total_horas
      FROM docente d
      LEFT JOIN horario_asignado h ON h.docente_id = d.id AND h.periodo_academico = $1
      GROUP BY d.id
      ORDER BY total_horas DESC
      LIMIT 10
    `,
      [periodo],
    );
  }

  async getRoomUtilization(periodo: string) {
    // Horas asignadas vs capacidad total (asumiendo 15 horas/día, 5 días/semana = 75h max)
    const MAX_HOURS = 75;
    return this.dataSource.query(
      `
      SELECT 
        a.id, 
        a.codigo, 
        a.nombre,
        COUNT(h.id) as horas_usadas,
        ROUND((COUNT(h.id)::numeric / $2::numeric) * 100, 2) as porcentaje_uso
      FROM ambiente a
      LEFT JOIN horario_asignado h ON h.ambiente_id = a.id AND h.periodo_academico = $1
      GROUP BY a.id
      ORDER BY porcentaje_uso DESC
    `,
      [periodo, MAX_HOURS],
    );
  }

  async getPeakHours(periodo: string) {
    return this.dataSource.query(
      `
      SELECT 
        dia_semana, 
        SUBSTRING(hora_inicio::text, 1, 5) as hora, 
        COUNT(*) as cantidad
      FROM horario_asignado
      WHERE periodo_academico = $1
      GROUP BY dia_semana, hora
      ORDER BY dia_semana, hora
    `,
      [periodo],
    );
  }

  async getSmartSuggestions(periodo: string) {
    const suggestions = [];

    // 1. Detectar ambientes subutilizados
    const rooms = await this.getRoomUtilization(periodo);
    const lowUsageRooms = rooms.filter((r) => r.porcentaje_uso < 20);
    if (lowUsageRooms.length > 0) {
      suggestions.push({
        type: "OPTIMIZATION",
        title: "Baja utilización de ambientes",
        message: `Hay ${lowUsageRooms.length} ambientes con menos del 20% de uso. Considere consolidar grupos.`,
        priority: "MEDIUM",
      });
    }

    // 2. Detectar saturación docente
    const saturation = await this.getDocenteSaturation(periodo);
    const overLoaded = saturation.filter((s) => s.total_horas > 20); // Umbral de 20h
    if (overLoaded.length > 0) {
      suggestions.push({
        type: "WARNING",
        title: "Saturación Docente",
        message: `${overLoaded.length} docentes tienen más de 20 horas asignadas. Riesgo de burnout.`,
        priority: "HIGH",
      });
    }

    // 3. Conflictos frecuentes
    const topConflicts = await this.conflictoRepo
      .createQueryBuilder("c")
      .select("c.tipo_conflicto", "tipo")
      .addSelect("COUNT(*)", "count")
      .where("c.periodo_academico = :periodo", { periodo })
      .groupBy("c.tipo_conflicto")
      .orderBy("count", "DESC")
      .limit(3)
      .getRawMany();

    if (topConflicts.length > 0) {
      suggestions.push({
        type: "ANALYSIS",
        title: "Patrón de Conflictos",
        message: `El conflicto más común es "${topConflicts[0].tipo}". Revise las restricciones institucionales relacionadas.`,
        priority: "HIGH",
      });
    }

    return suggestions;
  }
}
