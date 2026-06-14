import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class DistribucionCategoriaDto {
  @ApiProperty() categoria: string;
  @ApiProperty() modalidad: string;
  @ApiProperty() total: number;
  @ApiProperty() con_horario: number;
  @ApiProperty() porcentaje: number;
}

class DocenteCargaDto {
  @ApiProperty() nombre: string;
  @ApiProperty() categoria: string;
  @ApiProperty() horas: number;
}

class OcupacionAmbienteDto {
  @ApiProperty() codigo: string;
  @ApiProperty() tipo: string;
  @ApiProperty() capacidad: number;
  @ApiProperty() porcentaje_ocupacion: number;
}

class MapaCalorDto {
  @ApiProperty() dia: string;
  @ApiProperty() hora: string;
  @ApiProperty() intensidad: number;
  @ApiPropertyOptional({ nullable: true }) tipo_clase: string | null;
  @ApiProperty({ type: [String] }) cursos: string[];
}

class ActividadRecienteDto {
  @ApiProperty() timestamp: Date;
  @ApiProperty() descripcion: string;
  @ApiProperty() tipo: string;
}

class ProgresoSemanalDto {
  @ApiProperty() semana: string;
  @ApiProperty() cursos_asignados: number;
}

class HistogramaCargaDto {
  @ApiProperty() label: string;
  @ApiProperty() count: number;
}

class TendenciaDto {
  @ApiPropertyOptional() asignaciones?: number;
  @ApiPropertyOptional() conflictos?: number;
  @ApiPropertyOptional() docentes?: number;
}

export class DashboardKpisDto {
  @ApiProperty() total_docentes: number;
  @ApiProperty() docentes_con_horario: number;
  @ApiProperty() docentes_pendientes: number;
  @ApiProperty() porcentaje_docentes_asignados: number;
  @ApiProperty() docentes_sin_disponibilidad: number;
  @ApiProperty() porcentaje_docentes_con_disponibilidad: number;
  @ApiProperty() total_aulas: number;
  @ApiProperty() aulas_ocupadas: number;
  @ApiProperty() porcentaje_ocupacion_aulas: number;
  @ApiProperty() total_laboratorios: number;
  @ApiProperty() laboratorios_ocupados: number;
  @ApiProperty() porcentaje_ocupacion_laboratorios: number;
  @ApiProperty() total_cursos: number;
  @ApiProperty() cursos_asignados: number;
  @ApiProperty() cursos_sin_asignar: number;
  @ApiProperty() conflictos_activos: number;
  @ApiProperty() conflictos_resueltos: number;
  @ApiProperty() tasa_resolucion_conflictos: number;
  @ApiProperty() total_conflictos: number;
  @ApiProperty() horas_promedio_por_docente: number;
  @ApiProperty() horas_mediana_por_docente: number;
  @ApiProperty({ type: [DistribucionCategoriaDto] })
  distribucion_por_categoria: DistribucionCategoriaDto[];
  @ApiProperty({ type: [DocenteCargaDto] })
  top_docentes_mayor_carga: DocenteCargaDto[];
  @ApiProperty({ type: [DocenteCargaDto] })
  top_docentes_menor_carga: DocenteCargaDto[];
  @ApiProperty({ type: [OcupacionAmbienteDto] })
  ocupacion_por_ambiente: OcupacionAmbienteDto[];
  @ApiProperty({ type: [MapaCalorDto] })
  mapa_calor: MapaCalorDto[];
  @ApiProperty({ type: [ActividadRecienteDto] })
  actividad_reciente: ActividadRecienteDto[];
  @ApiProperty({ type: [ProgresoSemanalDto] })
  progreso_semanal: ProgresoSemanalDto[];
  @ApiProperty() estado_periodo: string;
  @ApiPropertyOptional({ nullable: true })
  fecha_inicio_periodo: Date | null;
  @ApiPropertyOptional({ nullable: true }) fecha_fin_periodo: Date | null;
  @ApiPropertyOptional({ nullable: true })
  ultima_generacion_horario: Date | null;
  @ApiProperty({ type: [HistogramaCargaDto] })
  histograma_carga: HistogramaCargaDto[];
  @ApiPropertyOptional({ nullable: true })
  tiempo_promedio_resolucion_horas: number | null;
  @ApiProperty() tendencia: TendenciaDto;
}
