import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, Docente } from '../../../core/interfaces/entities';

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

  categorias = ['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA'];
  tiposContrato = ['NOMBRADO', 'CONTRATADO'];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(10)]],
      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
      categoria: ['AUXILIAR', Validators.required],
      tipo_contrato: ['NOMBRADO', Validators.required],
      fecha_ingreso: [null, Validators.required],
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
          this.loading = false;
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
          this.isEdit ? 'Docente actualizado' : 'Docente creado',
          'OK',
          { duration: 2000 },
        );
        this.router.navigate(['/app/docentes']);
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/app/docentes']);
  }
}
