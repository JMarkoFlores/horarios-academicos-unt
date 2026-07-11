import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MiniFormularioData, COLORES_TIPO_CLASE, AmbienteDisponible } from '../../models/asignador.models';

@Component({
  selector: 'app-mini-formulario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDialogModule, MatTooltipModule,
  ],
  template: `
    @if (visible && data) {
      <div class="mini-overlay" (click)="onCancel()">
        <div class="mini-form" (click)="$event.stopPropagation()">
          <div class="mini-form__header">
            <div class="mini-form__header-left">
              <span class="mini-form__tipo" [style.background]="getTipoColor(data.tipoClase).light"
                    [style.color]="getTipoColor(data.tipoClase).text"
                    [style.border-color]="getTipoColor(data.tipoClase).border">
                {{ formatTipo(data.tipoClase) }}
              </span>
              <span class="mini-form__curso">{{ data.curso.codigo }} — {{ data.curso.nombre }}</span>
            </div>
            <button mat-icon-button (click)="onCancel()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="mini-form__body">
            <div class="mini-form__grid">
              <div class="mini-form__field">
                <label>Día</label>
                <span class="mini-form__value">{{ getDiaLabel(data.dia) }}</span>
              </div>
              <div class="mini-form__field">
                <label>Horario</label>
                <span class="mini-form__value">{{ data.horaInicio }} – {{ data.horaFin }}</span>
              </div>
              <div class="mini-form__field">
                <label>Docente</label>
                <span class="mini-form__value">{{ data.docente.apellido }}, {{ data.docente.nombre }}</span>
              </div>
            </div>

            <form [formGroup]="form" class="mini-form__form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Grupo / Sección</mat-label>
                <mat-select formControlName="grupo_id">
                  @for (g of data.grupos; track g.id) {
                    <mat-option [value]="g.id">{{ g.codigo }} — {{ g.nombre }} ({{ g.tipo }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Aula / Ambiente</mat-label>
                <mat-select formControlName="ambiente_id">
                  @for (a of ambientesDisponibles; track a.id) {
                    <mat-option [value]="a.id">
                      {{ a.codigo }} — {{ a.nombre }} (Cap: {{ a.capacidad }})
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>N° Alumnos</mat-label>
                <input matInput type="number" formControlName="nro_alumnos" min="1" max="60">
              </mat-form-field>
            </form>
          </div>

          <div class="mini-form__footer">
            <button mat-stroked-button (click)="onCancel()">Cancelar</button>
            <button mat-flat-button color="primary" [disabled]="form.invalid || guardando" (click)="onConfirm()">
              @if (guardando) {
                <mat-icon class="spin">sync</mat-icon>
              }
              Asignar
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .mini-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 150ms ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }

    .mini-form {
      background: var(--color-surface, #fff); border-radius: 12px; width: 440px; max-width: 95vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: slideUp 200ms ease;
    }
    @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .mini-form__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; border-bottom: 1px solid var(--color-border, #e2e8f0);
    }
    .mini-form__header-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .mini-form__tipo {
      font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px;
      border: 1px solid; text-transform: uppercase; white-space: nowrap;
    }
    .mini-form__curso { font-size: 13px; font-weight: 600; color: var(--color-text, #1e293b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .mini-form__body { padding: 16px; }
    .mini-form__grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .mini-form__field label { display: block; font-size: 10px; font-weight: 600; color: var(--color-text-muted, #94a3b8); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .mini-form__value { font-size: 12px; font-weight: 600; color: var(--color-text, #1e293b); }
    .mini-form__form { display: flex; flex-direction: column; gap: 4px; }
    .full-width { width: 100%; }

    .mini-form__footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 12px 16px; border-top: 1px solid var(--color-border, #e2e8f0);
    }
  `],
})
export class MiniFormularioComponent implements OnInit {
  @Input() visible = false;
  @Input() data: MiniFormularioData | null = null;
  @Input() ambientes: AmbienteDisponible[] = [];
  @Output() confirmar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  form!: FormGroup;
  guardando = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      grupo_id: [null, Validators.required],
      ambiente_id: [null, Validators.required],
      nro_alumnos: [30, [Validators.required, Validators.min(1), Validators.max(60)]],
    });
  }

  get ambientesDisponibles(): AmbienteDisponible[] {
    return this.ambientes.filter(a => a.activo && a.estado === 'ACTIVO');
  }

  getDiaLabel(dia: number): string {
    const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[dia] || '';
  }

  formatTipo(tipo: string): string {
    const map: Record<string, string> = { TEORIA: 'Teoría', PRACTICA: 'Práctica', LABORATORIO: 'Laboratorio' };
    return map[tipo] || tipo;
  }

  getTipoColor(tipo: string) {
    return COLORES_TIPO_CLASE[tipo] || COLORES_TIPO_CLASE['TEORIA'];
  }

  onCancel(): void {
    this.cancelar.emit();
  }

  onConfirm(): void {
    if (this.form.invalid || !this.data) return;
    this.guardando = true;
    const vals = this.form.value;
    this.confirmar.emit({
      docente_id: this.data.docente.id,
      curso_id: this.data.curso.cursoId,
      grupo_id: vals.grupo_id,
      ambiente_id: vals.ambiente_id,
      periodo: '',
      dia: this.data.dia,
      hora_inicio: this.data.horaInicio,
      hora_fin: this.data.horaFin,
      tipo_clase: this.data.tipoClase,
      curso_plan_id: this.data.curso.cursoPlanId,
      seccion: this.data.curso.codigo,
      nro_alumnos: vals.nro_alumnos,
    });
  }
}
