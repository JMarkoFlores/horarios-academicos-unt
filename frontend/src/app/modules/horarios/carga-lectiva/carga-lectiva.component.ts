import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize, debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { NotifToastService } from '../../../core/services/notif-toast.service';
import { DiasActivosService, DiaActivo } from '../../../core/services/dias-activos.service';
import { ContextoAcademicoHelper } from '../../../core/services/contexto-academico.helper';
import { ApiResponse } from '../../../core/interfaces/entities';

/* ------------------------------------------------------------------ */
/*  Interfaces                                                        */
/* ------------------------------------------------------------------ */

export interface AsignacionPendiente {
  id: number;
  docente: { id: number; nombres: string; apellidos: string; codigo: string };
  curso_plan: {
    id: number;
    curso: { id: number; codigo: string; nombre: string; ciclo: number };
    horas_teoria: number;
    horas_practica: number;
    horas_laboratorio: number;
  };
  tipo_clase: 'TEORIA' | 'PRACTICA' | 'LABORATORIO';
  seccion: string;
  grupo: { id: number; codigo: string } | null;
  estado: string;
  horas_asignadas: number;
  nro_alumnos?: number;
  horariosCount?: number;
}

export interface HorarioCargaLectiva {
  id: number;
  dia: number;
  hora_inicio: string;
  hora_fin: string;
  ambiente: { id: number; codigo: string; nombre: string };
  estado: string;
}

export interface DocenteGroup {
  docente: { id: number; nombres: string; apellidos: string; codigo: string };
  asignaciones: AsignacionPendiente[];
}

export interface ProgresoDocente {
  docente: any;
  total: number;
  programadas: number;
  pendientes: number;
}

export interface HorarioBloque {
  id: number;
  dia: number;
  hora_inicio: string;
  hora_fin: string;
  cursoCodigo: string;
  cursoNombre: string;
  docenteNombre: string;
  ambienteCodigo: string;
  tipoClase: string;
  nroAlumnos: number;
  asignacionId?: number;
}

export interface AmbienteDisponible {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  edificio?: string;
}

export interface ConflictoInfo {
  docenteNombre: string;
  mensaje: string;
  horario: string;
}

export interface DocenteOption {
  id: number;
  nombreCompleto: string;
  codigo: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

@Component({
  selector: 'app-carga-lectiva',
  templateUrl: './carga-lectiva.component.html',
  styleUrls: ['./carga-lectiva.component.scss'],
})
export class CargaLectivaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  /* ---- Estado ---- */
  loading = true;
  loadingHorarios = false;
  saving = false;

  /* ---- Datos ---- */
  asignacionesPorDocente: Record<number, DocenteGroup> = {};
  progreso: Record<number, ProgresoDocente> = {};
  horariosDelPeriodo: HorarioBloque[] = [];
  ambientesDisponibles: AmbienteDisponible[] = [];

  /* ---- Filtros (propiedades normales para ngModel) ---- */
  filtroCiclo: number | null = null;
  filtroTipo: string | null = null;
  filtroDocenteCtrl = new FormControl('');
  mostrarSoloSinHorario = false;

  /* ---- Docentes para autocomplete ---- */
  todosLosDocentes: DocenteOption[] = [];
  docentesFiltradosAutoComplete: DocenteOption[] = [];

  /* ---- Selección ---- */
  asignacionSeleccionada: AsignacionPendiente | null = null;
  horariosAsignados: HorarioCargaLectiva[] = [];
  bloqueSeleccionado: HorarioBloque | null = null;

  /* ---- Editor inline ---- */
  editingSchedule = false;
  draftHorarios: { dia: number; hora_inicio: string; hora_fin: string }[] = [];
  bloquesEliminados: { id: number }[] = [];
  horariosOriginales: HorarioBloque[] = [];
  ambienteSeleccionadoId: number | null = null;
  ambienteSeleccionadoCapacidad: number = 0;
  savingSchedule = false;
  erroresValidacion: string[] = [];

  /* ---- Drag selection (empty cells) ---- */
  dragStart: { dia: number; hora: number } | null = null;
  dragEnd: { dia: number; hora: number } | null = null;
  isDragging = false;

  /* ---- Drag-to-move (blocks) ---- */
  draggingBlock: HorarioBloque | null = null;
  dragBlockOffset = 0;
  dragBlockPreviewHour = 0;
  dragBlockDia = 0;
  dragBlockOriginalTop = 0;
  calendarGridTop = 0;

  /* ---- Calendario ---- */
  diasSemana: DiaActivo[] = [];
  horasCalendario: number[] = [];
  horaInicio = 7;
  horaFin = 22;
  almuerzoInicio = 12;
  almuerzoFin = 14;

  /* ---- KPIs ---- */
  totalPendientes = 0;
  totalProgramadas = 0;
  totalBloqueadas = 0;
  totalConflictos = 0;

  /* ---- Alcance ---- */
  alcanceLabel: string | null = null;

  /* ---- Periodos ---- */
  periodosDisponibles: { id: number; codigo: string; activo: boolean }[] = [];
  periodoSeleccionadoId: number | null = null;

  /* ---- Colores por tipo de clase ---- */
  readonly tipoColores: Record<string, { bg: string; border: string; text: string; label: string }> = {
    TEORIA:      { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', label: 'Teoría' },
    PRACTICA:    { bg: '#dcfce7', border: '#22c55e', text: '#166534', label: 'Práctica' },
    LABORATORIO: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', label: 'Laboratorio' },
  };

  /* ---- Ciclos ---- */
  ciclos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private notif: NotifToastService,
    private cdr: ChangeDetectorRef,
    private diasActivos: DiasActivosService,
    private contextoHelper: ContextoAcademicoHelper,
  ) {}

  /* ================================================================ */
  /*  Lifecycle                                                       */
  /* ================================================================ */

