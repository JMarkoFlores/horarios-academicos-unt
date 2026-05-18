import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import {
  ApiResponse,
  Curso,
  Ambiente,
} from '../../../core/interfaces/entities';

@Component({
  selector: 'app-curso-form',
  templateUrl: './curso-form.component.html',
  styleUrls: ['./curso-form.component.scss'],
})
export class CursoFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  cursoId!: number;
  loading = false;
  saving = false;
  aulas: Ambiente[] = [];
  laboratorios: Ambiente[] = [];
  ciclos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(15)]],
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      creditos: [3, [Validators.required, Validators.min(1)]],
      ciclo: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      horas_teoria: [2, [Validators.required, Validators.min(0)]],
      horas_laboratorio: [0],
      tiene_laboratorio: [false],
      ambientes_teoria_ids: [[]],
      ambientes_laboratorio_ids: [[]],
      prerequisitos: [''],
    });

    this.loadAmbientes();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.cursoId = parseInt(id, 10);
      this.loadCurso();
    }
  }

  loadAmbientes(): void {
    this.api
      .get<
        ApiResponse<{ items: Ambiente[] }>
      >('/ambientes', { limit: 100, activo: 'true' })
      .subscribe({
        next: (res) => {
          const all = res.data.items ?? (res.data as unknown as Ambiente[]);
          this.aulas = all.filter((a) => a.tipo === 'AULA');
          this.laboratorios = all.filter((a) => a.tipo === 'LABORATORIO');
        },
      });
  }

  loadCurso(): void {
    this.loading = true;
    this.api.get<ApiResponse<Curso>>(`/cursos/${this.cursoId}`).subscribe({
      next: (res) => {
        const c = res.data;
        this.form.patchValue({
          ...c,
          ambientes_teoria_ids: (c.ambientes_teoria ?? []).map((a) => a.id),
          ambientes_laboratorio_ids: (c.ambientes_laboratorio ?? []).map(
            (a) => a.id,
          ),
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get tieneLab(): boolean {
    return this.form.get('tiene_laboratorio')?.value as boolean;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;

    const raw = this.form.value;
    const teoriaIds: number[] = raw['ambientes_teoria_ids'] ?? [];
    const labIds: number[] = raw['ambientes_laboratorio_ids'] ?? [];

    // Strip campos que el DTO no acepta
    const { ambientes_teoria_ids, ambientes_laboratorio_ids, ...payload } = raw;

    const base$ = this.isEdit
      ? this.api.patch<ApiResponse<Curso>>(`/cursos/${this.cursoId}`, payload)
      : this.api.post<ApiResponse<Curso>>('/cursos', payload);

    base$.subscribe({
      next: (res) => {
        const id = res.data?.id ?? this.cursoId;
        const assigns: Promise<void>[] = [];

        if (teoriaIds.length) {
          assigns.push(
            this.api
              .post(`/cursos/${id}/ambientes`, {
                ambiente_ids: teoriaIds,
                tipo_clase: 'TEORIA',
              })
              .toPromise()
              .then(() => undefined),
          );
        }
        if (labIds.length) {
          assigns.push(
            this.api
              .post(`/cursos/${id}/ambientes`, {
                ambiente_ids: labIds,
                tipo_clase: 'LABORATORIO',
              })
              .toPromise()
              .then(() => undefined),
          );
        }

        Promise.all(assigns)
          .then(() => {
            this.snackBar.open(
              this.isEdit ? 'Curso actualizado' : 'Curso creado',
              'OK',
              { duration: 2000 },
            );
            this.router.navigate(['/app/cursos']);
          })
          .catch(() => {
            this.snackBar.open(
              'Curso guardado (error al asignar ambientes)',
              'OK',
              { duration: 3000 },
            );
            this.router.navigate(['/app/cursos']);
          });
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/app/cursos']);
  }
}
