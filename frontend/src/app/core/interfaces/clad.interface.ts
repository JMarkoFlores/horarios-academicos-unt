export enum EstadoClad {
  BORRADOR = 'BORRADOR',
  ENVIADO_DPTO = 'ENVIADO_DPTO',
  OBSERVADO_DPTO = 'OBSERVADO_DPTO',
  VALIDADO_DPTO = 'VALIDADO_DPTO',
  OBSERVADO_DEPENDENCIA = 'OBSERVADO_DEPENDENCIA',
  VALIDADO_DEPENDENCIA = 'VALIDADO_DEPENDENCIA',
  APROBADO_FINAL = 'APROBADO_FINAL'
}

export enum TipoDependenciaClad {
  POSGRADO = 'POSGRADO',
  SEGUNDA_ESPECIALIDAD = 'SEGUNDA_ESPECIALIDAD',
  CEPUNT = 'CEPUNT',
  FILIAL = 'FILIAL',
  CENTRO_PRODUCCION = 'CENTRO_PRODUCCION',
  OTRO = 'OTRO'
}

export interface DetalleClad {
  id?: number;
  declaracion_clad_id?: number;
  nombre_curso: string;
  codigo_curso?: string;
  fecha_inicio: string | Date;
  fecha_fin: string | Date;
  horario: any;
  horas_semanales: number;
}

export interface DeclaracionClad {
  id: number;
  docente_id: number;
  periodo_academico_id: number;
  tipo_dependencia: TipoDependenciaClad;
  nombre_dependencia?: string;
  estado: EstadoClad;
  observaciones?: string;
  total_horas: number;
  detalles: DetalleClad[];
  docente?: any; // Para mostrar datos en UI
  periodo_academico?: any;
  fecha_envio?: string;
  fecha_validacion_dpto?: string;
  fecha_validacion_dependencia?: string;
  fecha_aprobacion_final?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ObservarCladDto {
  motivo_observacion: string;
}
