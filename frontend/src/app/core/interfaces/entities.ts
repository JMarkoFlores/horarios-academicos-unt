export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
}

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: string;
  docenteId?: number;
}

export interface Docente {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  categoria: string;
  tipo_contrato: string;
  fecha_ingreso: string;
  activo: boolean;
  puntaje_jerarquia?: number;
  antiguedad?: {
    anios: number;
    meses: number;
  };
  disponibilidades?: any[];
}

export interface Curso {
  id: number;
  codigo: string;
  nombre: string;
  ciclo: number;
  creditos: number;
  horas_teoria: number;
  horas_laboratorio?: number;
  tiene_laboratorio: boolean;
  activo: boolean;
  ambientes_teoria?: Ambiente[];
  ambientes_laboratorio?: Ambiente[];
  ambientes?: Ambiente[];
}

export interface Grupo {
  id: number;
  codigo: string;
  nombre: string;
  ciclo: number;
  cupo_maximo: number;
}

export interface Ambiente {
  id: number;
  codigo: string;
  nombre: string;
  tipo: 'AULA' | 'LABORATORIO';
  capacidad: number;
  piso?: number;
  pabellon?: string;
  equipamiento?: string;
  activo: boolean;
}

export interface DisponibilidadDocente {
  id?: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  periodo_academico: string;
  disponible: boolean;
}

export interface HorarioAsignado {
  id: number;
  dia?: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  tipo_clase: string;
  periodo?: string;
  periodo_academico: string;
  estado: string;
  docente?: Docente;
  curso?: Curso;
  ambiente?: Ambiente;
}

export interface VentanaAtencion {
  id: string;
  periodo: string;
  fecha: string;
  categoria: string;
  modalidad: string | null;
  hora_inicio: string;
  hora_fin: string;
  intervalo_minutos: number;
  estado: string;
}

export interface ConflictoAsignacion {
  id: number;
  tipo_conflicto: string;
  descripcion: string;
  periodo_academico: string;
  resuelto: boolean;
  docente?: Docente;
  ambiente?: Ambiente;
}

export type EstadoPeriodo =
  | 'planificacion'
  | 'asignacionhorarios'
  | 'encurso'
  | 'finalizado';

export interface PeriodoAcademico {
  id: number;
  codigo: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoPeriodo;
  activo: boolean;
}

export interface KPIs {
  total_docentes: number;
  docentes_con_horario: number;
  docentes_pendientes: number;
  porcentaje_docentes_asignados: number;
  total_aulas: number;
  aulas_ocupadas: number;
  porcentaje_ocupacion_aulas: number;
  total_laboratorios: number;
  laboratorios_ocupados: number;
  porcentaje_ocupacion_laboratorios: number;
  total_cursos: number;
  cursos_asignados: number;
  conflictos_activos: number;
  horas_promedio_por_docente: number;
  horas_mediana_por_docente: number;
  distribucion_por_categoria: {
    categoria: string;
    modalidad: string;
    total: number;
    con_horario: number;
    porcentaje: number;
  }[];
  top_docentes_mayor_carga: {
    nombre: string;
    categoria: string;
    horas: number;
  }[];
  top_docentes_menor_carga: {
    nombre: string;
    categoria: string;
    horas: number;
  }[];
  ocupacion_por_ambiente: {
    codigo: string;
    tipo: string;
    capacidad: number;
    porcentaje_ocupacion: number;
  }[];
  mapa_calor: {
    dia: string;
    hora: string;
    intensidad: number;
    tipo_clase: string | null;
  }[];
  actividad_reciente: {
    timestamp: string | Date;
    descripcion: string;
    tipo: string;
  }[];
  progreso_semanal: { semana: string; cursos_asignados: number }[];
}
