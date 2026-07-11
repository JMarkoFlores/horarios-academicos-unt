import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AmbienteDisponible } from '../../models/asignador.models';

@Component({
  selector: 'app-panel-ambientes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatInputModule, MatFormFieldModule, MatTooltipModule],
  template: `
    <div class="panel">
      <div class="panel__header">
        <mat-icon>meeting_room</mat-icon>
        <span class="panel__title">Ambientes</span>
        <span class="panel__count">{{ ambientes.length }}</span>
      </div>

      <div class="panel__search">
        <mat-form-field appearance="outline" class="panel__search-field">
          <mat-icon matPrefix>search</mat-icon>
          <input matInput placeholder="Buscar aula..." [(ngModel)]="busqueda">
        </mat-form-field>
      </div>

      <div class="panel__list">
        @for (amb of ambientesFiltrados; track amb.id) {
          <div class="amb-card" [class.amb-card--selected]="ambienteSeleccionadoId === amb.id"
               (click)="seleccionar.emit(amb)"
               [matTooltip]="amb.nombre + ' — Cap: ' + amb.capacidad + ' — ' + amb.tipo">
            <div class="amb-card__status" [class]="'amb-card__status--' + getStatusClass(amb)"></div>
            <div class="amb-card__info">
              <div class="amb-card__row1">
                <span class="amb-card__codigo">{{ amb.codigo }}</span>
                <span class="amb-card__cap">{{ amb.capacidad }}</span>
              </div>
              <div class="amb-card__row2">
                <span class="amb-card__tipo">{{ amb.tipo }}</span>
                <span class="amb-card__ocupacion">{{ amb.totalBloquesOcupados }} bloques</span>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .panel { display: flex; flex-direction: column; height: 100%; }
    .panel__header {
      display: flex; align-items: center; gap: 6px; padding: 12px 16px;
      background: var(--color-surface-2, #f8fafc); border-bottom: 1px solid var(--color-border, #e2e8f0);
    }
    .panel__header mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--color-primary, #6366f1); }
    .panel__title { font-size: 13px; font-weight: 700; color: var(--color-text, #1e293b); flex: 1; text-transform: uppercase; letter-spacing: 0.03em; }
    .panel__count {
      background: var(--color-primary, #6366f1); color: white; font-size: 11px; font-weight: 700;
      padding: 2px 8px; border-radius: 10px;
    }
    .panel__search { padding: 4px 12px 0; }
    .panel__search-field { width: 100%; font-size: 12px; }
    .panel__search-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .panel__list { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; }

    .amb-card {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px;
      background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 6px; cursor: pointer; transition: all 150ms;
    }
    .amb-card:hover { border-color: var(--color-primary, #6366f1); }
    .amb-card--selected { border-color: var(--color-primary, #6366f1); background: var(--color-primary-bg, #eef2ff); }
    .amb-card__status { width: 4px; height: 28px; border-radius: 2px; flex-shrink: 0; }
    .amb-card__status--libre { background: #16a34a; }
    .amb-card__status--ocupada { background: #f59e0b; }
    .amb-card__status--llena { background: #ef4444; }
    .amb-card__info { flex: 1; min-width: 0; }
    .amb-card__row1 { display: flex; justify-content: space-between; align-items: center; }
    .amb-card__codigo { font-size: 12px; font-weight: 700; color: var(--color-text, #1e293b); }
    .amb-card__cap { font-size: 10px; color: var(--color-text-muted, #94a3b8); }
    .amb-card__row2 { display: flex; justify-content: space-between; align-items: center; }
    .amb-card__tipo { font-size: 10px; color: var(--color-text-muted, #94a3b8); }
    .amb-card__ocupacion { font-size: 10px; color: var(--color-text-muted, #94a3b8); }
  `],
})
export class PanelAmbientesComponent {
  @Input() ambientes: AmbienteDisponible[] = [];
  @Input() ambienteSeleccionadoId: number | null = null;
  @Output() seleccionar = new EventEmitter<AmbienteDisponible>();

  busqueda = '';

  get ambientesFiltrados(): AmbienteDisponible[] {
    if (!this.busqueda.trim()) return this.ambientes;
    const term = this.busqueda.toLowerCase();
    return this.ambientes.filter(a =>
      a.codigo.toLowerCase().includes(term) || a.nombre.toLowerCase().includes(term)
    );
  }

  getStatusClass(amb: AmbienteDisponible): string {
    if (amb.totalBloquesOcupados >= 10) return 'llena';
    if (amb.totalBloquesOcupados > 0) return 'ocupada';
    return 'libre';
  }
}
