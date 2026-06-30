import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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

interface CoberturaTipo {
  tipo: string;
  plan: number;
  cubierto: number;
  restante: number;
}

function maxHorasValidator(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (val == null || val === '') return null;
    return Number(val) > max ? { maxHoras: { max, actual: val } } : null;
  };
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

        <div class="cobertura-section" *ngIf="cobertura.length > 0">
          <div class="cobertura-title">Cobertura actual del curso</div>
          <div class="cobertura-bars">
            <div class="cobertura-item" *ngFor="let c of cobertura" (click)="seleccionarTipo(c.tipo)">
              <span class="cobertura-label">{{ c.tipo | titlecase }}</span>
              <div class="bar-container">
                <div class="bar-fill" [style.width.%]="porcentaje(c)" [class.completo]="c.restante <= 0"></div>
              </div>
              <span class="cobertura-num" [class.completo]="c.restante <= 0">
                {{ c.cubierto }}h / {{ c.plan }}h
              </span>
              <span class="cobertura-restante" *ngIf="c.restante > 0">
                {{ c.restante }}h libres
              </span>
              <span class="cobertura-completo" *ngIf="c.restante <= 0">
                Completo
              </span>
            </div>
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
            &nbsp;|&nbsp; Máx: <strong>{{ cargaMaxima }}h</strong>
            &nbsp;|&nbsp; Nueva total: <strong>{{ nuevaCargaTotal }}h</strong>
            <span [class.excede]="nuevaCargaTotal > cargaMaxima">
              {{ nuevaCargaTotal > cargaMaxima ? 'Excede el límite' : 'Dentro del límite' }}
            </span>
          </span>
        </div>

        <mat-form-field appearance="outline" class="premium-field">
          <mat-label>Tipo de clase</mat-label>
          <mat-select formControlName="tipo_clase">
            <mat-option *ngFor="let op of tipoOptions" [value]="op.valor" [disabled]="op.restante <= 0">
              {{ op.label }} <span *ngIf="op.restante <= 0">(Completo)</span>
              <span *ngIf="op.restante > 0">({{ op.restante }}h disp.)</span>
            </mat-option>
          </mat-select>
          <mat-hint *ngIf="horasRestanteTipo > 0">Horas disponibles: {{ horasRestanteTipo }}h</mat-hint>
          <mat-error *ngIf="form.get('tipo_clase')?.hasError('required')">Seleccione un tipo de clase</mat-error>
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
          <mat-error *ngIf="form.get('horas_asignadas')?.hasError('maxHoras')">
            Máximo {{ horasRestanteTipo }}h disponibles para este tipo
          </mat-error>
          <mat-error *ngIf="form.get('horas_asignadas')?.hasError('min')">Mínimo 0h</mat-error>
          <mat-error *ngIf="form.get('horas_asignadas')?.hasError('required')">Requerido</mat-error>
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
    .cobertura-section { padding: 10px 12px; background: #f8fbfd; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 4px; }
    .cobertura-title { font-size: 0.8rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .cobertura-bars { display: flex; flex-direction: column; gap: 6px; }
    .cobertura-item { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 3px 0; }
    .cobertura-label { font-size: 0.75rem; font-weight: 600; width: 70px; color: #333; }
    .bar-container { flex: 1; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: #1565c0; border-radius: 4px; transition: width 0.3s ease; }
    .bar-fill.completo { background: #43a047; }
    .cobertura-num { font-size: 0.75rem; font-weight: 600; width: 60px; text-align: right; color: #555; }
    .cobertura-num.completo { color: #43a047; }
    .cobertura-restante { font-size: 0.7rem; color: #1565c0; width: 55px; text-align: right; }
    .cobertura-completo { font-size: 0.7rem; color: #43a047; font-weight: 600; width: 55px; text-align: right; }
    .warning-banner { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #fff3e0; color: #e65100; border-radius: 8px; font-size: 0.85rem; margin-bottom: 8px; flex-wrap: wrap; }
    .warning-banner mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .warning-banner span { flex: 1; }
    .warning-banner button { flex-shrink: 0; }
  `],
})
export class AsignarDocenteDialogComponent implements OnInit, OnDestroy {
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

  cobertura: CoberturaTipo[] = [];
  horasRestanteTipo = 0;
  tipoOptions: { valor: string; label: string; restante: number }[] = [];

  private destroy$ = new Subject<void>();

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
      tipo_clase: [{ value: 'TEORIA', disabled: false }, Validators.required],
      grupo_id: [null],
      seccion: ['G1', Validators.required],
      horas_asignadas: [0, [Validators.required, Validators.min(0)]],
      nro_alumnos: [0, [Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.cargarCoberturaCurso();

    this.api.get<ApiResponse<PlanEstudios[]>>('/plan-estudios').subscribe({
      next: (res) => {
        this.planes = res.data;
        this.planControl.setValue(this.data.cursoPlan.plan_estudios_id);
      },
    });

    this.planControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((planId) => {
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

    this.form.get('tipo_clase')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((tipo: string) => {
      this.actualizarHorasPorTipo(tipo);
    });

    this.form.get('horas_asignadas')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.actualizarNuevaCargaTotal();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarCoberturaCurso(): void {
    this.api.get<ApiResponse<any[]>>('/asignacion-lectiva', {
      periodo_id: this.data.periodoId,
    }).subscribe({
      next: (res) => {
        const asigs = Array.isArray(res.data) ? res.data : [];
        const delCurso = asigs.filter((a: any) => a.curso_plan_id === this.data.cursoPlan.id
          && a.estado !== 'RECHAZADO');

        this.cobertura = [];
        for (const tipo of ['TEORIA', 'PRACTICA', 'LABORATORIO']) {
          const plan = this.getHorasPorTipo(tipo);
          if (plan === 0) continue;
          const cubierto = delCurso
            .filter((a: any) => a.tipo_clase === tipo)
            .reduce((s: number, a: any) => s + Number(a.horas_asignadas), 0);
          this.cobertura.push({ tipo, plan, cubierto, restante: plan - cubierto });
        }

        this.actualizarOpcionesTipo();

        const tipoActual = this.form.get('tipo_clase')?.value;
        if (tipoActual) {
          this.actualizarHorasPorTipo(tipoActual);
        }
      },
    });
  }

  private actualizarOpcionesTipo(): void {
    this.tipoOptions = [
      { valor: 'TEORIA', label: 'Teoría', restante: this.getRestante('TEORIA') },
      { valor: 'PRACTICA', label: 'Práctica', restante: this.getRestante('PRACTICA') },
      { valor: 'LABORATORIO', label: 'Laboratorio', restante: this.getRestante('LABORATORIO') },
    ];
  }

  getRestante(tipo: string): number {
    const item = this.cobertura.find(c => c.tipo === tipo);
    return item ? item.restante : this.getHorasPorTipo(tipo);
  }

  porcentaje(c: CoberturaTipo): number {
    if (c.plan === 0) return 0;
    return Math.min(100, (c.cubierto / c.plan) * 100);
  }

  seleccionarTipo(tipo: string): void {
    const restante = this.getRestante(tipo);
    if (restante <= 0) return;
    this.form.patchValue({ tipo_clase: tipo });
  }

  actualizarHorasPorTipo(tipo: string): void {
    const planHoras = this.getHorasPorTipo(tipo);
    this.horasRestanteTipo = Math.max(0, this.getRestante(tipo));

    this.form.get('horas_asignadas')?.clearValidators();
    const validators = [Validators.required, Validators.min(0)];
    if (this.horasRestanteTipo > 0) {
      validators.push(maxHorasValidator(this.horasRestanteTipo));
    }
    this.form.get('horas_asignadas')?.setValidators(validators);

    const valorActual = this.form.get('horas_asignadas')?.value;
    if (valorActual === 0 || valorActual === '' || this.horasRestanteTipo < valorActual) {
      this.form.patchValue({ horas_asignadas: Math.min(planHoras, this.horasRestanteTipo) }, { emitEvent: false });
    }

    this.form.get('horas_asignadas')?.updateValueAndValidity();
    this.actualizarNuevaCargaTotal();
  }

  actualizarNuevaCargaTotal(): void {
    if (this.cargaActual !== null) {
      const horasNuevas = this.form.get('horas_asignadas')?.value || 0;
      this.nuevaCargaTotal = this.cargaActual + horasNuevas;
    }
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
          this.cargarCoberturaCurso();
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
