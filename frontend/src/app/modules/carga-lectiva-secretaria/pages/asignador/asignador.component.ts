import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild, computed, signal,
  inject, DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PeriodoService } from '../../../../core/services/periodo.service';
import { PeriodoAcademico } from '../../../../core/interfaces/entities';
import { ScheduleGridComponent } from '../../../../shared/components/schedule-grid/schedule-grid.component';
import { ScheduleBlock, PaletteBlock, ConflictInfo } from '../../../../shared/components/schedule-grid/schedule-grid.models';
import { BancoCursosComponent } from '../../components/banco-cursos/banco-cursos.component';
import { PanelAmbientesComponent } from '../../components/panel-ambientes/panel-ambientes.component';
import { BarraProgresoComponent } from '../../components/barra-progreso/barra-progreso.component';
import { IndicadorCargaComponent } from '../../components/indicador-carga/indicador-carga.component';
import { MiniFormularioComponent } from '../../components/mini-formulario/mini-formulario.component';
import { AsignadorService } from '../../services/asignador.service';
import { ValidadorFrontService } from '../../services/validador-front.service';
import {
  CursoPendiente, DocenteAsignador, AmbienteDisponible,
  BloqueHorario, MiniFormularioData, GrupoInfo,
} from '../../models/asignador.models';
import { toSafeString, toSafeNumber } from '@app/shared/utils/sanitize';

type ViewMode = 'docente' | 'ambiente' | 'ciclo';

interface AsignadorViewModel {
  loading: boolean;
  error: string | null;
  docentes: DocenteAsignador[];
  ambientes: AmbienteDisponible[];
  cursosPendientes: CursoPendiente[];
  docenteSeleccionado: DocenteAsignador | null;
  bloquesDocente: BloqueHorario[];
  cursoArrastrando: CursoPendiente | null;
  tipoClaseArrastrando: string;
  formularioVisible: boolean;
  formularioData: MiniFormularioData | null;
  progreso: any;
  undoDisponible: boolean;

  viewMode: ViewMode;
  viewTabIndex: number;
  docenteSeleccionadoId: number | null;
  ambienteSeleccionadoId: number | null;
  cicloSeleccionado: number | null;
  grillaReadonly: boolean;

  filtroCiclo: string;
  filtroTipo: string;
  busqueda: string;

  filtroAmbienteTipo: string;
  filtroAmbienteCapacidad: string;
  filtroAmbienteDisponibilidad: string;
  busquedaAmbiente: string;

  gridBlocks: ScheduleBlock[];
  ciclosDisponibles: number[];
  cursosFiltrados: CursoPendiente[];
  docenteActual: DocenteAsignador | null;
}

const initialVM: AsignadorViewModel = {
  loading: false,
  error: null,
  docentes: [],
  ambientes: [],
  cursosPendientes: [],
  docenteSeleccionado: null,
  bloquesDocente: [],
  cursoArrastrando: null,
  tipoClaseArrastrando: '',
  formularioVisible: false,
  formularioData: null,
  progreso: null,
  undoDisponible: false,

  viewMode: 'docente',
  viewTabIndex: 0,
  docenteSeleccionadoId: null,
  ambienteSeleccionadoId: null,
  cicloSeleccionado: null,
  grillaReadonly: false,

  filtroCiclo: 'all',
  filtroTipo: 'all',
  busqueda: '',

  filtroAmbienteTipo: 'all',
  filtroAmbienteCapacidad: 'all',
  filtroAmbienteDisponibilidad: 'all',
  busquedaAmbiente: '',

  gridBlocks: [],
  ciclosDisponibles: [],
  cursosFiltrados: [],
  docenteActual: null,
};

