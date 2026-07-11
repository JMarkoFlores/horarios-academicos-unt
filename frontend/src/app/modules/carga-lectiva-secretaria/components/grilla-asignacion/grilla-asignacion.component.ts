import {
  Component, EventEmitter, Input, Output, OnChanges, OnDestroy, ChangeDetectorRef,
  ChangeDetectionStrategy, SimpleChanges, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, CdkDragEnter } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ScheduleConfigService, ScheduleConfig } from '../../../../core/services/schedule-config.service';
import { seSuperponen, normalizarHora } from '../../../declaraciones/horario.utils';
import { BloqueHorario, COLORES_TIPO_CLASE } from '../../models/asignador.models';

@Component({
  selector: 'app-grilla-asignacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DragDropModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="grilla" [class.grilla--readonly]="readonly">

      <header class="grilla-header">
        <div class="grilla-header__left">
          <ng-content select="[headerLeft]"></ng-content>
        </div>
        <div class="grilla-header__right">
          <ng-content select="[headerRight]"></ng-content>
        </div>
      </header>

      <div class="grilla-grid-wrap"
           cdkDropList
           [cdkDropListData]="bloquesExistentes"
           (cdkDropListDropped)="onDrop($event)"
           (cdkDropListEntered)="onCellEnter($event)">
        <div class="grilla-grid" [style.--cols]="dias.length">
          <div class="g-cell g-cell--corner">Hora</div>
          @for (d of diasLabels; track d) {
            <div class="g-cell g-cell--header">{{ d }}</div>
          }

          @if (almuerzoDuracion > 0) {
            <div class="g-almuerzo-band"
                 [style.grid-row]="almuerzoGridRow"
                 style="grid-column: 2 / -1">
              <div class="g-almuerzo-band__inner">
                <mat-icon>restaurant</mat-icon>
                <span>ALMUERZO · {{ fmtHora(almuerzoInicio) }}–{{ fmtHora(almuerzoFin) }}</span>
              </div>
            </div>
          }

          @for (h of horas; track h) {
            <div class="g-cell g-cell--hour"
                 [class.g-cell--almuerzo]="h >= almuerzoInicio && h < almuerzoFin">
              <span class="g-hour-text">{{ fmtHora(h) }}</span>
            </div>

            @for (d of dias; track d) {
              <div class="g-cell g-cell--body"
                   [class.g-cell--almuerzo]="isAlmuerzo(d, h)"
                   [class.g-cell--drop-target]="puedeSoltar(d, h)"
                   [class.g-cell--no-drop]="!puedeSoltar(d, h) && !isAlmuerzo(d, h)"
                   [style.--cell-bg]="getCellBg(d, h)"
                   [attr.data-dia]="d"
                   [attr.data-hora]="h"
                   cdkDropList
                   [cdkDropListData]="getCellBlocks(d, h)"
                   (cdkDropListDropped)="onCellDrop($event, d, h)"
                   (click)="onCellClick(d, h)"
                   [matTooltip]="getCellTooltip(d, h)">

                @if (isAlmuerzo(d, h)) {
                  <div class="g-cell__content g-cell__content--alm">
                    <mat-icon>restaurant</mat-icon>
                  </div>
                } @else {
                  @for (blk of getCellBlocks(d, h); track blk.id) {
                    <div class="g-cell__block"
                         [style.--blk-bg]="getBlockColor(blk).bg"
                         [style.--blk-border]="getBlockColor(blk).border"
                         [style.--blk-text]="getBlockColor(blk).text"
                         cdkDrag
                         [cdkDragData]="blk"
                         [class.g-cell__block--readonly]="blk.readOnly">
                      <span class="g-block__badge" [style.background]="getBlockColor(blk).border">
                        {{ blk.badge || 'TEO' }}
                      </span>
                      <span class="g-block__name">{{ blk.label }}</span>
                      @if (blk.sublabel) {
                        <span class="g-block__sub">{{ blk.sublabel }}</span>
                      }
                      @if (!blk.readOnly && !readonly) {
                        <button class="g-block__remove" (click)="onRemove(blk); $event.stopPropagation(); $event.preventDefault()"
                                matTooltip="Eliminar">
                          <mat-icon>close</mat-icon>
                        </button>
                      }
                    </div>
                  }

                  @if (getCellBlocks(d, h).length === 0 && !isAlmuerzo(d, h)) {
                    <div class="g-cell__empty">
                      @if (cursoArrastrando) {
                        <mat-icon class="g-cell__preview">add_circle</mat-icon>
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
        <div class="g-conflicts">
          <mat-icon>warning</mat-icon>
          <span>{{ conflicts.length }} conflicto(s) detectado(s)</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .grilla { display: flex; flex-direction: column; gap: 12px; }

    .grilla-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .grilla-header__left, .grilla-header__right { display: flex; align-items: center; gap: 8px; }

    .grilla-grid-wrap {
      overflow: auto; border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 10px; background: var(--color-border, #e2e8f0);
    }
    .grilla-grid {
      display: grid; grid-template-columns: 56px repeat(var(--cols, 6), 1fr);
      min-width: 600px; background: var(--color-border, #e2e8f0); gap: 1px;
      position: relative; overflow: hidden; isolation: isolate;
    }

    .g-almuerzo-band {
      display: flex; align-items: center; justify-content: center;
      pointer-events: none; z-index: 3;
      background: repeating-linear-gradient(-45deg, rgba(255,248,225,0.92), rgba(255,248,225,0.92) 8px, rgba(255,236,179,0.92) 8px, rgba(255,236,179,0.92) 16px);
      border-top: 1px dashed rgba(245,158,11,0.4); border-bottom: 1px dashed rgba(245,158,11,0.4);
    }
    .g-almuerzo-band__inner {
      display: flex; align-items: center; gap: 4px; padding: 3px 12px;
      border-radius: 999px; background: rgba(255,255,255,0.9);
      border: 1px solid rgba(245,158,11,0.35);
      font-size: 9px; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .g-almuerzo-band__inner mat-icon { font-size: 12px; width: 12px; height: 12px; }

    .g-cell {
      background: var(--color-surface, #fff); min-height: 44px; display: flex;
      align-items: center; justify-content: center; position: relative;
      transition: background 100ms ease, box-shadow 100ms ease;
    }
    .g-cell--corner { background: var(--color-surface-2, #f8fafc); font-size: 12px; font-weight: 700; color: var(--color-text-muted, #94a3b8); }
    .g-cell--header { background: var(--color-surface-2, #f8fafc); font-size: 12px; font-weight: 700; color: var(--color-text-secondary, #64748b); text-transform: uppercase; letter-spacing: 0.04em; padding: 8px 4px; text-align: center; }
    .g-cell--hour { background: var(--color-surface-2, #f8fafc); flex-direction: column; gap: 2px; padding: 4px; }
    .g-cell--almuerzo {
      background: repeating-linear-gradient(-45deg, #fff8e1, #fff8e1 6px, #ffecb3 6px, #ffecb3 12px) !important;
      cursor: not-allowed;
    }
    .g-cell--body { padding: 2px; cursor: pointer; min-height: 44px; flex-direction: column; align-items: stretch; justify-content: flex-start; }
    .g-cell--drop-target { background: #eef2ff !important; box-shadow: inset 0 0 0 2px rgba(99,102,241,0.3); }
    .g-cell--no-drop { cursor: not-allowed; opacity: 0.6; }
    .g-cell--no-drop:hover { background: rgba(239,68,68,0.05) !important; box-shadow: inset 0 0 0 2px rgba(239,68,68,0.3); }

    .g-hour-text { font-size: 10px; font-weight: 600; color: var(--color-text-muted, #94a3b8); font-family: 'SF Mono', monospace; }
    .g-cell__content { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; color: var(--color-text-muted, #94a3b8); }
    .g-cell__content mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .g-cell__empty { display: flex; align-items: center; justify-content: center; height: 100%; min-height: 36px; }
    .g-cell__preview { color: var(--color-primary, #6366f1); opacity: 0; font-size: 20px; transition: opacity 150ms ease; }
    .g-cell--drop-target .g-cell__preview { opacity: 0.6; }

    .g-cell__block {
      background: var(--blk-bg, #e8eaf6); border: 1px solid var(--blk-border, #5c6bc0);
      color: var(--blk-text, #283593); border-radius: 4px; padding: 3px 6px;
      font-size: 10px; line-height: 1.2; display: flex; flex-direction: column;
      gap: 1px; position: relative; min-height: 28px; cursor: grab;
      transition: box-shadow 150ms ease, transform 100ms ease;
    }
    .g-cell__block:hover { box-shadow: 0 1px 2px rgba(0,0,0,0.05); z-index: 2; }
    .g-cell__block--readonly { cursor: default; opacity: 0.85; }
    .g-block__badge {
      font-size: 8px; font-weight: 800; color: white; padding: 1px 5px;
      border-radius: 3px; align-self: flex-start; line-height: 1.4;
    }
    .g-block__name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 10px; }
    .g-block__sub { font-size: 9px; opacity: 0.8; }
    .g-block__remove {
      position: absolute; top: 2px; right: 2px; width: 16px; height: 16px;
      border: none; background: rgba(255,255,255,0.3); color: inherit;
      border-radius: 3px; cursor: pointer; display: flex; align-items: center;
      justify-content: center; opacity: 0; transition: opacity 150ms ease;
    }
    .g-block__remove mat-icon { font-size: 10px; width: 10px; height: 10px; }
    .g-cell__block:hover .g-block__remove { opacity: 1; }
    .g-cell__block--readonly .g-block__remove { display: none; }

    .g-conflicts {
      display: flex; align-items: center; gap: 4px; padding: 8px 16px;
      background: #fef2f2; border: 1px solid #ef4444; border-radius: 6px;
      font-size: 12px; color: #ef4444; font-weight: 600;
    }
    .g-conflicts mat-icon { color: #ef4444; }

    .grilla--readonly .g-cell__block { cursor: default; }
    .grilla--readonly .g-cell__block:hover { box-shadow: none; }
    .grilla--readonly .g-cell--body { cursor: default; }

    .grilla-grid-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
    .grilla-grid-wrap::-webkit-scrollbar-thumb { background: var(--color-border, #e2e8f0); border-radius: 3px; }
  `],
})
export class GrillaAsignacionComponent implements OnChanges, OnDestroy {
  @Input() bloquesExistentes: BloqueHorario[] = [];
  @Input() readonly = false;
  @Input() cursoArrastrando: any = null;
  @Input() config?: Partial<ScheduleConfig>;

  @Output() celdaSeleccionada = new EventEmitter<{ dia: number; hora: number }>();
  @Output() bloqueEliminado = new EventEmitter<BloqueHorario>();
  @Output() bloqueSoltado = new EventEmitter<{ dia: number; hora: number; data: any }>();

  horas: number[] = [];
  diasLabels: string[] = [];
  dias: number[] = [];
  almuerzoInicio = 13;
  almuerzoFin = 14;
  franjaInicio = 7;
  franjaFin = 22;
  conflicts: any[] = [];

  private grid = new Map<string, BloqueHorario[]>();
  private destroy$ = new Subject<void>();
  private configSub: any;

  constructor(
    private cdr: ChangeDetectorRef,
    private configService: ScheduleConfigService,
  ) {}

  ngOnInit(): void {
    this.configService.cargar();
    const cfg = this.configService.config;
    if (cfg.loaded) {
      this.applyConfig(cfg);
    } else {
      this.configSub = this.configService.ready$.pipe(takeUntil(this.destroy$)).subscribe(c => {
        this.applyConfig(c);
        this.cdr.markForCheck();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) this.applyConfig(this.config);
    if (changes['bloquesExistentes']) this.rebuildGrid();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.configSub?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {}

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
    for (const b of this.bloquesExistentes) {
      const ini = parseInt(normalizarHora(b.horaInicio).split(':')[0], 10);
      const fin = parseInt(normalizarHora(b.horaFin).split(':')[0], 10);
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

  getCellBlocks(dia: number, hora: number): BloqueHorario[] {
    return this.grid.get(this.cellKey(dia, hora)) || [];
  }

  getCellBg(dia: number, hora: number): string {
    if (this.isAlmuerzo(dia, hora)) return '#fff8e1';
    const blocks = this.getCellBlocks(dia, hora);
    if (blocks.length === 0) return 'transparent';
    return this.getBlockColor(blocks[0]).bg;
  }

  getCellTooltip(dia: number, hora: number): string {
    const blocks = this.getCellBlocks(dia, hora);
    if (blocks.length === 0) return '';
    return blocks.map(b => `${b.label} (${b.horaInicio}-${b.horaFin})`).join(' | ');
  }

  isAlmuerzo(dia: number, hora: number): boolean {
    return hora >= this.almuerzoInicio && hora < this.almuerzoFin;
  }

  get almuerzoDuracion(): number { return Math.max(0, this.almuerzoFin - this.almuerzoInicio); }

  get almuerzoGridRow(): string {
    const start = (this.almuerzoInicio - this.franjaInicio) + 2;
    return `${start} / span ${this.almuerzoDuracion}`;
  }

  getBlockColor(blk: BloqueHorario): { bg: string; border: string; text: string; light: string } {
    if (blk.tipo === 'no-lectiva') return { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8', light: '#e9d5ff' };
    const tc = blk.tipoClase || blk.badge;
    if (tc && COLORES_TIPO_CLASE[tc]) return COLORES_TIPO_CLASE[tc];
    return COLORES_TIPO_CLASE['TEORIA'];
  }

  puedeSoltar(dia: number, hora: number): boolean {
    if (this.readonly) return false;
    if (this.isAlmuerzo(dia, hora)) return false;
    if (hora < this.franjaInicio || hora >= this.franjaFin) return false;
    const existing = this.getCellBlocks(dia, hora);
    if (existing.some(b => b.tipo === 'lectiva')) return false;
    return true;
  }

  onDrop(event: CdkDragDrop<BloqueHorario[]>): void {}

  onCellDrop(event: CdkDragDrop<any>, dia: number, hora: number): void {
    if (this.readonly) return;
    const data = event.item.data;
    this.bloqueSoltado.emit({ dia, hora, data });
  }

  onCellEnter(event: CdkDragEnter): void {}

  onCellClick(dia: number, hora: number): void {
    if (this.readonly) return;
    this.celdaSeleccionada.emit({ dia, hora });
  }

  onRemove(blk: BloqueHorario): void {
    if (blk.readOnly || this.readonly) return;
    this.bloqueEliminado.emit(blk);
  }

  private detectConflicts(): void {
    this.conflicts = [];
    const byDay = new Map<number, BloqueHorario[]>();
    for (const b of this.bloquesExistentes) {
      if (b.tipo !== 'lectiva') continue;
      if (!byDay.has(b.dia)) byDay.set(b.dia, []);
      byDay.get(b.dia)!.push(b);
    }
    for (const [, dayBlocks] of byDay) {
      for (let i = 0; i < dayBlocks.length; i++) {
        for (let j = i + 1; j < dayBlocks.length; j++) {
          const a = dayBlocks[i];
          const b = dayBlocks[j];
          if (seSuperponen(a.horaInicio, a.horaFin, b.horaInicio, b.horaFin)) {
            this.conflicts.push({ dia: a.dia, mensaje: `Superposición: ${a.label} con ${b.label}` });
          }
        }
      }
    }
  }

  fmtHora(h: number): string { return `${String(h).padStart(2, '0')}:00`; }
}
