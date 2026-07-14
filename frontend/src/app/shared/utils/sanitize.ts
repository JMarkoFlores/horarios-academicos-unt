import { BloqueHorario } from "@app/modules/carga-lectiva-secretaria/models/asignador.models";

export const SAFE_STRING_KEYS = [
  'label', 'nombre', 'apellido', 'codigo', 'descripcion', 'value',
  'tooltip', 'sublabel', 'nombre', 'title', 'name', 'text', 'message',
  'horaInicio', 'horaFin', 'hora_inicio', 'hora_fin',
] as const;

export const SAFE_NUMBER_KEYS = [
  'value', 'id', 'cantidad', 'total', 'numero', 'numeroId',
  'horasLectivasAsignadas', 'horasLectivasMax', 'horasNoLectivas',
  'horasRestantes', 'horasTeoria', 'horasPractica', 'horasLaboratorio',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function toSafeString(
  value: unknown,
  fallback = '',
  seen = new WeakSet<object>()
): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => toSafeString(item, fallback, seen))
      .filter(Boolean)
      .join(' ');
  }
  if (isPlainObject(value)) {
    if (seen.has(value)) return fallback;
    seen.add(value);
    try {
      for (const key of SAFE_STRING_KEYS) {
        if (key in value) {
          const nested = toSafeString(value[key], fallback, seen);
          if (nested) {
            seen.delete(value);
            return nested;
          }
        }
      }
      try {
        const json = JSON.stringify(value);
        seen.delete(value);
        return typeof json === 'string' ? json : fallback;
      } catch {
        seen.delete(value);
        return fallback;
      }
    } finally {
      if (seen.has(value)) seen.delete(value);
    }
  }
  try {
    return String(value);
  } catch {
    return fallback;
  }
}

export function toSafeNumber(
  value: unknown,
  fallback = 0,
  seen = new WeakSet<object>()
): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (isPlainObject(value)) {
    if (seen.has(value)) return fallback;
    seen.add(value);
    try {
      for (const key of SAFE_NUMBER_KEYS) {
        if (key in value) {
          const nested = toSafeNumber(value[key], fallback, seen);
          if (Number.isFinite(nested)) {
            seen.delete(value);
            return nested;
          }
        }
      }
      return fallback;
    } finally {
      if (seen.has(value)) seen.delete(value);
    }
  }
  return fallback;
}

export function sanitizeBloqueHorario(raw: any): BloqueHorario {
  const seen = new WeakSet<object>();
  const id = toSafeString(raw?.id ?? raw?.cursoId ?? raw?.ambienteId ?? raw?.grupoId, `bloque_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, seen);
  const dia = toSafeNumber(raw?.dia, 1, seen);
  const horaInicio = toSafeString(raw?.horaInicio ?? raw?.hora_inicio, '08:00', seen);
  const horaFin = toSafeString(raw?.horaFin ?? raw?.hora_fin, '09:00', seen);
  const tipo = toSafeString(raw?.tipo, 'lectiva', seen) as 'lectiva' | 'no-lectiva';
  const tipoClase = raw?.tipoClase != null ? toSafeString(raw.tipoClase, '', seen) : undefined;
  const label = toSafeString(raw?.label, '', seen);
  const sublabel = raw?.sublabel != null ? toSafeString(raw.sublabel, '', seen) : undefined;
  const badge = raw?.badge != null ? toSafeString(raw.badge, '', seen) : undefined;
  const cursoId = raw?.cursoId != null ? toSafeNumber(raw.cursoId, 0, seen) : undefined;
  const ambienteId = raw?.ambienteId != null ? toSafeNumber(raw.ambienteId, 0, seen) : undefined;
  const ambienteCodigo = raw?.ambienteCodigo != null ? toSafeString(raw.ambienteCodigo, '', seen) : undefined;
  const grupoId = raw?.grupoId != null ? toSafeNumber(raw.grupoId, 0, seen) : undefined;
  const grupoCodigo = raw?.grupoCodigo != null ? toSafeString(raw.grupoCodigo, '', seen) : undefined;
  const colorKey = raw?.colorKey != null ? toSafeString(raw.colorKey, '', seen) : undefined;
  const readOnly = !!raw?.readOnly;
  const cursoNombre = raw?.cursoNombre != null ? toSafeString(raw.cursoNombre, '', seen) : undefined;
  const docenteId = raw?.docenteId != null ? toSafeNumber(raw.docenteId, 0, seen) : undefined;
  const docenteNombre = raw?.docenteNombre != null ? toSafeString(raw.docenteNombre, '', seen) : undefined;

  return {
    id,
    dia,
    horaInicio,
    horaFin,
    tipo,
    tipoClase,
    label,
    sublabel,
    badge,
    cursoId,
    ambienteId,
    ambienteCodigo,
    grupoId,
    grupoCodigo,
    colorKey,
    readOnly,
  };
}