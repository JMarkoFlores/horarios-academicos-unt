import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import {
  ApiResponse,
  PeriodoAcademico,
} from '../../../core/interfaces/entities';

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
    { value: 'planificacion', label: 'Planificación' },
    { value: 'asignacionhorarios', label: 'Asignación Horarios' },
    { value: 'encurso', label: 'En curso' },
    { value: 'finalizado', label: 'Finalizado' },
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(20)]],
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      estado: ['planificacion', Validators.required],
      activo: [false],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.periodoId = +id;
      this.cargarPeriodo(+id);
    }
  }

  cargarPeriodo(id: number): void {
    this.loading = true;
    this.api.get<ApiResponse<PeriodoAcademico>>(`/periodos/${id}`).subscribe({
      next: (res) => {
        const p = res.data;
        this.form.patchValue({
          codigo: p.codigo,
          nombre: p.nombre,
          fecha_inicio: p.fecha_inicio,
          fecha_fin: p.fecha_fin,
          activo: p.activo,
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = this.form.value;

    const req =
      this.isEdit && this.periodoId
        ? this.api.patch<ApiResponse<any>>(
            `/periodos/${this.periodoId}`,
            payload,
          )
        : this.api.post<ApiResponse<any>>('/periodos', payload);

    req.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEdit ? 'Periodo actualizado' : 'Periodo creado',
          'OK',
          { duration: 2000 },
        );
        this.saving = false;
        this.router.navigate(['/app/periodos']);
      },
      error: () => {
        this.saving = false;
      },
    });
  }
}
