export interface Docente {
  id: number;
  nombre: string;
  dni: string;
  ibm: string;
  facultad: string;
  departamento: string;
  condicion: string;
  categoria: string;
  dedicacion: string;
}

export interface Semestre {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
}

export enum EstadoDeclaracion {
  NO_INICIADO = 'NO_INICIADO',
  BORRADOR = 'BORRADOR',
  PENDIENTE_ENVIO = 'PENDIENTE_ENVIO',
  ENVIADO_DOCENTE = 'ENVIADO_DOCENTE',
  OBSERVADO_DPTO = 'OBSERVADO_DPTO',
  OBSERVADO_FACULTAD = 'OBSERVADO_FACULTAD',
  VALIDADO_DPTO = 'VALIDADO_DPTO',
  APROBADO_FACULTAD = 'APROBADO_FACULTAD',
  CERRADO = 'CERRADO',
}

export interface FormatoItem {
  id: number;
  numero: number;
  formato: string;
  sede: string;
  estado: EstadoDeclaracion;
  ultimaActualizacion: string;
}
