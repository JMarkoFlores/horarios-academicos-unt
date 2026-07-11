import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MiniFormularioData, COLORES_TIPO_CLASE, AmbienteDisponible } from '../../models/asignador.models';

@Component({
  selector: 'app-mini-formulario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTooltipModule, MatChipsModule,
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
              <div class="mini-form__curso-info">
                <span class="mini-form__curso-codigo">{{ data.curso.codigo }}</span>
                <span class="mini-form__curso-nombre">{{ data.curso.nombre }}</span>
              </div>
            </div>
            <button mat-icon-button (click)="onCancel()" matTooltip="Cerrar (Esc)">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="mini-form__body">
            <div class="mini-form__resumen">
              <div class="mini-form__resumen-item">
                <mat-icon>calendar_today</mat-icon>
                <span>{{ getDiaLabel(data.dia) }}</span>
              </div>
              <div class="mini-form__resumen-item">
                <mat-icon>schedule</mat-icon>
                <span>{{ data.horaInicio }} – {{ data.horaFin }}</span>
              </div>
              <div class="mini-form__resumen-item">
                <mat-icon>person</mat-icon>
                <span>{{ data.docente.apellido }}, {{ data.docente.nombre }}</span>
              </div>
            </div>

            <form [formGroup]="form" class="mini-form__form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Grupo / Sección</mat-label>
                <mat-select formControlName="grupo_id" (selectionChange)="onGrupoChange()">
                  @for (g of data.grupos; track g.id) {
                    <mat-option [value]="g.id">
                      {{ g.codigo }} — {{ g.nombre }} ({{ g.tipo }})
                    </mat-option>
                  }
                </mat-select>
                @if (form.get('grupo_id')?.hasError('required') && form.get('grupo_id')?.touched) {
                  <mat-error>Selecciona un grupo</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Aula / Ambiente</mat-label>
                <mat-select formControlName="ambiente_id">
                  @for (a of ambientesDisponibles; track a.id) {
                    <mat-option [value]="a.id" [matTooltip]="a.nombre + ' — Cap: ' + a.capacidad">
                      {{ a.codigo }} — {{ a.nombre }}
                      <span class="amb-cap">({{ a.capacidad }})</span>
                    </mat-option>
                  }
                </mat-select>
                @if (form.get('ambiente_id')?.hasError('required') && form.get('ambiente_id')?.touched) {
                  <mat-error>Selecciona un aula</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>N° Alumnos</mat-label>
                <input matInput type="number" formControlName="nro_alumnos" min="1" max="60">
                @if (form.get('nro_alumnos')?.hasError('min')) {
                  <mat-error>Mínimo 1 alumno</mat-error>
                }
                @if (form.get('nro_alumnos')?.hasError('max')) {
                  <mat-error>Máximo 60 alumnos</mat-error>
                }
              </mat-form-field>
            </form>

            @if (selectedAmbiente) {
              <div class="mini-form__ambiente-preview">
                <div class="mini-form__ambiente-header">
                  <mat-icon>meeting_room</mat-icon>
                  <span>{{ selectedAmbiente.codigo }} — {{ selectedAmbiente.nombre }}</span>
                </div>
                <div class="mini-form__ambiente-details">
                  <span>Cap: {{ selectedAmbiente.capacidad }}</span>
                  <span>Tipo: {{ selectedAmbiente.tipo }}</span>
                  <span>Ocupación: {{ selectedAmbiente.totalBloquesOcupados }}/30 bloques</span>
                </div>
              </div>
            }
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
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 150ms ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }

    .mini-form {
      background: var(--color-surface, #fff); border-radius: 12px; width: 480px; max-width: 95vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25); animation: slideUp 200ms ease;
      max-height: 90vh; overflow-y: auto;
    }
    @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .mini-form__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; border-bottom: 1px solid var(--color-border, #e2e8f0);
    }
    .mini-form__header-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
    .mini-form__tipo {
      font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px;
      border: 1px solid; text-transform: uppercase; white-space: nowrap; flex-shrink: 0;
    }
    .mini-form__curso-info { display: flex; flex-direction: column; min-width: 0; }
    .mini-form__curso-codigo { font-size: 11px; font-weight: 700; color: var(--color-primary, #6366f1); }
    .mini-form__curso-nombre {
      font-size: 13px; font-weight: 600; color: var(--color-text, #1e293b);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .mini-form__body { padding: 16px; }

    .mini-form__resumen {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px;
      padding: 10px; background: var(--color-surface-2, #f8fafc); border-radius: 6px;
    }
    .mini-form__resumen-item {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 600; color: var(--color-text, #1e293b);
    }
    .mini-form__resumen-item mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--color-primary, #6366f1); }

    .mini-form__form { display: flex; flex-direction: column; gap: 4px; }
    .full-width { width: 100%; }
    .amb-cap { font-size: 10px; color: var(--color-text-muted, #94a3b8); margin-left: 4px; }

    .mini-form__ambiente-preview {
      margin-top: 8px; padding: 8px 10px; background: #f0fdf4;
      border: 1px solid #bbf7d0; border-radius: 6px;
    }
    .mini-form__ambiente-header {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 700; color: #166534; margin-bottom: 4px;
    }
    .mini-form__ambiente-header mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .mini-form__ambiente-details {
      display: flex; gap: 12px; font-size: 10px; color: #166534;
    }

    .mini-form__footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 12px 16px; border-top: 1px solid var(--color-border, #e2e8f0);
    }
  `],
})
export class MiniFormularioComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() data: MiniFormularioData | null = null;
  @Input() ambientes: AmbienteDisponible[] = [];
  @Output() confirmar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  form!: FormGroup;
  guardando = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data && this.form) {
      this.form.patchValue({
        grupo_id: this.data.grupos?.length === 1 ? this.data.grupos[0].id : null,
        ambiente_id: null,
        nro_alumnos: 30,
      });
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      grupo_id: [null, Validators.required],
      ambiente_id: [null, Validators.required],
      nro_alumnos: [30, [Validators.required, Validators.min(1), Validators.max(60)]],
    });
  }

  get ambientesDisponibles(): AmbienteDisponible[] {
    return this.ambientes.filter(a => a.activo && a.estado === 'ACTIVO');
  }

  get selectedAmbiente(): AmbienteDisponible | null {
    const id = this.form?.get('ambiente_id')?.value;
    return this.ambientes.find(a => a.id === id) || null;
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

  onGrupoChange(): void {
    const grupo = this.data?.grupos.find(g => g.id === this.form.get('grupo_id')?.value);
    if (grupo) {
      this.form.patchValue({ nro_alumnos: grupo.cupoMaximo || 30 });
    }
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
