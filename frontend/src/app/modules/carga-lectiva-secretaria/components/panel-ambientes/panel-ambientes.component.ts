import { Component, EventEmitter, Input, Output, computed, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';
import { AmbienteDisponible } from '../../models/asignador.models';
import { toSafeString, toSafeNumber } from '@app/shared/utils/sanitize';

@Component({
  selector: 'app-panel-ambientes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatInputModule, MatFormFieldModule, MatTooltipModule, MatChipsModule, TranslateModule],
  template: `
    <div class="panel">
      <div class="panel__header">
        <div class="panel__header-left">
          <mat-icon>meeting_room</mat-icon>
          <span class="panel__title">{{ 'panelAmbientes.title' | translate }}</span>
        </div>
        <span class="panel__count">{{ ambientesFiltrados().length }}</span>
      </div>

      <div class="panel__search">
        <mat-form-field appearance="outline" class="panel__search-field">
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [placeholder]="'panelAmbientes.searchPlaceholder' | translate" [value]="busqueda()" (input)="onBusquedaChange($event)">
        </mat-form-field>
      </div>

      <div class="panel__filters">
        <div class="panel__filter-row">
          <span class="panel__filter-label">{{ 'panelAmbientes.filter.tipo' | translate }}</span>
          <mat-chip-listbox [value]="filtroTipo()" (change)="onFiltroTipoChange($event.value)">
            <mat-chip-option value="all" selected>{{ 'panelAmbientes.filter.all' | translate }}</mat-chip-option>
            <mat-chip-option value="AULA">{{ 'panelAmbientes.filter.aula' | translate }}</mat-chip-option>
            <mat-chip-option value="LABORATORIO">{{ 'panelAmbientes.filter.laboratorio' | translate }}</mat-chip-option>
            <mat-chip-option value="SALA_DE_COMPUTO">{{ 'panelAmbientes.filter.computo' | translate }}</mat-chip-option>
          </mat-chip-listbox>
        </div>
        <div class="panel__filter-row">
          <span class="panel__filter-label">{{ 'panelAmbientes.filter.capacidad' | translate }}</span>
          <mat-chip-listbox [value]="filtroCapacidad()" (change)="onFiltroCapacidadChange($event.value)">
            <mat-chip-option value="all" selected>{{ 'panelAmbientes.filter.all' | translate }}</mat-chip-option>
            <mat-chip-option value="small">≤20</mat-chip-option>
            <mat-chip-option value="medium">21-40</mat-chip-option>
            <mat-chip-option value="large">41+</mat-chip-option>
          </mat-chip-listbox>
        </div>
        <div class="panel__filter-row">
          <span class="panel__filter-label">{{ 'panelAmbientes.filter.disponibilidad' | translate }}</span>
          <mat-chip-listbox [value]="filtroDisponibilidad()" (change)="onFiltroDisponibilidadChange($event.value)">
            <mat-chip-option value="all" selected>{{ 'panelAmbientes.filter.all' | translate }}</mat-chip-option>
            <mat-chip-option value="libre">{{ 'panelAmbientes.filter.libre' | translate }}</mat-chip-option>
            <mat-chip-option value="parcial">{{ 'panelAmbientes.filter.parcial' | translate }}</mat-chip-option>
          </mat-chip-listbox>
        </div>
      </div>

      <div class="panel__legend">
        <div class="legend-item">
          <span class="legend-dot legend-dot--libre"></span>
          <span>{{ 'panelAmbientes.legend.libre' | translate }}</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot legend-dot--ocupada"></span>
          <span>{{ 'panelAmbientes.legend.ocupada' | translate }}</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot legend-dot--llena"></span>
          <span>{{ 'panelAmbientes.legend.llena' | translate }}</span>
        </div>
      </div>

      <div class="panel__list">
        @for (amb of ambientesFiltrados(); track amb.id) {
          <div class="amb-card" [class.amb-card--selected]="ambienteSeleccionadoId() === amb.id"
               (click)="seleccionar.emit(amb)"
               [matTooltip]="getTooltip(amb)">
            <div class="amb-card__status" [class]="'amb-card__status--' + getStatusClass(amb)"></div>
            <div class="amb-card__info">
              <div class="amb-card__row1">
                <span class="amb-card__codigo">{{ amb.codigo }}</span>
                <span class="amb-card__cap" [matTooltip]="'panelAmbientes.tooltip.capacidad' | translate:{ cap: amb.capacidad }">
                  <mat-icon>person</mat-icon> {{ amb.capacidad }}
                </span>
              </div>
              <div class="amb-card__row2">
                <span class="amb-card__tipo">{{ amb.tipo }}</span>
                <span class="amb-card__ubicacion" *ngIf="amb.piso || amb.pabellon">
                  P{{ amb.piso || '?' }} {{ amb.pabellon || '' }}
                </span>
              </div>
              <div class="amb-card__row3">
                <div class="amb-card__bar">
                  <div class="amb-card__bar-fill" [style.width]="getOcupacion(amb) + '%'"
                       [class]="'amb-card__bar-fill--' + getStatusClass(amb)"></div>
                </div>
                <span class="amb-card__horas">{{ amb.totalBloquesOcupados }}/30 {{ 'panelAmbientes.bloques' | translate }}</span>
              </div>
            </div>
          </div>
        } @empty {
          <div class="panel__empty">
            <mat-icon>meeting_room</mat-icon>
            <span>{{ 'panelAmbientes.empty' | translate }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .panel { display: flex; flex-direction: column; height: 100%; background: var(--color-surface, #fff); }
    .panel__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px;
      background: var(--color-surface-2, #f8fafc); border-bottom: 1px solid var(--color-border, #e2e8f0);
    }
    .panel__header-left { display: flex; align-items: center; gap: 6px; }
    .panel__header-left mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--color-primary, #6366f1); }
    .panel__title { font-size: 13px; font-weight: 700; color: var(--color-text, #1e293b); text-transform: uppercase; letter-spacing: 0.03em; }
    .panel__count {
      background: var(--color-primary, #6366f1); color: white; font-size: 11px; font-weight: 700;
      padding: 2px 8px; border-radius: 10px;
    }

    .panel__search { padding: 8px 12px 0; }
    .panel__search-field { width: 100%; font-size: 12px; }
    .panel__search-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

    .panel__filters { padding: 0 12px 8px; }
    .panel__filter-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .panel__filter-label { font-size: 10px; font-weight: 600; color: var(--color-text-muted, #94a3b8); min-width: 32px; }
    .panel__filter-row mat-chip-listbox { flex: 1; }
    .panel__filter-row ::ng-deep .mat-mdc-chip-listbox { min-height: 28px; }
    .panel__filter-row ::ng-deep .mat-mdc-chip { font-size: 10px; min-height: 24px; }

    .panel__legend {
      display: flex; gap: 12px; padding: 4px 16px 8px;
      border-bottom: 1px solid var(--color-border, #e2e8f0);
    }
    .legend-item { display: flex; align-items: center; gap: 4px; font-size: 9px; color: var(--color-text-muted, #94a3b8); }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
    .legend-dot--libre { background: #16a34a; }
    .legend-dot--ocupada { background: #f59e0b; }
    .legend-dot--llena { background: #ef4444; }

    .panel__list { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }

    .amb-card {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px;
      background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 6px; cursor: pointer; transition: all 150ms;
    }
    .amb-card:hover { border-color: var(--color-primary, #6366f1); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .amb-card--selected { border-color: var(--color-primary, #6366f1); background: var(--color-primary-bg, #eef2ff); }

    .amb-card__status { width: 4px; height: 40px; border-radius: 2px; flex-shrink: 0; }
    .amb-card__status--libre { background: #16a34a; }
    .amb-card__status--ocupada { background: #f59e0b; }
    .amb-card__status--llena { background: #ef4444; }

    .amb-card__info { flex: 1; min-width: 0; }
    .amb-card__row1 { display: flex; justify-content: space-between; align-items: center; }
    .amb-card__codigo { font-size: 12px; font-weight: 700; color: var(--color-text, #1e293b); }
    .amb-card__cap { display: flex; align-items: center; gap: 2px; font-size: 10px; color: var(--color-text-muted, #94a3b8); }
    .amb-card__cap mat-icon { font-size: 11px; width: 11px; height: 11px; }
    .amb-card__row2 { display: flex; justify-content: space-between; align-items: center; margin: 2px 0; }
    .amb-card__tipo { font-size: 10px; color: var(--color-text-muted, #94a3b8); }
    .amb-card__ubicacion { font-size: 9px; color: var(--color-text-muted, #94a3b8); background: #f1f5f9; padding: 0 4px; border-radius: 2px; }
    .amb-card__row3 { display: flex; align-items: center; gap: 6px; }
    .amb-card__bar { flex: 1; height: 3px; background: #e2e8f0; border-radius: 2px; overflow: hidden; }
    .amb-card__bar-fill { height: 100%; border-radius: 2px; transition: width 300ms; }
    .amb-card__bar-fill--libre { background: #16a34a; }
    .amb-card__bar-fill--ocupada { background: #f59e0b; }
    .amb-card__bar-fill--llena { background: #ef4444; }
    .amb-card__horas { font-size: 9px; color: var(--color-text-muted, #94a3b8); white-space: nowrap; }

    .panel__empty {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 24px; color: var(--color-text-muted, #94a3b8); font-size: 12px;
    }
    .panel__empty mat-icon { font-size: 24px; width: 24px; height: 24px; }
  `],
})
export class PanelAmbientesComponent {
  ambientes = input.required<AmbienteDisponible[]>();
  ambienteSeleccionadoId = input<number | null>(null);
  filtroTipo = input<string>('all');
  filtroCapacidad = input<string>('all');
  filtroDisponibilidad = input<string>('all');
  busqueda = input<string>('');