@Component({
  selector: 'app-asignador',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, TranslateModule, DragDropModule,
    MatIconModule, MatButtonModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatTooltipModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatChipsModule, MatTabsModule, MatProgressBarModule, MatDividerModule,
    ScheduleGridComponent, BancoCursosComponent, PanelAmbientesComponent,
    BarraProgresoComponent, IndicadorCargaComponent, MiniFormularioComponent,
  ],
  template: `
    <div class="asignador" [class.asignador--loading]="vm().loading">
      <header class="asignador__hero">
        <div class="asignador__hero-content">
          <mat-icon class="asignador__hero-icon">assignment_ind</mat-icon>
          <div>
            <h1 class="asignador__title">{{ 'asignador.title' | translate }}</h1>
            <p class="asignador__subtitle">{{ 'asignador.subtitle' | translate }}</p>
          </div>
        </div>
        <div class="asignador__hero-actions">
          <button mat-stroked-button (click)="cargarDatos()" [disabled]="vm().loading" matTooltip="Actualizar datos (Ctrl+R)">
            <mat-icon>refresh</mat-icon> {{ 'asignador.refresh' | translate }}
          </button>
          <button mat-stroked-button (click)="deshacer()" [disabled]="!vm().undoDisponible" matTooltip="Deshacer última acción (Ctrl+Z)">
            <mat-icon>undo</mat-icon> {{ 'asignador.undo' | translate }}
          </button>
          <button mat-flat-button color="primary" [disabled]="vm().loading" (click)="guardarTodo()" matTooltip="Guardar borrador">
            <mat-icon>save</mat-icon> {{ 'asignador.save' | translate }}
          </button>
        </div>
      </header>

      <div class="asignador__toolbar">
        <app-barra-progreso [progreso]="vm().progreso"></app-barra-progreso>
        @if (vm().error) {
          <div class="asignador__error" role="alert">
            <mat-icon>error</mat-icon>
            <span>{{ vm().error }}</span>
            <button mat-icon-button (click)="setError(null)" matTooltip="Cerrar">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
      </div>

      <div class="asignador__view-tabs">
        <mat-tab-group [(selectedIndex)]="vm().viewTabIndex" (selectedIndexChange)="onViewChange()">
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>person</mat-icon>
              <span>{{ 'asignador.view.docente' | translate }}</span>
            </ng-template>
          </mat-tab>
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>meeting_room</mat-icon>
              <span>{{ 'asignador.view.ambiente' | translate }}</span>
            </ng-template>
          </mat-tab>
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>auto_stories</mat-icon>
              <span>{{ 'asignador.view.ciclo' | translate }}</span>
            </ng-template>
          </mat-tab>
        </mat-tab-group>
      </div>

      <div class="asignador__main" cdkDropListGroup>
        <aside class="asignador__left">
          <app-banco-cursos
            [cursos]="vm().cursosFiltrados"
            [cursoArrastrando]="vm().cursoArrastrando"
            [filtroCiclo]="vm().filtroCiclo"
            [filtroTipo]="vm().filtroTipo"
            [busqueda]="vm().busqueda"
            (arrastreIniciado)="onArrastreIniciado($event)"
            (arrastreFinalizado)="onArrastreFinalizado()"
            (bloqueSeleccionado)="onBloqueSeleccionado($event)"
            (filtroCicloChange)="onFiltroCicloChange($event)"
            (filtroTipoChange)="onFiltroTipoChange($event)"
            (busquedaChange)="onBusquedaChange($event)">
          </app-banco-cursos>
        </aside>

        <main class="asignador__center">
          @if (vm().viewMode === 'docente') {
            <div class="asignador__docente-select">
              <mat-form-field appearance="outline" class="asignador__docente-field">
                <mat-label>{{ 'asignador.selectDocente' | translate }}</mat-label>
                <mat-select [value]="vm().docenteSeleccionadoId" (selectionChange)="onDocenteChange($event.value)">
                  <mat-option value="">{{ 'asignador.selectDocentePlaceholder' | translate }}</mat-option>
                  @for (d of vm().docentes; track d.id) {
                    <mat-option [value]="d.id">
                      <div class="docente-option">
                        <span class="docente-option__name">{{ safeDocenteNombre(d) }}</span>
                        <span class="docente-option__load">{{ toSafeNumber(d.horasLectivasAsignadas) }}/{{ toSafeNumber(d.horasLectivasMax) }}h</span>
                      </div>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (vm().docenteActual) {
                <app-indicador-carga [docente]="vm().docenteActual!"></app-indicador-carga>
              }
            </div>
          }

          @if (vm().viewMode === 'ambiente') {
            <div class="asignador__docente-select">
              <mat-form-field appearance="outline" class="asignador__docente-field">
                <mat-label>{{ 'asignador.selectAmbiente' | translate }}</mat-label>
                <mat-select [value]="vm().ambienteSeleccionadoId" (selectionChange)="onAmbienteViewChange($event.value)">
                  <mat-option value="">{{ 'asignador.selectAmbientePlaceholder' | translate }}</mat-option>
                  @for (amb of vm().ambientes; track amb.id) {
                    <mat-option [value]="amb.id">
                      <div class="docente-option">
                        <span class="docente-option__name">{{ safeAmbienteNombre(amb) }}</span>
                        <span class="docente-option__load">{{ toSafeNumber(amb.totalBloquesOcupados) }}/30 bloques</span>
                      </div>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          }

          @if (vm().viewMode === 'ciclo') {
            <div class="asignador__docente-select">
              <mat-form-field appearance="outline" class="asignador__docente-field">
                <mat-label>{{ 'asignador.selectCiclo' | translate }}</mat-label>
                <mat-select [value]="vm().cicloSeleccionado" (selectionChange)="onCicloViewChange($event.value)">
                  <mat-option value="">{{ 'asignador.selectCicloPlaceholder' | translate }}</mat-option>
                  @for (c of vm().ciclosDisponibles; track c) {
                    <mat-option [value]="c">{{ c }}° {{ 'asignador.ciclo' | translate }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          }

          <div class="asignador__grid-area">
            <app-schedule-grid
              [blocks]="vm().gridBlocks"
              [paletteBlocks]="[]"
              [editable]="!vm().grillaReadonly"
              (blockAdded)="onBlockAdded($event)"
              (blockRemoved)="onBlockRemoved($event)"
              (conflictDetected)="onConflictsDetected($event)">
            </app-schedule-grid>
          </div>
        </main>

        <aside class="asignador__right">
          <app-panel-ambientes
            [ambientes]="vm().ambientes"
            [ambienteSeleccionadoId]="vm().ambienteSeleccionadoId"
            [filtroTipo]="vm().filtroAmbienteTipo"
            [filtroCapacidad]="vm().filtroAmbienteCapacidad"
            [filtroDisponibilidad]="vm().filtroAmbienteDisponibilidad"
            [busqueda]="vm().busquedaAmbiente"
            (seleccionar)="onAmbienteSeleccionado($event)"
            (filtroTipoChange)="onFiltroAmbienteTipoChange($event)"
            (filtroCapacidadChange)="onFiltroAmbienteCapacidadChange($event)"
            (filtroDisponibilidadChange)="onFiltroAmbienteDisponibilidadChange($event)"
            (busquedaChange)="onBusquedaAmbienteChange($event)">
          </app-panel-ambientes>
        </aside>
      </div>

      <app-mini-formulario
        [visible]="vm().formularioVisible"
        [data]="vm().formularioData"
        [ambientes]="vm().ambientes"
        (confirmar)="onFormConfirmar($event)"
        (cancelar)="cerrarFormulario()">
      </app-mini-formulario>

      @if (vm().loading) {
        <div class="asignador__loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      }
    </div>
  `,
  styles: [`
    .asignador { display: flex; flex-direction: column; min-height: 100%; position: relative; }
    .asignador--loading { opacity: 0.7; pointer-events: none; }

    .asignador__hero {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
      border-bottom: 1px solid #c7d2fe;
    }
    .asignador__hero-content { display: flex; align-items: center; gap: 12px; }
    .asignador__hero-icon { font-size: 36px; width: 36px; height: 36px; color: #4f46e5; }
    .asignador__title { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; }
    .asignador__subtitle { font-size: 12px; color: #64748b; margin: 2px 0 0; }
    .asignador__hero-actions { display: flex; gap: 8px; }

    .asignador__toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px; gap: 16px;
    }
    .asignador__error {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; background: #fef2f2; border: 1px solid #fecaca;
      border-radius: 6px; color: #dc2626; font-size: 13px;
    }
    .asignador__error mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .asignador__view-tabs { padding: 0 24px; }
    .asignador__view-tabs ::ng-deep .mat-mdc-tab-labels { min-height: 40px; }
    .asignador__view-tabs ::ng-deep .mat-mdc-tab:not(.mat-mdc-tab-disabled) .mdc-tab__text-label {
      display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600;
    }
    .asignador__view-tabs ::ng-deep mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .asignador__main {
      display: grid; grid-template-columns: 320px 1fr 280px;
      gap: 0; flex: 1; min-height: 0; padding: 12px 0;
    }
    .asignador__left, .asignador__right {
      border-right: 1px solid var(--color-border, #e2e8f0);
      overflow: hidden; display: flex; flex-direction: column;
    }
    .asignador__right { border-right: none; border-left: 1px solid var(--color-border, #e2e8f0); }
    .asignador__center { display: flex; flex-direction: column; padding: 12px 16px; overflow: auto; }

    .asignador__docente-select {
      display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;
    }
    .asignador__docente-field { flex: 1; max-width: 400px; }
    .asignador__grid-area { flex: 1; min-height: 0; }

    .docente-option { display: flex; justify-content: space-between; width: 100%; }
    .docente-option__name { font-weight: 600; }
    .docente-option__load { font-size: 11px; color: #64748b; margin-left: 8px; }

    .asignador__loading {
      position: fixed; inset: 0; background: rgba(255,255,255,0.7);
      display: flex; align-items: center; justify-content: center; z-index: 999;
    }

    @media (max-width: 1200px) {
      .asignador__main { grid-template-columns: 1fr; }
      .asignador__left, .asignador__right { border: none; max-height: 300px; }
    }
  `],
})
export class AsignadorComponent implements OnInit, OnDestroy {
  @ViewChild(ScheduleGridComponent) scheduleGrid!: ScheduleGridComponent;

