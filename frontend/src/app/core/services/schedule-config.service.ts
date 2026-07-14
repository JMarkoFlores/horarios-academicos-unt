import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, catchError, tap, shareReplay, filter } from 'rxjs/operators';
import { ApiService } from './api.service';
import { PeriodoService } from './periodo.service';
import { DiasActivosService, DiaActivo } from './dias-activos.service';

export interface ScheduleConfig {
  dias: DiaActivo[];
  diasNumeros: number[];
  diasNombres: string[];
  franja: { inicio: number; fin: number };
  almuerzo: { inicio: number; fin: number };
  duracionBloque: number;
  maxHorasDiarias: number;
  maxHorasSemanales: number;
  loaded: boolean;
}

const DEFAULTS: ScheduleConfig = {
  dias: [],
  diasNumeros: [1, 2, 3, 4, 5, 6],
  diasNombres: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  franja: { inicio: 7, fin: 22 },
  almuerzo: { inicio: 13, fin: 14 },
  duracionBloque: 60,
  maxHorasDiarias: 8,
  maxHorasSemanales: 40,
  loaded: false,
};

/** Parsea HH:mm a hora decimal (13:30 → 13.5) para comparaciones de franjas. */
function parseHoraDecimal(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  const parts = String(val).trim().split(':').map(Number);
  const h = parts[0];
  const m = parts[1] || 0;
  if (isNaN(h)) return undefined;
  return h + m / 60;
}

/** Hora entera inclusiva para inicio de bloque (13:30 → 13). */
function parseHoraInicio(val: unknown): number | undefined {
  const dec = parseHoraDecimal(val);
  return dec === undefined ? undefined : Math.floor(dec);
}

/** Hora entera exclusiva para fin de bloque (14:00 → 14, 13:30 → 14). */
function parseHoraFinExclusiva(val: unknown): number | undefined {
  const dec = parseHoraDecimal(val);
  return dec === undefined ? undefined : Math.ceil(dec);
}

function parseValorRestriccion(valor: unknown): Record<string, unknown> {
  if (!valor) return {};
  if (typeof valor === 'string') {
    try {
      const parsed = JSON.parse(valor);
      return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof valor === 'object' ? valor as Record<string, unknown> : {};
}

@Injectable({ providedIn: 'root' })
export class ScheduleConfigService {
  private _config$ = new BehaviorSubject<ScheduleConfig>({ ...DEFAULTS });
  private _loaded = false;

  readonly config$ = this._config$.asObservable();

  /** Observable that emits once config is loaded (cached with shareReplay) */
  readonly ready$: Observable<ScheduleConfig>;

  constructor(
    private api: ApiService,
    private periodoService: PeriodoService,
    private diasActivosService: DiasActivosService,
  ) {
    this.ready$ = this.config$.pipe(
      filter((c: ScheduleConfig) => c.loaded),
      shareReplay(1),
    );
  }

  get config(): ScheduleConfig {
    return this._config$.getValue();
  }

  /** Load configuration from backend. Safe to call multiple times. */
  cargar(): void {
    if (this._loaded) return;

    const periodo = this.periodoService.periodo;

    combineLatest([
      this.diasActivosService.cargar().pipe(catchError(() => of(null))),
      this.api.get<any>('/configuracion/restricciones', { periodo }).pipe(
        catchError(() => of({ data: [] })),
      ),
    ]).subscribe({
      next: ([diasRes, restriccionesRes]) => {
        void diasRes;
        const raw = restriccionesRes?.data ?? restriccionesRes ?? [];
        const restricciones: any[] = Array.isArray(raw) ? raw : [];
        const config = this.parseRestricciones(restricciones);
        this._config$.next(config);
        this._loaded = true;
      },
      error: () => {
        this._config$.next({ ...DEFAULTS, loaded: true });
        this._loaded = true;
      },
    });
  }

  /** Force reload (e.g., after period change) */
  recargar(): void {
    this._loaded = false;
    this.cargar();
  }

  private parseRestricciones(lista: any[]): ScheduleConfig {
    const dias = this.diasActivosService.dias;
    const diasNumeros = dias.map(d => d.dia_semana);
    const diasNombres = dias.map(d => d.nombre);

    const findRestriccion = (tipo: string) =>
      lista.find(x => x.tipo_restriccion === tipo && x.activo !== false)
      ?? lista.find(x => x.tipo_restriccion === tipo);

    const franjaRaw = findRestriccion('FRANJA_HORARIA');
    const almuerzoRaw = findRestriccion('BLOQUE_ALMUERZO');
    const duracionRaw = findRestriccion('DURACION_BLOQUE');
    const maxDiariasRaw = findRestriccion('MAX_HORAS_DIARIAS');
    const maxSemanalesRaw = findRestriccion('MAX_HORAS_SEMANALES');

    const franjaValor = parseValorRestriccion(franjaRaw?.valor);
    const almuerzoValor = parseValorRestriccion(almuerzoRaw?.valor);

    const franjaInicio = parseHoraInicio(franjaValor['hora_inicio']) ?? DEFAULTS.franja.inicio;
    const franjaFin = parseHoraFinExclusiva(franjaValor['hora_fin']) ?? DEFAULTS.franja.fin;
    const almuerzoInicio = parseHoraInicio(almuerzoValor['hora_inicio']) ?? DEFAULTS.almuerzo.inicio;
    const almuerzoFin = parseHoraFinExclusiva(almuerzoValor['hora_fin']) ?? DEFAULTS.almuerzo.fin;

    return {
      dias,
      diasNumeros,
      diasNombres,
      franja: { inicio: franjaInicio, fin: franjaFin },
      almuerzo: { inicio: almuerzoInicio, fin: almuerzoFin },
      duracionBloque: (parseValorRestriccion(duracionRaw?.valor)['duracion_minutos'] as number) ?? DEFAULTS.duracionBloque,
      maxHorasDiarias: (parseValorRestriccion(maxDiariasRaw?.valor)['max_horas'] as number) ?? DEFAULTS.maxHorasDiarias,
      maxHorasSemanales: (parseValorRestriccion(maxSemanalesRaw?.valor)['max_horas'] as number) ?? DEFAULTS.maxHorasSemanales,
      loaded: true,
    };
  }

  /** Generate hours array from config */
  getHoras(): number[] {
    const c = this.config;
    const horas: number[] = [];
    for (let h = c.franja.inicio; h < c.franja.fin; h++) horas.push(h);
    return horas;
  }

  /** Check if a given hour is within lunch break */
  esAlmuerzo(hora: number): boolean {
    const c = this.config;
    return hora >= c.almuerzo.inicio && hora < c.almuerzo.fin;
  }

  /** Check if a given hour is within the allowed time range */
  esFranjaPermitida(hora: number): boolean {
    const c = this.config;
    return hora >= c.franja.inicio && hora < c.franja.fin;
  }

  /** Convert dia_semana number to code (LU, MA, etc.) */
  diaNumToCod(diaNum: number): string {
    const map: Record<number, string> = { 1: 'LU', 2: 'MA', 3: 'MI', 4: 'JU', 5: 'VI', 6: 'SA', 7: 'DO' };
    return map[diaNum] || 'LU';
  }
}