  @Output() seleccionar = new EventEmitter<AmbienteDisponible>();
  @Output() filtroTipoChange = new EventEmitter<string>();
  @Output() filtroCapacidadChange = new EventEmitter<string>();
  @Output() filtroDisponibilidadChange = new EventEmitter<string>();
  @Output() busquedaChange = new EventEmitter<string>();

  private _ambientes = computed(() => this.ambientes());
  private _filtroTipo = computed(() => this.filtroTipo());
  private _filtroCapacidad = computed(() => this.filtroCapacidad());
  private _filtroDisponibilidad = computed(() => this.filtroDisponibilidad());
  private _busqueda = computed(() => this.busqueda());

  readonly ambientesFiltrados = computed(() => {
    let result = this._ambientes();
    const tipo = this._filtroTipo();
    const capacidad = this._filtroCapacidad();
    const disponibilidad = this._filtroDisponibilidad();
    const busq = this._busqueda().toLowerCase().trim();

    if (tipo !== 'all') {
      result = result.filter(a => toSafeString(a.tipo).toUpperCase().includes(tipo));
    }
    if (capacidad !== 'all') {
      switch (capacidad) {
        case 'small': result = result.filter(a => toSafeNumber(a.capacidad) <= 20); break;
        case 'medium': result = result.filter(a => toSafeNumber(a.capacidad) > 20 && toSafeNumber(a.capacidad) <= 40); break;
        case 'large': result = result.filter(a => toSafeNumber(a.capacidad) > 40); break;
      }
    }
    if (disponibilidad !== 'all') {
      switch (disponibilidad) {
        case 'libre': result = result.filter(a => toSafeNumber(a.totalBloquesOcupados) === 0); break;
        case 'parcial': result = result.filter(a => toSafeNumber(a.totalBloquesOcupados) > 0 && toSafeNumber(a.totalBloquesOcupados) < 25); break;
      }
    }
    if (busq) {
      result = result.filter(a =>
        toSafeString(a.codigo).toLowerCase().includes(busq) || toSafeString(a.nombre).toLowerCase().includes(busq)
      );
    }
    return result;
  });

