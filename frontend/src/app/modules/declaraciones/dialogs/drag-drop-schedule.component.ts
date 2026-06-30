import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { Subscription } from 'rxjs';
import { DiasActivosService } from '../../../core/services/dias-activos.service';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { ApiResponse } from '../../../core/interfaces/entities';
import {
  DIA_CODIGO_A_ETIQUETA,
  DIA_CODIGO_A_CORTO,
  HorarioLectivoRef,
  normalizarHora,
  seSuperponen,
} from '../horario.utils';

export interface HorarioEntry {
  dia: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface ActividadHorarios {
  id: number;
  nombre: string;
  horarios: HorarioEntry[];
}

export interface DragDropScheduleData {
  actividadId: number;
  actividadNombre: string;
  horarios: HorarioEntry[];
  horas: number;
  maxHoras?: number;
  totalHorasLectivas?: number;
  horariosLectivos: HorarioLectivoRef[];
  allActividades: ActividadHorarios[];
}

const COLORES_ACTIVIDADES: Record<number, { bg: string; border: string; text: string; label: string }> = {
  2:  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', label: '2' },
  3:  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', label: '3' },
  4:  { bg: '#dcfce7', border: '#22c55e', text: '#166534', label: '4' },
  5:  { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8', label: '5' },
  6:  { bg: '#ffe4e6', border: '#f43f5e', text: '#9f1239', label: '6' },
  7:  { bg: '#e0f2fe', border: '#0ea5e9', text: '#0c4a6e', label: '7' },
  8:  { bg: '#fef9c3', border: '#eab308', text: '#854d0e', label: '8' },
  9:  { bg: '#d1fae5', border: '#10b981', text: '#065f46', label: '9' },
  10: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', label: '10' },
};

interface CeldaState {
  dia: string;
  hora: number;
  tipo: 'vacia' | 'lectiva' | 'no-lectiva' | 'almuerzo';
  asignacion?: HorarioLectivoRef;
  actividadBloque?: { id: number; nombre: string };
}

@Component({
  selector: 'app-drag-drop-schedule',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatChipsModule,
  ],
  template: `
    <div class="schedule-container">
      <!-- Header -->
      <div class="schedule-header">
        <div class="header-left">
          <span class="actividad-badge" [style.background]="getColor(data.actividadId).border">
            {{ data.actividadId }}
          </span>
          <span class="actividad-name">{{ data.actividadNombre }}</span>
        </div>
        <div class="header-right">
          <span class="stat-chip" [class.over-limit]="totalHoras > (data.maxHoras ?? 999)">
            <mat-icon>schedule</mat-icon>
            {{ totalHoras }}h / {{ data.maxHoras ?? '∞' }}h
          </span>
        </div>
      </div>

      <!-- Warning -->
      <div class="warning-banner" *ngIf="totalHoras > (data.maxHoras ?? 999)">
        <mat-icon>warning</mat-icon>
        Horas excedidas ({{ totalHoras }}h > {{ data.maxHoras }}h).
      </div>

      <!-- Grid -->
      <div class="grid-scroll">
        <table class="horario-grid">
          <thead>
            <tr>
              <th class="hora-col">Hora</th>
              <th *ngFor="let d of diasLabels; let i = index" class="dia-col">{{ d }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let h of horas" [class.fila-almuerzo]="h >= almuerzoInicio && h < almuerzoFin">
              <td class="hora-cell" [class.hora-alm]="h >= almuerzoInicio && h < almuerzoFin">
                <span class="hora-texto">{{ fmtHora(h) }}</span>
                <span *ngIf="h >= almuerzoInicio && h < almuerzoFin" class="alm-tag">ALM</span>
              </td>
              <ng-container *ngFor="let d of diasNum">
                <td
                  class="celda"
                  [ngClass]="getCeldaClase(d, h)"
                  [style.background]="getCeldaBg(d, h)"
                  [style.border-color]="getCeldaBorder(d, h)"
                  [class.celda-clickable]="puedeSeleccionar(d, h)"
                  [class.celda-seleccionada]="estaSeleccionada(d, h)"
                  [class.celda-otra]="esBloqueOtraActividad(d, h)"
                  (click)="onCellClick(d, h)"
                  [matTooltip]="getTooltipCelda(d, h)"
                >
                  <!-- Almuerzo -->
                  <div *ngIf="esAlmuerzo(d, h)" class="celda-content alm-content">
                    <mat-icon>restaurant</mat-icon>
                    <span class="alm-label">ALMUERZO</span>
                  </div>

                  <!-- Bloque lectivo -->
                  <div *ngIf="getCelda(d, h)?.tipo === 'lectiva'" class="celda-content lectiva-content">
                    <span class="tipo-badge badge-lectiva">[{{ getBadgeTipo(d, h) }}]</span>
                    <div class="curso-nombre">{{ getCursoNombre(d, h) }}</div>
                    <div class="celda-meta">
                      <span class="amb-codigo">{{ getAmbiente(d, h) }}</span>
                    </div>
                  </div>

                  <!-- Bloque de OTRA actividad (no editable) -->
                  <div *ngIf="esBloqueOtraActividad(d, h)" class="celda-content otra-content">
                    <span class="tipo-badge" [style.background]="getColor(getActividadIdBloque(d, h)).border" style="color:white">
                      [{{ getActividadIdBloque(d, h) }}]
                    </span>
                    <div class="curso-nombre">{{ getNombreActividadBloque(d, h) }}</div>
                  </div>

                  <!-- Bloque de la actividad ACTUAL (seleccionable) -->
                  <div *ngIf="estaSeleccionada(d, h)" class="celda-content seleccionada-content">
                    <span class="tipo-badge" [style.background]="getColor(data.actividadId).border" style="color:white">
                      [{{ data.actividadId }}]
                    </span>
                    <div class="curso-nombre">Seleccionada</div>
                    <button class="remove-cell-btn" (click)="desSeleccionar(d, h); $event.stopPropagation()" matTooltip="Quitar">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>

                  <!-- Celda vacía -->
                  <div *ngIf="getCelda(d, h)?.tipo === 'vacia' && !esAlmuerzo(d, h)" class="celda-content vacia-content">
                    <span class="add-icon" *ngIf="puedeSeleccionar(d, h)">
                      <mat-icon>add</mat-icon>
                    </span>
                  </div>
                </td>
              </ng-container>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Conflicts -->
      <div class="conflicts-panel" *ngIf="conflictos.length > 0">
        <mat-icon>warning</mat-icon>
        <span>{{ conflictos.length }} conflicto(s):</span>
        <span class="conflicto-item" *ngFor="let c of conflictos">{{ c }}</span>
      </div>

      <!-- Legend -->
      <div class="legend">
        <span class="legend-item">
          <span class="dot" style="background:#3b82f6"></span> Lectiva
        </span>
        <span class="legend-item" *ngFor="let a of otrasActividades">
          <span class="dot" [style.background]="getColor(a.id).border"></span>
          [{{ a.id }}] {{ a.nombre }}
        </span>
        <span class="legend-item">
          <span class="dot" [style.background]="getColor(data.actividadId).border"></span>
          [{{ data.actividadId }}] {{ data.actividadNombre }} (editar)
        </span>
        <span class="legend-item">
          <span class="dot dot-alm"></span> Almuerzo
        </span>
      </div>

      <!-- Instructions -->
      <div class="instructions" *ngIf="puedeEditar">
        <mat-icon>info</mat-icon>
        Haga clic en celdas vacías para asignar bloques a la actividad <strong>[{{ data.actividadId }}]</strong>.
        Los bloques de otras actividades se muestran como referencia.
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .schedule-container { background: var(--color-surface, #fff); border-radius: 8px; overflow: hidden; }

    .schedule-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; border-bottom: 1px solid var(--color-border, #e2e8f0);
      flex-wrap: wrap; gap: 8px;
    }
    .header-left { display: flex; align-items: center; gap: 8px; }
    .actividad-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 8px; color: white;
      font-size: 13px; font-weight: 800;
    }
    .actividad-name { font-size: 14px; font-weight: 700; color: var(--color-text, #1e293b); }
    .header-right { display: flex; gap: 6px; }
    .stat-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 700;
      background: var(--color-surface-2, #f1f5f9); color: var(--color-text-muted, #64748b);
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .stat-chip.over-limit { background: #fee2e2; color: #dc2626; }

    .warning-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; background: #fef3c7; color: #92400e; font-size: 13px;
      mat-icon { color: #d97706; }
    }

    .grid-scroll { overflow-x: auto; }
    .horario-grid { border-collapse: collapse; width: 100%; min-width: 720px; }
    .horario-grid th, .horario-grid td {
      border: 1px solid var(--color-border, #e2e8f0); text-align: center; vertical-align: middle;
    }
    .horario-grid thead th {
      background: var(--color-text-secondary, #334155); color: var(--color-surface, #fff);
      font-size: 11px; font-weight: 700; padding: 10px 6px; text-transform: uppercase;
    }
    .hora-col { width: 70px; border-right: 2px solid var(--color-text-muted, #64748b); }

    .hora-cell {
      background: var(--color-surface-2, #f1f5f9); padding: 6px; width: 70px;
      border-right: 2px solid var(--color-border, #e2e8f0);
    }
    .hora-texto {
      display: block; font-size: 11px; font-weight: 700;
      font-family: 'SF Mono', monospace; color: var(--color-primary, #1565c0);
    }
    .alm-tag { display: block; font-size: 9px; font-weight: 800; color: var(--color-text-disabled, #94a3b8); }
    .hora-alm { background: var(--color-surface-3, #cbd5e1); .hora-texto { color: var(--color-text-muted); } }

    .fila-almuerzo .celda-almuerzo {
      background: var(--color-surface-3, #cbd5e1);
      background-image: repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(148,163,184,0.15) 4px, rgba(148,163,184,0.15) 8px);
    }

    .celda { min-width: 130px; padding: 0; transition: all 0.15s; position: relative; }

    .celda-vacia {
      background: var(--color-surface, #fff);
      &:hover { background: var(--color-surface-2, #f1f5f9); }
    }
    .celda-lectiva { background: #dbeafe; &:hover { filter: brightness(0.96); } }
    .celda-almuerzo {
      background: var(--color-surface-2, #f1f5f9);
      background-image: repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(148,163,184,0.12) 4px, rgba(148,163,184,0.12) 8px);
    }

    .celda-clickable { cursor: pointer; }
    .celda-clickable:hover { background: #e0f2fe !important; box-shadow: inset 0 0 0 2px #0ea5e9; }
    .celda-seleccionada { box-shadow: inset 0 0 0 2px currentColor !important; }
    .celda-otra { box-shadow: inset 0 0 0 1px currentColor; }

    .celda-content {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 3px; padding: 8px 4px; text-align: center; min-height: 56px; position: relative;
    }

    .tipo-badge {
      display: inline-block; padding: 2px 6px; border-radius: 4px;
      font-size: 10px; font-weight: 800; letter-spacing: 0.05em;
    }
    .badge-lectiva { background: rgba(0,0,0,0.2); color: #1e40af; }

    .curso-nombre {
      font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.2;
      word-break: break-word; text-shadow: 0 0 2px rgba(255,255,255,0.5);
    }
    .celda-meta { display: flex; gap: 6px; font-size: 10px; .amb-codigo { font-weight: 700; color: #1e40af; } }

    .vacia-content .add-icon {
      opacity: 0; transition: opacity 0.15s;
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #94a3b8; }
    }
    .celda-clickable:hover .add-icon { opacity: 1; }

    .remove-cell-btn {
      position: absolute; top: 2px; right: 2px;
      width: 18px; height: 18px; padding: 0; background: #ef4444; color: white;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.15s;
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }
    .celda-seleccionada:hover .remove-cell-btn { opacity: 1; }

    .alm-content { mat-icon { font-size: 16px; color: #94a3b8; } .alm-label { font-size: 9px; font-weight: 700; color: #94a3b8; } }
    .lectiva-content, .otra-content, .seleccionada-content { cursor: default; }

    .conflicts-panel {
      display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
      padding: 8px 16px; background: #fee2e2; color: #991b1b; font-size: 12px;
      mat-icon { color: #dc2626; }
    }
    .conflicto-item { font-size: 11px; }

    .legend {
      display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 16px;
      border-top: 1px solid var(--color-border, #e2e8f0); background: var(--color-surface-2, #f8fafc);
    }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500; color: var(--color-text-muted); }
    .dot { width: 10px; height: 10px; border-radius: 3px; }
    .dot-alm { background: var(--color-surface-3, #cbd5e1); }

    .instructions {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; background: #eff6ff; color: #1e40af; font-size: 12px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
  `],
})
export class DragDropScheduleComponent implements OnChanges, OnDestroy {
  @Input() data!: DragDropScheduleData;
  @Input() puedeEditar = true;
  @Output() horariosChange = new EventEmitter<HorarioEntry[]>();
  @Output() horasChange = new EventEmitter<number>();

