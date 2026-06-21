import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../../core/services/api.service';
import { PeriodoService } from '../../../../core/services/periodo.service';
import { ApiResponse, PaginatedData, PlanEstudios, Docente, Grupo } from '../../../../core/interfaces/entities';
import { CursoPlanDialogComponent } from '../../../../modules/plan-estudios/dialogs/curso-plan-dialog/curso-plan-dialog.component';

export interface CursoPlanData {
  id: number;
  curso_id: number;
  plan_estudios_id: number;
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
        <mat-form-field appearance="outline" class="premium-field">
          <mat-label>Plan de Estudios</mat-label>
          <mat-select [formControl]="planControl">
            <mat-option *ngFor="let p of planes" [value]="p.id">
              {{ p.nombre }} <span *ngIf="p.activo">(Activo)</span>
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div class="curso-info">
          <strong>{{ cursoPlanData.curso.codigo }} — {{ cursoPlanData.curso.nombre }}</strong>
          <div class="horas-info">
            <span>T: {{ cursoPlanData.horas_teoria }}h</span>
            <span>P: {{ cursoPlanData.horas_practica }}h</span>
            <span>L: {{ cursoPlanData.horas_laboratorio }}h</span>
            <span class="credits">{{ cursoPlanData.creditos }} créd.</span>
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
      <div *ngIf="cursoNoExisteEnPlan" class="warning-banner">
        <mat-icon>warning</mat-icon>
        <span>Este curso no existe en el plan seleccionado.</span>
        <button mat-stroked-button color="primary" (click)="agregarCursoAlPlan()">Agregar al plan</button>
      </div>

      <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || saving || cursoNoExisteEnPlan" (click)="onSave()">
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
    .warning-banner { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #fff3e0; color: #e65100; border-radius: 8px; font-size: 0.85rem; margin-bottom: 8px; flex-wrap: wrap; }
    .warning-banner mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .warning-banner span { flex: 1; }
    .warning-banner button { flex-shrink: 0; }
  `],
})
export class AsignarDocenteDialogComponent implements OnInit {
  form: FormGroup;
  planes: PlanEstudios[] = [];
  planControl = this.fb.control<number | null>(null);
  cursoPlanData: CursoPlanData;
  docentes: Docente[] = [];
  grupos: Grupo[] = [];
  saving = false;
  cargaActual: number | null = null;
  cargaMaxima = 40;
  nuevaCargaTotal = 0;
  cursoNoExisteEnPlan = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar,
    private periodoService: PeriodoService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<AsignarDocenteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cursoPlan: CursoPlanData; periodoId: number },
  ) {
    this.cursoPlanData = { ...data.cursoPlan };
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
    this.api.get<ApiResponse<PlanEstudios[]>>('/plan-estudios').subscribe({
      next: (res) => {
        this.planes = res.data;
        this.planControl.setValue(this.data.cursoPlan.plan_estudios_id);
      },
    });

    this.planControl.valueChanges.subscribe((planId) => {
      if (planId && planId !== this.data.cursoPlan.plan_estudios_id) {
        this.cargarCursoParaPlan(planId);
      }
    });

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

  cargarCursoParaPlan(planId: number): void {
    this.api.get<ApiResponse<CursoPlanData[]>>(
      `/plan-estudios/${planId}/cursos`
    ).subscribe({
      next: (res) => {
        const items = Array.isArray(res.data) ? res.data : [];
        const encontrado = items.find((cp) => cp.curso_id === this.data.cursoPlan.curso_id);
        if (encontrado) {
          this.cursoPlanData = encontrado;
          this.cursoNoExisteEnPlan = false;
          this.form.patchValue({
            horas_asignadas: this.getHorasPorTipo(this.form.get('tipo_clase')?.value),
          });
          if (this.form.get('docente_id')?.value) {
            this.onDocenteChange(this.form.get('docente_id')?.value);
          }
        } else {
          this.cursoNoExisteEnPlan = true;
        }
      },
      error: () => {
        this.cursoNoExisteEnPlan = true;
      },
    });
  }

  getHorasPorTipo(tipo: string): number {
    switch (tipo) {
      case 'TEORIA': return this.cursoPlanData.horas_teoria;
      case 'PRACTICA': return this.cursoPlanData.horas_practica;
      case 'LABORATORIO': return this.cursoPlanData.horas_laboratorio;
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
      curso_plan_id: this.cursoPlanData.id,
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

  agregarCursoAlPlan(): void {
    const planId = this.planControl.value;
    if (!planId) return;

    const cursoInfo = this.data.cursoPlan.curso;
    this.dialog.open(CursoPlanDialogComponent, {
      width: '600px',
      data: {
        planId,
        modo: 'crear',
        cursoPreSeleccionado: { id: cursoInfo.id, codigo: cursoInfo.codigo, nombre: cursoInfo.nombre },
      },
    }).afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.cargarCursoParaPlan(planId);
      }
    });
  }
}
