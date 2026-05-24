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
  tipo_docente: string;
  categoria: string;
  tipo_contrato: string;
  modalidad: string;
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
  tipo:
    | 'AULA'
    | 'LABORATORIO'
    | 'AUDITORIO'
    | 'TALLER'
    | 'SEMINARIO'
    | 'SALA_COMPUTACION';
  capacidad: number;
  piso?: number;
  pabellon?: string;
  sede?: string;
  equipamiento?: string;
  estado?: 'ACTIVO' | 'MANTENIMIENTO' | 'RESERVADO' | 'INACTIVO';
  activo: boolean;
}

export interface AmbienteMapa {
  id: number;
  nombre: string;
  coordX: number | null;
  coordY: number | null;
  edificio: string | null;
  capacidad: number;
  piso?: number | null;
  pabellon?: string | null;
  sede?: string | null;
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

export interface MisKPIs {
  docente: {
    nombre: string;
    categoria: string;
    tipo_contrato: string;
  };
  total_horas: number;
  total_cursos: number;
  total_ambientes: number;
  dias_con_clase: number;
  total_asignaciones: number;
  proximas_clases: {
    dia: number;
    diaNombre: string;
    hora_inicio: string;
    hora_fin: string;
    curso: string;
    ambiente: string;
    tipo: string;
    grupo: string;
  }[];
  distribucion_dia: {
    dia: string;
    horas: number;
  }[];
}

export interface KPIs {
  total_docentes: number;
  docentes_con_horario: number;
  docentes_pendientes: number;
  porcentaje_docentes_asignados: number;
  docentes_sin_disponibilidad: number;
  porcentaje_docentes_con_disponibilidad: number;
  total_aulas: number;
  aulas_ocupadas: number;
  porcentaje_ocupacion_aulas: number;
  total_laboratorios: number;
  laboratorios_ocupados: number;
  porcentaje_ocupacion_laboratorios: number;
  total_cursos: number;
  cursos_asignados: number;
  cursos_sin_asignar: number;
  conflictos_activos: number;
  conflictos_resueltos: number;
  total_conflictos: number;
  tasa_resolucion_conflictos: number;
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
  estado_periodo: string;
  fecha_inicio_periodo: string | null;
  fecha_fin_periodo: string | null;
  ultima_generacion_horario: string | null;
}
