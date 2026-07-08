import {
  Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges,
  ChangeDetectionStrategy, ChangeDetectorRef, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ScheduleConfigService, ScheduleConfig } from '../../../core/services/schedule-config.service';
import { seSuperponen, normalizarHora } from '../../../modules/declaraciones/horario.utils';
import { ScheduleBlock, BlockType, PaletteBlock, ConflictInfo } from './schedule-grid.models';

const BLOCK_COLORS: Record<string, { bg: string; border: string; text: string; light: string }> = {
  lectiva:      { bg: '#e8eaf6', border: '#5c6bc0', text: '#283593', light: '#c5cae9' },
  'no-lectiva': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', light: '#fde68a' },
  ventana:      { bg: '#fce4ec', border: '#e91e63', text: '#880e4f', light: '#f8bbd0' },
  almuerzo:     { bg: '#f5f5f5', border: '#bdbdbd', text: '#616161', light: '#e0e0e0' },
};

const ACTIVITY_COLORS: Record<number, { bg: string; border: string; text: string; light: string }> = {
  2:  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', light: '#fde68a' },
  3:  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', light: '#bfdbfe' },
  4:  { bg: '#dcfce7', border: '#22c55e', text: '#166534', light: '#bbf7d0' },
  5:  { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8', light: '#e9d5ff' },
  6:  { bg: '#ffe4e6', border: '#f43f5e', text: '#9f1239', light: '#fecdd3' },
  7:  { bg: '#e0f2fe', border: '#0ea5e9', text: '#0c4a6e', light: '#bae6fd' },
  8:  { bg: '#fef9c3', border: '#eab308', text: '#854d0e', light: '#fef08a' },
  9:  { bg: '#d1fae5', border: '#10b981', text: '#065f46', light: '#a7f3d0' },
  10: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', light: '#ddd6fe' },
};

type ColorSource = { tipo: string; colorKey?: string };

function getColorForBlock(block: ColorSource): { bg: string; border: string; text: string; light: string } {
  if (block.tipo === 'lectiva') return BLOCK_COLORS['lectiva'];
  if (block.tipo === 'ventana') return BLOCK_COLORS['ventana'];
  if (block.colorKey) {
    const id = parseInt(block.colorKey, 10);
    if (!isNaN(id) && ACTIVITY_COLORS[id]) return ACTIVITY_COLORS[id];
  }
  return BLOCK_COLORS['no-lectiva'];
}

@Component({
  selector: 'app-schedule-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, DragDropModule, MatButtonModule, MatIconModule, MatTooltipModule,
  ],
  template: `
    <div class="sg" [class.sg--readonly]="!editable" [class.sg--armed]="armedBlock !== null">

      <!-- Header -->
      <header class="sg-header">
        <div class="sg-header__left">
          <ng-content select="[headerLeft]"></ng-content>
        </div>
        <div class="sg-header__right">
          <ng-content select="[headerRight]"></ng-content>
        </div>
      </header>

      <!-- Palette -->
      @if (editable && paletteBlocks.length > 0) {
        <div class="sg-palette" cdkDropList
             [cdkDropListData]="paletteBlocks"
             (cdkDropListDropped)="onPaletteDrop($event)">
          <div class="sg-palette__title">
            <mat-icon>view_week</mat-icon>
            <span>Bloques disponibles</span>
          </div>
          <div class="sg-palette__items">
            @for (b of paletteBlocks; track b.id) {
              <div class="sg-palette-block"
                   cdkDrag
                   [cdkDragData]="b"
                   [style.--block-bg]="getBlockColor(b).light"
                   [style.--block-border]="getBlockColor(b).border"
                   [class.sg-palette-block--armed]="armedBlock?.id === b.id"
                   (click)="toggleArm(b)">
                <span class="sg-palette-block__dur">{{ b.duracion }}h</span>
                <span class="sg-palette-block__label">{{ b.label }}</span>
                <mat-icon class="sg-palette-block__drag" cdkDragHandle>drag_indicator</mat-icon>
              </div>
            }
          </div>
          <p class="sg-palette__hint">
            Arrastre un bloque a la grilla o seleccione y haga clic
          </p>
        </div>
      }

      <!-- Armed toolbar -->
      @if (armedBlock !== null && editable) {
        <div class="sg-toolbar" [style.--accent]="getBlockColor(armedBlock).border">
          <mat-icon>touch_app</mat-icon>
          <span><strong>{{ armedBlock.duracion }}h</strong> — Haga clic en celdas vacías para asignar</span>
          <span class="sg-toolbar__hint">Shift+clic para rango · Clic derecho para eliminar</span>
          <button mat-icon-button (click)="disarm()" matTooltip="Cancelar (Esc)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }

      <!-- Grid -->
      <div class="sg-grid-wrap">
        <div class="sg-grid" [style.--cols]="dias.length">
          <div class="sg-cell sg-cell--corner">Hora</div>
          @for (d of diasLabels; track d) {
            <div class="sg-cell sg-cell--header">{{ d }}</div>
          }

          @if (almuerzoDuracion > 0) {
            <div class="sg-almuerzo-band"
                 [style.grid-row]="almuerzoGridRow"
                 style="grid-column: 2 / -1">
              <div class="sg-almuerzo-band__inner">
                <mat-icon>restaurant</mat-icon>
                <span>ALMUERZO · {{ fmtHora(almuerzoInicio) }}–{{ fmtHora(almuerzoFin) }}</span>
              </div>
            </div>
          }

          @for (h of horas; track h) {
            <div class="sg-cell sg-cell--hour"
                 [class.sg-cell--almuerzo]="h >= almuerzoInicio && h < almuerzoFin">
              <span class="sg-hour-text">{{ fmtHora(h) }}</span>
              @if (h >= almuerzoInicio && h < almuerzoFin) {
                <span class="sg-hour-tag">ALM</span>
              }
            </div>

            @for (d of dias; track d) {
              <div class="sg-cell sg-cell--body"
                   [class.sg-cell--almuerzo]="isAlmuerzo(d, h)"
                   [class.sg-cell--occupied]="getCellState(d, h) !== 'vacia' && !isAlmuerzo(d, h)"
                   [class.sg-cell--armed-hover]="armedBlock !== null && canPlace(d, h)"
                   [class.sg-cell--no-place]="armedBlock !== null && !canPlace(d, h) && !isAlmuerzo(d, h)"
                   [style.--cell-bg]="getCellBg(d, h)"
                   [style.--cell-border]="getCellBorder(d, h)"
                   [attr.data-dia]="d"
                   [attr.data-hora]="h"
                   (mousedown)="onCellMouseDown($event, d, h)"
                   (mouseenter)="onCellMouseEnter(d, h)"
                   (click)="onCellClick($event, d, h)"
                   [matTooltip]="getCellTooltip(d, h)">

                @if (isAlmuerzo(d, h)) {
                  <div class="sg-cell__content sg-cell__content--alm">
                    <mat-icon>restaurant</mat-icon>
                    <span>ALMUERZO</span>
                  </div>
                } @else {
                  @for (blk of getCellBlocks(d, h); track blk.id) {
                    <div class="sg-cell__block"
                         [style.--blk-bg]="getBlockColor(blk).bg"
                         [style.--blk-border]="getBlockColor(blk).border"
                         [style.--blk-text]="getBlockColor(blk).text"
                         [class.sg-cell__block--lectiva]="blk.tipo === 'lectiva'"
                         [class.sg-cell__block--no-lectiva]="blk.tipo === 'no-lectiva'"
                         [class.sg-cell__block--ventana]="blk.tipo === 'ventana'"
                         [class.sg-cell__block--readonly]="blk.readOnly">
                      <span class="sg-block__badge" [style.background]="getBlockColor(blk).border">
                        {{ blk.badge || getShortType(blk) }}
                      </span>
                      <span class="sg-block__name">{{ blk.label }}</span>
                      @if (blk.sublabel) {
                        <span class="sg-block__sub">{{ blk.sublabel }}</span>
                      }
                      @if (!blk.readOnly && editable) {
                        <button class="sg-block__remove" (click)="removeBlock(blk); $event.stopPropagation(); $event.preventDefault()"
                                matTooltip="Eliminar">
                          <mat-icon>close</mat-icon>
                        </button>
                      }
                    </div>
                  }

                  @if (getCellBlocks(d, h).length === 0) {
                    <div class="sg-cell__empty">
                      @if (armedBlock !== null && canPlace(d, h)) {
                        <mat-icon class="sg-cell__preview">add_circle</mat-icon>
                      }
                    </div>
                  }
                }
              </div>
            }
          }
        </div>
      </div>

      @if (conflicts.length > 0) {
        <div class="sg-conflicts">
          <mat-icon>warning</mat-icon>
          <span>{{ conflicts.length }} conflicto(s) detectado(s)</span>
        </div>
      }

      <div class="sg-summary">
        <ng-content select="[summary]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .sg { display: flex; flex-direction: column; gap: 16px; }

    .sg-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .sg-header__left, .sg-header__right { display: flex; align-items: center; gap: 8px; }

    .sg-palette {
      background: var(--color-surface-2); border: 1px solid var(--color-border);
      border-radius: 10px; padding: 8px 16px;
    }
    .sg-palette__title {
      display: flex; align-items: center; gap: 4px; margin-bottom: 8px;
      font-size: 11px; font-weight: 700; color: var(--color-text-secondary);
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .sg-palette__title mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--color-primary); }
    .sg-palette__items { display: flex; flex-wrap: wrap; gap: 8px; }
    .sg-palette__hint { margin: 8px 0 0; font-size: 10px; color: var(--color-text-muted); text-align: center; }

    .sg-palette-block {
      display: flex; align-items: center; gap: 4px; padding: 6px 12px;
      background: var(--block-bg, #f3f4f6); border: 1px solid var(--block-border, #d1d5db);
      border-radius: 6px; cursor: grab; font-size: 12px; font-weight: 600;
      color: var(--color-text); transition: all 150ms ease; user-select: none;
    }
    .sg-palette-block:hover { box-shadow: 0 1px 2px rgba(0,0,0,0.05); transform: translateY(-1px); }
    .sg-palette-block--armed { outline: 2px solid var(--block-border, #d1d5db); outline-offset: 2px; }
    .sg-palette-block__dur { font-weight: 800; font-size: 11px; }
    .sg-palette-block__label { white-space: nowrap; }
    .sg-palette-block__drag { font-size: 14px; width: 14px; height: 14px; opacity: 0.4; }

    .sg-toolbar {
      display: flex; align-items: center; gap: 8px; padding: 8px 16px;
      background: var(--color-primary-bg); border: 1px solid var(--accent, var(--color-primary));
      border-radius: 6px; font-size: 12px; color: var(--color-text);
    }
    .sg-toolbar mat-icon { color: var(--accent, var(--color-primary)); }
    .sg-toolbar span { flex: 1; }
    .sg-toolbar__hint { font-size: 10px; color: var(--color-text-muted); flex: none; }

    .sg-grid-wrap {
      overflow: auto; border: 1px solid var(--color-border);
      border-radius: 10px; background: var(--color-border);
    }
    .sg-grid {
      display: grid; grid-template-columns: 56px repeat(var(--cols, 6), 1fr);
      min-width: 600px; background: var(--color-border); gap: 1px;
      position: relative; overflow: hidden; isolation: isolate;
    }

    .sg-almuerzo-band {
      display: flex; align-items: center; justify-content: center;
      pointer-events: none; z-index: 3;
      background: repeating-linear-gradient(
        -45deg,
        rgba(255, 248, 225, 0.92),
        rgba(255, 248, 225, 0.92) 8px,
        rgba(255, 236, 179, 0.92) 8px,
        rgba(255, 236, 179, 0.92) 16px
      );
      border-top: 1px dashed rgba(245, 158, 11, 0.4);
      border-bottom: 1px dashed rgba(245, 158, 11, 0.4);
    }
    .sg-almuerzo-band__inner {
      display: flex; align-items: center; gap: 4px;
      padding: 3px 12px; border-radius: 999px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(245, 158, 11, 0.35);
      font-size: 9px; font-weight: 700; color: var(--color-warning);
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .sg-almuerzo-band__inner mat-icon { font-size: 12px; width: 12px; height: 12px; }

    .sg-cell {
      background: var(--color-surface); min-height: 44px; display: flex;
      align-items: center; justify-content: center; position: relative;
      transition: background 100ms ease, box-shadow 100ms ease;
    }
    .sg-cell--corner {
      background: var(--color-surface-2); font-size: 12px;
      font-weight: 700; color: var(--color-text-muted);
    }
    .sg-cell--header {
      background: var(--color-surface-2); font-size: 12px; font-weight: 700;
      color: var(--color-text-secondary); text-transform: uppercase;
      letter-spacing: 0.04em; padding: 8px 4px; text-align: center;
    }
    .sg-cell--hour {
      background: var(--color-surface-2); flex-direction: column; gap: 2px; padding: 4px;
    }
    .sg-cell--almuerzo {
      background: repeating-linear-gradient(
        -45deg,
        #fff8e1,
        #fff8e1 6px,
        #ffecb3 6px,
        #ffecb3 12px
      ) !important;
      cursor: not-allowed;
    }
    .sg-cell--body {
      padding: 2px; cursor: pointer; min-height: 44px;
      flex-direction: column; align-items: stretch; justify-content: flex-start;
    }
    .sg-cell--occupied { background: var(--cell-bg, transparent); }
    .sg-cell--armed-hover:hover {
      background: var(--color-primary-bg) !important;
      box-shadow: inset 0 0 0 2px rgba(99,102,241,0.3);
    }
    .sg-cell--no-place { cursor: not-allowed; opacity: 0.6; }
    .sg-cell--no-place:hover {
      background: rgba(239,68,68,0.05) !important;
      box-shadow: inset 0 0 0 2px rgba(239,68,68,0.3);
    }

    .sg-hour-text {
      font-size: 10px; font-weight: 600; color: var(--color-text-muted);
      font-family: 'SF Mono', monospace;
    }
    .sg-hour-tag {
      font-size: 8px; font-weight: 700; color: var(--color-warning);
      background: var(--color-warning-bg); padding: 1px 4px; border-radius: 3px;
      text-transform: uppercase; letter-spacing: 0.05em;
    }

    .sg-cell__content {
      display: flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: 600; color: var(--color-text-muted);
    }
    .sg-cell__content mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .sg-cell__empty { display: flex; align-items: center; justify-content: center; height: 100%; min-height: 36px; }
    .sg-cell__preview {
      color: var(--color-primary); opacity: 0; font-size: 20px;
      transition: opacity 150ms ease;
    }
    .sg-cell--armed-hover .sg-cell__preview { opacity: 0.6; }

    .sg-cell__block {
      background: var(--blk-bg, #e8eaf6); border: 1px solid var(--blk-border, #5c6bc0);
      color: var(--blk-text, #283593); border-radius: 4px; padding: 3px 6px;
      font-size: 10px; line-height: 1.2; display: flex; flex-direction: column;
      gap: 1px; position: relative; min-height: 28px; cursor: grab;
      transition: box-shadow 150ms ease, transform 100ms ease;
    }
    .sg-cell__block:hover { box-shadow: 0 1px 2px rgba(0,0,0,0.05); z-index: 2; }
    .sg-cell__block--lectiva { cursor: default; opacity: 0.85; }
    .sg-cell__block--readonly { cursor: default; }

    .sg-block__badge {
      font-size: 8px; font-weight: 800; color: white; padding: 1px 5px;
      border-radius: 3px; align-self: flex-start; line-height: 1.4;
    }
    .sg-block__name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 10px; }
    .sg-block__sub { font-size: 9px; opacity: 0.8; }
    .sg-block__remove {
      position: absolute; top: 2px; right: 2px; width: 16px; height: 16px;
      border: none; background: rgba(255,255,255,0.3); color: inherit;
      border-radius: 3px; cursor: pointer; display: flex; align-items: center;
      justify-content: center; opacity: 0; transition: opacity 150ms ease;
    }
    .sg-block__remove mat-icon { font-size: 10px; width: 10px; height: 10px; }
    .sg-cell__block:hover .sg-block__remove { opacity: 1; }
    .sg-cell__block--readonly .sg-block__remove { display: none; }

    .sg-conflicts {
      display: flex; align-items: center; gap: 4px; padding: 8px 16px;
      background: var(--color-danger-bg); border: 1px solid var(--color-danger);
      border-radius: 6px; font-size: 12px; color: var(--color-danger); font-weight: 600;
    }
    .sg-conflicts mat-icon { color: var(--color-danger); }

    .sg-summary { display: flex; align-items: center; gap: 16px; font-size: 12px; color: var(--color-text-secondary); flex-wrap: wrap; }

    .sg--readonly .sg-cell__block { cursor: default; }
    .sg--readonly .sg-cell__block:hover { box-shadow: none; }
    .sg--readonly .sg-cell--body { cursor: default; }

    .sg-grid-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
    .sg-grid-wrap::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }
  `],
})
export class ScheduleGridComponent implements OnInit, OnChanges, OnDestroy {
  @Input() blocks: ScheduleBlock[] = [];
  @Input() paletteBlocks: PaletteBlock[] = [];
  @Input() editable = true;
  @Input() config?: Partial<ScheduleConfig>;