  readonly vm = signal<AsignadorViewModel>(initialVM);

  private destroy$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private docenteChange$ = new Subject<number | null>();
  private ambienteChange$ = new Subject<number | null>();
  private cicloChange$ = new Subject<number | null>();

  constructor(
    public svc: AsignadorService,
    private validador: ValidadorFrontService,
    private periodoService: PeriodoService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.periodoService.periodo$.pipe(takeUntil(this.destroy$)).subscribe(async (codigo) => {
      if (codigo) {
        await this.loadData(codigo);
      }
    });

    this.svc.refresh$observable.pipe(takeUntil(this.destroy$)).subscribe(async () => {
      const codigo = this.periodoService.periodo;
      if (codigo) await this.loadData(codigo, true);
    });

    this.docenteChange$.pipe(debounceTime(150), takeUntil(this.destroy$)).subscribe(async (id) => {
      if (!id) return;
      await this.selectDocente(id);
    });

    this.ambienteChange$.pipe(debounceTime(100), takeUntil(this.destroy$)).subscribe(() => this.recalculateBlocks());

    this.cicloChange$.pipe(debounceTime(100), takeUntil(this.destroy$)).subscribe((ciclo: number | null) => {
      if (ciclo != null && ciclo > 0) this.vm.update(v => ({ ...v, cicloSeleccionado: ciclo }));
      this.recalculateBlocks();
    });

    const currentPeriodo = this.periodoService.periodo;
    if (currentPeriodo) this.loadData(currentPeriodo);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.docenteChange$.complete();
    this.ambienteChange$.complete();
    this.cicloChange$.complete();
  }

