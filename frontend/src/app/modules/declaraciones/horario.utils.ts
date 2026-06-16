export const DIAS_SEMANA = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA'] as const;

export const DIA_NUMERO_A_CODIGO: Record<number, string> = {
  1: 'LU',
  2: 'MA',
  3: 'MI',
  4: 'JU',
  5: 'VI',
  6: 'SA',
};

export const DIA_CODIGO_A_ETIQUETA: Record<string, string> = {
  LU: 'Lunes',
  MA: 'Martes',
  MI: 'Miércoles',
  JU: 'Jueves',
  VI: 'Viernes',
  SA: 'Sábado',
};

export const DIA_CODIGO_A_CORTO: Record<string, string> = {
  LU: 'Lun',
  MA: 'Mar',
  MI: 'Mié',
  JU: 'Jue',
  VI: 'Vie',
  SA: 'Sáb',
};

export interface HorarioBloque {
  dia: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface HorarioLectivoRef extends HorarioBloque {
  codigoCurso: string;
  nombreCurso: string;
  tipoClase?: string;
  seccion?: string;
}

export function normalizarHora(hora: string | undefined | null): string {
  if (!hora) return '';
  return hora.substring(0, 5);
}

export function diaNumericoACodigo(dia: number | string): string {
  const normalize = (value: string): string =>
    value
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^A-Z0-9]/g, '');

  const mapExtendedDia: Record<string, string> = {
    LUN: 'LU',
    LUNES: 'LU',
    MAR: 'MA',
    MARTES: 'MA',
    MIE: 'MI',
    MI: 'MI',
    MIERCOLES: 'MI',
    JUE: 'JU',
    JUEVES: 'JU',
    VIE: 'VI',
    VIERNES: 'VI',
    SAB: 'SA',
    SABADO: 'SA',
  };

  if (typeof dia === 'string') {
    const upper = normalize(dia);
    if (DIAS_SEMANA.includes(upper as (typeof DIAS_SEMANA)[number])) return upper;
    if (mapExtendedDia[upper]) return mapExtendedDia[upper];
    const parsed = Number(upper);
    if (!Number.isNaN(parsed)) return DIA_NUMERO_A_CODIGO[parsed] ?? upper;
    return upper;
  }

  return DIA_NUMERO_A_CODIGO[dia] ?? String(dia);
}

export function seSuperponen(
  ini1: string,
  fin1: string,
  ini2: string,
  fin2: string,
): boolean {
  const a1 = normalizarHora(ini1);
  const b1 = normalizarHora(fin1);
  const a2 = normalizarHora(ini2);
  const b2 = normalizarHora(fin2);
  if (!a1 || !b1 || !a2 || !b2) return false;
  return a1 < b2 && a2 < b1;
}

export function esHorarioIdentico(a: HorarioBloque, b: HorarioBloque): boolean {
  return (
    a.dia === b.dia &&
    normalizarHora(a.hora_inicio) === normalizarHora(b.hora_inicio) &&
    normalizarHora(a.hora_fin) === normalizarHora(b.hora_fin)
  );
}

export function formatearBloqueHorario(h: HorarioBloque): string {
  const dia = DIA_CODIGO_A_CORTO[h.dia] || h.dia;
  return `${dia} ${normalizarHora(h.hora_inicio)}-${normalizarHora(h.hora_fin)}`;
}