  @Output() blocksChange = new EventEmitter<ScheduleBlock[]>();
  @Output() blockAdded = new EventEmitter<ScheduleBlock>();
  @Output() blockRemoved = new EventEmitter<ScheduleBlock>();
  @Output() conflictDetected = new EventEmitter<ConflictInfo[]>();

  armedBlock: PaletteBlock | null = null;
  painting = false;
  paintCells: { dia: number; hora: number }[] = [];
  selectedCells = new Set<string>();

  horas: number[] = [];
  diasLabels: string[] = [];
  dias: number[] = [];
  almuerzoInicio = 13;
  almuerzoFin = 14;
  franjaInicio = 7;
  franjaFin = 22;
  conflicts: ConflictInfo[] = [];

  private grid = new Map<string, ScheduleBlock[]>();
  private destroy$ = new Subject<void>();
  private configSub?: Subscription;

  constructor(
    private cdr: ChangeDetectorRef,
    private configService: ScheduleConfigService,
  ) {}

  ngOnInit(): void {
    this.configService.cargar();
    const cfg = this.configService.config;
    if (cfg.loaded) {
      this.applyConfig({
        diasNumeros: cfg.diasNumeros,
        diasNombres: cfg.diasNombres,
        franja: cfg.franja,
        almuerzo: cfg.almuerzo,
        maxHorasDiarias: cfg.maxHorasDiarias,
        maxHorasSemanales: cfg.maxHorasSemanales,
      });
    } else {
      this.configSub = this.configService.ready$.pipe(takeUntil(this.destroy$)).subscribe(c => {
        this.applyConfig({
          diasNumeros: c.diasNumeros,
          diasNombres: c.diasNombres,
          franja: c.franja,
          almuerzo: c.almuerzo,
          maxHorasDiarias: c.maxHorasDiarias,
          maxHorasSemanales: c.maxHorasSemanales,
        });
        this.cdr.markForCheck();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.applyConfig(this.config);
    }
    if (changes['blocks']) {
      this.rebuildGrid();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.configSub?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.disarm(); }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.disarm();
  }

  private applyConfig(cfg: Partial<ScheduleConfig>): void {
    if (cfg.diasNumeros) this.dias = cfg.diasNumeros;
    if (cfg.diasNombres) this.diasLabels = cfg.diasNombres;
    if (cfg.franja) { this.franjaInicio = cfg.franja.inicio; this.franjaFin = cfg.franja.fin; }
    if (cfg.almuerzo) { this.almuerzoInicio = cfg.almuerzo.inicio; this.almuerzoFin = cfg.almuerzo.fin; }
    this.buildHoras();
    this.rebuildGrid();
    this.cdr.markForCheck();
  }

  private buildHoras(): void {
    this.horas = [];
    for (let h = this.franjaInicio; h < this.franjaFin; h++) this.horas.push(h);
  }

  private rebuildGrid(): void {
    this.grid.clear();
    for (const b of this.blocks) {
      const ini = parseInt(normalizarHora(b.hora_inicio).split(':')[0], 10);
      const fin = parseInt(normalizarHora(b.hora_fin).split(':')[0], 10);
      for (let h = ini; h < fin; h++) {
        const key = this.cellKey(b.dia, h);
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key)!.push(b);
      }
    }
    this.detectConflicts();
    this.cdr.markForCheck();
  }

  private cellKey(dia: number, hora: number): string { return `${dia}_${hora}`; }

  getCellState(dia: number, hora: number): string {
    const blocks = this.grid.get(this.cellKey(dia, hora)) || [];
    if (blocks.length === 0) return 'vacia';
    if (blocks.some(b => b.tipo === 'lectiva')) return 'lectiva';
    if (blocks.some(b => b.tipo === 'ventana')) return 'ventana';
    if (blocks.some(b => b.tipo === 'no-lectiva')) return 'no-lectiva';
    return 'vacia';
  }

  getCellBlocks(dia: number, hora: number): ScheduleBlock[] {
    return this.grid.get(this.cellKey(dia, hora)) || [];
  }

  getCellBg(dia: number, hora: number): string {
    if (this.isAlmuerzo(dia, hora)) return BLOCK_COLORS['almuerzo'].bg;
    const blocks = this.getCellBlocks(dia, hora);
    if (blocks.length === 0) return 'transparent';
    return getColorForBlock(blocks[0]).bg;
  }

  getCellBorder(dia: number, hora: number): string {
    if (this.isAlmuerzo(dia, hora)) return BLOCK_COLORS['almuerzo'].border;
    const blocks = this.getCellBlocks(dia, hora);
    if (blocks.length === 0) return 'var(--color-border)';
    return getColorForBlock(blocks[0]).border;
  }

  getCellTooltip(dia: number, hora: number): string {
    const blocks = this.getCellBlocks(dia, hora);
    if (blocks.length === 0) return '';
    return blocks.map(b => b.tooltip || b.label).join(' | ');
  }

  isAlmuerzo(dia: number, hora: number): boolean {
    return hora >= this.almuerzoInicio && hora < this.almuerzoFin;
  }

  get almuerzoDuracion(): number {
    return Math.max(0, this.almuerzoFin - this.almuerzoInicio);
  }

  get almuerzoGridRow(): string {
    const start = (this.almuerzoInicio - this.franjaInicio) + 2;
    return `${start} / span ${this.almuerzoDuracion}`;
  }

  getBlockColor(block: ColorSource): { bg: string; border: string; text: string; light: string } {
    return getColorForBlock(block);
  }

  getShortType(block: ScheduleBlock): string {
    if (block.tipo === 'lectiva') return block.badge || 'TEO';
    if (block.tipo === 'ventana') return 'VEN';
    return block.badge || 'NL';
  }

  toggleArm(block: PaletteBlock): void {
    if (this.armedBlock?.id === block.id) {
      this.disarm();
    } else {
      this.armedBlock = block;
      this.selectedCells.clear();
      this.cdr.markForCheck();
    }
  }

  disarm(): void {
    this.armedBlock = null;
    this.painting = false;
    this.paintCells = [];
    this.selectedCells.clear();
    this.cdr.markForCheck();
  }

  canPlace(dia: number, hora: number): boolean {
    if (!this.editable || !this.armedBlock) return false;
    if (this.isAlmuerzo(dia, hora)) return false;
    if (hora < this.franjaInicio || hora >= this.franjaFin) return false;
    const existing = this.getCellBlocks(dia, hora);
    if (existing.some(b => b.tipo === 'lectiva')) return false;
    if (existing.length >= 3) return false;
    const dur = this.armedBlock.duracion;
    for (let i = 0; i < dur; i++) {
      if (hora + i >= this.franjaFin) return false;
      if (this.isAlmuerzo(dia, hora + i)) return false;
      const atSlot = this.getCellBlocks(dia, hora + i);
      if (atSlot.some(b => b.tipo === 'lectiva')) return false;
      if (atSlot.length >= 3) return false;
    }
    return true;
  }

  private createBlock(dia: number, hora: number, palette: PaletteBlock): ScheduleBlock {
    const fin = hora + palette.duracion;
    return {
      id: `blk_${dia}_${hora}_${Date.now()}`,
      tipo: palette.tipo as BlockType,
      dia,
      hora_inicio: `${String(hora).padStart(2, '0')}:00`,
      hora_fin: `${String(fin).padStart(2, '0')}:00`,
      duracion: palette.duracion,
      label: palette.label,
      badge: palette.tipo === 'ventana' ? 'VEN' : palette.tipo === 'lectiva' ? 'TEO' : undefined,
      colorKey: palette.colorKey,
      readOnly: palette.tipo === 'lectiva',
    };
  }

  placeBlock(dia: number, hora: number): void {
    if (!this.armedBlock || !this.canPlace(dia, hora)) return;
    const block = this.createBlock(dia, hora, this.armedBlock);
    const newBlocks = [...this.blocks, block];
    this.blocksChange.emit(newBlocks);
    this.blockAdded.emit(block);
  }

  removeBlock(block: ScheduleBlock): void {
    if (block.readOnly) return;
    const newBlocks = this.blocks.filter(b => b.id !== block.id);
    this.blocksChange.emit(newBlocks);
    this.blockRemoved.emit(block);
  }

  onPaletteDrop(event: CdkDragDrop<PaletteBlock[]>): void {
    const palette = event.item.data as PaletteBlock;
    const el = event.event.target as HTMLElement;
    const cell = el.closest('.sg-cell--body') as HTMLElement;
    if (cell) {
      const dia = parseInt(cell.getAttribute('data-dia') || '0', 10);
      const hora = parseInt(cell.getAttribute('data-hora') || '0', 10);
      if (dia && hora) {
        this.armedBlock = palette;
        this.placeBlock(dia, hora);
        this.disarm();
      }
    }
  }

  onCellMouseDown(e: MouseEvent, dia: number, hora: number): void {
    if (e.button === 2) {
      e.preventDefault();
      const blocks = this.getCellBlocks(dia, hora);
      const removable = blocks.find(b => !b.readOnly && this.editable);
      if (removable) this.removeBlock(removable);
      return;
    }
    if (this.armedBlock && this.canPlace(dia, hora)) {
      this.placeBlock(dia, hora);
      this.painting = true;
      this.paintCells = [{ dia, hora }];
    }
  }

  onCellMouseEnter(dia: number, hora: number): void {
    if (this.painting && this.armedBlock) {
      const last = this.paintCells[this.paintCells.length - 1];
      if (last && last.dia === dia && !this.paintCells.some(c => c.dia === dia && c.hora === hora)) {
        if (this.canPlace(dia, hora)) {
          this.paintCells.push({ dia, hora });
        }
      }
    }
  }

  onCellClick(e: MouseEvent, dia: number, hora: number): void {
    if (this.armedBlock) return;
    if (e.shiftKey) {
      const selectedArr = Array.from(this.selectedCells);
      if (selectedArr.length === 0) {
        this.selectedCells.add(this.cellKey(dia, hora));
      } else {
        const last = selectedArr[selectedArr.length - 1];
        const [lastDia, lastHora] = last.split('_').map(Number);
        if (lastDia === dia) {
          const minH = Math.min(lastHora, hora);
          const maxH = Math.max(lastHora, hora);
          for (let h = minH; h <= maxH; h++) {
            this.selectedCells.add(this.cellKey(dia, h));
          }
        } else {
          this.selectedCells.clear();
          this.selectedCells.add(this.cellKey(dia, hora));
        }
      }
    } else {
      const key = this.cellKey(dia, hora);
      if (this.selectedCells.has(key)) {
        this.selectedCells.delete(key);
      } else {
        if (!e.ctrlKey && !e.metaKey) this.selectedCells.clear();
        this.selectedCells.add(key);
      }
    }
    this.cdr.markForCheck();
  }

  private detectConflicts(): void {
    this.conflicts = [];
    const byDay = new Map<number, ScheduleBlock[]>();
    for (const b of this.blocks) {
      if (!byDay.has(b.dia)) byDay.set(b.dia, []);
      byDay.get(b.dia)!.push(b);
    }
    for (const [, dayBlocks] of byDay) {
      for (let i = 0; i < dayBlocks.length; i++) {
        for (let j = i + 1; j < dayBlocks.length; j++) {
          const a = dayBlocks[i];
          const b = dayBlocks[j];
          if (seSuperponen(a.hora_inicio, a.hora_fin, b.hora_inicio, b.hora_fin)) {
            const msg = `Superposición: ${a.label} (${a.hora_inicio}-${a.hora_fin}) con ${b.label} (${b.hora_inicio}-${b.hora_fin})`;
            this.conflicts.push({ dia: a.dia, hora: a.hora_inicio, mensaje: msg, tipo: 'superposicion' });
          }
        }
      }
    }
    this.conflictDetected.emit(this.conflicts);
  }

  fmtHora(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }
}
