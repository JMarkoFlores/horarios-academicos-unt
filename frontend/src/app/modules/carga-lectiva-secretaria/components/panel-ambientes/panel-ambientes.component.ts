import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { AmbienteDisponible } from '../../models/asignador.models';

@Component({
  selector: 'app-panel-ambientes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatInputModule, MatFormFieldModule, MatTooltipModule, MatChipsModule],
  template: `
    <div class="panel">
      <div class="panel__header">
        <div class="panel__header-left">
          <mat-icon>meeting_room</mat-icon>
          <span class="panel__title">Ambientes</span>
        </div>
        <span class="panel__count">{{ ambientesFiltrados.length }}</span>
      </div>

      <div class="panel__search">
        <mat-form-field appearance="outline" class="panel__search-field">
          <mat-icon matPrefix>search</mat-icon>
          <input matInput placeholder="Buscar aula..." [(ngModel)]="busqueda">
        </mat-form-field>
      </div>

      <div class="panel__filters">
        <mat-chip-listbox [(ngModel)]="filtroTipo" (change)="onFiltroChange()">
          <mat-chip-option value="all" selected>Todos</mat-chip-option>
          <mat-chip-option value="AULA">Aulas</mat-chip-option>
          <mat-chip-option value="LABORATORIO">Laboratorios</mat-chip-option>
          <mat-chip-option value="SALA_DE_COMPUTO">Computo</mat-chip-option>
        </mat-chip-listbox>
      </div>

      <div class="panel__legend">
        <div class="legend-item">
          <span class="legend-dot legend-dot--libre"></span>
          <span>Libre</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot legend-dot--ocupada"></span>
          <span>Ocupado</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot legend-dot--llena"></span>
          <span>Lleno</span>
        </div>
      </div>

      <div class="panel__list">
        @for (amb of ambientesFiltrados; track amb.id) {
          <div class="amb-card" [class.amb-card--selected]="ambienteSeleccionadoId === amb.id"
               (click)="seleccionar.emit(amb)"
               [matTooltip]="getTooltip(amb)">
            <div class="amb-card__status" [class]="'amb-card__status--' + getStatusClass(amb)"></div>
            <div class="amb-card__info">
              <div class="amb-card__row1">
                <span class="amb-card__codigo">{{ amb.codigo }}</span>
                <span class="amb-card__cap" [matTooltip]="'Capacidad: ' + amb.capacidad">
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
                <span class="amb-card__horas">{{ amb.totalBloquesOcupados }}/30 bloques</span>
              </div>
            </div>
          </div>
        } @empty {
          <div class="panel__empty">
            <mat-icon>meeting_room</mat-icon>
            <span>No hay ambientes</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .panel { display: flex; flex-direction: column; height: 100%; }
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
    .panel__filters ::ng-deep .mat-mdc-chip-listbox { min-height: 28px; }
    .panel__filters ::ng-deep .mat-mdc-chip { font-size: 10px; min-height: 24px; }

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
  @Input() ambientes: AmbienteDisponible[] = [];
  @Input() ambienteSeleccionadoId: number | null = null;
  @Output() seleccionar = new EventEmitter<AmbienteDisponible>();

  busqueda = '';
  filtroTipo = 'all';

  get ambientesFiltrados(): AmbienteDisponible[] {
    let result = this.ambientes;
    if (this.filtroTipo !== 'all') {
      result = result.filter(a => a.tipo?.toUpperCase().includes(this.filtroTipo));
    }
    if (this.busqueda.trim()) {
      const term = this.busqueda.toLowerCase();
      result = result.filter(a =>
        a.codigo.toLowerCase().includes(term) || a.nombre.toLowerCase().includes(term)
      );
    }
    return result;
  }

  onFiltroChange(): void {}

  getStatusClass(amb: AmbienteDisponible): string {
    const pct = this.getOcupacion(amb);
    if (pct >= 90) return 'llena';
    if (pct > 0) return 'ocupada';
    return 'libre';
  }

  getOcupacion(amb: AmbienteDisponible): number {
    return amb.capacidad > 0 ? Math.round((amb.totalBloquesOcupados / 30) * 100) : 0;
  }

  getTooltip(amb: AmbienteDisponible): string {
    return `${amb.nombre}\nCap: ${amb.capacidad} | ${amb.tipo}\nPiso ${amb.piso || '?'} ${amb.pabellon || ''}\nOcupación: ${amb.totalBloquesOcupados}/30 bloques`;
  }
}
