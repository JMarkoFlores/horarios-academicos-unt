import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-docente-cursos-list',
  templateUrl: './docente-cursos-list.component.html',
  styleUrls: ['./docente-cursos-list.component.scss']
})
export class DocenteCursosListComponent implements OnInit, OnDestroy {
  docentes: any[] = [];
  docenteSeleccionado: any = null;
  cursosDocente: any[] = [];
  todosCursos: any[] = [];
  loading = false;
  guardando = false;
  filtroDocente = '';
  filtroCursoAdd = '';
  nuevoCursoId = 0;
  nuevoTipoClase = 'TEORIA';
  private periodSub?: Subscription;

  tiposClase = [
    { value: 'TEORIA', label: 'Teoría' },
    { value: 'LABORATORIO', label: 'Laboratorio' },
  ];

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snack: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDocentes();
    this.cargarTodosCursos();
    this.periodSub = this.periodoService.periodo$.subscribe(() => {
      this.cargarDocentes();
      if (this.docenteSeleccionado) {
        this.cargarCursosDocente(this.docenteSeleccionado.id);
      }
    });
  }

  ngOnDestroy(): void {
    this.periodSub?.unsubscribe();
  }

  cargarDocentes(): void {
    this.loading = true;
    this.api.get<any>('/docentes', { limit: 100, activo: 'true' }).subscribe({
      next: (r) => {
        this.docentes = (r.data?.items ?? r.data ?? []).sort((a: any, b: any) =>
          `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`)
        );
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  cargarTodosCursos(): void {
    this.api.get<any>('/cursos', { limit: 100 }).subscribe({
      next: (r) => {
        this.todosCursos = r.data?.items ?? r.data ?? [];
      },
      error: () => {}
    });
  }

  seleccionarDocente(docente: any): void {
    this.docenteSeleccionado = docente;
    this.cargarCursosDocente(docente.id);
  }

  cargarCursosDocente(docenteId: number): void {
    this.loading = true;
    this.api.get<any>(`/docentes/${docenteId}/cursos`, { periodo: this.periodoService.periodo }).subscribe({
      next: (r) => {
        this.cursosDocente = r.data ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  agregarCurso(cursoId: number, tipoClase: string): void {
    if (!this.docenteSeleccionado || cursoId === 0) return;
    const yaExiste = this.cursosDocente.find((c: any) => c.cursoId === cursoId && c.tipo_clase === tipoClase);
    if (yaExiste) {
      this.snack.open('Este curso ya está asignado con esa modalidad', 'OK', { duration: 3000 });
      return;
    }
    this.guardando = true;
    this.api.post<any>(`/docentes/${this.docenteSeleccionado.id}/cursos`, {
      cursos: [{ cursoId, tipo_clase: tipoClase }],
      periodo: this.periodoService.periodo,
    }).subscribe({
      next: () => {
        this.snack.open('Curso asignado correctamente', 'OK', { duration: 3000 });
        this.nuevoCursoId = 0;
        this.cargarCursosDocente(this.docenteSeleccionado.id);
        this.guardando = false;
      },
      error: (err) => {
        this.snack.open(err?.error?.message ?? 'Error al asignar curso', 'Cerrar', { duration: 5000 });
        this.guardando = false;
      }
    });
  }

  quitarCurso(cursoId: number, tipoClase: string): void {
    if (!this.docenteSeleccionado) return;
    if (!confirm(`¿Quitar este curso del docente?`)) return;
    this.guardando = true;
    this.api.delete<any>(`/docentes/${this.docenteSeleccionado.id}/cursos/${cursoId}/${tipoClase}`, {
      periodo: this.periodoService.periodo,
    }).subscribe({
      next: () => {
        this.snack.open('Curso removido correctamente', 'OK', { duration: 3000 });
        this.cargarCursosDocente(this.docenteSeleccionado.id);
        this.guardando = false;
      },
      error: (err) => {
        this.snack.open(err?.error?.message ?? 'Error al remover curso', 'Cerrar', { duration: 5000 });
        this.guardando = false;
      }
    });
  }

  get docentesFiltrados(): any[] {
    const f = this.filtroDocente.trim().toLowerCase();
    if (!f) return this.docentes;
    return this.docentes.filter((d: any) =>
      `${d.apellidos} ${d.nombres}`.toLowerCase().includes(f) ||
      d.codigo.toLowerCase().includes(f)
    );
  }

  getCursosNoAsignados(): any[] {
    const asignados = new Set(this.cursosDocente.map((c: any) => `${c.cursoId}-${c.tipo_clase}`));
    return this.todosCursos.filter((c: any) =>
      !asignados.has(`${c.id}-TEORIA`) || !asignados.has(`${c.id}-LABORATORIO`)
    ).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
  }

  get cursosFiltradosParaAgregar(): any[] {
    const f = this.filtroCursoAdd.trim().toLowerCase();
    const disponibles = this.getCursosNoAsignados();
    if (!f) return disponibles;
    return disponibles.filter((c: any) =>
      c.nombre.toLowerCase().includes(f) ||
      c.codigo.toLowerCase().includes(f)
    );
  }

  get cursoSeleccionadoParaAgregar(): any | null {
    return this.todosCursos.find((c: any) => c.id === this.nuevoCursoId) || null;
  }

  get tiposClaseDisponibles(): any[] {
    const curso = this.cursoSeleccionadoParaAgregar;
    if (!curso) return this.tiposClase;
    return this.tiposClase.filter((t: any) => {
      if (t.value === 'TEORIA') return (curso.horas_teoria || 0) > 0;
      if (t.value === 'LABORATORIO') return (curso.horas_laboratorio || 0) > 0;
      return false;
    });
  }

  onCursoChange(): void {
    const curso = this.cursoSeleccionadoParaAgregar;
    if (!curso) {
      this.nuevoTipoClase = 'TEORIA';
      return;
    }
    const disponibles = this.tiposClaseDisponibles;
    if (!disponibles.find((t: any) => t.value === this.nuevoTipoClase)) {
      this.nuevoTipoClase = disponibles[0]?.value || 'TEORIA';
    }
  }

  seleccionarCursoRapido(curso: any): void {
    this.nuevoCursoId = curso.id;
    this.onCursoChange();
  }

  limpiarFiltroCurso(): void {
    this.filtroCursoAdd = '';
  }

  puedeAgregarCurso(cursoId: number, tipoClase: string): boolean {
    if (!cursoId || cursoId === 0) return false;
    const asignados = new Set(this.cursosDocente.map((c: any) => `${c.cursoId}-${c.tipo_clase}`));
    return !asignados.has(`${cursoId}-${tipoClase}`);
  }
}
