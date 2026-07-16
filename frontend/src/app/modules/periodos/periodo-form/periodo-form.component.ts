import { Component, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { NotifToastService } from '../../../core/services/notif-toast.service';
import { ApiResponse, PeriodoAcademico } from '../../../core/interfaces/entities';

export function fechaFinValidator(form: FormGroup): ValidationErrors | null {
  const inicio = form.get('fecha_inicio')?.value;
  const fin = form.get('fecha_fin')?.value;
  if (inicio && fin) {
    const dInicio = new Date(inicio);
    const dFin = new Date(fin);
    if (dFin <= dInicio) {
      return { fechaFinMenor: true };
    }
  }
  return null;
}

@Component({
  selector: 'app-periodo-form',
  templateUrl: './periodo-form.component.html',
  styleUrls: ['./periodo-form.component.scss'],
})
export class PeriodoFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  periodoId: number | null = null;
  saving = false;
  loading = false;

  estados = [
    { value: 'planificacion', label: 'Planificación', desc: 'El período está en etapa de planificación. Se pueden registrar cursos, docentes y disponibilidad. No se han generado horarios aún.' },
    { value: 'asignacionhorarios', label: 'Asignación Horarios', desc: 'Etapa de asignación de horarios. Los docentes registran su disponibilidad y el sistema asigna las franjas horarias.' },
    { value: 'encurso', label: 'En curso', desc: 'El período académico está activo. Las clases se están dictando según los horarios asignados.' },
    { value: 'finalizado', label: 'Finalizado', desc: 'Período cerrado. No se permiten modificaciones. Todas las declaraciones y horarios quedan bloqueados.' },
  ];

  modosAsignacion = [
    { value: 'ventanas', label: 'Ventanas', desc: 'Los docentes eligen sus horarios por turnos (ventanas) en tiempo real vía WebSocket. El operador gestiona las colas de atención.' },
    { value: 'automatica', label: 'Automática', desc: 'El sistema asigna los horarios automáticamente usando un algoritmo de optimización basado en restricciones, disponibilidad y preferencias.' },
    { value: 'mixta', label: 'Mixta', desc: 'Combinación: asignación automática inicial seguida de ventanas para ajustes manuales. Los docentes pueden solicitar cambios en ventanas abiertas.' },
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private notif: NotifToastService,
    private periodoService: PeriodoService,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        codigo: ['', [Validators.required, Validators.maxLength(20)]],
        nombre: ['', [Validators.required, Validators.maxLength(100)]],
        fecha_inicio: ['', Validators.required],
        fecha_fin: ['', Validators.required],
        estado: ['planificacion', Validators.required],
        activo: [false],
        modo_asignacion: ['ventanas', Validators.required],
      },
      { validators: fechaFinValidator },
    );

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.periodoId = +id;
      this.cargarPeriodo(+id);
    }
  }

  cargarPeriodo(id: number): void {
    this.loading = true;
    this.api
      .get<ApiResponse<PeriodoAcademico>>(`/periodos/${id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const p = res.data;
          this.form.patchValue({
            codigo: p.codigo,
            nombre: p.nombre,
            fecha_inicio: p.fecha_inicio ? new Date(p.fecha_inicio + 'T12:00:00') : null,
            fecha_fin: p.fecha_fin ? new Date(p.fecha_fin + 'T12:00:00') : null,
            estado: p.estado,
            activo: p.activo,
            modo_asignacion: (p as any).modo_asignacion ?? 'ventanas',
          });
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.notif.error(err?.error?.message ?? 'Error al cargar el período');
        },
      });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const raw = this.form.value;
    const payload = {
      ...raw,
      fecha_inicio: raw.fecha_inicio instanceof Date
        ? raw.fecha_inicio.toISOString().split('T')[0]
        : raw.fecha_inicio,
      fecha_fin: raw.fecha_fin instanceof Date
        ? raw.fecha_fin.toISOString().split('T')[0]
        : raw.fecha_fin,
    };

    const req =
      this.isEdit && this.periodoId
        ? this.api.patch<ApiResponse<any>>(`/periodos/${this.periodoId}`, payload)
        : this.api.post<ApiResponse<any>>('/periodos', payload);

    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notif.success(this.isEdit ? 'Período actualizado correctamente' : 'Período creado correctamente');
        this.periodoService.cargarPeriodos();
        this.saving = false;
        this.router.navigate(['/app/periodos']);
      },
      error: (err) => {
        this.saving = false;
        this.notif.error(err?.error?.message ?? 'Error al guardar el período');
      },
    });
  }

  get estadoActual() {
    const val = this.form?.get('estado')?.value;
    return this.estados.find(e => e.value === val);
  }

  get modoActual() {
    const val = this.form?.get('modo_asignacion')?.value;
    return this.modosAsignacion.find(m => m.value === val);
  }

  get estadoDesc(): string {
    return this.estadoActual?.desc ?? '';
  }

  get modoDesc(): string {
    return this.modoActual?.desc ?? '';
  }

  fieldHasError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!ctrl && ctrl.touched && ctrl.hasError(error);
  }

  get fechaFinMenor(): boolean {
    return this.form.touched && this.form.hasError('fechaFinMenor');
  }
}
