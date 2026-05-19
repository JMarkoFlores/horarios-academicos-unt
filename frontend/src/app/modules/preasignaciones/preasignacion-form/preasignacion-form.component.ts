import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-preasignacion-form',
  templateUrl: './preasignacion-form.component.html',
  styleUrls: ['./preasignacion-form.component.scss']
})
export class PreasignacionFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  id: string | null = null;
  loading = false;
  docentes: any[] = [];
  cursos: any[] = [];
  grupos: any[] = [];
  dias = [
    { valor: 1, label: 'Lunes' },
    { valor: 2, label: 'Martes' },
    { valor: 3, label: 'Miércoles' },
    { valor: 4, label: 'Jueves' },
    { valor: 5, label: 'Viernes' },
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    public periodoService: PeriodoService,
    private route: ActivatedRoute,
    private router: Router,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      docente_id: [null, Validators.required],
      curso_id: [null, Validators.required],
      grupo_id: [null],
      tipo_clase: ['TEORIA', Validators.required],
      dia: [null],
      hora_inicio: [''],
      hora_fin: [''],
      periodo: [this.periodoService.periodo, Validators.required],
    });
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.id;
    this.cargarDocentes();
    this.cargarCursos();
    if (this.isEdit && this.id) {
      this.cargarPreasignacion(this.id);
    }
  }

  cargarDocentes(): void {
    this.api.get<any>('/docentes').subscribe(r => {
      this.docentes = r.data || [];
    });
  }

  cargarCursos(): void {
    this.api.get<any>('/cursos').subscribe(r => {
      this.cursos = r.data || [];
    });
  }

  onCursoChange(): void {
    const cursoId = this.form.value.curso_id;
    if (!cursoId) return;
    this.api.get<any>(`/cursos/${cursoId}/grupos`).subscribe(r => {
      this.grupos = r.data || [];
    });
  }

  cargarPreasignacion(id: string): void {
    this.loading = true;
    this.api.get<any>(`/preasignaciones`).subscribe({
      next: (r) => {
        const p = (r.data || []).find((x: any) => x.id === id);
        if (p) {
          this.form.patchValue({
            docente_id: p.docente_id,
            curso_id: p.curso_id,
            grupo_id: p.grupo_id,
            tipo_clase: p.tipo_clase,
            dia: p.dia,
            hora_inicio: p.hora_inicio,
            hora_fin: p.hora_fin,
            periodo: p.periodo,
          });
          if (p.curso_id) this.onCursoChange();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error al cargar preasignación', 'Error', { duration: 3000 });
      }
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const payload = { ...this.form.value };
    if (!payload.dia) {
      delete payload.dia; delete payload.hora_inicio; delete payload.hora_fin;
    }

    const req = this.isEdit && this.id
      ? this.api.patch<any>(`/preasignaciones/${this.id}`, payload)
      : this.api.post<any>('/preasignaciones', payload);

    req.subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Preasignación guardada', 'OK', { duration: 3000 });
        this.router.navigate(['/app/preasignaciones']);
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error al guardar', 'Error', { duration: 3000 });
      }
    });
  }
}
