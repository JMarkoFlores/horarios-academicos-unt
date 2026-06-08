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
  ibm?: number;
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
  facultad_id?: number;
  departamento_id?: number;
  departamento?: Departamento;
  antiguedad?: {
    anios: number;
    meses: number;
  };
  disponibilidades?: any[];
  facultad?: { id: number; nombre: string } | null;
}

export interface Departamento {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
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
  grupo?: Grupo;
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
  campaña_id?: string;
  campaña?: CampañaVentanas;
  total_docentes?: number;
}

export interface CampañaVentanas {
  id: string;
  nombre: string;
  descripcion: string;
  periodo_id: number;
  periodo?: PeriodoAcademico;
  estado: string; // EstadoCampaña enum
  fecha_inicio: string;
  fecha_fin: string;
  dias_habilitados: string[];
  bloques_horarios: Array<{
    nombre: string;
    hora_inicio: string;
    hora_fin: string;
  }>;
  duracion_turno_minutos: number;
  buffer_minutos: number;
  cupos_maximos_ventana: number;
  porcentaje_reserva: number;
  reglas_prioridad: Array<{
    campo: string;
    orden: 'ASC' | 'DESC';
  }>;
  excluir_feriados: boolean;
  excluir_eventos: boolean;
  distribucion_equitativa: boolean;
  total_ventanas_generadas: number;
  total_docentes_asignados: number;
  total_docentes_atendidos: number;
  total_ausencias: number;
  tiempo_promedio_atencion: number;
  creado_por_id?: number;
  actualizado_por_id?: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_publicacion?: string;
  fecha_cierre?: string;
  ventanas?: VentanaAtencion[];
}

export interface CeldaSeleccionada {
  dia: number;
  horaInicio: string;
  horaFin: string;
  docenteId?: number;
  cursoId?: number;
  grupoId?: number;
  ambienteId?: number;
  tipoClase?: string;
  periodo?: string;
}

export interface ValidationFeedback {
  valido: boolean;
  reglasFallidas: { codigo: string; motivo: string }[];
  advertencias: { codigo: string; mensaje: string }[];
  sugerencias: { codigo: string; sugerencia: string }[];
  alternativas?: Array<{
    tipo: 'ambiente' | 'bloque';
    id: number;
    descripcion: string;
    preferencia: string;
  }>;
}

export interface LockStatus {
  ambienteId: number;
  dia: number;
  horaInicio: string;
  periodo: string;
  sesionId?: string;
  operadorNombre?: string;
}

export interface CeldaMatriz {
  dia: number;
  horaInicio: string;
  horaFin: string;
  estado:
    | 'LIBRE'
    | 'OCUPADO'
    | 'TEMPORAL_PROPIO'
    | 'TEMPORAL_OTRO'
    | 'BLOQUEADO';
  lockStatus?: 'LOCKED' | 'AVAILABLE' | 'LOCKED_BY_OTHER';
  validationResult?: ValidationFeedback;
  metadata?: {
    docenteNombre?: string;
    cursoNombre?: string;
    grupo?: string;
    ambienteCodigo?: string;
  };
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

export interface DocumentacionResumen {
  id: number;
  docente_id: number;
  docente_nombre: string;
  docente_ibm: number | null;
  estado: string;
  periodo: string;
  fecha_envio: string | null;
}

export interface CargaLectivaRegistro {
  horarioAsignadoId: number;
  cursoId: number;
  codigoCurso: string;
  nombreCurso: string;
  grupoId: number;
  seccion: string;
  ciclo: number;
  tipoClase: string;
  horasTeoria: number;
  horasPractica: number;
  horasLaboratorio: number;
  horasBloque: number;
  ambiente: string;
  dia: number;
  horaInicio: string;
  horaFin: string;
}

export interface CargaLectivaResumen {
  totalHoras: number;
  totalCursos: number;
  totalSecciones: number;
  totalBloques: number;
}

export interface CargaLectivaGenerada {
  docenteId: number;
  periodoId: number;
  periodoCodigo: string;
  registros: CargaLectivaRegistro[];
  resumen: CargaLectivaResumen;
  generadoEn: string;
}

export interface DeclaracionVista {
  declaracion: {
    id: number;
    docente_id: number;
    estado: string;
    observaciones?: string | null;
    carga_no_lectiva?: {
      actividades?: Array<{
        id: number;
        codigo: string;
        descripcion: string;
        detalle?: string;
        horas: number;
      }>;
      total_horas?: number;
    } | null;
    fecha_firma_docente?: string | null;
    fecha_firma_director?: string | null;
    fecha_firma_decano?: string | null;
  } | null;
  estado: string;
  docente: Docente;
  departamento?: Departamento | null;
  facultad?: { id: number; nombre: string } | null;
  periodo: PeriodoAcademico;
  cargaLectiva: CargaLectivaGenerada;
  snapshotGuardado?: CargaLectivaGenerada | null;
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
