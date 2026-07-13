export type BlockType = 'lectiva' | 'no-lectiva' | 'ventana';

export type CellState = 'vacia' | 'lectiva' | 'no-lectiva' | 'ventana' | 'almuerzo' | 'otra';

export interface ScheduleBlock {
  id: string;
  tipo: BlockType;
  dia: number;
  hora_inicio: string;
  hora_fin: string;
  duracion: number;
  label: string;
  sublabel?: string;
  badge?: string;
  colorKey?: string;
  actividadId?: number;
  actividadNombre?: string;
  curso_id?: number;
  grupo_id?: number;
  ambiente_id?: number;
  curso_plan_id?: number;
  tipo_clase?: string;
  seccion?: string;
  nro_alumnos?: number;
  readOnly?: boolean;
  tooltip?: string;
}

export interface PaletteBlock {
  id: string;
  duracion: number;
  label: string;
  tipo: BlockType;
  colorKey?: string;
}

export interface ConflictInfo {
  dia: number;
  hora: string;
  mensaje: string;
  tipo: 'superposicion' | 'limite' | 'institucional';
}
