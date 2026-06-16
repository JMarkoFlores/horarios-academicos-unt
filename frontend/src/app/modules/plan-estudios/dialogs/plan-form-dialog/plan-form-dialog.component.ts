import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../core/interfaces/entities';
import { PlanEstudios } from '../../plan-estudios-list/plan-estudios-list.component';

@Component({
  selector: 'app-plan-form-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.plan ? 'Editar Plan' : 'Nuevo Plan' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <div class="form-row">
          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Código</mat-label>
            <input matInput formControlName="codigo" placeholder="Ej: 2018" maxlength="20">
            <mat-hint>Identificador único del plan</mat-hint>
            <mat-error *ngIf="form.get('codigo')?.hasError('required')">Requerido</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Año</mat-label>
            <input matInput type="number" formControlName="anio" placeholder="2018" min="1900" max="2100">
            <mat-error *ngIf="form.get('anio')?.hasError('required')">Requerido</mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="premium-field full-width">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" placeholder="Plan de Estudios 2018" maxlength="200">
          <mat-error *ngIf="form.get('nombre')?.hasError('required')">Requerido</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="premium-field full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="descripcion" rows="2" maxlength="500"></textarea>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Resolución</mat-label>
            <input matInput formControlName="resolucion" placeholder="R.N° 123-2018-UNT" maxlength="100">
          </mat-form-field>

          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Escuela</mat-label>
            <mat-select formControlName="escuela_id" [disabled]="!!data.plan">
              <mat-option *ngFor="let esc of escuelas" [value]="esc.id">{{ esc.nombre }}</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('escuela_id')?.hasError('required')">Requerido</mat-error>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || saving" (click)="guardar()">
        <mat-spinner diameter="16" *ngIf="saving"></mat-spinner>
        <span *ngIf="!saving">{{ data.plan ? 'Actualizar' : 'Crear' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    ::ng-deep .mat-mdc-dialog-container {
      --mdc-dialog-container-shape: 12px;
    }
    h2[mat-dialog-title] { margin: 0; padding: 20px 24px 0; }
    mat-dialog-content { padding: 16px 24px 0 !important; }
    mat-dialog-actions { padding: 16px 24px 20px; }
    .dialog-form { display: flex; flex-direction: column; gap: 20px; min-width: 500px; }
    .form-row { display: flex; gap: 16px; }
    .form-row > * { flex: 1; }
    .full-width { width: 100%; }
    .premium-field { width: 100%; }
    @media (max-width: 600px) { .dialog-form { min-width: 0; } .form-row { flex-direction: column; } }
  `],
})
export class PlanFormDialogComponent implements OnInit {
  form: FormGroup;
  saving = false;
  escuelas: Array<{ id: number; nombre: string }> = [];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<PlanFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { plan?: PlanEstudios } = {},
  ) {
    this.form = this.fb.group({
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      descripcion: [''],
      resolucion: [''],
      anio: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(2100)]],
      escuela_id: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.api.get<ApiResponse<any[]>>('/escuelas').subscribe({
      next: (res) => { this.escuelas = res.data; },
      error: () => { this.snackBar.open('Error al cargar escuelas', 'Cerrar', { duration: 3000 }); },
    });

    if (this.data.plan) {
      this.form.patchValue({
        codigo: this.data.plan.codigo,
        nombre: this.data.plan.nombre,
        descripcion: this.data.plan.descripcion || '',
        resolucion: this.data.plan.resolucion || '',
        anio: this.data.plan.anio,
        escuela_id: this.data.plan.escuela_id,
      });
    }
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const dto = this.form.value;

    const request = this.data.plan
      ? this.api.patch<ApiResponse<PlanEstudios>>(`/plan-estudios/${this.data.plan.id}`, dto)
      : this.api.post<ApiResponse<PlanEstudios>>('/plan-estudios', dto);

    request.subscribe({
      next: () => {
        this.snackBar.open(this.data.plan ? 'Plan actualizado' : 'Plan creado', 'OK', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 });
      },
    });
  }
}
