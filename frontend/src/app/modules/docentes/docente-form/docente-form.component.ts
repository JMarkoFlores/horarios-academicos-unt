import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, Docente } from '../../../core/interfaces/entities';

export function emailInstitucionalValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const valor: string = control.value.trim();
    const partes = valor.split('@');
    if (partes.length !== 2) return { emailInvalido: true };
    const [local, dominio] = partes;
    if (!local || local.length === 0) return { emailInvalido: true };
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(dominio)) return { emailInvalido: true };
    if (!dominio.includes('.')) return { emailInvalido: true };
    return null;
  };
}

export function fechaNoFuturaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const fecha = new Date(control.value);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    if (fecha > hoy) return { fechaFutura: true };
    const minDate = new Date('1970-01-01');
    if (fecha < minDate) return { fechaAntigua: true };
    return null;
  };
}

@Component({
  selector: 'app-docente-form',
  templateUrl: './docente-form.component.html',
  styleUrls: ['./docente-form.component.scss'],
})
export class DocenteFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  docenteId!: number;
  loading = false;
  saving = false;
  hoy = new Date();

  categorias = ['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA'];
  tiposContrato = ['NOMBRADO', 'CONTRATADO'];
  modalidades = [
    { value: 'DEDICACION_EXCLUSIVA', label: 'Dedicación Exclusiva' },
    { value: 'TIEMPO_COMPLETO_40', label: 'Tiempo Completo (40 h)' },
    { value: 'TIEMPO_PARCIAL_20', label: 'Tiempo Parcial 20 h' },
    { value: 'TIEMPO_PARCIAL_12', label: 'Tiempo Parcial 12 h' },
    { value: 'TIEMPO_PARCIAL_10', label: 'Tiempo Parcial 10 h' },
    { value: 'TIEMPO_PARCIAL_8', label: 'Tiempo Parcial 8 h' },
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(20)]],
      nombres: ['', [Validators.required, Validators.maxLength(150)]],
      apellidos: ['', [Validators.required, Validators.maxLength(150)]],
      email: ['', [Validators.required, emailInstitucionalValidator()]],
      telefono: ['', [Validators.pattern(/^\+?[\d\s\-]{7,20}$/)]],
      categoria: ['AUXILIAR', Validators.required],
      tipo_contrato: ['NOMBRADO', Validators.required],
      modalidad: [null],
      fecha_ingreso: [null, [Validators.required, fechaNoFuturaValidator()]],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.docenteId = parseInt(id, 10);
      this.loadDocente();
    }
  }

  loadDocente(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<Docente>>(`/docentes/${this.docenteId}`)
      .subscribe({
        next: (res) => {
          const d = res.data;
          this.form.patchValue({
            ...d,
            fecha_ingreso: d.fecha_ingreso ? new Date(d.fecha_ingreso) : null,
          });
          this.loading = false;
        },
        error: () => {
          this.snackBar.open('No se encontró el docente', 'Cerrar', {
            duration: 3000,
          });
          this.loading = false;
          this.router.navigate(['/app/docentes']);
        },
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;

    const v = this.form.value as Record<string, unknown>;
    const fi = v['fecha_ingreso'];
    const payload = {
      ...v,
      fecha_ingreso: fi instanceof Date ? fi.toISOString().split('T')[0] : fi,
    };

    const request = this.isEdit
      ? this.api.patch<ApiResponse<Docente>>(
          `/docentes/${this.docenteId}`,
          payload,
        )
      : this.api.post<ApiResponse<Docente>>('/docentes', payload);

    request.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEdit
            ? 'Docente actualizado exitosamente'
            : 'Docente registrado exitosamente',
          'OK',
          { duration: 2500 },
        );
        this.router.navigate(['/app/docentes']);
      },
      error: (err) => {
        const mensaje =
          err?.error?.message ||
          (this.isEdit
            ? 'Error al actualizar docente'
            : 'Error al registrar docente');
        this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
        this.saving = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/app/docentes']);
  }
}
