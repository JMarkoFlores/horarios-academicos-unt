import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize, debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { NotifToastService } from '../../../core/services/notif-toast.service';
import { DiasActivosService, DiaActivo } from '../../../core/services/dias-activos.service';
import { ContextoAcademicoHelper } from '../../../core/services/contexto-academico.helper';
import { ApiResponse } from '../../../core/interfaces/entities';
import { AsignarHorarioCargaLectivaDialogComponent } from './dialogs/asignar-horario-carga-lectiva-dialog/asignar-horario-carga-lectiva-dialog.component';

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
  totalConflictos = 0;

  /* ---- Alcance ---- */
  alcanceLabel: string | null = null;

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
    private dialog: MatDialog,
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
        if (periodo) {
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
      nroAlumnos: h.nro_alumnos ?? 0,
      asignacionId: h.asignacion_lectiva?.id,
    }));
  }

  /* ================================================================ */
  /*  KPIs                                                            */
  /* ================================================================ */

  calcularKPIs(): void {
    let pendientes = 0;
    let programadas = 0;
    const grupos = Object.values(this.asignacionesPorDocente);
    for (const g of grupos) {
      for (const a of g.asignaciones) {
        if (this.tieneHorario(a)) {
          programadas++;
        } else {
          pendientes++;
        }
      }
    }
    this.totalPendientes = pendientes;
    this.totalProgramadas = programadas;
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
    return this.horariosDelPeriodo.filter((h) => {
      if (h.dia !== dia) return false;
      const ini = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin = parseInt(h.hora_fin.split(':')[0], 10);
      return hora >= ini && hora < fin;
    });
  }

  getRowSpan(bloque: HorarioBloque): number {
    const ini = parseInt(bloque.hora_inicio.split(':')[0], 10);
    const fin = parseInt(bloque.hora_fin.split(':')[0], 10);
    return Math.max(1, fin - ini);
  }

  esPrimeraHoraBloque(bloque: HorarioBloque, horaActual: number): boolean {
    const ini = parseInt(bloque.hora_inicio.split(':')[0], 10);
    return ini === horaActual;
  }

  esAlmuerzo(hora: number): boolean {
    return hora >= this.almuerzoInicio && hora < this.almuerzoFin;
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
    this.cdr.markForCheck();
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

  abrirDialogoAsignar(): void {
    const asignacion = this.asignacionSeleccionada;
    if (!asignacion) return;

    if (asignacion.estado !== 'PENDIENTE') {
      this.notif.error(`Solo se pueden editar asignaciones en estado PENDIENTE. Estado actual: ${asignacion.estado}`);
      return;
    }

    const dialogRef = this.dialog.open(AsignarHorarioCargaLectivaDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        asignacion: {
          id: asignacion.id,
          docente: asignacion.docente,
          curso_plan: asignacion.curso_plan,
          tipo_clase: asignacion.tipo_clase,
          seccion: asignacion.seccion,
          horas_asignadas: asignacion.horas_asignadas,
          nro_alumnos: asignacion.nro_alumnos || 0,
          grupo: asignacion.grupo,
        },
        horariosExistentes: this.horariosAsignados,
      },
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado && this.asignacionSeleccionada) {
        this.notif.success('Horario asignado correctamente');
        this.cargarHorariosAsignados(this.asignacionSeleccionada.id);
        this.cargarDatos();
      }
    });
  }

  trackByDocente(_index: number, entry: [string, DocenteGroup]): number {
    return Number(entry[0]);
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
}
