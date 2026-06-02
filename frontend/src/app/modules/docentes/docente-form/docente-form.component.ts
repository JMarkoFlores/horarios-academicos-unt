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

const CATEGORIAS_POR_TIPO: Record<string, { value: string; label: string }[]> =
  {
    ORDINARIO: [
      { value: 'PRINCIPAL', label: 'Principal' },
      { value: 'ASOCIADO', label: 'Asociado' },
      { value: 'AUXILIAR', label: 'Auxiliar' },
    ],
    CONTRATADO: [{ value: 'SIN_CATEGORIA', label: 'Sin categoría' }],
    JEFE_PRACTICA_CONTRATADO: [
      { value: 'SIN_CATEGORIA', label: 'Sin categoría' },
    ],
  };

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

  tiposDocente = [
    { value: 'ORDINARIO', label: 'Ordinario' },
    { value: 'CONTRATADO', label: 'Contratado' },
    { value: 'JEFE_PRACTICA_CONTRATADO', label: 'Jefe de práctica contratado' },
  ];

  categoriasDisponibles: { value: string; label: string }[] = [];

  modalidades = [
    { value: 'DEDICACION_EXCLUSIVA', label: 'Dedicación exclusiva' },
    { value: 'TIEMPO_COMPLETO_40', label: 'Tiempo completo 40h' },
    { value: 'TIEMPO_PARCIAL_20', label: 'Tiempo parcial 20h' },
    { value: 'TIEMPO_PARCIAL_12', label: 'Tiempo parcial 12h' },
    { value: 'TIEMPO_PARCIAL_10', label: 'Tiempo parcial 10h' },
    { value: 'TIEMPO_PARCIAL_8', label: 'Tiempo parcial 8h' },
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
      ibm: [
        null,
        [Validators.required, Validators.min(1000), Validators.max(9999)],
      ],
      nombres: ['', [Validators.required, Validators.maxLength(150)]],
      apellidos: ['', [Validators.required, Validators.maxLength(150)]],
      email: ['', [Validators.required, emailInstitucionalValidator()]],
      telefono: ['', [Validators.pattern(/^\+?[\d\s\-]{7,20}$/)]],
      tipo_docente: [{ value: '', disabled: false }, Validators.required],
      categoria: [{ value: '', disabled: true }, Validators.required],
      modalidad: [{ value: '', disabled: true }, Validators.required],
      fecha_ingreso: [null, [Validators.required, fechaNoFuturaValidator()]],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.docenteId = parseInt(id, 10);
      this.loadDocente();
    }
  }

  onTipoDocenteChange(tipo: string): void {
    this.form.get('categoria')!.reset('');
    this.form.get('modalidad')!.reset('');
    this.form.get('modalidad')!.disable();

    if (tipo) {
      this.categoriasDisponibles = CATEGORIAS_POR_TIPO[tipo] ?? [];
      this.form.get('categoria')!.enable();

      if (this.categoriasDisponibles.length === 1) {
        this.form
          .get('categoria')!
          .setValue(this.categoriasDisponibles[0].value);
        this.form.get('modalidad')!.enable();
      }
    } else {
      this.categoriasDisponibles = [];
      this.form.get('categoria')!.disable();
    }
  }

  onCategoriaChange(categoria: string): void {
    this.form.get('modalidad')!.reset('');
    if (categoria) {
      this.form.get('modalidad')!.enable();
    } else {
      this.form.get('modalidad')!.disable();
    }
  }

  loadDocente(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<Docente>>(`/docentes/${this.docenteId}`)
      .subscribe({
        next: (res) => {
          const d = res.data;
          const tipo = d.tipo_docente ?? '';
          this.categoriasDisponibles = CATEGORIAS_POR_TIPO[tipo] ?? [];

          this.form.get('categoria')!.enable();
          this.form.get('modalidad')!.enable();

          this.form.patchValue({
            codigo: d.codigo,
            ibm: d.ibm,
            nombres: d.nombres,
            apellidos: d.apellidos,
            email: d.email,
            telefono: d.telefono ?? '',
            tipo_docente: tipo,
            categoria: d.categoria,
            modalidad: d.modalidad,
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

    const v = this.form.getRawValue() as Record<string, unknown>;
    const fi = v['fecha_ingreso'];
    const payload = {
      ...v,
      fecha_ingreso:
        fi instanceof Date ? (fi as Date).toISOString().split('T')[0] : fi,
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
