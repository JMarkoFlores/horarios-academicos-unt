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
  cursoId: number | null;
  cursoCodigo: string;
  cursoNombre: string;
  cursoCiclo: number | null;
  docenteNombre: string;
  docenteId: number | null;
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

export interface DisponibilidadDocente {
  dia: number;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
}

export interface DocenteOption {
  id: number;
  nombreCompleto: string;
  codigo: string;
}

type FiltroProgramacion =
  | 'TODAS'
  | 'SIN_HORARIO'
  | 'PARCIAL'
  | 'COMPLETO'
  | 'BLOQUEADAS';

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
  loadingDisponibilidad = false;
  validandoAmbiente = false;
  generandoSugerencias = false;
  saving = false;

  /* ---- Datos ---- */
  asignacionesPorDocente: Record<number, DocenteGroup> = {};
  progreso: Record<number, ProgresoDocente> = {};
  horariosDelPeriodo: HorarioBloque[] = []; // Todos los horarios del período
  horariosFiltrados: HorarioBloque[] = []; // Horarios filtrados según filtros activos
  ambientesDisponibles: AmbienteDisponible[] = [];
  ambientesFiltradosPorCurso: AmbienteDisponible[] = []; // Ambientes filtrados por tipo de curso
  ambientesCompatiblesPorClave: Record<string, AmbienteDisponible[]> = {};
  disponibilidadDocente: DisponibilidadDocente[] = [];
  sugerenciasHorarios: { dia: number; hora_inicio: string; hora_fin: string; ambiente_id: number }[] = [];

  /* ---- Filtros (propiedades normales para ngModel) ---- */
  filtroCiclo: number | null = 1; // Ciclo I por defecto cuando no hay docente
  filtroTipo: string | null = null;
  filtroDocenteCtrl = new FormControl<string | DocenteOption>('');
  filtroAmbienteId: string | null = null;
  filtroProgramacion: FiltroProgramacion = 'TODAS';

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
  dragTargetDia: number | null = null;
  dragTargetHora: number | null = null;
  pendingHorarioChange: { bloque: HorarioBloque; newHoraInicio: string; newHoraFin: string; newDia: number } | null = null;
  hasDraggedBlock = false; // Bandera para evitar clic después de arrastre

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

  /* ---- Modo de asignación por ciclo ---- */
  modoCicloActivo = false;
  cicloActual: number | null = null;
  asignacionesCiclo: AsignacionPendiente[] = [];
  indiceCicloActual = 0;
  progresoCiclo = 0;

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
  readonly filtrosProgramacion: FiltroProgramacion[] = [
    'TODAS',
    'SIN_HORARIO',
    'PARCIAL',
    'COMPLETO',
    'BLOQUEADAS',
  ];

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
      map(valor => this.filtrarDocentes(typeof valor === 'string' ? valor : '')),
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
      cursoId: h.curso?.id ?? h.curso_id ?? h.curso_plan?.curso?.id ?? null,
      cursoCodigo: h.curso?.codigo ?? '',
      cursoNombre: h.curso?.nombre ?? '',
      cursoCiclo: h.curso?.ciclo ?? h.curso_plan?.curso?.ciclo ?? null,
      docenteNombre: h.docente ? `${h.docente.apellidos ?? ''}, ${h.docente.nombres ?? ''}`.trim() : '',
      docenteId: h.docente?.id ?? null,
      ambienteCodigo: h.ambiente?.codigo ?? '',
      tipoClase: h.tipo_clase ?? 'TEORIA',
      nroAlumnos: h.asignacion_lectiva?.nro_alumnos ?? h.nro_alumnos ?? 0,
      asignacionId: h.asignacion_lectiva?.id ?? h.asignacion_lectiva_id,
    }));
    this.aplicarFiltrosHorarios();
  }

  private aplicarFiltrosHorarios(): void {
    this.horariosFiltrados = this.horariosDelPeriodo.filter(h => {
      // Filtro por docente (texto) - PRIMERO
      if (this.filtroDocenteCtrl.value) {
        const valor = this.filtroDocenteCtrl.value;
        const filtroNombre = typeof valor === 'string' 
          ? valor.toLowerCase().trim()
          : valor.nombreCompleto.toLowerCase().trim();
        // Usar coincidencia exacta o parcial
        const docenteNombre = h.docenteNombre.toLowerCase().trim();
        if (!docenteNombre.includes(filtroNombre) && !filtroNombre.includes(docenteNombre)) {
          return false;
        }
      }
      // Filtro por ciclo - SEGUNDO
      if (this.filtroCiclo && h.cursoCiclo !== this.filtroCiclo) {
        return false;
      }
      // Filtro por tipo - TERCERO
      if (this.filtroTipo && h.tipoClase !== this.filtroTipo) {
        return false;
      }
      // Filtro por ambiente - CUARTO
      if (this.filtroAmbienteId && h.ambienteCodigo !== this.filtroAmbienteId) {
        return false;
      }
      return true;
    });
    // Actualizar la vista después de aplicar filtros
    this.cdr.markForCheck();
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
          if (this.estaCompletamenteProgramada(a)) {
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

  onDocenteSelected(docente: DocenteOption | string): void {
    if (typeof docente === 'string') {
      // Si es un string, buscar el docente por nombre
      const encontrado = this.todosLosDocentes.find(d => d.nombreCompleto === docente);
      if (encontrado) {
        this.filtroDocenteCtrl.setValue(encontrado, { emitEvent: false });
      } else {
        // Si no se encuentra, mantener el valor como string para permitir búsqueda libre
        this.filtroDocenteCtrl.setValue(docente, { emitEvent: false });
      }
    } else {
      // Si es un objeto, usarlo directamente
      this.filtroDocenteCtrl.setValue(docente, { emitEvent: false });
    }
    // Al seleccionar un docente, cambiar ciclo a Todos para ver todos sus cursos
    if (this.filtroDocenteCtrl.value) {
      this.filtroCiclo = null;
    } else {
      // Si se limpia el docente, volver a Ciclo I por defecto
      this.filtroCiclo = 1;
    }
    this.aplicarFiltrosHorarios();
    this.cdr.markForCheck();
  }

  getFiltroDocenteTexto(): string {
    const valor = this.filtroDocenteCtrl.value;
    if (typeof valor === 'string') return valor;
    return valor?.nombreCompleto ?? '';
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
    // Start with backend horarios (usar filtrados)
    let bloques = this.horariosFiltrados.filter((h) => {
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
          cursoId: asignacion.curso_plan.curso.id,
          cursoCodigo: asignacion.curso_plan.curso.codigo,
          cursoNombre: asignacion.curso_plan.curso.nombre,
          cursoCiclo: asignacion.curso_plan.curso.ciclo ?? null,
          docenteNombre: `${asignacion.docente.apellidos ?? ''}, ${asignacion.docente.nombres ?? ''}`.trim(),
          docenteId: asignacion.docente.id ?? null,
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
    for (const h of this.horariosFiltrados) {
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
        const backendCovers = this.horariosFiltrados.some(h =>
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
          cursoId: asignacion.curso_plan.curso.id,
          cursoCodigo: asignacion.curso_plan.curso.codigo,
          cursoNombre: asignacion.curso_plan.curso.nombre,
          cursoCiclo: asignacion.curso_plan.curso.ciclo ?? null,
          docenteNombre: `${asignacion.docente.apellidos ?? ''}, ${asignacion.docente.nombres ?? ''}`.trim(),
          docenteId: asignacion.docente.id ?? null,
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

  // Nuevo método para contar bloques en una celda específica
  contarBloquesEnCelda(dia: number, horaInicio: string, horaFin: string): number {
    const bloques = this.horariosFiltrados.filter(h => {
      if (h.dia !== dia) return false;
      // Verificar si hay superposición de horarios
      const ini1 = parseInt(horaInicio.split(':')[0], 10);
      const fin1 = parseInt(horaFin.split(':')[0], 10);
      const ini2 = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin2 = parseInt(h.hora_fin.split(':')[0], 10);
      return ini1 < fin2 && fin1 > ini2; // Hay superposición
    });
    return bloques.length;
  }

  // Nuevo método para obtener el índice del bloque en la celda
  getIndiceBloqueEnCelda(bloque: HorarioBloque): number {
    const bloquesEnCelda = this.horariosFiltrados.filter(h => {
      if (h.dia !== bloque.dia) return false;
      // Verificar si hay superposición de horarios
      const ini1 = parseInt(bloque.hora_inicio.split(':')[0], 10);
      const fin1 = parseInt(bloque.hora_fin.split(':')[0], 10);
      const ini2 = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin2 = parseInt(h.hora_fin.split(':')[0], 10);
      return ini1 < fin2 && fin1 > ini2; // Hay superposición
    });
    // Ordenar por ID para tener un orden consistente
    bloquesEnCelda.sort((a, b) => a.id - b.id);
    return bloquesEnCelda.findIndex(b => b.id === bloque.id);
  }

  // Nuevo método para calcular el ancho del bloque según el número de bloques en la celda
  getBloqueWidthConColision(bloque: HorarioBloque): string {
    const numBloques = this.contarBloquesEnCelda(bloque.dia, bloque.hora_inicio, bloque.hora_fin);
    if (numBloques <= 1) {
      return `calc(100% / ${this.diasSemana.length} - 8px)`;
    }
    // Dividir el ancho de la columna equitativamente entre los bloques
    const anchoColumna = 100 / this.diasSemana.length;
    const anchoBloque = anchoColumna / numBloques;
    return `calc(${anchoBloque}% - 8px)`; // 8px total de margen/padding
  }

  // Nuevo método para calcular la posición izquierda del bloque según su índice
  getBloqueLeftConColision(bloque: HorarioBloque): string {
    const dia = bloque.dia;
    const dayIndex = dia - 1; // 0-based
    const anchoColumna = 100 / this.diasSemana.length;
    const numBloques = this.contarBloquesEnCelda(dia, bloque.hora_inicio, bloque.hora_fin);
    
    if (numBloques <= 1) {
      return `calc(${dayIndex} * ${anchoColumna}% + 4px)`;
    }
    
    const indice = this.getIndiceBloqueEnCelda(bloque);
    const anchoBloque = anchoColumna / numBloques;
    const left = (dayIndex * anchoColumna) + (indice * anchoBloque);
    return `calc(${left}% + 4px)`;
  }

  getBloqueTop(bloque: HorarioBloque): string {
    const ini = parseInt(bloque.hora_inicio.split(':')[0], 10);
    const hourHeight = 64; // min-height of .calendar-row
    const almuerzoRowHeight = 48; // min-height of .almuerzo-row
    if (ini >= this.almuerzoFin) {
      // Hours before lunch + almuerzo row + hours after lunch start
      const rowsBeforeLunch = this.almuerzoInicio - this.horaInicio;
      const rowsAfterLunch = ini - this.almuerzoFin;
      return `${rowsBeforeLunch * hourHeight + almuerzoRowHeight + rowsAfterLunch * hourHeight}px`;
    }
    const hourIndex = ini - this.horaInicio;
    return `${hourIndex * hourHeight}px`;
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
    const almuerzoRowHeight = 48;
    if (this.dragBlockPreviewHour >= this.almuerzoFin) {
      const rowsBeforeLunch = this.almuerzoInicio - this.horaInicio;
      const rowsAfterLunch = this.dragBlockPreviewHour - this.almuerzoFin;
      return rowsBeforeLunch * hourHeight + almuerzoRowHeight + rowsAfterLunch * hourHeight;
    }
    // El ghost debe aparecer en la posición de la celda de destino (snap)
    const hourIndex = this.dragBlockPreviewHour - this.horaInicio;
    return hourIndex * hourHeight;
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
    const valor = this.filtroDocenteCtrl.value;
    const texto = (typeof valor === 'string' ? valor : valor?.nombreCompleto ?? '').toLowerCase().trim();
    const filtroProgramacion = this.filtroProgramacion;
    const ambienteId = this.filtroAmbienteId;

    // Filtro por docente (texto) - PRIMERO para ver asignaciones de un docente específico
    if (texto) {
      entries = entries
        .map(([k, g]) => [k, {
          ...g,
          asignaciones: g.asignaciones.filter(a => {
            const nombreDocente = `${a.docente.apellidos}, ${a.docente.nombres}`.toLowerCase();
            return nombreDocente.includes(texto) ||
                   a.docente.apellidos.toLowerCase().includes(texto) ||
                   a.docente.nombres.toLowerCase().includes(texto) ||
                   a.docente.codigo.toLowerCase().includes(texto);
          }),
        }] as [string, DocenteGroup])
        .filter(([_, g]) => g.asignaciones.length > 0);
    }

    // Filtro por ciclo - SEGUNDO para filtrar por ciclo dentro del docente
    if (ciclo !== null) {
      entries = entries
        .map(([k, g]) => [k, {
          ...g,
          asignaciones: g.asignaciones.filter(a => a.curso_plan.curso.ciclo === ciclo),
        }] as [string, DocenteGroup])
        .filter(([_, g]) => g.asignaciones.length > 0);
    }

    // Filtro por tipo - TERCERO
    if (tipo !== null) {
      entries = entries
        .map(([k, g]) => [k, {
          ...g,
          asignaciones: g.asignaciones.filter(a => a.tipo_clase === tipo),
        }] as [string, DocenteGroup])
        .filter(([_, g]) => g.asignaciones.length > 0);
    }

    // Filtro por ambiente - CUARTO
    if (ambienteId) {
      entries = entries
        .map(([k, g]) => [k, {
          ...g,
          asignaciones: g.asignaciones.filter(a => {
            // Verificar si esta asignación tiene horarios en el ambiente seleccionado
            const horariosAsignacion = this.horariosDelPeriodo.filter(h => 
              h.asignacionId === a.id && h.ambienteCodigo === ambienteId
            );
            return horariosAsignacion.length > 0;
          }),
        }] as [string, DocenteGroup])
        .filter(([_, g]) => g.asignaciones.length > 0);
    }

    if (filtroProgramacion !== 'TODAS') {
      entries = entries
        .map(([k, g]) => [k, {
          ...g,
          asignaciones: g.asignaciones.filter(a => this.cumpleFiltroProgramacion(a)),
        }] as [string, DocenteGroup])
        .filter(([_, g]) => g.asignaciones.length > 0);
    }

    return entries
      .map(([k, g]) => [k, {
        ...g,
        asignaciones: [...g.asignaciones].sort((a, b) => this.compararAsignaciones(a, b)),
      }] as [string, DocenteGroup])
      .sort((a, b) => this.compararGruposDocente(a[1], b[1]));
  }

  get totalAsignacionesFiltradas(): number {
    return this.docentesFiltrados.reduce((sum, [_, g]) => sum + g.asignaciones.length, 0);
  }

  limpiarFiltros(): void {
    this.filtroCiclo = null; // Todos por defecto
    this.filtroTipo = null;
    this.filtroDocenteCtrl.setValue('');
    this.filtroAmbienteId = null;
    this.filtroProgramacion = 'TODAS';
    this.aplicarFiltrosHorarios();
    this.cdr.markForCheck();
  }

  onFiltroCicloChange(): void {
    this.aplicarFiltrosHorarios();
    this.cdr.markForCheck();
  }

  onFiltroTipoChange(): void {
    this.aplicarFiltrosHorarios();
    this.cdr.markForCheck();
  }

  onFiltroDocenteChange(): void {
    this.aplicarFiltrosHorarios();
    this.cdr.markForCheck();
  }

  onFiltroAmbienteChange(): void {
    this.aplicarFiltrosHorarios();
    this.cdr.markForCheck();
  }

  onFiltroProgramacionChange(filtro: FiltroProgramacion): void {
    this.filtroProgramacion = filtro;
    this.cdr.markForCheck();
  }

  /* ================================================================ */
  /*  Modo de asignación por ciclo                                    */
  /* ================================================================ */

  activarModoCiclo(ciclo: number): void {
    this.modoCicloActivo = true;
    this.cicloActual = ciclo;
    this.filtroCiclo = ciclo;
    this.indiceCicloActual = 0;
    this.progresoCiclo = 0;
    this.cargarAsignacionesCiclo();
    this.cdr.markForCheck();
  }

  desactivarModoCiclo(): void {
    this.modoCicloActivo = false;
    this.cicloActual = null;
    this.asignacionesCiclo = [];
    this.indiceCicloActual = 0;
    this.progresoCiclo = 0;
    this.filtroCiclo = null;
    this.cdr.markForCheck();
  }

  cargarAsignacionesCiclo(): void {
    const asignaciones: AsignacionPendiente[] = [];
    const grupos = Object.values(this.asignacionesPorDocente);
    for (const g of grupos) {
      for (const a of g.asignaciones) {
        if (a.curso_plan.curso.ciclo === this.cicloActual && a.estado === 'CONFIRMADO') {
          asignaciones.push(a);
        }
      }
    }
    this.asignacionesCiclo = asignaciones.sort((a, b) => {
      return this.compararAsignaciones(a, b);
    });
    this.calcularProgresoCiclo();
    this.cdr.markForCheck();
  }

  calcularProgresoCiclo(): void {
    if (this.asignacionesCiclo.length === 0) {
      this.progresoCiclo = 100;
      return;
    }
    const completadas = this.asignacionesCiclo.filter(a => this.estaCompletamenteProgramada(a)).length;
    this.progresoCiclo = Math.round((completadas / this.asignacionesCiclo.length) * 100);
  }

  siguienteAsignacionCiclo(): void {
    if (this.indiceCicloActual < this.asignacionesCiclo.length - 1) {
      this.indiceCicloActual++;
      this.seleccionarAsignacion(this.asignacionesCiclo[this.indiceCicloActual]);
    }
  }

  anteriorAsignacionCiclo(): void {
    if (this.indiceCicloActual > 0) {
      this.indiceCicloActual--;
      this.seleccionarAsignacion(this.asignacionesCiclo[this.indiceCicloActual]);
    }
  }

  irAAsignacionCiclo(index: number): void {
    this.indiceCicloActual = index;
    this.seleccionarAsignacion(this.asignacionesCiclo[index]);
  }

  get asignacionCicloActual(): AsignacionPendiente | null {
    return this.asignacionesCiclo[this.indiceCicloActual] || null;
  }

  /* ================================================================ */
  /*  Asignaciones / Progreso                                         */
  /* ================================================================ */

  getCantidadBloquesProgramados(asignacion: AsignacionPendiente): number {
    const horariosLocales = this.horariosDelPeriodo.filter(
      h => h.asignacionId === asignacion.id,
    );

    if (horariosLocales.length > 0) {
      return horariosLocales.length;
    }

    if (
      this.asignacionSeleccionada?.id === asignacion.id &&
      this.horariosAsignados.length > 0
    ) {
      return this.horariosAsignados.length;
    }

    return asignacion.horariosCount ?? 0;
  }

  tieneHorario(asignacion: AsignacionPendiente): boolean {
    return this.getCantidadBloquesProgramados(asignacion) > 0;
  }

  estaCompletamenteProgramada(asignacion: AsignacionPendiente): boolean {
    if (!this.puedeProgramar(asignacion)) return false;
    return this.horasProgramadas(asignacion) >= asignacion.horas_asignadas;
  }

  estaParcialmenteProgramada(asignacion: AsignacionPendiente): boolean {
    return this.tieneHorario(asignacion) && !this.estaCompletamenteProgramada(asignacion);
  }

  getEstadoHorarioLabel(asignacion: AsignacionPendiente): string {
    if (this.estaCompletamenteProgramada(asignacion)) return 'Completo';
    if (this.estaParcialmenteProgramada(asignacion)) return 'Parcial';
    return 'Sin horario';
  }

  getEstadoHorarioIcon(asignacion: AsignacionPendiente): string {
    if (this.estaCompletamenteProgramada(asignacion)) return 'task_alt';
    if (this.estaParcialmenteProgramada(asignacion)) return 'pending_actions';
    return 'schedule';
  }

  getEstadoHorarioClase(asignacion: AsignacionPendiente): string {
    if (this.estaCompletamenteProgramada(asignacion)) return 'estado-completo';
    if (this.estaParcialmenteProgramada(asignacion)) return 'estado-parcial';
    return 'estado-sin-horario';
  }

  getAccionHorarioLabel(asignacion: AsignacionPendiente): string {
    if (!this.puedeProgramar(asignacion)) {
      return `Bloqueado (${asignacion.estado})`;
    }

    if (this.estaCompletamenteProgramada(asignacion)) {
      return 'Editar horario';
    }

    if (this.estaParcialmenteProgramada(asignacion)) {
      return 'Completar horario';
    }

    return 'Asignar horario';
  }

  getResumenProgramacion(asignacion: AsignacionPendiente): string {
    const bloques = this.getCantidadBloquesProgramados(asignacion);
    const bloqueLabel = bloques === 1 ? 'bloque' : 'bloques';
    return `${bloques} ${bloqueLabel} · ${this.getProgresoLabel(asignacion)}`;
  }

  getEtiquetaFiltroProgramacion(filtro: FiltroProgramacion): string {
    const labels: Record<FiltroProgramacion, string> = {
      TODAS: 'Todas',
      SIN_HORARIO: 'Sin horario',
      PARCIAL: 'Parcial',
      COMPLETO: 'Completo',
      BLOQUEADAS: 'Bloqueadas',
    };
    return labels[filtro];
  }

  getConteoFiltroProgramacion(filtro: FiltroProgramacion): number {
    const grupos = Object.values(this.asignacionesPorDocente);
    return grupos.reduce((sum, grupo) => {
      return sum + grupo.asignaciones.filter((a) => {
        if (filtro === 'TODAS') return true;
        return this.cumpleFiltroProgramacion(a, filtro);
      }).length;
    }, 0);
  }

  private cumpleFiltroProgramacion(
    asignacion: AsignacionPendiente,
    filtro = this.filtroProgramacion,
  ): boolean {
    switch (filtro) {
      case 'SIN_HORARIO':
        return this.puedeProgramar(asignacion) && !this.tieneHorario(asignacion);
      case 'PARCIAL':
        return this.estaParcialmenteProgramada(asignacion);
      case 'COMPLETO':
        return this.estaCompletamenteProgramada(asignacion);
      case 'BLOQUEADAS':
        return !this.puedeProgramar(asignacion);
      default:
        return true;
    }
  }

  private getPrioridadAsignacion(asignacion: AsignacionPendiente): number {
    if (!this.puedeProgramar(asignacion)) return 4;
    if (!this.tieneHorario(asignacion)) return 0;
    if (this.estaParcialmenteProgramada(asignacion)) return 1;
    if (this.estaCompletamenteProgramada(asignacion)) return 2;
    return 3;
  }

  private compararAsignaciones(a: AsignacionPendiente, b: AsignacionPendiente): number {
    const prioridad = this.getPrioridadAsignacion(a) - this.getPrioridadAsignacion(b);
    if (prioridad !== 0) return prioridad;

    const horasRestantes =
      (a.horas_asignadas - this.horasProgramadas(a)) -
      (b.horas_asignadas - this.horasProgramadas(b));
    if (horasRestantes !== 0) return horasRestantes < 0 ? 1 : -1;

    const docenteCompare = a.docente.apellidos.localeCompare(b.docente.apellidos);
    if (docenteCompare !== 0) return docenteCompare;

    const cursoCompare = a.curso_plan.curso.codigo.localeCompare(b.curso_plan.curso.codigo);
    if (cursoCompare !== 0) return cursoCompare;

    return a.seccion.localeCompare(b.seccion);
  }

  private compararGruposDocente(a: DocenteGroup, b: DocenteGroup): number {
    const prioridadA = Math.min(...a.asignaciones.map((asignacion) => this.getPrioridadAsignacion(asignacion)));
    const prioridadB = Math.min(...b.asignaciones.map((asignacion) => this.getPrioridadAsignacion(asignacion)));

    if (prioridadA !== prioridadB) {
      return prioridadA - prioridadB;
    }

    return a.docente.apellidos.localeCompare(b.docente.apellidos);
  }

  seleccionarAsignacion(asignacion: AsignacionPendiente): void {
    this.asignacionSeleccionada = asignacion;
    this.bloqueSeleccionado = null;
    // Solo resetear draftHorarios si no estamos en modo edición
    if (!this.editingSchedule) {
      this.editingSchedule = false;
      this.draftHorarios = [];
    }
    this.erroresValidacion = [];
    this.ambienteSeleccionadoId = null;
    this.ambienteSeleccionadoCapacidad = 0;
    this.sugerenciasHorarios = [];
    this.filtrarAmbientesPorCurso(asignacion);
    this.cargarHorariosAsignados(asignacion.id);
    this.cargarDisponibilidadDocente(asignacion.docente.id);
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
          // Solo actualizar horariosAsignados si no estamos en modo edición
          if (!this.editingSchedule) {
            this.horariosAsignados = r.data ?? [];
            const ambienteInicial = this.horariosAsignados[0]?.ambiente?.id ?? null;
            this.ambienteSeleccionadoId = ambienteInicial;
            this.ambienteSeleccionadoCapacidad =
              this.ambientesDisponibles.find((a) => a.id === ambienteInicial)?.capacidad ?? 0;
          }
          this.cdr.markForCheck();
        },
        error: () => this.notif.error('Error al cargar horarios'),
      });
  }

  cargarDisponibilidadDocente(docenteId: number): void {
    const periodo = this.periodoService.periodoActivo;
    if (!periodo) {
      this.disponibilidadDocente = [];
      return;
    }

    this.loadingDisponibilidad = true;
    this.cdr.markForCheck();

    this.api
      .get<any>('/disponibilidad/docente/' + docenteId, { periodo: periodo.codigo })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingDisponibilidad = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (r) => {
          this.disponibilidadDocente = this.mapearDisponibilidad(r.data ?? []);
          this.cdr.markForCheck();
        },
        error: () => {
          this.disponibilidadDocente = [];
          this.cdr.markForCheck();
        },
      });
  }

  private mapearDisponibilidad(data: any[]): DisponibilidadDocente[] {
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map((d: any) => ({
      dia: d.dia,
      hora_inicio: d.hora_inicio?.substring(0, 5) ?? '',
      hora_fin: d.hora_fin?.substring(0, 5) ?? '',
      disponible: true, // Por defecto disponible si está en la lista
    }));
  }

  tieneDisponibilidadEnSlot(dia: number, hora: number): boolean {
    return this.disponibilidadDocente.some(d => {
      if (d.dia !== dia) return false;
      const ini = parseInt(d.hora_inicio.split(':')[0], 10);
      const fin = parseInt(d.hora_fin.split(':')[0], 10);
      return hora >= ini && hora < fin;
    });
  }

  tieneConflictoEnCelda(dia: number, hora: number): boolean {
    if (!this.editingSchedule || !this.asignacionSeleccionada) return false;
    
    // Verificar si hay bloques de otros docentes en esta celda (usar filtrados)
    const bloques = this.horariosFiltrados.filter(h => {
      if (h.dia !== dia) return false;
      const ini = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin = parseInt(h.hora_fin.split(':')[0], 10);
      return hora >= ini && hora < fin;
    });
    return bloques.some(b => !this.esBloqueDeAsignacion(b));
  }

  generarSugerenciasHorarios(): void {
    const asignacion = this.asignacionSeleccionada;
    if (!asignacion || !this.ambienteSeleccionadoId) {
      this.notif.error('Seleccione una asignación y un ambiente primero');
      return;
    }

    this.generandoSugerencias = true;
    this.sugerenciasHorarios = [];
    this.cdr.markForCheck();

    // Generar sugerencias basadas en disponibilidad del docente y disponibilidad de ambiente
    const horasNecesarias = asignacion.horas_asignadas;
    const sugerencias: { dia: number; hora_inicio: string; hora_fin: string; ambiente_id: number }[] = [];

    // Buscar slots disponibles en la disponibilidad del docente
    for (const disp of this.disponibilidadDocente) {
      const ini = parseInt(disp.hora_inicio.split(':')[0], 10);
      const fin = parseInt(disp.hora_fin.split(':')[0], 10);
      
      // Verificar disponibilidad de ambiente en este slot
      for (let h = ini; h < fin - 1; h++) {
        const horaInicio = this.fmtHora(h);
        const horaFin = this.fmtHora(h + 1);
        
        // Verificar que no haya conflicto en el calendario (usar filtrados)
        const tieneConflicto = this.horariosFiltrados.some(bloque => {
          if (bloque.dia !== disp.dia) return false;
          return horaInicio < bloque.hora_fin && horaFin > bloque.hora_inicio;
        });

        if (!tieneConflicto) {
          sugerencias.push({
            dia: disp.dia,
            hora_inicio: horaInicio,
            hora_fin: horaFin,
            ambiente_id: this.ambienteSeleccionadoId,
          });
        }
      }
    }

    // Ordenar sugerencias por día y hora
    sugerencias.sort((a, b) => {
      if (a.dia !== b.dia) return a.dia - b.dia;
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });

    // Limitar a las primeras N sugerencias (basado en horas necesarias)
    this.sugerenciasHorarios = sugerencias.slice(0, horasNecesarias * 2);
    
    this.generandoSugerencias = false;
    this.cdr.markForCheck();

    if (this.sugerenciasHorarios.length === 0) {
      this.notif.info('No se encontraron sugerencias de horario disponibles');
    } else {
      this.notif.success(`Se generaron ${this.sugerenciasHorarios.length} sugerencias de horario`);
    }
  }

  aplicarSugerencia(sugerencia: { dia: number; hora_inicio: string; hora_fin: string; ambiente_id: number }): void {
    if (!this.editingSchedule) {
      this.iniciarEdicion();
    }

    // Verificar si ya existe esta sugerencia en draft
    const yaExiste = this.draftHorarios.some(h =>
      h.dia === sugerencia.dia && h.hora_inicio === sugerencia.hora_inicio
    );

    if (!yaExiste) {
      this.draftHorarios.push({
        dia: sugerencia.dia,
        hora_inicio: sugerencia.hora_inicio,
        hora_fin: sugerencia.hora_fin,
      });
      this.validarDraft();
      this.cdr.markForCheck();
    }
  }

  aplicarTodasSugerencias(): void {
    if (!this.editingSchedule) {
      this.iniciarEdicion();
    }

    const asignacion = this.asignacionSeleccionada;
    if (!asignacion) return;

    let horasAgregadas = 0;
    for (const sugerencia of this.sugerenciasHorarios) {
      if (horasAgregadas >= asignacion.horas_asignadas) break;
      
      const yaExiste = this.draftHorarios.some(h =>
        h.dia === sugerencia.dia && h.hora_inicio === sugerencia.hora_inicio
      );

      if (!yaExiste) {
        this.draftHorarios.push({
          dia: sugerencia.dia,
          hora_inicio: sugerencia.hora_inicio,
          hora_fin: sugerencia.hora_fin,
        });
        horasAgregadas++;
      }
    }

    this.validarDraft();
    this.cdr.markForCheck();
    this.notif.success(`Se aplicaron ${horasAgregadas} horas de sugerencias`);
  }

  async verificarDisponibilidadAmbiente(dia: number, horaInicio: string, horaFin: string, ambienteId: number): Promise<boolean> {
    const periodo = this.periodoService.periodoActivo;
    if (!periodo) return true;

    this.validandoAmbiente = true;
    this.cdr.markForCheck();

    try {
      const response = await this.api.post<any>('/validaciones/cruce-ambiente', {
        ambienteId,
        diaSemana: dia,
        horaInicio,
        horaFin,
        periodo: periodo.codigo,
        excluirId: null,
      }).toPromise();
      
      return !response.data.tieneCruce;
    } catch (error) {
      console.error('Error verificando disponibilidad de ambiente:', error);
      return true; // Asumir disponible si hay error
    } finally {
      this.validandoAmbiente = false;
      this.cdr.markForCheck();
    }
  }

  async validarCruceDocente(dia: number, horaInicio: string, horaFin: string): Promise<boolean> {
    const asignacion = this.asignacionSeleccionada;
    if (!asignacion) return true;

    const periodo = this.periodoService.periodoActivo;
    if (!periodo) return true;

    try {
      const response = await this.api.post<any>('/validaciones/cruce-docente', {
        docenteId: asignacion.docente.id,
        diaSemana: dia,
        horaInicio,
        horaFin,
        periodo: periodo.codigo,
        excluirId: null,
      }).toPromise();
      
      return !response.data.tieneCruce;
    } catch (error) {
      console.error('Error verificando cruce de docente:', error);
      return true;
    }
  }

  seleccionarBloque(bloque: HorarioBloque): void {
    this.bloqueSeleccionado = bloque;
    this.asignacionSeleccionada = null;
    this.editingSchedule = false;
    this.sincronizarAmbientesDelBloque(bloque);
    this.cdr.markForCheck();
  }

  onBlockClick(bloque: HorarioBloque, event: Event): void {
    // Si hubo un arrastre reciente, no procesar el clic
    if (this.hasDraggedBlock) {
      this.hasDraggedBlock = false; // Resetear para el próximo clic
      return;
    }
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

    // Obtener la posición real del elemento DOM del bloque
    const blockEl = (event.target as HTMLElement).closest('.bloque-horario');
    if (!blockEl) return;
    const blockRect = blockEl.getBoundingClientRect();
    
    // Calcular el offset como la posición del cursor dentro del bloque
    this.dragBlockOffset = event.clientY - blockRect.top;

    const ini = parseInt(bloque.hora_inicio.split(':')[0], 10);
    const hourHeight = 64;
    const almuerzoRowHeight = 48;
    let expectedTop: number;
    if (ini >= this.almuerzoFin) {
      const rowsBeforeLunch = this.almuerzoInicio - this.horaInicio;
      const rowsAfterLunch = ini - this.almuerzoFin;
      expectedTop = rowsBeforeLunch * hourHeight + almuerzoRowHeight + rowsAfterLunch * hourHeight;
    } else {
      expectedTop = (ini - this.horaInicio) * hourHeight;
    }
    
    // Calcular el offset corregido para snap correcto
    const actualTop = blockRect.top - gridRect.top;
    this.dragBlockOffset = this.dragBlockOffset - (actualTop - expectedTop);

    this.draggingBlock = bloque;
    this.dragBlockDia = bloque.dia;
    this.dragBlockPreviewHour = ini;
    this.dragBlockOriginalTop = blockRect.top - gridRect.top;
    this.hasDraggedBlock = false; // Resetear bandera al iniciar arrastre
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.draggingBlock) return;

    this.hasDraggedBlock = true; // Marcar que hubo movimiento

    const gridEl = document.querySelector('.calendar-grid');
    if (!gridEl) return;
    const gridRect = gridEl.getBoundingClientRect();
    const hourHeight = 64;
    const almuerzoRowHeight = 48;
    
    // Calcular la posición Y relativa al grid RESTANDO el offset para snap correcto
    const relativeY = event.clientY - gridRect.top - this.dragBlockOffset;
    
    // Calculate which hour this corresponds to, accounting for almuerzo row height difference
    const rowsBeforeLunch = this.almuerzoInicio - this.horaInicio;
    const lunchThreshold = rowsBeforeLunch * hourHeight; // Y position where almuerzo starts
    const afterLunchThreshold = lunchThreshold + almuerzoRowHeight; // Y position where post-lunch rows start
    
    let hour: number;
    if (relativeY < lunchThreshold) {
      // Before lunch: simple linear mapping
      hour = Math.round(relativeY / hourHeight) + this.horaInicio;
    } else if (relativeY < afterLunchThreshold) {
      // Inside almuerzo row: snap to before or after lunch
      const midLunch = lunchThreshold + almuerzoRowHeight / 2;
      hour = relativeY < midLunch ? this.almuerzoInicio - 1 : this.almuerzoFin;
    } else {
      // After lunch: offset by almuerzo row height difference
      const afterLunchY = relativeY - afterLunchThreshold;
      hour = Math.round(afterLunchY / hourHeight) + this.almuerzoFin;
    }

    // Clamp
    const duracion = parseInt(this.draggingBlock.hora_fin.split(':')[0], 10) - parseInt(this.draggingBlock.hora_inicio.split(':')[0], 10);
    hour = Math.max(this.horaInicio, Math.min(hour, this.horaFin - duracion));

    this.dragBlockPreviewHour = hour;
    this.dragTargetHora = hour;

    // Calculate which day column based on X position
    const overlayLeft = 64; // width of hora-cell
    const offsetX = event.clientX - gridRect.left - overlayLeft;
    const totalWidth = gridRect.width - overlayLeft;
    const numDias = this.diasSemana.length;
    const dayWidth = totalWidth / numDias;
    let dayIndex = Math.floor(offsetX / dayWidth);
    dayIndex = Math.max(0, Math.min(dayIndex, numDias - 1));
    this.dragBlockDia = this.diasSemana[dayIndex].dia_semana;
    this.dragTargetDia = this.dragBlockDia;

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
          // Validar contra horarios filtrados (no todos los horarios del período)
          const conflicto = this.horariosFiltrados.some(h => {
            // Excluir todos los bloques de la misma asignación (una asignación puede tener múltiples bloques)
            if (bloque.asignacionId && h.asignacionId === bloque.asignacionId) return false;
            // Si no hay asignacionId, excluir por ID o posición original
            if (!bloque.asignacionId) {
              if (bloque.id && h.id === bloque.id) return false;
              if (h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin) return false;
            }
            // Solo validar conflicto si es el mismo día
            if (h.dia !== this.dragBlockDia) return false;
            // Validar superposición de horarios
            return this.seSuperponen(newHoraInicio, newHoraFin, h.hora_inicio, h.hora_fin);
          });
          if (conflicto) {
            this.notif.error('Conflicto con otro horario en ese día/hora');
            valid = false;
          }
        }

        if (valid) {
          // Inicializar draftHorarios si está vacío (cuando no estaba en modo edición)
          if (this.draftHorarios.length === 0 && this.horariosAsignados.length > 0) {
            this.draftHorarios = this.horariosAsignados.map(h => ({
              dia: h.dia,
              hora_inicio: h.hora_inicio?.substring(0, 5) ?? '',
              hora_fin: h.hora_fin?.substring(0, 5) ?? '',
            }));
          }
          
          // Mover el bloque inmediatamente a la nueva posición
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
            // Sincronizar horariosAsignados con el cambio
            const horarioAsignadoIdx = this.horariosAsignados.findIndex(h =>
              h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin
            );
            if (horarioAsignadoIdx >= 0) {
              this.horariosAsignados = this.horariosAsignados.map((h, i) =>
                i === horarioAsignadoIdx ? { ...h, dia: this.dragBlockDia, hora_inicio: newHoraInicio, hora_fin: newHoraFin } : h
              );
            }
          } else {
            const draftIdx = this.draftHorarios.findIndex(h =>
              h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin
            );
            if (draftIdx >= 0) {
              this.draftHorarios = this.draftHorarios.map((h, i) =>
                i === draftIdx ? { ...h, dia: this.dragBlockDia, hora_inicio: newHoraInicio, hora_fin: newHoraFin } : h
              );
              // Sincronizar horariosAsignados con el cambio
              const horarioAsignadoIdx = this.horariosAsignados.findIndex(h =>
                h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin
              );
              if (horarioAsignadoIdx >= 0) {
                this.horariosAsignados = this.horariosAsignados.map((h, i) =>
                  i === horarioAsignadoIdx ? { ...h, dia: this.dragBlockDia, hora_inicio: newHoraInicio, hora_fin: newHoraFin } : h
                );
              }
            }
          }
          // Actualizar horariosFiltrados para reflejar el cambio
          this.aplicarFiltrosHorarios();
          this.validarDraft();
          // Activar modo de edición para mostrar botones de guardar/deshacer
          this.editingSchedule = true;
        }
      }

      this.draggingBlock = null;
      this.dragTargetDia = null;
      this.dragTargetHora = null;
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

    if (!this.ambienteSeleccionadoId && this.horariosAsignados.length > 0) {
      this.onAmbienteChange(this.horariosAsignados[0].ambiente.id);
    }

    this.editingSchedule = true;
    this.erroresValidacion = [];
    this.validarDraft();
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

    // Validate capacity (no para laboratorios porque los alumnos se dividen por grupos)
    if (this.ambienteSeleccionadoId && asignacion.nro_alumnos) {
      const amb = this.ambientesDisponibles.find(a => a.id === this.ambienteSeleccionadoId);
      // No validar capacidad para laboratorios (código empieza con LAB o tipo es LABORATORIO)
      const esLaboratorio = amb && (amb.codigo?.toUpperCase().startsWith('LAB') || amb.tipo?.toUpperCase().includes('LABORATORIO'));
      if (amb && !esLaboratorio && asignacion.nro_alumnos > amb.capacidad) {
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

  cargarAmbientesParaCambioHorario(cursoId: number): void {
    // Filtrar ambientes por el curso seleccionado
    // Crear un objeto mock con la estructura necesaria para filtrarAmbientesPorCurso
    const mockAsignacion = {
      docente: { id: 0 }, // ID dummy, no se usa para filtrar ambientes
      curso_plan: { curso: { id: cursoId } },
      tipo_clase: 'TEORIA',
      nro_alumnos: 0,
    } as any;
    this.filtrarAmbientesPorCurso(mockAsignacion);
  }

  abrirDialogoAmbienteParaCambio(): void {
    // Activar el modo de edición para mostrar el selector de ambiente
    this.editingSchedule = true;
    this.cdr.markForCheck();
  }

  confirmarCambioHorario(): void {
    if (!this.pendingHorarioChange) return;

    const { bloque, newHoraInicio, newHoraFin, newDia } = this.pendingHorarioChange;

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
      this.draftHorarios.push({ dia: newDia, hora_inicio: newHoraInicio, hora_fin: newHoraFin });
    } else {
      const draftIdx = this.draftHorarios.findIndex(h =>
        h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio && h.hora_fin === bloque.hora_fin
      );
      if (draftIdx >= 0) {
        this.draftHorarios = this.draftHorarios.map((h, i) =>
          i === draftIdx ? { ...h, dia: newDia, hora_inicio: newHoraInicio, hora_fin: newHoraFin } : h
        );
      }
    }
    this.validarDraft();
    this.pendingHorarioChange = null;
    this.cdr.markForCheck();
  }

  guardarSchedule(): void {
    const asignacion = this.asignacionSeleccionada;
    if (!asignacion || this.draftHorarios.length === 0 || this.erroresValidacion.length > 0) return;

    this.savingSchedule = true;
    this.cdr.markForCheck();

    const periodo = this.periodoService.periodoActivo;

    // Usar UPDATE en lugar de DELETE + CREATE para evitar conflictos temporales
    const bloques: any[] = [];

    // Si hay horarios existentes, actualizarlos con los nuevos horarios
    if (this.horariosAsignados.length > 0) {
      for (let i = 0; i < this.draftHorarios.length; i++) {
        const draft = this.draftHorarios[i];
        const horarioExistente = this.horariosAsignados[i];
        
        if (horarioExistente && horarioExistente.id) {
          bloques.push({
            operacion: 'UPDATE',
            horario_id: horarioExistente.id,
            dia: draft.dia,
            hora_inicio: draft.hora_inicio,
            hora_fin: draft.hora_fin,
            ambiente_id: this.ambienteSeleccionadoId ?? horarioExistente.ambiente?.id ?? 0,
          });
        } else {
          bloques.push({
            operacion: 'CREATE',
            dia: draft.dia,
            hora_inicio: draft.hora_inicio,
            hora_fin: draft.hora_fin,
            ambiente_id: this.ambienteSeleccionadoId ?? 0,
          });
        }
      }
      
      // Eliminar horarios sobrantes si hay menos drafts que horarios existentes
      if (this.horariosAsignados.length > this.draftHorarios.length) {
        for (let i = this.draftHorarios.length; i < this.horariosAsignados.length; i++) {
          const horario = this.horariosAsignados[i];
          if (horario.id) {
            bloques.push({ operacion: 'DELETE', horario_id: horario.id });
          }
        }
      }
    } else {
      // No hay horarios existentes, crear todos
      for (const h of this.draftHorarios) {
        bloques.push({
          operacion: 'CREATE',
          dia: h.dia,
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
          ambiente_id: this.ambienteSeleccionadoId ?? 0,
        });
      }
    }

    this.api.post('/horarios/carga-lectiva/guardar-batch', {
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
        asignacion.horariosCount = this.draftHorarios.length;
        this.cargarHorariosAsignados(asignacion.id);
        this.cargarDatos();
        if (this.modoCicloActivo) {
          this.calcularProgresoCiclo();
        }
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

  filtrarAmbientesPorCurso(asignacion: AsignacionPendiente): void {
    this.cargarAmbientesCompatiblesCurso(
      asignacion.docente.id,
      asignacion.curso_plan.curso.id,
      asignacion.tipo_clase,
      asignacion.nro_alumnos || 0,
    );
  }

  /* ================================================================ */
  /*  Disponibilidad de ambientes                                     */
  /* ================================================================ */

  getAmbientesDisponibles(bloque: HorarioBloque): AmbienteDisponible[] {
    if (!bloque) return [];
    const compatibles = this.obtenerAmbientesCompatiblesDelBloque(bloque);
    const ocupados = this.horariosDelPeriodo
      .filter(h => h.id !== bloque.id && h.dia === bloque.dia && h.hora_inicio === bloque.hora_inicio)
      .map(h => h.ambienteCodigo);
    return compatibles.filter(a => !ocupados.includes(a.codigo));
  }

  private sincronizarAmbientesDelBloque(bloque: HorarioBloque): void {
    const asignacion = this.buscarAsignacionPorBloque(bloque);

    if (asignacion) {
      this.filtrarAmbientesPorCurso(asignacion);
      return;
    }

    if (!bloque.docenteId || !bloque.cursoId) {
      this.ambientesFiltradosPorCurso = [];
      return;
    }

    this.cargarAmbientesCompatiblesCurso(
      bloque.docenteId,
      bloque.cursoId,
      bloque.tipoClase,
      bloque.nroAlumnos,
    );
  }

  private buscarAsignacionPorBloque(bloque: HorarioBloque): AsignacionPendiente | null {
    for (const grupo of Object.values(this.asignacionesPorDocente)) {
      const encontrada = grupo.asignaciones.find((asignacion) => {
        if (bloque.asignacionId && asignacion.id === bloque.asignacionId) {
          return true;
        }

        return (
          asignacion.docente.id === bloque.docenteId &&
          asignacion.curso_plan.curso.id === bloque.cursoId &&
          asignacion.tipo_clase === bloque.tipoClase
        );
      });

      if (encontrada) {
        return encontrada;
      }
    }

    return null;
  }

  private getClaveAmbientesCompatibles(cursoId: number | null, tipoClase: string): string | null {
    if (!cursoId || !tipoClase) {
      return null;
    }

    return `${cursoId}:${tipoClase}`;
  }

  private obtenerFallbackAmbientes(tipoClase: string, nroAlumnos = 0): AmbienteDisponible[] {
    return this.aplicarFiltroCapacidad(
      this.ambientesDisponibles.filter((amb) => {
        if (tipoClase === 'LABORATORIO') {
          return amb.tipo === 'LABORATORIO';
        }

        return amb.tipo === 'AULA' || amb.tipo === 'TALLER';
      }),
      nroAlumnos,
    );
  }

  private aplicarFiltroCapacidad(
    ambientes: AmbienteDisponible[],
    nroAlumnos = 0,
  ): AmbienteDisponible[] {
    if (!nroAlumnos) {
      return ambientes;
    }

    return ambientes.filter((amb) => amb.capacidad >= Math.ceil(nroAlumnos * 0.8));
  }

  private cargarAmbientesCompatiblesCurso(
    docenteId: number,
    cursoId: number,
    tipoClase: string,
    nroAlumnos = 0,
  ): void {
    const clave = this.getClaveAmbientesCompatibles(cursoId, tipoClase);

    if (!clave) {
      this.ambientesFiltradosPorCurso = [];
      return;
    }

    const cache = this.ambientesCompatiblesPorClave[clave];
    if (cache) {
      this.ambientesFiltradosPorCurso = this.aplicarFiltroCapacidad(cache, nroAlumnos);
      this.cdr.markForCheck();
      return;
    }

    this.api
      .get<any>(`/docentes/${docenteId}/ambientes-compatibles`, {
        cursoId,
        tipoClase,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const ambientes = response?.data ?? [];
          this.ambientesCompatiblesPorClave[clave] = ambientes;
          this.ambientesFiltradosPorCurso = this.aplicarFiltroCapacidad(ambientes, nroAlumnos);
          this.cdr.markForCheck();
        },
        error: () => {
          this.ambientesFiltradosPorCurso = this.obtenerFallbackAmbientes(tipoClase, nroAlumnos);
          this.cdr.markForCheck();
        },
      });
  }

  private obtenerAmbientesCompatiblesDelBloque(bloque: HorarioBloque): AmbienteDisponible[] {
    const clave = this.getClaveAmbientesCompatibles(bloque.cursoId, bloque.tipoClase);
    const compatibles = clave ? this.ambientesCompatiblesPorClave[clave] : [];
    return this.aplicarFiltroCapacidad(compatibles ?? [], bloque.nroAlumnos);
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
    let horarios = this.horariosDelPeriodo.filter(h => h.asignacionId === asignacion.id);

    if (
      horarios.length === 0 &&
      this.asignacionSeleccionada?.id === asignacion.id &&
      this.horariosAsignados.length > 0
    ) {
      horarios = this.horariosAsignados.map((h) => ({
        asignacionId: asignacion.id,
        dia: h.dia,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
      })) as any[];
    }

    return horarios
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