  readonly DIA_CODIGO_A_ETIQUETA = DIA_CODIGO_A_ETIQUETA;
  readonly DIA_CODIGO_A_CORTO = DIA_CODIGO_A_CORTO;
  readonly normalizarHora = normalizarHora;
  readonly parseInt = parseInt;

  diasLabels: string[] = [];
  diasNum: number[] = [];
  horas: number[] = [];
  franjaInicio = 7;
  franjaFin = 22;
  almuerzoInicio = 12;
  almuerzoFin = 14;

  private grid = new Map<string, CeldaState>();
  bloquesSeleccionados = new Map<string, HorarioEntry>();
  conflictos: string[] = [];
  otrasActividades: ActividadHorarios[] = [];
  private diasSub?: Subscription;
  private initialized = false;

  constructor(
    private snackBar: MatSnackBar,
    private diasActivosService: DiasActivosService,
    private api: ApiService,
    private periodoService: PeriodoService,
  ) {
    this.diasSub = this.diasActivosService.dias$.subscribe(() => {
      this.diasLabels = this.diasActivosService.nombres;
      this.diasNum = this.diasActivosService.numeros;
    });
    this.diasLabels = this.diasActivosService.nombres;
    this.diasNum = this.diasActivosService.numeros;
    this.cargarConfiguracion();
  }

