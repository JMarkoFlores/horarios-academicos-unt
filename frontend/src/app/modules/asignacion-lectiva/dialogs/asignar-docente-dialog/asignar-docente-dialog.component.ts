import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../../core/services/api.service';
import { PeriodoService } from '../../../../core/services/periodo.service';
import { ApiResponse, PaginatedData, Docente, Grupo } from '../../../../core/interfaces/entities';

export interface CursoPlanData {
  id: number;
  curso_id: number;
  horas_teoria: number;
  horas_practica: number;
  horas_laboratorio: number;
  creditos: number;
  curso: { id: number; codigo: string; nombre: string };
}

@Component({
  selector: 'app-asignar-docente-dialog',
  template: `
    <h2 mat-dialog-title>Asignar docente</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <div class="curso-info">
          <strong>{{ data.cursoPlan.curso.codigo }} — {{ data.cursoPlan.curso.nombre }}</strong>
          <div class="horas-info">
            <span>T: {{ data.cursoPlan.horas_teoria }}h</span>
            <span>P: {{ data.cursoPlan.horas_practica }}h</span>
            <span>L: {{ data.cursoPlan.horas_laboratorio }}h</span>
            <span class="credits">{{ data.cursoPlan.creditos }} créd.</span>
          </div>
        </div>

        <mat-form-field appearance="outline" class="premium-field">
          <mat-label>Docente</mat-label>
          <mat-select formControlName="docente_id" (selectionChange)="onDocenteChange($event.value)">
            <mat-option *ngFor="let d of docentes" [value]="d.id">
              {{ d.nombres }} {{ d.apellidos }} ({{ d.codigo }})
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('docente_id')?.invalid">Este campo es obligatorio</mat-error>
        </mat-form-field>

        <div class="carga-info" *ngIf="cargaActual !== null">
          <mat-icon>info</mat-icon>
          <span>
            Carga actual: <strong>{{ cargaActual }}h</strong>
            &nbsp;|&nbsp; Carga máxima: <strong>{{ cargaMaxima }}h</strong>
            &nbsp;|&nbsp; Nueva carga total: <strong>{{ nuevaCargaTotal }}h</strong>
            <span [class.excede]="nuevaCargaTotal > cargaMaxima">
              {{ nuevaCargaTotal > cargaMaxima ? '⚠️ Excede el límite' : '✅' }}
            </span>
          </span>
        </div>

        <mat-form-field appearance="outline" class="premium-field">
          <mat-label>Tipo de clase</mat-label>
          <mat-select formControlName="tipo_clase">
            <mat-option value="TEORIA">Teoría</mat-option>
            <mat-option value="PRACTICA">Práctica</mat-option>
            <mat-option value="LABORATORIO">Laboratorio</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="premium-field">
          <mat-label>Grupo</mat-label>
          <mat-select formControlName="grupo_id">
            <mat-option *ngFor="let g of grupos" [value]="g.id">{{ g.nombre }} ({{ g.codigo }})</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="premium-field">
          <mat-label>Sección</mat-label>
          <mat-select formControlName="seccion">
            <mat-option value="G1">G1</mat-option>
            <mat-option value="G2">G2</mat-option>
            <mat-option value="G3">G3</mat-option>
            <mat-option value="U">Unica</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="premium-field">
          <mat-label>Horas asignadas</mat-label>
          <input matInput type="number" formControlName="horas_asignadas" min="0" step="0.5">
        </mat-form-field>

        <mat-form-field appearance="outline" class="premium-field">
          <mat-label>Número de alumnos</mat-label>
          <input matInput type="number" formControlName="nro_alumnos" min="0">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || saving" (click)="onSave()">
        Asignar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .premium-field { width: 100%; }
    .curso-info { padding: 12px; background: #f5f5f5; border-radius: 8px; margin-bottom: 8px; }
    .curso-info strong { display: block; margin-bottom: 4px; }
    .horas-info { display: flex; gap: 12px; font-size: 0.85rem; color: #555; }
    .horas-info .credits { color: #1565c0; font-weight: 600; }
    .carga-info { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #e3f2fd; border-radius: 8px; font-size: 0.85rem; }
    .carga-info mat-icon { font-size: 18px; width: 18px; height: 18px; color: #1565c0; }
    .carga-info .excede { color: #c62828; font-weight: 600; }
  `],
})
export class AsignarDocenteDialogComponent implements OnInit {
  form: FormGroup;
  docentes: Docente[] = [];
  grupos: Grupo[] = [];
  saving = false;
  cargaActual: number | null = null;
  cargaMaxima = 40;
  nuevaCargaTotal = 0;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar,
    private periodoService: PeriodoService,
    public dialogRef: MatDialogRef<AsignarDocenteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cursoPlan: CursoPlanData; periodoId: number },
  ) {
    this.form = this.fb.group({
      docente_id: [null, Validators.required],
      tipo_clase: ['TEORIA', Validators.required],
      grupo_id: [null],
      seccion: ['G1', Validators.required],
      horas_asignadas: [0, [Validators.required, Validators.min(0)]],
      nro_alumnos: [0, [Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.api.get<ApiResponse<PaginatedData<Docente>>>('/docentes', { limit: 200 }).subscribe({
      next: (res) => {
        this.docentes = Array.isArray(res.data) ? res.data : res.data?.items || [];
      },
    });

    const periodoCodigo = this.periodoService.periodo;
    this.api.get<ApiResponse<PaginatedData<Grupo>>>('/grupos', {
      curso_id: this.data.cursoPlan.curso_id,
      periodo: periodoCodigo,
      limit: 100
    }).subscribe({
      next: (res) => {
        this.grupos = Array.isArray(res.data) ? res.data : res.data?.items || [];
        if (this.grupos.length > 0) {
          this.form.patchValue({ grupo_id: this.grupos[0].id });
        }
      },
    });

    this.form.get('tipo_clase')?.valueChanges.subscribe((tipo: string) => {
      const horas = this.getHorasPorTipo(tipo);
      this.form.patchValue({ horas_asignadas: horas }, { emitEvent: false });
    });
  }

  getHorasPorTipo(tipo: string): number {
    const cp = this.data.cursoPlan;
    switch (tipo) {
      case 'TEORIA': return cp.horas_teoria;
      case 'PRACTICA': return cp.horas_practica;
      case 'LABORATORIO': return cp.horas_laboratorio;
      default: return 0;
    }
  }

  onDocenteChange(docenteId: number): void {
    this.api.get<ApiResponse<any>>(`/asignacion-lectiva/docente/${docenteId}`, {
      periodo_id: this.data.periodoId,
    }).subscribe({
      next: (res) => {
        const asigs = Array.isArray(res.data) ? res.data : [];
        this.cargaActual = asigs.reduce((sum: number, a: any) => sum + Number(a.horas_asignadas), 0);
        this.cargaMaxima = 40;
        const horasNuevas = this.form.get('horas_asignadas')?.value || 0;
        this.nuevaCargaTotal = this.cargaActual + horasNuevas;
      },
    });
  }

  onSave(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const dto = {
      ...this.form.value,
      curso_plan_id: this.data.cursoPlan.id,
      periodo_id: this.data.periodoId,
    };
    this.api.post<ApiResponse<any>>('/asignacion-lectiva', dto).subscribe({
      next: () => {
        this.snackBar.open('Asignación creada correctamente', 'OK', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err?.error?.message || 'Error al asignar', 'Cerrar', { duration: 4000 });
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