  onFiltroTipoChange(value: string): void {
    this.filtroTipoChange.emit(value);
  }

  onFiltroCapacidadChange(value: string): void {
    this.filtroCapacidadChange.emit(value);
  }

  onFiltroDisponibilidadChange(value: string): void {
    this.filtroDisponibilidadChange.emit(value);
  }

  onBusquedaChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.busquedaChange.emit(value);
  }

  getStatusClass(amb: AmbienteDisponible): string {
    const pct = this.getOcupacion(amb);
    if (pct >= 90) return 'llena';
    if (pct > 0) return 'ocupada';
    return 'libre';
  }

  getOcupacion(amb: AmbienteDisponible): number {
    const cap = toSafeNumber(amb.capacidad);
    const ocup = toSafeNumber(amb.totalBloquesOcupados);
    return cap > 0 ? Math.round((ocup / 30) * 100) : 0;
  }

  getTooltip(amb: AmbienteDisponible): string {
    return `${toSafeString(amb.nombre)}\nCap: ${toSafeNumber(amb.capacidad)} | ${toSafeString(amb.tipo)}\nPiso ${amb.piso || '?'} ${toSafeString(amb.pabellon)}\nOcupación: ${toSafeNumber(amb.totalBloquesOcupados)}/30 bloques`;
  }
}