  protected readonly toSafeString = toSafeString;
  protected readonly toSafeNumber = toSafeNumber;

  safeDocenteNombre(d: DocenteAsignador): string {
    return toSafeString(d?.apellido) + ', ' + toSafeString(d?.nombre);
  }

  safeAmbienteNombre(amb: AmbienteDisponible): string {
    return toSafeString(amb?.codigo) + ' — ' + toSafeString(amb?.nombre);
  }

  private async loadData(periodoCodigo: string, preserveSelection = false): Promise<void> {
    this.vm.update(v => ({ ...v, loading: true, error: null }));
    try {
      const periodos = this.periodoService.periodos;
      const activo = periodos.find((p: PeriodoAcademico) => p.codigo === periodoCodigo);
      if (!activo) throw new Error('Período no encontrado');

      await this.svc.cargarDatos(activo.id, periodoCodigo);

      if (!preserveSelection && this.vm().docenteSeleccionadoId) {
        await this.selectDocente(this.vm().docenteSeleccionadoId!);
      }

      this.updateDerivedState();
    } catch (e) {
      console.error('Error loading data:', e);
      this.vm.update(v => ({ ...v, error: this.translate.instant('asignador.errorLoading') }));
    } finally {
      this.vm.update(v => ({ ...v, loading: false }));
    }
  }

