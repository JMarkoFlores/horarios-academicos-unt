import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CursoPendiente } from '../../models/asignador.models';

@Component({
  selector: 'app-banco-cursos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DragDropModule,
    MatIconModule, MatInputModule, MatFormFieldModule, MatChipsModule,
    MatTooltipModule, MatButtonModule,
  ],
  template: `
    <div class="banco">
      <div class="banco__header">
        <div class="banco__header-left">
          <mat-icon>menu_book</mat-icon>
          <span class="banco__title">Cursos Pendientes</span>
        </div>
        <span class="banco__count">{{ cursosFiltrados.length }}/{{ cursos.length }}</span>
      </div>

      <div class="banco__search">
        <mat-form-field appearance="outline" class="banco__search-field">
          <mat-icon matPrefix>search</mat-icon>
          <input matInput placeholder="Buscar por código o nombre..." [(ngModel)]="busqueda"
                 (ngModelChange)="onSearchChange()">
        </mat-form-field>
      </div>

      <div class="banco__filters">
        <div class="banco__filter-row">
          <span class="banco__filter-label">Ciclo:</span>
          <mat-chip-listbox [(ngModel)]="filtroCiclo" (change)="onFiltroChange()">
            <mat-chip-option value="all" selected>Todos</mat-chip-option>
            @for (c of ciclosUnicos; track c) {
              <mat-chip-option [value]="c">{{ c }}°</mat-chip-option>
            }
          </mat-chip-listbox>
        </div>

        <div class="banco__filter-row">
          <span class="banco__filter-label">Tipo:</span>
          <mat-chip-listbox [(ngModel)]="filtroTipo" (change)="onFiltroChange()">
            <mat-chip-option value="all" selected>Todos</mat-chip-option>
            <mat-chip-option value="OBLIGATORIO_GENERAL">General</mat-chip-option>
            <mat-chip-option value="OBLIGATORIO_PROFESIONAL">Profesional</mat-chip-option>
            <mat-chip-option value="ELECTIVO">Electivo</mat-chip-option>
          </mat-chip-listbox>
        </div>
      </div>

      <div class="banco__stats">
        <div class="stat">
          <span class="stat__value">{{ totalHorasPendientes }}</span>
          <span class="stat__label">horas pendientes</span>
        </div>
        <div class="stat">
          <span class="stat__value">{{ cursosFiltrados.length }}</span>
          <span class="stat__label">cursos</span>
        </div>
      </div>

      <div class="banco__list">
        @for (curso of cursosFiltrados; track curso.cursoPlanId) {
          <div class="curso-card"
               [class.curso-card--dragging]="cursoArrastrando?.cursoPlanId === curso.cursoPlanId"
               [class.curso-card--complete]="isCompleto(curso)">
            <div class="curso-card__header">
              <span class="curso-card__codigo">{{ curso.codigo }}</span>
              <span class="curso-card__ciclo">{{ curso.ciclo }}° ciclo</span>
            </div>
            <div class="curso-card__nombre" [matTooltip]="curso.nombre">{{ curso.nombre }}</div>
            <div class="curso-card__meta">
              <span class="curso-card__alumnos" [matTooltip]="'N° de alumnos: ' + curso.totalAlumnos">
                <mat-icon>people</mat-icon> {{ curso.totalAlumnos }}
              </span>
              <span class="curso-card__tipo">{{ formatTipoCurso(curso.tipoCurso) }}</span>
            </div>

            <div class="curso-card__progreso">
              <div class="curso-card__progreso-bar">
                <div class="curso-card__progreso-fill" [style.width]="getProcentajeAsignado(curso) + '%'"
                     [class.complete]="isCompleto(curso)"></div>
              </div>
              <span class="curso-card__progreso-text">{{ getProcentajeAsignado(curso) }}%</span>
            </div>

            <div class="curso-card__tipos">
              @for (tipo of curso.tiposRequeridos; track tipo) {
                <div class="tipo-badge" [class]="'tipo-badge--' + tipo.toLowerCase()"
                     [class.tipo-badge--done]="getHorasRestantes(curso, tipo) <= 0"
                     cdkDrag
                     [cdkDragData]="{ curso: curso, tipoClase: tipo }"
                     (cdkDragStarted)="onDragStart(curso, tipo)"
                     (cdkDragEnded)="onDragEnd()"
                     [matTooltip]="getTooltipTipo(curso, tipo)">
                  <span class="tipo-badge__icon">{{ getTipoIcon(tipo) }}</span>
                  <span class="tipo-badge__label">{{ formatTipo(tipo) }}</span>
                  <span class="tipo-badge__hrs">{{ getHorasRestantes(curso, tipo) }}h</span>
                  @if (getHorasRestantes(curso, tipo) > 0) {
                    <mat-icon class="tipo-badge__drag">drag_indicator</mat-icon>
                  } @else {
                    <mat-icon class="tipo-badge__check">check_circle</mat-icon>
                  }
                </div>
              }
            </div>
          </div>
        } @empty {
          <div class="banco__empty">
            @if (cursos.length === 0) {
              <mat-icon>check_circle</mat-icon>
              <span>Todos los cursos están asignados</span>
            } @else {
              <mat-icon>filter_list_off</mat-icon>
              <span>No hay cursos con estos filtros</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .banco { display: flex; flex-direction: column; height: 100%; }
    .banco__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px;
      background: var(--color-surface-2, #f8fafc); border-bottom: 1px solid var(--color-border, #e2e8f0);
    }
    .banco__header-left { display: flex; align-items: center; gap: 6px; }
    .banco__header-left mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--color-primary, #6366f1); }
    .banco__title { font-size: 13px; font-weight: 700; color: var(--color-text, #1e293b); text-transform: uppercase; letter-spacing: 0.03em; }
    .banco__count {
      background: var(--color-primary, #6366f1); color: white; font-size: 11px; font-weight: 700;
      padding: 2px 8px; border-radius: 10px;
    }

    .banco__search { padding: 8px 12px 0; }
    .banco__search-field { width: 100%; font-size: 12px; }
    .banco__search-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

    .banco__filters { padding: 0 12px 8px; }
    .banco__filter-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .banco__filter-label { font-size: 10px; font-weight: 600; color: var(--color-text-muted, #94a3b8); min-width: 36px; }
    .banco__filter-row mat-chip-listbox { flex: 1; }
    .banco__filter-row ::ng-deep .mat-mdc-chip-listbox { min-height: 28px; }
    .banco__filter-row ::ng-deep .mat-mdc-chip { font-size: 10px; min-height: 24px; }

    .banco__stats {
      display: flex; gap: 16px; padding: 8px 16px; margin: 0 12px 8px;
      background: var(--color-primary-bg, #eef2ff); border-radius: 6px;
    }
    .stat { display: flex; flex-direction: column; align-items: center; flex: 1; }
    .stat__value { font-size: 16px; font-weight: 800; color: var(--color-primary, #6366f1); }
    .stat__label { font-size: 9px; color: var(--color-text-muted, #94a3b8); text-transform: uppercase; }

    .banco__list {
      flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 8px;
    }

    .curso-card {
      background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 8px; padding: 10px 12px; transition: all 200ms;
      position: relative; overflow: hidden;
    }
    .curso-card::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
      background: var(--color-primary, #6366f1); opacity: 0; transition: opacity 200ms;
    }
    .curso-card:hover { border-color: var(--color-primary, #6366f1); box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
    .curso-card:hover::before { opacity: 1; }
    .curso-card--dragging { opacity: 0.5; border-style: dashed; }
    .curso-card--complete { opacity: 0.6; }
    .curso-card--complete::before { background: #16a34a; }

    .curso-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .curso-card__codigo {
      font-size: 11px; font-weight: 700; color: var(--color-primary, #6366f1);
      background: var(--color-primary-bg, #eef2ff); padding: 1px 6px; border-radius: 4px;
    }
    .curso-card__ciclo { font-size: 10px; color: var(--color-text-muted, #94a3b8); }
    .curso-card__nombre {
      font-size: 12px; font-weight: 600; color: var(--color-text, #1e293b);
      margin-bottom: 4px; line-height: 1.3;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .curso-card__meta { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
    .curso-card__alumnos { display: flex; align-items: center; gap: 2px; font-size: 10px; color: var(--color-text-muted, #94a3b8); }
    .curso-card__alumnos mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .curso-card__tipo { font-size: 9px; color: var(--color-text-muted, #94a3b8); background: #f1f5f9; padding: 1px 6px; border-radius: 3px; }

    .curso-card__progreso { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .curso-card__progreso-bar { flex: 1; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; }
    .curso-card__progreso-fill { height: 100%; background: var(--color-primary, #6366f1); border-radius: 2px; transition: width 300ms; }
    .curso-card__progreso-fill.complete { background: #16a34a; }
    .curso-card__progreso-text { font-size: 9px; font-weight: 700; color: var(--color-text-muted, #94a3b8); min-width: 24px; text-align: right; }

    .curso-card__tipos { display: flex; flex-wrap: wrap; gap: 4px; }

    .tipo-badge {
      display: flex; align-items: center; gap: 3px; padding: 3px 8px;
      border-radius: 5px; font-size: 10px; font-weight: 600; cursor: grab;
      transition: all 150ms; user-select: none; position: relative;
    }
    .tipo-badge:active { cursor: grabbing; }
    .tipo-badge--teoria { background: #e8eaf6; color: #283593; border: 1px solid #c5cae9; }
    .tipo-badge--practica { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .tipo-badge--laboratorio { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .tipo-badge--done { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; opacity: 0.7; cursor: default; }
    .tipo-badge__icon { font-size: 10px; }
    .tipo-badge__hrs { font-weight: 800; }
    .tipo-badge__drag { font-size: 12px; width: 12px; height: 12px; opacity: 0.4; }
    .tipo-badge__check { font-size: 12px; width: 12px; height: 12px; color: #16a34a; }
    .tipo-badge:hover { transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .tipo-badge--done:hover { transform: none; box-shadow: none; }

    .banco__empty {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 24px; color: var(--color-text-muted, #94a3b8); text-align: center; font-size: 12px;
    }
    .banco__empty mat-icon { font-size: 32px; width: 32px; height: 32px; }
  `],
})
export class BancoCursosComponent {
  @Input() cursos: CursoPendiente[] = [];
  @Input() cursoArrastrando: CursoPendiente | null = null;
  @Output() arrastreIniciado = new EventEmitter<{ curso: CursoPendiente; tipoClase: string }>();
  @Output() arrastreFinalizado = new EventEmitter<void>();

