import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, Curso, Ambiente } from '../../../core/interfaces/entities';

function horasLabRequeridaValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const tieneLab = group.get('tiene_laboratorio')?.value;
    const horasLab = group.get('horas_laboratorio')?.value;
    if (tieneLab && (!horasLab || horasLab < 1)) {
      return { horasLabRequeridas: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-curso-form',
  templateUrl: './curso-form.component.html',
  styleUrls: ['./curso-form.component.scss'],
})
export class CursoFormComponent implements OnInit {
  form!: FormGroup;
  isEdit   = false;
  cursoId!: number;
  loading  = false;
  saving   = false;
  aulas: Ambiente[]       = [];
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
      codigo:                   ['', [Validators.required, Validators.maxLength(20)]],
      nombre:                   ['', [Validators.required, Validators.maxLength(150)]],
      creditos:                 [3,  [Validators.required, Validators.min(1), Validators.max(12)]],
      ciclo:                    [1,  [Validators.required, Validators.min(1), Validators.max(10)]],
      horas_teoria:             [2,  [Validators.required, Validators.min(1)]],
      horas_laboratorio:        [{ value: 0, disabled: true }],
      tiene_laboratorio:        [false],
      ambientes_teoria_ids:     [[]],
      ambientes_laboratorio_ids:[[]],
      prerequisitos:            [''],
    }, { validators: horasLabRequeridaValidator() });

    // Habilitar/deshabilitar horas_laboratorio según el checkbox
    this.form.get('tiene_laboratorio')!.valueChanges.subscribe((val: boolean) => {
      const ctrl = this.form.get('horas_laboratorio')!;
      if (val) {
        ctrl.enable();
        ctrl.setValidators([Validators.required, Validators.min(1), Validators.max(20)]);
        if (!ctrl.value || ctrl.value < 1) ctrl.setValue(2);
      } else {
        ctrl.disable();
        ctrl.clearValidators();
        ctrl.setValue(0);
      }
      ctrl.updateValueAndValidity();
    });

    this.loadAmbientes();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit  = true;
      this.cursoId = parseInt(id, 10);
      this.loadCurso();
    }
  }

  loadAmbientes(): void {
    this.api.get<ApiResponse<{ items: Ambiente[] }>>('/ambientes', { limit: 200, activo: 'true' }).subscribe({
      next: (res) => {
        const all = res.data.items ?? (res.data as unknown as Ambiente[]);
        this.aulas       = all.filter((a) => a.tipo === 'AULA');
        this.laboratorios = all.filter((a) => a.tipo === 'LABORATORIO');
      },
    });
  }

  loadCurso(): void {
    this.loading = true;
    this.api.get<ApiResponse<Curso>>(`/cursos/${this.cursoId}`).subscribe({
      next: (res) => {
        const c = res.data;
        // Habilitar horas_lab antes de patchValue si el curso tiene lab
        if (c.tiene_laboratorio) {
          this.form.get('horas_laboratorio')!.enable();
        }
        this.form.patchValue({
          ...c,
          ambientes_teoria_ids:      (c.ambientes_teoria      ?? (c.ambientes ?? []).filter(a => a.tipo === 'AULA')).map((a) => a.id),
          ambientes_laboratorio_ids: (c.ambientes_laboratorio ?? (c.ambientes ?? []).filter(a => a.tipo === 'LABORATORIO')).map((a) => a.id),
        });
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get tieneLab(): boolean { return this.form.get('tiene_laboratorio')?.value as boolean; }

  get horasLabError(): boolean {
    return !!this.form.errors?.['horasLabRequeridas'] && (this.form.get('horas_laboratorio')?.touched ?? false);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving = true;

    const raw = this.form.getRawValue(); // incluye campos disabled
    const teoriaIds: number[] = raw['ambientes_teoria_ids'] ?? [];
    const labIds:    number[] = raw['ambientes_laboratorio_ids'] ?? [];
    const { ambientes_teoria_ids, ambientes_laboratorio_ids, ...payload } = raw;

    const base$ = this.isEdit
      ? this.api.patch<ApiResponse<Curso>>(`/cursos/${this.cursoId}`, payload)
      : this.api.post<ApiResponse<Curso>>('/cursos', payload);

    base$.subscribe({
      next: (res) => {
        const id = res.data?.id ?? this.cursoId;
        const assigns: Promise<unknown>[] = [];

        if (teoriaIds.length) {
          assigns.push(
            this.api.post(`/cursos/${id}/ambientes`, { ambiente_ids: teoriaIds, tipo_clase: 'TEORIA' }).toPromise(),
          );
        }
        if (labIds.length && this.tieneLab) {
          assigns.push(
            this.api.post(`/cursos/${id}/ambientes`, { ambiente_ids: labIds, tipo_clase: 'LABORATORIO' }).toPromise(),
          );
        }

        Promise.all(assigns)
          .then(() => {
            this.snackBar.open(this.isEdit ? 'Curso actualizado' : 'Curso creado exitosamente', 'OK', { duration: 2500 });
            this.router.navigate(['/app/cursos']);
          })
          .catch(() => {
            this.snackBar.open('Curso guardado (error al asignar ambientes)', 'OK', { duration: 3000 });
            this.router.navigate(['/app/cursos']);
          });
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message;
        this.snackBar.open(
          Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Error al guardar el curso'),
          'Cerrar',
          { duration: 5000 },
        );
      },
    });
  }

  cancelar(): void { this.router.navigate(['/app/cursos']); }
}