  private async selectDocente(id: number): Promise<void> {
    const doc = this.svc.docentes().find((d: DocenteAsignador) => d.id === id);
    if (!doc) return;

    const periodos = this.periodoService.periodos;
    const codigo = this.periodoService.periodo;
    const activo = periodos.find((p: PeriodoAcademico) => p.codigo === codigo);
    const periodoId = activo?.id ?? 0;
    
    await this.svc.seleccionarDocente(doc, periodoId);
    this.vm.update(v => ({ ...v, grillaReadonly: false }));
    this.recalculateBlocks();
  }

  private updateDerivedState(): void {
    const state = this.vm();
    const docentes = this.svc.docentes();
    const ambientes = this.svc.ambientes();
    const cursos = this.svc.cursosPendientes();
    const bloquesDocente = this.svc.bloquesDocente();
    const docenteSeleccionado = this.svc.docenteSeleccionado();

    const ciclos = [...new Set(cursos.map(c => toSafeNumber(c.ciclo) || 0))].sort((a, b) => a - b);

    const filtroCiclo = state.filtroCiclo;
    const filtroTipo = state.filtroTipo;
    const busqueda = state.busqueda.toLowerCase().trim();

    let cursosFiltrados = cursos;
    if (filtroCiclo !== 'all') {
      cursosFiltrados = cursosFiltrados.filter(c => toSafeNumber(c.ciclo) === toSafeNumber(filtroCiclo));
    }
    if (filtroTipo !== 'all') {
      cursosFiltrados = cursosFiltrados.filter(c => c.tipoCurso === filtroTipo);
    }
    if (busqueda) {
      cursosFiltrados = cursosFiltrados.filter(c =>
        c.codigo.toLowerCase().includes(busqueda) || c.nombre.toLowerCase().includes(busqueda)
      );
    }

    this.vm.update(v => ({
      ...v,
      docentes,
      ambientes,
      cursosPendientes: cursos,
      docenteSeleccionado,
      bloquesDocente,
      cursoArrastrando: this.svc.cursoArrastrando(),
      tipoClaseArrastrando: this.svc.tipoClaseArrastrando(),
      formularioVisible: this.svc.formularioVisible(),
      formularioData: this.svc.formularioData(),
      progreso: this.svc.progreso(),
      undoDisponible: this.svc.undoDisponible(),
      ciclosDisponibles: ciclos,
      cursosFiltrados,
      docenteActual: docenteSeleccionado,
    }));

    this.recalculateBlocks();
  }

  recalculateBlocks(): void {
    try {
      const state = this.vm();
      let rawBlocks: BloqueHorario[] = [];

      if (state.viewMode === 'docente') {
        rawBlocks = Array.isArray(state.bloquesDocente) ? state.bloquesDocente : [];
      } else if (state.viewMode === 'ambiente') {
        if (state.ambienteSeleccionadoId != null) {
          const amb = state.ambientes.find(a => a.id === state.ambienteSeleccionadoId);
          rawBlocks = amb?.bloquesOcupados || [];
        }
      } else if (state.viewMode === 'ciclo') {
        const cicloNum = toSafeNumber(state.cicloSeleccionado);
        for (const doc of state.docentes) {
          const bloques = Array.isArray(doc.bloquesExistentes) ? doc.bloquesExistentes : [];
          for (const blk of bloques) {
            const curso = state.cursosPendientes.find(c => c.cursoId === blk.cursoId);
            if (curso && toSafeNumber(curso.ciclo) === cicloNum) {
              rawBlocks.push(blk);
            }
          }
        }
      }

      const validBlocks = rawBlocks.filter(b => this.isValidBloqueHorario(b));
      if (validBlocks.length !== rawBlocks.length) {
        console.warn('Filtered invalid schedule blocks', rawBlocks);
      }

      const blocks = this.convertBloquesToScheduleBlocks(validBlocks);
      const grillaReadonly = state.viewMode === 'docente' ? !state.docenteSeleccionado : false;

      this.vm.update(v => ({ ...v, gridBlocks: blocks, grillaReadonly }));
    } catch (e) {
      console.error('Error in recalculateBlocks:', e);
      this.vm.update(v => ({ ...v, gridBlocks: [] }));
    }
  }

  private isValidBloqueHorario(b: BloqueHorario | null | undefined): b is BloqueHorario {
    if (!b || typeof b !== 'object') return false;
    const hasDia = b.dia != null && (typeof b.dia === 'number' || typeof b.dia === 'string');
    const hasHora = b.horaInicio != null || b.horaFin != null;
    return hasDia && hasHora;
  }