  busqueda = '';
  filtroCiclo = 'all';
  filtroTipo = 'all';

  get ciclosUnicos(): number[] {
    return [...new Set(this.cursos.map(c => c.ciclo))].sort();
  }

  get cursosFiltrados(): CursoPendiente[] {
    let result = this.cursos;
    if (this.filtroCiclo !== 'all') {
      result = result.filter(c => c.ciclo === Number(this.filtroCiclo));
    }
    if (this.filtroTipo !== 'all') {
      result = result.filter(c => c.tipoCurso === this.filtroTipo);
    }
    if (this.busqueda.trim()) {
      const term = this.busqueda.toLowerCase();
      result = result.filter(c =>
        c.codigo.toLowerCase().includes(term) || c.nombre.toLowerCase().includes(term)
      );
    }
    return result;
  }

  get totalHorasPendientes(): number {
    return this.cursosFiltrados.reduce((sum, c) => {
      return sum + c.tiposRequeridos.reduce((s, t) => s + this.getHorasRestantes(c, t), 0);
    }, 0);
  }

  onSearchChange(): void {}
  onFiltroChange(): void {}

  onDragStart(curso: CursoPendiente, tipoClase: string): void {
    this.arrastreIniciado.emit({ curso, tipoClase });
  }

  onDragEnd(): void {
    this.arrastreFinalizado.emit();
  }

