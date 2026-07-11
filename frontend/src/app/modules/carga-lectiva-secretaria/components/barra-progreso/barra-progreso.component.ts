import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProgresoAsignacion } from '../../models/asignador.models';

@Component({
  selector: 'app-barra-progreso',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="progreso-bar">
      <div class="progreso-bar__header">
        <mat-icon>pie_chart</mat-icon>
        <span class="progreso-bar__title">Avance de Asignación</span>
        <span class="progreso-bar__pct">{{ progreso?.porcentajeAvance || 0 }}%</span>
      </div>
      <div class="progreso-bar__track">
        <div class="progreso-bar__fill" [style.width.%]="progreso?.porcentajeAvance || 0"></div>
      </div>
      <div class="progreso-bar__stats">
        <div class="stat" [matTooltip]="'Docentes con carga completa'">
          <span class="stat__value stat__value--ok">{{ progreso?.docentesCompletos || 0 }}</span>
          <span class="stat__label">Completos</span>
        </div>
        <div class="stat" [matTooltip]="'Docentes sin carga suficiente'">
          <span class="stat__value stat__value--warn">{{ progreso?.docentesIncompletos || 0 }}</span>
          <span class="stat__label">Incompletos</span>
        </div>
        <div class="stat" [matTooltip]="'Cursos sin asignar'">
          <span class="stat__value stat__value--info">{{ progreso?.totalCursosPendientes || 0 }}</span>
          <span class="stat__label">Pendientes</span>
        </div>
        <div class="stat" [matTooltip]="'Horas por asignar'">
          <span class="stat__value">{{ progreso?.totalHorasPendientes || 0 }}h</span>
          <span class="stat__label">Por asignar</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .progreso-bar {
      background: var(--color-surface-2, #f8fafc);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 10px; padding: 12px 16px;
    }
    .progreso-bar__header {
      display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
    }
    .progreso-bar__header mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary, #6366f1); }
    .progreso-bar__title { font-size: 12px; font-weight: 700; color: var(--color-text-secondary, #64748b); text-transform: uppercase; letter-spacing: 0.04em; flex: 1; }
    .progreso-bar__pct { font-size: 16px; font-weight: 800; color: var(--color-primary, #6366f1); }
    .progreso-bar__track {
      height: 6px; background: var(--color-border, #e2e8f0); border-radius: 3px; overflow: hidden; margin-bottom: 10px;
    }
    .progreso-bar__fill {
      height: 100%; background: linear-gradient(90deg, var(--color-primary, #6366f1), #818cf8);
      border-radius: 3px; transition: width 500ms ease;
    }
    .progreso-bar__stats { display: flex; gap: 12px; }
    .stat { display: flex; flex-direction: column; align-items: center; flex: 1; }
    .stat__value { font-size: 14px; font-weight: 700; color: var(--color-text, #1e293b); }
    .stat__value--ok { color: #16a34a; }
    .stat__value--warn { color: #f59e0b; }
    .stat__value--info { color: #6366f1; }
    .stat__label { font-size: 9px; color: var(--color-text-muted, #94a3b8); text-transform: uppercase; letter-spacing: 0.05em; }
  `],
})
export class BarraProgresoComponent {
  @Input() progreso: ProgresoAsignacion | null = null;
}
