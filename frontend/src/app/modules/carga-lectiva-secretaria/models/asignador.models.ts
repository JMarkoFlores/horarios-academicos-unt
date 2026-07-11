export interface CursoPendiente {
  cursoPlanId: number;
  cursoId: number;
  codigo: string;
  nombre: string;
  ciclo: number;
  tipoCurso: string;
  horasTeoria: number;
  horasPractica: number;
  horasLaboratorio: number;
  horasAsignadasTeoria: number;
  horasAsignadasPractica: number;
  horasAsignadasLaboratorio: number;
  tiposRequeridos: string[];
  grupos: GrupoInfo[];
  totalAlumnos: number;
}

export interface GrupoInfo {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  cupoMaximo: number;
}

export interface DocenteAsignador {
  id: number;
  nombre: string;
  apellido: string;
  codigo: string;
  categoria: string;
  modalidad: string;
  tipoDocente: string;
  horasLectivasAsignadas: number;
  horasLectivasMax: number;
  horasNoLectivas: number;
  horasRestantes: number;
  departamentoId: number;
  departamentoNombre: string;
  enSuspension: boolean;
  bloquesExistentes: BloqueHorario[];
}

export interface BloqueHorario {
  id: string;
  dia: number;
  horaInicio: string;
  horaFin: string;
  tipo: 'lectiva' | 'no-lectiva';
  tipoClase?: string;
  label: string;
  sublabel?: string;
  badge?: string;
  cursoId?: number;
  ambienteId?: number;
  ambienteCodigo?: string;
  grupoId?: number;
  grupoCodigo?: string;
  colorKey?: string;
  readOnly?: boolean;
}

export interface AmbienteDisponible {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  piso?: number;
  pabellon?: string;
  estado: string;
  activo: boolean;
  bloquesOcupados: BloqueHorario[];
  totalBloquesOcupados: number;
}

export interface ValidacionDrop {
  valido: boolean;
  errores: string[];
  advertencias: string[];
}

export interface HistorialAccion {
  tipo: 'asignar' | 'mover' | 'eliminar';
  timestamp: number;
  horarioId?: number;
  datosAnteriores: any;
  datosNuevos: any;
}

export interface ProgresoAsignacion {
  totalDocentes: number;
  docentesCompletos: number;
  docentesIncompletos: number;
  totalCursosPendientes: number;
  totalHorasPendientes: number;
  totalHorasRequeridas: number;
  totalHorasAsignadas: number;
  porcentajeAvance: number;
}

export interface MiniFormularioData {
  curso: CursoPendiente;
  dia: number;
  horaInicio: string;
  horaFin: string;
  docente: DocenteAsignador;
  tipoClase: string;
  grupos: GrupoInfo[];
  ambientes: AmbienteDisponible[];
}

export const COLORES_TIPO_CLASE: Record<string, { bg: string; border: string; text: string; light: string }> = {
  TEORIA:     { bg: '#e8eaf6', border: '#5c6bc0', text: '#283593', light: '#c5cae9' },
  PRACTICA:   { bg: '#dcfce7', border: '#22c55e', text: '#166534', light: '#bbf7d0' },
  LABORATORIO:{ bg: '#fef3c7', border: '#f59e0b', text: '#92400e', light: '#fde68a' },
  NO_LECTIVA: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8', light: '#e9d5ff' },
};