  private convertBloquesToScheduleBlocks(bloques: BloqueHorario[]): ScheduleBlock[] {
    return bloques.map(b => this.normalizeScheduleBlock({
      id: toSafeString(b.id),
      tipo: toSafeString(b.tipo, 'lectiva') as 'lectiva' | 'no-lectiva',
      dia: toSafeNumber(b.dia, 1),
      hora_inicio: toSafeString(b.horaInicio, '08:00'),
      hora_fin: toSafeString(b.horaFin, '09:00'),
      duracion: this.calcDuracion(toSafeString(b.horaInicio, '08:00'), toSafeString(b.horaFin, '09:00')),
      label: toSafeString(b.label),
      sublabel: b.sublabel != null ? toSafeString(b.sublabel) : undefined,
      badge: toSafeString(b.badge),
      colorKey: b.colorKey != null ? toSafeString(b.colorKey) : undefined,
      readOnly: !!b.readOnly,
      tooltip: b.sublabel ? `${toSafeString(b.label)} — ${toSafeString(b.sublabel)}` : toSafeString(b.label),
    }));
  }

  private normalizeScheduleBlock(block: ScheduleBlock): ScheduleBlock {
    return {
      ...block,
      id: toSafeString(block?.id),
      tipo: toSafeString(block?.tipo, 'lectiva') as 'lectiva' | 'no-lectiva',
      dia: toSafeNumber(block?.dia, 1),
      hora_inicio: toSafeString(block?.hora_inicio, '08:00'),
      hora_fin: toSafeString(block?.hora_fin, '09:00'),
      duracion: toSafeNumber(block?.duracion, 1),
      label: toSafeString(block?.label),
      sublabel: block?.sublabel != null ? toSafeString(block.sublabel) : undefined,
      badge: block?.badge != null ? toSafeString(block.badge) : undefined,
      colorKey: block?.colorKey != null ? toSafeString(block.colorKey) : undefined,
      tooltip: block?.tooltip != null ? toSafeString(block.tooltip) : (block?.sublabel ? `${toSafeString(block?.label)} — ${toSafeString(block.sublabel)}` : toSafeString(block?.label)),
      readOnly: !!block?.readOnly,
    };
  }

  private calcDuracion(inicio: string, fin: string): number {
    try {
      const h1 = parseInt(toSafeString(inicio, '08').split(':')[0], 10);
      const h2 = parseInt(toSafeString(fin, '09').split(':')[0], 10);
      return Math.max(1, Math.abs(h2 - h1));
    } catch { return 1; }
  }

  onViewChange(): void {
    const modes: ViewMode[] = ['docente', 'ambiente', 'ciclo'];
    this.vm.update(v => ({ ...v, viewMode: modes[v.viewTabIndex] || 'docente' }));
    this.recalculateBlocks();
  }

  onDocenteChange(id: number | null): void {
    this.vm.update(v => ({ ...v, docenteSeleccionadoId: id }));
    this.docenteChange$.next(id);
  }

  onAmbienteViewChange(id: number | null): void {
    this.vm.update(v => ({ ...v, ambienteSeleccionadoId: id }));
    this.ambienteChange$.next(id);
  }

  onCicloViewChange(ciclo: number | null): void {
    this.cicloChange$.next(ciclo);
  }

  onAmbienteSeleccionado(amb: AmbienteDisponible): void {
    this.vm.update(v => ({ ...v, ambienteSeleccionadoId: amb.id }));
    if (this.vm().viewMode === 'ambiente') this.recalculateBlocks();
  }

  onArrastreIniciado(event: { curso: CursoPendiente; tipoClase: string }): void {
    this.svc.iniciarArrastre(event.curso, event.tipoClase);
  }

  onArrastreFinalizado(): void {
    this.svc.finalizarArrastre();
  }

  onBloqueSeleccionado(event: { curso: CursoPendiente; tipoClase: string }): void {
    const duracion = event.tipoClase === 'LABORATORIO' ? 3 : 2;
    const block: PaletteBlock = {
      id: `pal_${event.curso.cursoPlanId}_${event.tipoClase}`,
      duracion,
      label: `${event.curso.codigo} — ${event.tipoClase}`,
      tipo: 'lectiva',
      colorKey: this.getTipoColorKey(event.tipoClase),
    };
    if (this.scheduleGrid) this.scheduleGrid.toggleArm(block);
  }

