import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import {
  Departamento,
  Escuela,
  Facultad,
  FacultadesService,
} from '../../../core/services/facultades.service';
import { ApiResponse, Docente } from '../../../core/interfaces/entities';

@Component({
  selector: 'app-docente-facultad-form',
  templateUrl: './docente-facultad-form.component.html',
  styleUrls: ['./docente-facultad-form.component.scss'],
})
export class DocenteFacultadFormComponent implements OnInit {
  form!: FormGroup;
  docenteId!: number;
  docente: Docente | null = null;
  facultades: Facultad[] = [];
  departamentos: Departamento[] = [];
  loading = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private snackBar: MatSnackBar,
    private facultadesService: FacultadesService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      facultad_id: [null, Validators.required],
      departamento_id: [null, Validators.required],
    });

    this.docenteId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    forkJoin({
      docente: this.api.get<ApiResponse<Docente>>(`/docentes/${this.docenteId}`),
      facultades: this.facultadesService.listarFacultades(),
    }).subscribe({
      next: ({ docente, facultades }) => {
        this.docente = docente.data;
        this.facultades = facultades.data;

        const facultadId = this.docente.facultad_id ?? this.docente.facultad?.id ?? null;
        const departamentoId = this.docente.departamento_id ?? this.docente.departamento?.id ?? null;

        this.form.patchValue({
          facultad_id: facultadId,
          departamento_id: departamentoId,
        });

        if (facultadId) {
          this.cargarDepartamentosPorFacultad(facultadId, departamentoId);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('No se pudo cargar el docente', 'Cerrar', {
          duration: 3000,
        });
        this.router.navigate(['/app/docente-facultad']);
      },
    });
  }

  onFacultadChange(facultadId: number): void {
    this.form.patchValue({ departamento_id: null });
    this.departamentos = [];

    if (!facultadId) {
      return;
    }

    this.cargarDepartamentosPorFacultad(facultadId);
  }

  cargarDepartamentosPorFacultad(
    facultadId: number,
    departamentoSeleccionado?: number | null,
  ): void {
    this.facultadesService
      .listarEscuelas(facultadId)
      .pipe(
        switchMap((escuelasRes) => {
          const escuelas = escuelasRes.data || [];
          if (escuelas.length === 0) {
            return of([] as Departamento[]);
          }

          return forkJoin(
            escuelas.map((escuela: Escuela) =>
              this.facultadesService.listarDepartamentos(escuela.id),
            ),
          ).pipe(
            switchMap((departamentosRes) =>
              of(
                departamentosRes
                  .flatMap((item) => item.data || [])
                  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
              ),
            ),
          );
        }),
      )
      .subscribe({
        next: (departamentos) => {
          this.departamentos = departamentos;
          if (departamentoSeleccionado) {
            this.form.patchValue({ departamento_id: departamentoSeleccionado });
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('No se pudieron cargar los departamentos', 'Cerrar', {
            duration: 3000,
          });
        },
      });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = this.form.getRawValue();

    this.api
      .patch<ApiResponse<Docente>>(`/docentes/${this.docenteId}`, payload)
      .subscribe({
        next: () => {
          this.snackBar.open('Asignación actualizada correctamente', 'OK', {
            duration: 2500,
          });
          this.router.navigate(['/app/docente-facultad']);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(
            err?.error?.message || 'Error al guardar la asignación',
            'Cerrar',
            { duration: 4000 },
          );
        },
      });
  }

  cancelar(): void {
    this.router.navigate(['/app/docente-facultad']);
  }

  get nombreCompleto(): string {
    if (!this.docente) return '';
    return `${this.docente.apellidos}, ${this.docente.nombres}`;
  }

  get necesitaAsignacion(): boolean {
    return !this.docente?.facultad_id || !this.docente?.departamento_id;
  }
}
