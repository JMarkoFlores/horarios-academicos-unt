import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse, Curso, PaginatedData } from '../../../../core/interfaces/entities';
import { CursoPlan } from '../../plan-estudios-detail/plan-estudios-detail.component';

@Component({
  selector: 'app-curso-plan-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.modo === 'editar' ? 'Editar Curso en Plan' : 'Agregar Curso al Plan' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="premium-field" *ngIf="data.modo === 'crear'">
          <mat-label>Curso</mat-label>
          <mat-select formControlName="curso_id">
            <mat-option *ngFor="let c of cursos" [value]="c.id">
              {{ c.codigo }} - {{ c.nombre }}
            </mat-option>
          </mat-select>
          <mat-error>Requerido</mat-error>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Ciclo</mat-label>
            <mat-select formControlName="ciclo">
              <mat-option *ngFor="let c of [1,2,3,4,5,6,7,8,9,10]" [value]="c">Ciclo {{ c }}</mat-option>
            </mat-select>
            <mat-error>Requerido (1-10)</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="tipo_curso">
              <mat-option value="OBLIGATORIO">Obligatorio</mat-option>
              <mat-option value="ELECTIVO">Electivo</mat-option>
              <mat-option value="COMPLEMENTARIO">Complementario</mat-option>
            </mat-select>
            <mat-error>Requerido</mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Hrs Teoría</mat-label>
            <input matInput type="number" formControlName="horas_teoria" min="0">
          </mat-form-field>
          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Hrs Práctica</mat-label>
            <input matInput type="number" formControlName="horas_practica" min="0">
          </mat-form-field>
          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Hrs Laboratorio</mat-label>
            <input matInput type="number" formControlName="horas_laboratorio" min="0">
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Créditos</mat-label>
            <input matInput type="number" formControlName="creditos" step="0.5" min="0">
            <mat-error>Requerido</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Prerrequisitos</mat-label>
            <mat-select formControlName="prerequisitos" multiple>
              <mat-option *ngFor="let c of cursosDisponibles" [value]="c.id">
                {{ c.codigo }} - {{ c.nombre }}
              </mat-option>
            </mat-select>
            <mat-hint>Seleccione los cursos prerrequisito</mat-hint>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || saving" (click)="guardar()">
        <mat-spinner diameter="16" *ngIf="saving"></mat-spinner>
        <span *ngIf="!saving">{{ data.modo === 'editar' ? 'Actualizar' : 'Agregar' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 16px; min-width: 500px; padding-top: 8px; }
    .form-row { display: flex; gap: 16px; }
    .form-row > * { flex: 1; }
    .premium-field { width: 100%; }
    @media (max-width: 600px) { .dialog-form { min-width: 0; } .form-row { flex-direction: column; } }
  `],
})
export class CursoPlanDialogComponent implements OnInit {
  form: FormGroup;
  saving = false;
  cursos: Curso[] = [];
  cursosDisponibles: Curso[] = [];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<CursoPlanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { planId: number; cursoPlan?: CursoPlan; modo: 'crear' | 'editar' },
  ) {
    this.form = this.fb.group({
      curso_id: [null, Validators.required],
      ciclo: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      tipo_curso: ['OBLIGATORIO', Validators.required],
      horas_teoria: [0, Validators.min(0)],
      horas_practica: [0, Validators.min(0)],
      horas_laboratorio: [0, Validators.min(0)],
      creditos: [4, [Validators.required, Validators.min(0)]],
      prerequisitos: [[]],
    });
  }

  ngOnInit(): void {
    this.api.get<ApiResponse<PaginatedData<Curso>>>('/cursos', { limit: 200 }).subscribe({
      next: (res) => {
        this.cursos = res.data.items;
        this.cursosDisponibles = this.cursos;
      },
      error: () => this.snackBar.open('Error al cargar cursos', 'Cerrar', { duration: 3000 }),
    });

    if (this.data.modo === 'editar' && this.data.cursoPlan) {
      const cp = this.data.cursoPlan;
      this.form.patchValue({
        curso_id: cp.curso_id,
        ciclo: cp.ciclo,
        tipo_curso: cp.tipo_curso,
        horas_teoria: cp.horas_teoria,
        horas_practica: cp.horas_practica,
        horas_laboratorio: cp.horas_laboratorio,
        creditos: cp.creditos,
        prerequisitos: cp.prerequisitos || [],
      });
      if (this.data.modo === 'editar') {
        this.form.get('curso_id')?.disable();
      }
    }
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const dto = this.form.getRawValue();

    if (this.data.modo === 'editar' && this.data.cursoPlan) {
      this.api.patch<ApiResponse<any>>(`/plan-estudios/${this.data.planId}/cursos/${this.data.cursoPlan.id}`, dto).subscribe({
        next: () => {
          this.snackBar.open('Curso actualizado en el plan', 'OK', { duration: 2500 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 });
        },
      });
    } else {
      this.api.post<ApiResponse<any>>(`/plan-estudios/${this.data.planId}/cursos`, dto).subscribe({
        next: () => {
          this.snackBar.open('Curso agregado al plan', 'OK', { duration: 2500 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 });
        },
      });
    }
  }
}