  formatTipo(tipo: string): string {
    const map: Record<string, string> = { TEORIA: 'Teoría', PRACTICA: 'Práctica', LABORATORIO: 'Laboratorio' };
    return map[tipo] || tipo;
  }

  formatTipoCurso(tipo: string): string {
    const map: Record<string, string> = {
      OBLIGATORIO_GENERAL: 'Oblig. General',
      OBLIGATORIO_PROFESIONAL: 'Oblig. Prof.',
      ELECTIVO: 'Electivo',
      ESPECIALIDAD: 'Especialidad',
    };
    return map[tipo] || tipo;
  }

  getTipoIcon(tipo: string): string {
    const map: Record<string, string> = { TEORIA: '📖', PRACTICA: '🔬', LABORATORIO: '🧪' };
    return map[tipo] || '📚';
  }

  getHorasRestantes(curso: CursoPendiente, tipo: string): number {
    switch (tipo) {
      case 'TEORIA': return curso.horasTeoria - curso.horasAsignadasTeoria;
      case 'PRACTICA': return curso.horasPractica - curso.horasAsignadasPractica;
      case 'LABORATORIO': return curso.horasLaboratorio - curso.horasAsignadasLaboratorio;
      default: return 0;
    }
  }

  getProcentajeAsignado(curso: CursoPendiente): number {
    const totalRequerido = curso.horasTeoria + curso.horasPractica + curso.horasLaboratorio;
    const totalAsignado = curso.horasAsignadasTeoria + curso.horasAsignadasPractica + curso.horasAsignadasLaboratorio;
    return totalRequerido > 0 ? Math.round((totalAsignado / totalRequerido) * 100) : 0;
  }

  isCompleto(curso: CursoPendiente): boolean {
    return curso.tiposRequeridos.every(t => this.getHorasRestantes(curso, t) <= 0);
  }

  getTooltipTipo(curso: CursoPendiente, tipo: string): string {
    const restantes = this.getHorasRestantes(curso, tipo);
    if (restantes <= 0) return `${this.formatTipo(tipo)}: Completado`;
    return `Arrastrar ${this.formatTipo(tipo)} — ${restantes}h pendientes`;
  }
}