  ngOnInit(): void {
    this.alcanceLabel = this.contextoHelper.getEtiquetaAlcance();
    this.generarHorasCalendario();
    this.cargarDias();
    this.cargarDocentes();
    this.cargarPeriodos();

    // Suscripción al autocomplete de docente
    this.filtroDocenteCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(200),
      distinctUntilChanged(),
      map(valor => this.filtrarDocentes(valor ?? '')),
    ).subscribe(lista => {
      this.docentesFiltradosAutoComplete = lista;
    });

    // Esperar a que el periodo activo esté disponible
    this.periodoService.periodoActivo$
      .pipe(takeUntil(this.destroy$))
      .subscribe((periodo) => {
        if (periodo && !this.editingSchedule) {
          this.cargarDatos();
        }
      });

    // Recargar cuando el usuario cambia de período
    this.periodoService.periodo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.periodoService.periodoActivo) {
          this.cargarDatos();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ================================================================ */
  /*  Carga de datos                                                  */
  /* ================================================================ */

  cargarDatos(): void {
    const periodo = this.periodoService.periodoActivo;
    if (!periodo) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    forkJoin({
      pendientes: this.api.get<any>('/horarios/carga-lectiva/pendientes', { periodo_id: periodo.id }).pipe(
        catchError((err) => {
          console.error('Error cargando pendientes:', err);
          return of({ data: {} });
        }),
      ),
      progreso: this.api.get<any>('/horarios/carga-lectiva/progreso', { periodo_id: periodo.id }).pipe(
        catchError((err) => {
          console.error('Error cargando progreso:', err);
          return of({ data: {} });
        }),
      ),
      horarios: this.api.get<any>(`/horarios/periodo/${periodo.codigo}`, { limit: 500 }).pipe(
        catchError((err) => {
          console.error('Error cargando horarios:', err);
          return of({ data: { items: [] } });
        }),
      ),
      ambientes: this.api.get<any>('/ambientes', { limit: 200 }).pipe(
        catchError((err) => {
          console.warn('Ambientes no disponibles (posible 403):', err.status);
          return of({ data: { items: [] } });
        }),
      ),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ pendientes, progreso, horarios, ambientes }) => {
          this.asignacionesPorDocente = pendientes?.data ?? {};
          this.progreso = progreso?.data ?? {};
          this.mapearHorarios(horarios?.data?.items ?? horarios?.data ?? []);
          this.ambientesDisponibles = ambientes?.data?.items ?? ambientes?.data ?? [];
          this.calcularKPIs();
          this.extraerDocentes();
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error en forkJoin:', err);
          this.notif.error('Error al cargar datos del calendario');
        },
      });
  }

  /* ================================================================ */
  /*  Calendario                                                      */
  /* ================================================================ */

  private generarHorasCalendario(): void {
    this.horasCalendario = [];
    for (let h = this.horaInicio; h < this.horaFin; h++) {
      this.horasCalendario.push(h);
    }
  }

  private cargarDias(): void {
    this.diasActivos.cargar().subscribe(() => {
      this.diasSemana = this.diasActivos.dias;
      this.cdr.markForCheck();
    });
    if (this.diasActivos.dias.length > 0) {
      this.diasSemana = this.diasActivos.dias;
    }
  }

  private mapearHorarios(items: any[]): void {
    this.horariosDelPeriodo = items.map((h: any) => ({
      id: h.id,
      dia: h.dia ?? h.dia_semana,
      hora_inicio: h.hora_inicio?.substring(0, 5) ?? '',
      hora_fin: h.hora_fin?.substring(0, 5) ?? '',
      cursoCodigo: h.curso?.codigo ?? '',
      cursoNombre: h.curso?.nombre ?? '',
      docenteNombre: h.docente ? `${h.docente.apellidos ?? ''} ${h.docente.nombres ?? ''}`.trim() : '',
      ambienteCodigo: h.ambiente?.codigo ?? '',
      tipoClase: h.tipo_clase ?? 'TEORIA',
      nroAlumnos: h.asignacion_lectiva?.nro_alumnos ?? h.nro_alumnos ?? 0,
      asignacionId: h.asignacion_lectiva?.id ?? h.asignacion_lectiva_id,
    }));
  }

  /* ================================================================ */
  /*  KPIs                                                            */
  /* ================================================================ */

  calcularKPIs(): void {
    let pendientes = 0;
    let programadas = 0;
    let bloqueadas = 0;
    const grupos = Object.values(this.asignacionesPorDocente);
    for (const g of grupos) {
      for (const a of g.asignaciones) {
        if (a.estado === 'CONFIRMADO') {
          if (this.tieneHorario(a)) {
            programadas++;
          } else {
            pendientes++;
          }
        } else {
          // PENDIENTE (esperando confirmación) o RECHAZADO (bloqueado)
          bloqueadas++;
        }
      }
    }
    this.totalPendientes = pendientes;
    this.totalProgramadas = programadas;
    this.totalBloqueadas = bloqueadas;
    this.totalConflictos = this.detectarConflictos().length;
  }

  /* ================================================================ */
  /*  Docentes (autocomplete)                                         */
  /* ================================================================ */

  cargarDocentes(): void {
    this.api.get<any>('/docentes', { limit: 500 }).pipe(
      catchError(() => of({ data: { items: [] } })),
    ).subscribe({
      next: (r) => {
        const items = r.data?.items ?? r.data ?? [];
        this.todosLosDocentes = items.map((d: any) => ({
          id: d.id,
          nombreCompleto: `${d.apellidos ?? ''}, ${d.nombres ?? ''}`.trim(),
          codigo: d.codigo ?? '',
        }));
        this.docentesFiltradosAutoComplete = [...this.todosLosDocentes];
        this.cdr.markForCheck();
      },
    });
  }

  cargarPeriodos(): void {
    this.api.get<any>('/periodos/todos').pipe(
      catchError(() => of({ data: [] })),
    ).subscribe({
      next: (r) => {
        this.periodosDisponibles = (r.data ?? []).map((p: any) => ({
          id: p.id,
          codigo: p.codigo,
          activo: p.activo,
        }));
        const activo = this.periodoService.periodoActivo;
        if (activo) {
          this.periodoSeleccionadoId = activo.id;
        }
        this.cdr.markForCheck();
      },
    });
  }

  cambiarPeriodo(periodoId: number): void {
    const periodo = this.periodosDisponibles.find(p => p.id === periodoId);
    if (periodo) {
      this.periodoService.cambiarPeriodo(periodo.codigo);
      this.periodoSeleccionadoId = periodoId;
    }
  }

  private extraerDocentes(): void {
    const existentes = new Map<number, DocenteOption>();
    const grupos = Object.values(this.asignacionesPorDocente);
    for (const g of grupos) {
      if (!existentes.has(g.docente.id)) {
        existentes.set(g.docente.id, {
          id: g.docente.id,
          nombreCompleto: `${g.docente.apellidos ?? ''}, ${g.docente.nombres ?? ''}`.trim(),
          codigo: g.docente.codigo ?? '',
        });
      }
    }
    // Combinar con la lista completa de docentes
    for (const d of this.todosLosDocentes) {
      if (!existentes.has(d.id)) {
        existentes.set(d.id, d);
      }
    }
    this.todosLosDocentes = Array.from(existentes.values())
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
    this.docentesFiltradosAutoComplete = [...this.todosLosDocentes];
  }

  private filtrarDocentes(valor: string): DocenteOption[] {
    const texto = valor.toLowerCase().trim();
    if (!texto) return [...this.todosLosDocentes];
    return this.todosLosDocentes.filter(d =>
      d.nombreCompleto.toLowerCase().includes(texto) ||
      d.codigo.toLowerCase().includes(texto)
    );
  }

  onDocenteSelected(docente: any): void {
    const nombre = typeof docente === 'string' ? docente : docente?.nombreCompleto ?? docente;
    this.filtroDocenteCtrl.setValue(nombre, { emitEvent: false });
    this.cdr.markForCheck();
  }

  getFiltroDocenteTexto(): string {
    return this.filtroDocenteCtrl.value ?? '';
  }

  displayFn = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.nombreCompleto ?? `${value.apellidos ?? ''}, ${value.nombres ?? ''}`.trim();
  };

  /* ================================================================ */
  /*  Grid helpers                                                    */
  /* ================================================================ */

  getBloquesCelda(dia: number, hora: number): HorarioBloque[] {
    // Start with backend horarios
    let bloques = this.horariosDelPeriodo.filter((h) => {
      if (h.dia !== dia) return false;
      const ini = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin = parseInt(h.hora_fin.split(':')[0], 10);
      return hora >= ini && hora < fin;
    });

    // When editing, add draft blocks (excluding those already in backend)
    if (this.editingSchedule && this.asignacionSeleccionada) {
      const asignacionId = this.asignacionSeleccionada.id;
      const draftEnCelda = this.draftHorarios.filter(h => {
        if (h.dia !== dia) return false;
        const ini = parseInt(h.hora_inicio.split(':')[0], 10);
        const fin = parseInt(h.hora_fin.split(':')[0], 10);
        return hora >= ini && hora < fin;
      });

      for (const draft of draftEnCelda) {
        // Check if this draft already has a backend block
        const existeEnBackend = this.horariosAsignados.some(h =>
          h.dia === draft.dia && h.hora_inicio === draft.hora_inicio && h.hora_fin === draft.hora_fin
        );
        if (existeEnBackend) continue;

        // Check if we already added this draft block visually
        const yaExiste = bloques.some(b =>
          b.asignacionId === asignacionId &&
          b.hora_inicio === draft.hora_inicio &&
          b.hora_fin === draft.hora_fin
        );
        if (yaExiste) continue;

        // Create a visual block from draft
        const asignacion = this.asignacionSeleccionada;
        bloques.push({
          id: -1, // Draft blocks get -1 as ID
          dia: draft.dia,
          hora_inicio: draft.hora_inicio,
          hora_fin: draft.hora_fin,
          cursoCodigo: asignacion.curso_plan.curso.codigo,
          cursoNombre: asignacion.curso_plan.curso.nombre,
          docenteNombre: `${asignacion.docente.apellidos ?? ''}, ${asignacion.docente.nombres ?? ''}`.trim(),
          ambienteCodigo: '—',
          tipoClase: asignacion.tipo_clase,
          nroAlumnos: asignacion.nro_alumnos || 0,
          asignacionId: asignacion.id,
        });
      }
    }

    return bloques;
  }

  getRowSpan(bloque: HorarioBloque): number {
    const ini = parseInt(bloque.hora_inicio.split(':')[0], 10);
    const fin = parseInt(bloque.hora_fin.split(':')[0], 10);
    return Math.max(1, fin - ini);
  }

  getBloquesUnicosDia(dia: number): HorarioBloque[] {
    const seen = new Set<string>();
    const result: HorarioBloque[] = [];
    for (const h of this.horariosDelPeriodo) {
      if (h.dia !== dia) continue;
      const key = `${h.hora_inicio}-${h.hora_fin}-${h.asignacionId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(h);
    }

    // Add draft blocks for this day (skip if backend block with same times exists)
    if (this.editingSchedule && this.asignacionSeleccionada) {
      const asignacion = this.asignacionSeleccionada;
      for (const draft of this.draftHorarios) {
        if (draft.dia !== dia) continue;
        // Skip if a backend block already covers this exact time range for same assignment
        const backendCovers = this.horariosDelPeriodo.some(h =>
          h.dia === dia && h.hora_inicio === draft.hora_inicio && h.hora_fin === draft.hora_fin && h.asignacionId === asignacion.id
        );
        if (backendCovers) continue;
        const key = `${draft.hora_inicio}-${draft.hora_fin}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          id: -1,
          dia: draft.dia,
          hora_inicio: draft.hora_inicio,
          hora_fin: draft.hora_fin,
          cursoCodigo: asignacion.curso_plan.curso.codigo,
          cursoNombre: asignacion.curso_plan.curso.nombre,
          docenteNombre: `${asignacion.docente.apellidos ?? ''}, ${asignacion.docente.nombres ?? ''}`.trim(),
          ambienteCodigo: '—',
          tipoClase: asignacion.tipo_clase,
          nroAlumnos: asignacion.nro_alumnos || 0,
          asignacionId: asignacion.id,
        });
      }
    }

    return result;
  }

  getDiaColumn(dia: number): string {
    // Column 1 is hora-cell, columns 2-6 are Mon-Fri
    const col = dia + 1; // dia 1 = Mon = column 2
    return `${col} / ${col + 1}`;
  }

  getBloqueLeft(dia: number): string {
    // Each day column takes equal width after the hora-cell (64px)
    const dayIndex = dia - 1; // 0-based
    return `calc(${dayIndex} * (100% / ${this.diasSemana.length}))`;
  }

  getBloqueWidth(): string {
    return `calc(100% / ${this.diasSemana.length} - 8px)`;
  }

  getBloqueTop(bloque: HorarioBloque): string {
    const ini = parseInt(bloque.hora_inicio.split(':')[0], 10);
    const hourHeight = 64; // min-height of .calendar-row
    const hourIndex = ini - this.horaInicio;
    // Add 1 hour for almuerzo row if before lunch
    const lunchOffset = ini >= this.almuerzoFin ? hourHeight : 0;
    return `${hourIndex * hourHeight + lunchOffset}px`;
  }

  getBloqueHeight(bloque: HorarioBloque): string {
    const ini = parseInt(bloque.hora_inicio.split(':')[0], 10);
    const fin = parseInt(bloque.hora_fin.split(':')[0], 10);
    const hourHeight = 64;
    const duration = fin - ini;
    return `${duration * hourHeight - 4}px`;
  }

  getBloqueDuracion(bloque: HorarioBloque): number {
    const ini = parseInt(bloque.hora_inicio.split(':')[0], 10);
    const fin = parseInt(bloque.hora_fin.split(':')[0], 10);
    return fin - ini;
  }

  getDragPreviewTop(): number {
    const hourHeight = 64;
    const hourIndex = this.dragBlockPreviewHour - this.horaInicio;
    const lunchOffset = this.dragBlockPreviewHour >= this.almuerzoFin
      ? (this.almuerzoFin - this.almuerzoInicio) * hourHeight
      : 0;
    return hourIndex * hourHeight + lunchOffset;
  }

  esPrimeraHoraBloque(bloque: HorarioBloque, horaActual: number): boolean {
    const ini = parseInt(bloque.hora_inicio.split(':')[0], 10);
    return ini === horaActual;
  }

  esAlmuerzo(hora: number): boolean {
    return hora >= this.almuerzoInicio && hora < this.almuerzoFin;
  }

  isHoraInRange(hora: number, start: number | undefined, end: number | undefined): boolean {
    if (start === undefined || end === undefined) return false;
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    return hora >= min && hora <= max;
  }

  fmtHora(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  getDiaNombre(dia: number): string {
    const map: Record<number, string> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo' };
    return map[dia] || '';
  }

  getTipoColor(tipo: string): { bg: string; border: string; text: string; label: string } {
    return this.tipoColores[tipo] ?? { bg: '#f1f5f9', border: '#64748b', text: '#334155', label: tipo };
  }

  /* ================================================================ */
  /*  Filtros                                                         */
  /* ================================================================ */

  get docentesFiltrados(): [string, DocenteGroup][] {
    let entries = Object.entries(this.asignacionesPorDocente) as [string, DocenteGroup][];

    const ciclo = this.filtroCiclo;
    const tipo = this.filtroTipo;
    const texto = (this.filtroDocenteCtrl.value ?? '').toLowerCase().trim();
    const soloSinHorario = this.mostrarSoloSinHorario;

    if (ciclo !== null) {
      entries = entries
        .map(([k, g]) => [k, {
          ...g,
          asignaciones: g.asignaciones.filter(a => a.curso_plan.curso.ciclo === ciclo),
        }] as [string, DocenteGroup])
        .filter(([_, g]) => g.asignaciones.length > 0);
    }

    if (tipo !== null) {
      entries = entries
        .map(([k, g]) => [k, {
          ...g,
          asignaciones: g.asignaciones.filter(a => a.tipo_clase === tipo),
        }] as [string, DocenteGroup])
        .filter(([_, g]) => g.asignaciones.length > 0);
    }

    if (texto) {
      entries = entries
        .map(([k, g]) => [k, {
          ...g,
          asignaciones: g.asignaciones.filter(a =>
            a.docente.apellidos.toLowerCase().includes(texto) ||
            a.docente.nombres.toLowerCase().includes(texto) ||
            a.docente.codigo.toLowerCase().includes(texto) ||
            a.curso_plan.curso.codigo.toLowerCase().includes(texto) ||
            a.curso_plan.curso.nombre.toLowerCase().includes(texto)
          ),
        }] as [string, DocenteGroup])
        .filter(([_, g]) => g.asignaciones.length > 0);
    }

    if (soloSinHorario) {
      entries = entries
        .map(([k, g]) => [k, {
          ...g,
          asignaciones: g.asignaciones.filter(a => !this.tieneHorario(a)),
        }] as [string, DocenteGroup])
        .filter(([_, g]) => g.asignaciones.length > 0);
    }

    return entries;
  }

  get totalAsignacionesFiltradas(): number {
    return this.docentesFiltrados.reduce((sum, [_, g]) => sum + g.asignaciones.length, 0);
  }

  limpiarFiltros(): void {
    this.filtroCiclo = null;
    this.filtroTipo = null;
    this.filtroDocenteCtrl.setValue('');
    this.mostrarSoloSinHorario = false;
    this.cdr.markForCheck();
  }

  /* ================================================================ */
  /*  Asignaciones / Progreso                                         */
  /* ================================================================ */

  tieneHorario(asignacion: AsignacionPendiente): boolean {
    return this.horariosDelPeriodo.some(h => h.asignacionId === asignacion.id);
  }

  seleccionarAsignacion(asignacion: AsignacionPendiente): void {
    this.asignacionSeleccionada = asignacion;
    this.bloqueSeleccionado = null;
    this.editingSchedule = false;
    this.draftHorarios = [];
    this.erroresValidacion = [];
    this.cargarHorariosAsignados(asignacion.id);
    this.cdr.markForCheck();
  }

  cargarHorariosAsignados(asignacionId: number): void {
    this.loadingHorarios = true;
    this.cdr.markForCheck();

    this.api
      .get<any>(`/horarios/carga-lectiva/${asignacionId}/horarios`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingHorarios = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (r) => {
          this.horariosAsignados = r.data ?? [];
          this.cdr.markForCheck();
        },
        error: () => this.notif.error('Error al cargar horarios'),
      });
  }

  seleccionarBloque(bloque: HorarioBloque): void {
    this.bloqueSeleccionado = bloque;
    this.asignacionSeleccionada = null;
    this.editingSchedule = false;
    this.cdr.markForCheck();
  }

  onBlockClick(bloque: HorarioBloque, event: Event): void {
    const target = (event.target as HTMLElement).closest('.bloque-controls');
    if (target) return;
    this.seleccionarBloque(bloque);
    event.stopPropagation();
  }

  onBlockMouseDown(bloque: HorarioBloque, event: MouseEvent): void {
    if (!this.editingSchedule) return;
    if (event.button !== 0) return;
    const target = (event.target as HTMLElement).closest('.bloque-controls');
    if (target) return;
    if (!this.esBloqueDeAsignacion(bloque)) return;

    event.preventDefault();
    event.stopPropagation();

    const gridEl = (event.target as HTMLElement).closest('.calendar-grid');
    if (!gridEl) return;
    const gridRect = gridEl.getBoundingClientRect();
    this.calendarGridTop = gridRect.top;

    const ini = parseInt(bloque.hora_inicio.split(':')[0], 10);
    const hourHeight = 64;
    const offsetY = event.clientY - gridRect.top;
    const hourOffset = ini - this.horaInicio;
    const lunchOffset = ini >= this.almuerzoFin ? (this.almuerzoFin - this.almuerzoInicio) * hourHeight : 0;
    const blockTop = hourOffset * hourHeight + lunchOffset;
    this.dragBlockOffset = offsetY - blockTop;

    this.draggingBlock = bloque;
    this.dragBlockDia = bloque.dia;
    this.dragBlockPreviewHour = ini;
    this.dragBlockOriginalTop = blockTop;
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.draggingBlock) return;

    const gridEl = document.querySelector('.calendar-grid');
    if (!gridEl) return;
    const gridRect = gridEl.getBoundingClientRect();
    const hourHeight = 64;
    const offsetY = event.clientY - gridRect.top - this.dragBlockOffset;

    // Calculate which hour this corresponds to
    let hour = Math.round(offsetY / hourHeight) + this.horaInicio;

    // Account for lunch break
    if (hour >= this.almuerzoInicio && hour < this.almuerzoFin) {
      hour = event.clientY - gridRect.top > this.dragBlockOriginalTop + (this.almuerzoInicio - this.horaInicio) * hourHeight
        ? this.almuerzoFin
        : this.almuerzoInicio - 1;
    }

    // Clamp
    const duracion = parseInt(this.draggingBlock.hora_fin.split(':')[0], 10) - parseInt(this.draggingBlock.hora_inicio.split(':')[0], 10);
    hour = Math.max(this.horaInicio, Math.min(hour, this.horaFin - duracion));

    this.dragBlockPreviewHour = hour;

    // Calculate which day column based on X position
    const overlayLeft = 64; // width of hora-cell
    const offsetX = event.clientX - gridRect.left - overlayLeft;
    const totalWidth = gridRect.width - overlayLeft;
    const numDias = this.diasSemana.length;
    const dayWidth = totalWidth / numDias;
    let dayIndex = Math.floor(offsetX / dayWidth);
    dayIndex = Math.max(0, Math.min(dayIndex, numDias - 1));
    this.dragBlockDia = this.diasSemana[dayIndex].dia_semana;

    this.cdr.markForCheck();
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    // --- Block drag-to-move ---
    if (this.draggingBlock) {
      const bloque = this.draggingBlock;
      const newHour = this.dragBlockPreviewHour;
      const duracion = parseInt(bloque.hora_fin.split(':')[0], 10) - parseInt(bloque.hora_inicio.split(':')[0], 10);
      const newHoraInicio = this.fmtHora(newHour);
      const newHoraFin = this.fmtHora(newHour + duracion);

      // Validate: same position → no-op
      if (newHoraInicio !== bloque.hora_inicio || this.dragBlockDia !== bloque.dia) {
        const newFin = newHour + duracion;
        let valid = true;

        if (newHour < this.almuerzoFin && newFin > this.almuerzoInicio) {
          this.notif.error('El horario no puede cruzar el almuerzo');
          valid = false;
        }

        if (valid) {
          const conflicto = this.horariosDelPeriodo.some(h => {
            if (h.id === bloque.id) return false;
            if (h.dia !== this.dragBlockDia) return false;
            return this.seSuperponen(newHoraInicio, newHoraFin, h.hora_inicio, h.hora_fin);
          });
          if (conflicto) {
            this.notif.error('Conflicto con otro horario en ese día/hora');
            valid = false;
          }
        }

        if (valid) {
          const backendIdx = this.horariosDelPeriodo.findIndex(h =>
            h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin && h.asignacionId === bloque.asignacionId
          );
          if (backendIdx >= 0) {
            const removed = this.horariosDelPeriodo[backendIdx];
            this.horariosDelPeriodo = this.horariosDelPeriodo.filter((_, i) => i !== backendIdx);
            if (removed.id) {
              this.bloquesEliminados.push({ id: removed.id });
            }
            this.draftHorarios = this.draftHorarios.filter(h =>
              !(h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin)
            );
            this.draftHorarios.push({ dia: this.dragBlockDia, hora_inicio: newHoraInicio, hora_fin: newHoraFin });
          } else {
            const draftIdx = this.draftHorarios.findIndex(h =>
              h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin
            );
            if (draftIdx >= 0) {
              this.draftHorarios = this.draftHorarios.map((h, i) =>
                i === draftIdx ? { ...h, dia: this.dragBlockDia, hora_inicio: newHoraInicio, hora_fin: newHoraFin } : h
              );
            }
          }
          this.validarDraft();
        }
      }

      this.draggingBlock = null;
      this.cdr.markForCheck();
      return;
    }

    // --- Cell drag selection (empty cells) ---
    if (this.isDragging && this.dragStart && this.dragEnd) {
      const minHora = Math.min(this.dragStart.hora, this.dragEnd.hora);
      const maxHora = Math.max(this.dragStart.hora, this.dragEnd.hora) + 1;

      if (minHora < this.almuerzoFin && maxHora > this.almuerzoInicio) {
        this.isDragging = false;
        this.dragStart = null;
        this.dragEnd = null;
        this.cdr.markForCheck();
        return;
      }

      const horaInicio = this.fmtHora(minHora);
      const horaFin = this.fmtHora(maxHora);

      const alreadyDrafted = this.draftHorarios.some(h =>
        h.dia === this.dragStart!.dia && h.hora_inicio === horaInicio && h.hora_fin === horaFin
      );

      if (!alreadyDrafted) {
        this.draftHorarios.push({
          dia: this.dragStart.dia,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
        });
        this.validarDraft();
      }

      this.isDragging = false;
      this.dragStart = null;
      this.dragEnd = null;
      this.cdr.markForCheck();
    }
  }

  cerrarEdicion(): void {
    this.editingSchedule = false;
    this.draftHorarios = [];
    this.bloquesEliminados = [];
    this.erroresValidacion = [];
    // Restore horariosDelPeriodo to pre-edit snapshot
    this.horariosDelPeriodo = [...this.horariosOriginales];
    this.horariosOriginales = [];
    this.cdr.markForCheck();
  }

  /* ================================================================ */
  /*  Editor inline — Click en calendario                            */
  /* ================================================================ */

  iniciarEdicion(): void {
    const asignacion = this.asignacionSeleccionada;
    if (!asignacion || asignacion.estado !== 'CONFIRMADO') return;

    // Snapshot original state for cancel restoration
    this.horariosOriginales = [...this.horariosDelPeriodo];
    this.bloquesEliminados = [];

    // Initialize draft from existing horarios (normalize to HH:mm)
    this.draftHorarios = this.horariosAsignados.map(h => ({
      dia: h.dia,
      hora_inicio: h.hora_inicio?.substring(0, 5) ?? '',
      hora_fin: h.hora_fin?.substring(0, 5) ?? '',
    }));

    this.editingSchedule = true;
    this.erroresValidacion = [];
    this.cdr.markForCheck();
  }

  esBloqueDeAsignacion(bloque: HorarioBloque): boolean {
    const asignacion = this.asignacionSeleccionada;
    if (!asignacion) return false;
    return bloque.asignacionId === asignacion.id;
  }

  onCalendarCellClick(dia: number, hora: number): void {
    if (!this.editingSchedule) return;
    const asignacion = this.asignacionSeleccionada;
    if (!asignacion) return;

    // Check if cell is already occupied by THIS assignment's block (draft or backend)
    const bloquesEnCelda = this.getBloquesCelda(dia, hora);
    const bloqueMio = bloquesEnCelda.find(b => b.asignacionId === asignacion.id);
    if (bloqueMio) return; // Already occupied by this assignment

    // Check if cell is occupied by another assignment
    if (bloquesEnCelda.length > 0) return;

    // Check if we're in lunch hour
    if (this.esAlmuerzo(hora)) return;

    // Check if we already have a draft block starting at this hour
    const horaStr = this.fmtHora(hora);
    const alreadyDrafted = this.draftHorarios.some(h =>
      h.dia === dia && h.hora_inicio === horaStr
    );
    if (alreadyDrafted) return;

    // Add 1-hour block to draft
    const horaFin = this.fmtHora(hora + 1);
    this.draftHorarios.push({ dia, hora_inicio: horaStr, hora_fin: horaFin });
    this.validarDraft();
    this.cdr.markForCheck();
  }

  onCalendarCellRightClick(dia: number, hora: number, event: Event): void {
    if (!this.editingSchedule) return;
    event.preventDefault();

    // First try to remove from draft
    const draftIdx = this.draftHorarios.findIndex(h =>
      h.dia === dia && hora >= parseInt(h.hora_inicio.split(':')[0], 10) && hora < parseInt(h.hora_fin.split(':')[0], 10)
    );
    if (draftIdx >= 0) {
      this.draftHorarios.splice(draftIdx, 1);
    this.validarDraft();
    this.cdr.markForCheck();
  }

    // If not in draft, check if it's a backend block belonging to this assignment
    const bloquesEnCelda = this.horariosDelPeriodo.filter(h => {
      if (h.dia !== dia) return false;
      const ini = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin = parseInt(h.hora_fin.split(':')[0], 10);
      return hora >= ini && hora < fin && h.asignacionId === this.asignacionSeleccionada?.id;
    });
    if (bloquesEnCelda.length > 0) {
      const removed = bloquesEnCelda[0];
      const idx = this.horariosDelPeriodo.indexOf(removed);
      if (idx >= 0) {
        this.horariosDelPeriodo = this.horariosDelPeriodo.filter((_, i) => i !== idx);
        if (removed.id) {
          this.bloquesEliminados.push({ id: removed.id });
        }
        this.validarDraft();
        this.cdr.markForCheck();
      }
    }
  }

  /* ================================================================ */
  /*  Block controls (+/-/x)                                          */
  /* ================================================================ */

  extenderBloque(bloque: HorarioBloque, delta: number, event: Event): void {
    event.stopPropagation();
    if (!this.editingSchedule) return;

    const ini = parseInt(bloque.hora_inicio.split(':')[0], 10);
    const fin = parseInt(bloque.hora_fin.split(':')[0], 10);
    const newFin = fin + delta;

    // Validate: don't go below 1 hour or above 22:00
    if (delta < 0 && newFin <= ini) return; // Can't shrink below 1 hour
    if (delta > 0 && newFin > this.horaFin) return; // Can't extend past end of day

    // Validate: no lunch overlap
    if (delta > 0 && newFin > this.almuerzoInicio && newFin <= this.almuerzoFin) return;
    if (delta < 0 && ini <= this.almuerzoInicio && newFin > this.almuerzoInicio) return;

    const newHoraFin = this.fmtHora(newFin);
    const newHoraInicio = bloque.hora_inicio;

    // Update in draft or backend — check backend FIRST (draft always has the original copy)
    const backendIdx = this.horariosDelPeriodo.findIndex(h =>
      h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin && h.asignacionId === bloque.asignacionId
    );
    if (backendIdx >= 0) {
      const removed = this.horariosDelPeriodo[backendIdx];
      this.horariosDelPeriodo = this.horariosDelPeriodo.filter((_, i) => i !== backendIdx);
      if (removed.id) {
        this.bloquesEliminados.push({ id: removed.id });
      }
      // Remove matching original draft entry (created by iniciarEdicion)
      this.draftHorarios = this.draftHorarios.filter(h =>
        !(h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin)
      );
      this.draftHorarios.push({
        dia: bloque.dia,
        hora_inicio: newHoraInicio,
        hora_fin: newHoraFin,
      });
    } else {
      // Already a draft block — update in place
      const draftIdx = this.draftHorarios.findIndex(h =>
        h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin
      );
      if (draftIdx >= 0) {
        this.draftHorarios = this.draftHorarios.map((h, i) =>
          i === draftIdx ? { ...h, hora_inicio: newHoraInicio, hora_fin: newHoraFin } : h
        );
      }
    }

    this.validarDraft();
    this.cdr.markForCheck();
  }

  eliminarBloque(bloque: HorarioBloque, event: Event): void {
    event.stopPropagation();
    if (!this.editingSchedule) return;

    // Remove from draft
    const draftIdx = this.draftHorarios.findIndex(h =>
      h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin
    );
    if (draftIdx >= 0) {
      this.draftHorarios.splice(draftIdx, 1);
    } else {
      // Remove from backend visually + track for deletion
      const backendIdx = this.horariosDelPeriodo.findIndex(h =>
        h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin && h.asignacionId === bloque.asignacionId
      );
      if (backendIdx >= 0) {
        const removed = this.horariosDelPeriodo[backendIdx];
        this.horariosDelPeriodo = this.horariosDelPeriodo.filter((_, i) => i !== backendIdx);
        if (removed.id) {
          this.bloquesEliminados.push({ id: removed.id });
        }
      }
    }

    this.validarDraft();
    this.cdr.markForCheck();
  }

  /* ================================================================ */
  /*  Drag selection                                                  */
  /* ================================================================ */

  onCalendarCellMouseDown(dia: number, hora: number, event: MouseEvent): void {
    if (!this.editingSchedule) return;
    if (event.button !== 0) return; // Only left click
    if (this.esAlmuerzo(hora)) return;

    // Prevent text selection during drag
    event.preventDefault();

    // Check if cell is occupied
    const bloquesEnCelda = this.getBloquesCelda(dia, hora);
    if (bloquesEnCelda.length > 0) return;

    this.isDragging = true;
    this.dragStart = { dia, hora };
    this.dragEnd = { dia, hora };
    this.cdr.markForCheck();
  }

  onCalendarCellMouseEnter(dia: number, hora: number): void {
    if (!this.isDragging || !this.dragStart) return;
    if (this.esAlmuerzo(hora)) return;
    if (dia !== this.dragStart.dia) return; // Stay in same column

    this.dragEnd = { dia, hora };
    this.cdr.markForCheck();
  }

  private validarDraft(): void {
    this.erroresValidacion = [];
    const asignacion = this.asignacionSeleccionada;
    if (!asignacion) return;

    // Validate total hours
    let totalHoras = 0;
    for (const h of this.draftHorarios) {
      const ini = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin = parseInt(h.hora_fin.split(':')[0], 10);
      totalHoras += fin - ini;
    }
    if (totalHoras > asignacion.horas_asignadas) {
      this.erroresValidacion.push(
        `Horas programadas (${totalHoras}h) exceden las horas asignadas (${asignacion.horas_asignadas}h)`
      );
    }

    // Validate capacity
    if (this.ambienteSeleccionadoId && asignacion.nro_alumnos) {
      const amb = this.ambientesDisponibles.find(a => a.id === this.ambienteSeleccionadoId);
      if (amb && asignacion.nro_alumnos > amb.capacidad) {
        this.erroresValidacion.push(
          `Nro alumnos (${asignacion.nro_alumnos}) excede capacidad del ambiente ${amb.codigo} (${amb.capacidad})`
        );
      }
    }
  }

  get draftHorasTotal(): number {
    return this.draftHorarios.reduce((sum, h) => {
      const ini = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin = parseInt(h.hora_fin.split(':')[0], 10);
      return sum + (fin - ini);
    }, 0);
  }

  getProgresoDraftWidth(): number {
    const asignacion = this.asignacionSeleccionada;
    if (!asignacion || asignacion.horas_asignadas <= 0) return 0;
    return Math.min(100, (this.draftHorasTotal / asignacion.horas_asignadas) * 100);
  }

  onAmbienteChange(ambienteId: number): void {
    this.ambienteSeleccionadoId = ambienteId;
    const amb = this.ambientesDisponibles.find(a => a.id === ambienteId);
    this.ambienteSeleccionadoCapacidad = amb?.capacidad ?? 0;
    this.cdr.markForCheck();
  }

  guardarSchedule(): void {
    const asignacion = this.asignacionSeleccionada;
    if (!asignacion || this.draftHorarios.length === 0 || this.erroresValidacion.length > 0) return;

    this.savingSchedule = true;
    this.cdr.markForCheck();

    const periodo = this.periodoService.periodoActivo;

    // Build batch: DELETE removed backend blocks + CREATE new draft blocks
    const bloques: any[] = [];

    // DELETE operations for removed backend blocks
    for (const el of this.bloquesEliminados) {
      bloques.push({ operacion: 'DELETE', horario_id: el.id });
    }

    // CREATE operations for new draft blocks
    for (const h of this.draftHorarios) {
      bloques.push({
        operacion: 'CREATE',
        dia: h.dia,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        ambiente_id: this.ambienteSeleccionadoId ?? 0,
      });
    }

    this.api.post('/horarios/guardar-batch', {
      periodo_id: periodo?.id,
      asignacion_lectiva_id: asignacion.id,
      bloques,
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.savingSchedule = false;
        this.cdr.markForCheck();
      }),
    ).subscribe({
      next: () => {
        this.notif.success('Horarios guardados correctamente');
        this.editingSchedule = false;
        this.bloquesEliminados = [];
        this.horariosOriginales = [];
        this.cargarHorariosAsignados(asignacion.id);
        this.cargarDatos();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Error al guardar horarios';
        this.notif.error(msg);
      },
    });
  }

  getAmbienteCodigo(ambienteId: number): string {
    const amb = this.ambientesDisponibles.find(a => a.id === ambienteId);
    return amb ? `${amb.codigo} — ${amb.nombre}` : '—';
  }

  /* ================================================================ */
  /*  Disponibilidad de ambientes                                     */
  /* ================================================================ */

  getAmbientesDisponibles(bloque: HorarioBloque): AmbienteDisponible[] {
    if (!bloque) return [];
    const ocupados = this.horariosDelPeriodo
      .filter(h => h.id !== bloque.id && h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio)
      .map(h => h.ambienteCodigo);
    return this.ambientesDisponibles.filter(a => !ocupados.includes(a.codigo));
  }

  /* ================================================================ */
  /*  Conflictos                                                      */
  /* ================================================================ */

  detectarConflictos(): ConflictoInfo[] {
    const conflictos: ConflictoInfo[] = [];
    const horariosPorDocente = new Map<string, HorarioBloque[]>();

    for (const h of this.horariosDelPeriodo) {
      if (!h.docenteNombre) continue;
      if (!horariosPorDocente.has(h.docenteNombre)) horariosPorDocente.set(h.docenteNombre, []);
      horariosPorDocente.get(h.docenteNombre)!.push(h);
    }

    horariosPorDocente.forEach((horarios, docente) => {
      for (let i = 0; i < horarios.length; i++) {
        for (let j = i + 1; j < horarios.length; j++) {
          const a = horarios[i];
          const b = horarios[j];
          if (a.dia === b.dia && this.seSuperponen(a.hora_inicio, a.hora_fin, b.hora_inicio, b.hora_fin)) {
            conflictos.push({
              docenteNombre: docente,
              mensaje: `${a.cursoCodigo} se superpone con ${b.cursoCodigo}`,
              horario: `${this.getDiaNombre(a.dia)} ${a.hora_inicio}-${a.hora_fin}`,
            });
          }
        }
      }
    });

    return conflictos;
  }

  private seSuperponen(ini1: string, fin1: string, ini2: string, fin2: string): boolean {
    return ini1 < fin2 && fin1 > ini2;
  }

  /* ================================================================ */
  /*  Acciones                                                        */
  /* ================================================================ */

  trackByDocente(_index: number, entry: [string, DocenteGroup]): number {
    return Number(entry[0]);
  }

  trackByBloque(_index: number, bloque: HorarioBloque): string {
    return `${bloque.dia}-${bloque.hora_inicio}-${bloque.hora_fin}-${bloque.asignacionId}`;
  }

  trackByAsignacion(_index: number, asignacion: AsignacionPendiente): number {
    return asignacion.id;
  }

  cicloLabel(ciclo: number): string {
    const romanos = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return romanos[ciclo - 1] || String(ciclo);
  }

  getBadgeTipoClase(tipo: string): string {
    const map: Record<string, string> = { TEORIA: 'TEO', PRACTICA: 'PRA', LABORATORIO: 'LAB' };
    return map[tipo] ?? tipo.substring(0, 3).toUpperCase();
  }

  getEstadoChip(estado: string): { label: string; cssClass: string; icon: string } {
    const map: Record<string, { label: string; cssClass: string; icon: string }> = {
      CONFIRMADO:  { label: 'Confirmado', cssClass: 'estado-confirmado', icon: 'check_circle' },
      PENDIENTE:   { label: 'Pendiente',  cssClass: 'estado-pendiente',  icon: 'schedule' },
      RECHAZADO:   { label: 'Rechazado',  cssClass: 'estado-rechazado',  icon: 'cancel' },
    };
    return map[estado] ?? { label: estado, cssClass: '', icon: 'help' };
  }

  horasProgramadas(asignacion: AsignacionPendiente): number {
    return this.horariosDelPeriodo
      .filter(h => h.asignacionId === asignacion.id)
      .reduce((sum, h) => {
        const ini = parseInt(h.hora_inicio.split(':')[0], 10);
        const fin = parseInt(h.hora_fin.split(':')[0], 10);
        return sum + (fin - ini);
      }, 0);
  }

  puedeProgramar(asignacion: AsignacionPendiente): boolean {
    return asignacion.estado === 'CONFIRMADO';
  }

  getProgresoBarWidth(asignacion: AsignacionPendiente): number {
    const asignadas = asignacion.horas_asignadas;
    if (asignadas <= 0) return 0;
    return Math.min(100, (this.horasProgramadas(asignacion) / asignadas) * 100);
  }

  getProgresoLabel(asignacion: AsignacionPendiente): string {
    const prog = this.horasProgramadas(asignacion);
    return `${prog}h / ${asignacion.horas_asignadas}h`;
  }
}