  onBlockAdded(block: ScheduleBlock): void {
    const curso = this.svc.cursoArrastrando() || this.svc.cursoSeleccionado();
    const docente = this.svc.docenteSeleccionado();
    const tipoClase = this.svc.tipoClaseArrastrando() || this.svc.tipoClaseSeleccionado();

    if (!curso || !docente || !tipoClase) return;

    const data: MiniFormularioData = {
      curso,
      dia: block.dia,
      horaInicio: block.hora_inicio,
      horaFin: block.hora_fin,
      docente,
      tipoClase,
      grupos: (() => {
        const matching = curso.grupos.filter((g: GrupoInfo) => g.tipo === tipoClase);
        return matching.length > 0 ? matching : curso.grupos.filter((g: GrupoInfo) => g.tipo === 'TEORIA');
      })(),
      ambientes: this.svc.ambientes(),
      periodo: this.periodoService.periodo,
    };
    this.svc.abrirFormulario(data);
    this.svc.finalizarArrastre();
  }

  onBlockRemoved(block: ScheduleBlock): void {
    if (!block.id || block.id.startsWith('temp_')) return;
    const horarioId = parseInt(block.id.replace(/\D/g, ''), 10);
    if (isNaN(horarioId)) return;

    this.svc.eliminarBloque(horarioId, block).then(ok => {
      this.snackBar.open(ok ? 'Bloque eliminado' : 'Error al eliminar', 'Cerrar', { duration: 3000 });
    });
  }

  onConflictsDetected(conflicts: ConflictInfo[]): void {
    if (conflicts.length > 0) {
      this.snackBar.open(`${conflicts.length} conflicto(s) detectado(s)`, 'Cerrar', {
        duration: 5000, panelClass: 'snackbar-warning',
      });
    }
  }

  async onFormConfirmar(datos: any): Promise<void> {
    const codigo = this.periodoService.periodo;
    datos.periodo = codigo;

    const ok = await this.svc.asignarBloque(datos);
    this.svc.cerrarFormulario();

    this.snackBar.open(ok ? 'Asignación exitosa' : 'Error en la asignación', 'OK', {
      duration: ok ? 3000 : 4000, panelClass: ok ? 'snackbar-success' : 'snackbar-error'
    });
  }

  deshacer(): void {
    this.svc.deshacer().then(ok => {
      if (ok) this.snackBar.open('Acción deshecha', 'OK', { duration: 2000 });
    });
  }

  guardarTodo(): void {
    this.snackBar.open('Borrador guardado', 'OK', { duration: 2000 });
  }

  cargarDatos(): void {
    const periodos = this.periodoService.periodos;
    const codigo = this.periodoService.periodo;
    const activo = periodos.find((p: PeriodoAcademico) => p.codigo === codigo);
    if (activo) {
      this.svc.cargarDatos(activo.id, codigo);
    }
  }

  setError(error: string | null): void {
    this.vm.update(v => ({ ...v, error }));
  }

  cerrarFormulario(): void {
    this.svc.cerrarFormulario();
  }

  onFiltroCicloChange(value: string): void { this.vm.update(v => ({ ...v, filtroCiclo: value })); this.updateDerivedState(); }
  onFiltroTipoChange(value: string): void { this.vm.update(v => ({ ...v, filtroTipo: value })); this.updateDerivedState(); }
  onBusquedaChange(value: string): void { this.vm.update(v => ({ ...v, busqueda: value })); this.updateDerivedState(); }

  onFiltroAmbienteTipoChange(value: string): void { this.vm.update(v => ({ ...v, filtroAmbienteTipo: value })); }
  onFiltroAmbienteCapacidadChange(value: string): void { this.vm.update(v => ({ ...v, filtroAmbienteCapacidad: value })); }
  onFiltroAmbienteDisponibilidadChange(value: string): void { this.vm.update(v => ({ ...v, filtroAmbienteDisponibilidad: value })); }
  onBusquedaAmbienteChange(value: string): void { this.vm.update(v => ({ ...v, busquedaAmbiente: value })); }

  private getTipoColorKey(tipo: string): string {
    const map: Record<string, string> = { TEORIA: '2', PRACTICA: '4', LABORATORIO: '3' };
    return map[tipo] || '2';
  }
}