  ngOnDestroy(): void {
    this.diasSub?.unsubscribe();
  }

  get totalHoras(): number {
    return this.bloquesSeleccionados.size;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.otrasActividades = (this.data.allActividades || [])
        .filter(a => a.id !== this.data.actividadId);
      this.buildHours();
      this.syncFromData();
    }
  }

  getColor(actividadId: number): { bg: string; border: string; text: string; label: string } {
    return COLORES_ACTIVIDADES[actividadId] || { bg: '#f1f5f9', border: '#64748b', text: '#334155', label: String(actividadId) };
  }

  private cargarConfiguracion(): void {
    this.api.get<ApiResponse<any>>('/configuracion/restricciones', {
      periodo: this.periodoService.periodo,
    }).subscribe({
      next: (r) => {
        const lista: any[] = r.data ?? [];
        const almuerzo = lista.find(x => x.tipo_restriccion === 'BLOQUE_ALMUERZO' && x.activo);
        if (almuerzo?.valor?.hora_inicio && almuerzo?.valor?.hora_fin) {
          this.almuerzoInicio = parseInt(almuerzo.valor.hora_inicio.split(':')[0], 10);
          this.almuerzoFin = parseInt(almuerzo.valor.hora_fin.split(':')[0], 10);
          this.buildGrid();
        }
        const franja = lista.find(x => x.tipo_restriccion === 'FRANJA_HORARIA' && x.activo);
        if (franja?.valor?.hora_inicio && franja?.valor?.hora_fin) {
          this.franjaInicio = parseInt(franja.valor.hora_inicio.split(':')[0], 10);
          this.franjaFin = parseInt(franja.valor.hora_fin.split(':')[0], 10);
          this.buildHours();
          this.buildGrid();
        }
      },
      error: () => {},
    });
  }

  private buildHours(): void {
    this.horas = [];
    for (let h = this.franjaInicio; h < this.franjaFin; h++) this.horas.push(h);
    if (this.diasNum.length === 0) {
      this.diasNum = this.diasActivosService.numeros;
      this.diasLabels = this.diasActivosService.nombres;
    }
  }

  private buildGrid(): void {
    this.grid.clear();
    for (const dNum of this.diasNum) {
      for (const h of this.horas) {
        const diaCod = this.diaNumToCod(dNum);
        const esAlm = h >= this.almuerzoInicio && h < this.almuerzoFin;

        const lectiva = this.data.horariosLectivos.find(l =>
          l.dia === diaCod && this.horaEnRango(h, l.hora_inicio, l.hora_fin)
        );

        let tipo: CeldaState['tipo'] = 'vacia';
        let asignacion: HorarioLectivoRef | undefined;
        let actividadBloque: { id: number; nombre: string } | undefined;

        if (esAlm) {
          tipo = 'almuerzo';
        } else if (lectiva) {
          tipo = 'lectiva';
          asignacion = lectiva;
        } else if (this.bloquesSeleccionados.has(`${diaCod}_${h}`)) {
          tipo = 'no-lectiva';
        } else {
          // Check other activities
          for (const act of this.otrasActividades) {
            const match = act.horarios.find(bh => {
              if (bh.dia !== diaCod) return false;
              const bhIni = parseInt(bh.hora_inicio.split(':')[0], 10);
              const bhFin = parseInt(bh.hora_fin.split(':')[0], 10);
              return h >= bhIni && h < bhFin;
            });
            if (match) {
              tipo = 'no-lectiva';
              actividadBloque = { id: act.id, nombre: act.nombre };
              break;
            }
          }
        }

        this.grid.set(`${dNum}_${h}`, { dia: diaCod, hora: h, tipo, asignacion, actividadBloque });
      }
    }
    this.detectarConflictos();
  }

  private horaEnRango(hora: number, inicio: string, fin: string): boolean {
    const ini = parseInt(inicio.split(':')[0], 10);
    const f = parseInt(fin.split(':')[0], 10);
    return hora >= ini && hora < f;
  }

  getCelda(diaNum: number, hora: number): CeldaState | undefined {
    return this.grid.get(`${diaNum}_${hora}`);
  }

  getCeldaClase(diaNum: number, hora: number): string {
    const c = this.getCelda(diaNum, hora);
    if (!c) return '';
    return `celda-${c.tipo}`;
  }

  getCeldaBg(diaNum: number, hora: number): string {
    const c = this.getCelda(diaNum, hora);
    if (!c) return '';
    if (c.tipo === 'lectiva') return '#dbeafe';
    if (c.tipo === 'almuerzo') return '';
    if (c.actividadBloque) return this.getColor(c.actividadBloque.id).bg;
    if (this.estaSeleccionada(diaNum, hora)) return this.getColor(this.data.actividadId).bg;
    return '';
  }

  getCeldaBorder(diaNum: number, hora: number): string {
    const c = this.getCelda(diaNum, hora);
    if (!c) return '';
    if (c.actividadBloque) return this.getColor(c.actividadBloque.id).border;
    if (this.estaSeleccionada(diaNum, hora)) return this.getColor(this.data.actividadId).border;
    return '';
  }

  esAlmuerzo(diaNum: number, hora: number): boolean {
    return hora >= this.almuerzoInicio && hora < this.almuerzoFin;
  }

  esBloqueOtraActividad(diaNum: number, hora: number): boolean {
    const c = this.getCelda(diaNum, hora);
    return !!c?.actividadBloque;
  }

  getActividadIdBloque(diaNum: number, hora: number): number {
    return this.getCelda(diaNum, hora)?.actividadBloque?.id ?? 0;
  }

  getNombreActividadBloque(diaNum: number, hora: number): string {
    return this.getCelda(diaNum, hora)?.actividadBloque?.nombre ?? '';
  }

  getBadgeTipo(diaNum: number, hora: number): string {
    return this.getCelda(diaNum, hora)?.asignacion?.tipoClase || 'TEO';
  }

  getCursoNombre(diaNum: number, hora: number): string {
    return this.getCelda(diaNum, hora)?.asignacion?.nombreCurso || '';
  }

  getAmbiente(diaNum: number, hora: number): string {
    return this.getCelda(diaNum, hora)?.asignacion?.seccion || '';
  }

  puedeSeleccionar(diaNum: number, hora: number): boolean {
    if (!this.puedeEditar) return false;
    const c = this.getCelda(diaNum, hora);
    if (!c) return false;
    // Can select empty cells or deselect own blocks
    return c.tipo === 'vacia' || (c.tipo === 'no-lectiva' && !c.actividadBloque);
  }

  estaSeleccionada(diaNum: number, hora: number): boolean {
    const c = this.getCelda(diaNum, hora);
    if (!c || c.tipo !== 'no-lectiva') return false;
    return !c.actividadBloque && this.bloquesSeleccionados.has(`${c.dia}_${hora}`);
  }

  onCellClick(diaNum: number, hora: number): void {
    if (!this.puedeSeleccionar(diaNum, hora)) return;
    if (this.estaSeleccionada(diaNum, hora)) {
      this.desSeleccionar(diaNum, hora);
    } else {
      this.seleccionar(diaNum, hora);
    }
  }

  seleccionar(diaNum: number, hora: number): void {
    const diaCod = this.diaNumToCod(diaNum);
    const key = `${diaCod}_${hora}`;
    const ini = `${String(hora).padStart(2, '0')}:00`;
    const fin = `${String(hora + 1).padStart(2, '0')}:00`;

    if (this.data.horariosLectivos.some(l => l.dia === diaCod && seSuperponen(l.hora_inicio, l.hora_fin, ini, fin))) {
      this.snackBar.open('Conflicto: hay carga lectiva en ese horario', 'Cerrar', { duration: 2000 });
      return;
    }

    this.bloquesSeleccionados.set(key, { dia: diaCod, hora_inicio: ini, hora_fin: fin });
    this.buildGrid();
    this.emitChanges();
  }

  desSeleccionar(diaNum: number, hora: number): void {
    const diaCod = this.diaNumToCod(diaNum);
    this.bloquesSeleccionados.delete(`${diaCod}_${hora}`);
    this.buildGrid();
    this.emitChanges();
  }

  getTooltipCelda(diaNum: number, hora: number): string {
    const c = this.getCelda(diaNum, hora);
    if (!c) return '';
    const diaLabel = DIA_CODIGO_A_ETIQUETA[c.dia] || c.dia;
    const horaLabel = `${this.fmtHora(hora)}–${this.fmtHora(hora + 1)}`;

    if (c.tipo === 'lectiva' && c.asignacion) {
      return `${diaLabel} ${horaLabel}: ${c.asignacion.nombreCurso} (${c.asignacion.tipoClase || 'TEO'})`;
    }
    if (c.actividadBloque) {
      return `${diaLabel} ${horaLabel}: [${c.actividadBloque.id}] ${c.actividadBloque.nombre}`;
    }
    if (this.estaSeleccionada(diaNum, hora)) {
      return `${diaLabel} ${horaLabel}: [${this.data.actividadId}] Seleccionada (click para quitar)`;
    }
    if (c.tipo === 'almuerzo') {
      return `${diaLabel} ${horaLabel}: Almuerzo`;
    }
    return `${diaLabel} ${horaLabel}: Disponible`;
  }

  private diaNumToCod(diaNum: number): string {
    const map: Record<number, string> = { 1: 'LU', 2: 'MA', 3: 'MI', 4: 'JU', 5: 'VI', 6: 'SA' };
    return map[diaNum] || 'LU';
  }

  fmtHora(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  private syncFromData(): void {
    this.bloquesSeleccionados.clear();
    if (this.data.horarios?.length) {
      for (const h of this.data.horarios) {
        const hora = parseInt(h.hora_inicio.split(':')[0], 10);
        const key = `${h.dia}_${hora}`;
        this.bloquesSeleccionados.set(key, { dia: h.dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin });
      }
    }
    this.buildGrid();
    this.initialized = true;
  }

  private emitChanges(): void {
    if (!this.initialized) return;
    const entries = Array.from(this.bloquesSeleccionados.values());
    this.horariosChange.emit(entries);
    this.horasChange.emit(this.totalHoras);
  }

  private detectarConflictos(): void {
    this.conflictos = [];
    const list = Array.from(this.bloquesSeleccionados.values());
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]; const b = list[j];
        if (a.dia === b.dia && seSuperponen(a.hora_inicio, a.hora_fin, b.hora_inicio, b.hora_fin)) {
          this.conflictos.push(`${DIA_CODIGO_A_ETIQUETA[a.dia]} ${a.hora_inicio}–${a.hora_fin} vs ${b.hora_inicio}–${b.hora_fin}`);
        }
      }
    }
  }
}
