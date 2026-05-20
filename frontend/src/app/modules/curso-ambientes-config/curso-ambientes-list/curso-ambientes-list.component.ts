import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-curso-ambientes-list',
  templateUrl: './curso-ambientes-list.component.html',
  styleUrls: ['./curso-ambientes-list.component.scss']
})
export class CursoAmbientesListComponent implements OnInit {
  cursos: any[] = [];
  ambientes: any[] = [];
  relaciones: any[] = [];
  cursoSeleccionado: any = null;
  loading = false;
  guardando = false;
  filtroCurso = '';

  tiposClase = [
    { value: 'TEORIA', label: 'Teoría' },
    { value: 'LABORATORIO', label: 'Laboratorio' },
  ];

  filtroAmbienteAdd = '';
  nuevoAmbienteId: number | null = null;
  nuevoTipoClase = 'TEORIA';

  constructor(
    private api: ApiService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarCursos();
    this.cargarAmbientes();
  }

  cargarCursos(): void {
    this.loading = true;
    this.api.get<any>('/cursos', { limit: 100 }).subscribe({
      next: (r) => {
        this.cursos = r.data?.items ?? r.data ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  cargarAmbientes(): void {
    this.api.get<any>('/ambientes', { limit: 100, estado: 'ACTIVO' }).subscribe({
      next: (r) => {
        this.ambientes = r.data?.items ?? r.data ?? [];
      },
      error: () => {}
    });
  }

  seleccionarCurso(curso: any): void {
    this.cursoSeleccionado = curso;
    this.cargarRelaciones(curso.id);
  }

  cargarRelaciones(cursoId: number): void {
    this.loading = true;
    this.api.get<any>('/cursos-ambiente', { cursoId }).subscribe({
      next: (r) => {
        this.relaciones = r.data ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  agregarRelacion(): void {
    if (!this.cursoSeleccionado || !this.nuevoAmbienteId) return;
    this.agregarRelacionDirecta(this.nuevoAmbienteId, this.nuevoTipoClase);
  }

  agregarRelacionDirecta(ambienteId: number, tipoClase: string): void {
    if (!this.cursoSeleccionado) return;
    const yaExiste = this.relaciones.find((r: any) =>
      r.ambienteId === ambienteId && r.tipo_clase === tipoClase
    );
    if (yaExiste) {
      this.snack.open('Este ambiente ya está asignado con esa modalidad', 'OK', { duration: 3000 });
      return;
    }
    this.guardando = true;
    this.api.post<any>('/cursos-ambiente', {
      cursoId: this.cursoSeleccionado.id,
      ambienteId: ambienteId,
      tipo_clase: tipoClase,
    }).subscribe({
      next: () => {
        this.snack.open('Ambiente asignado correctamente', 'OK', { duration: 3000 });
        this.cargarRelaciones(this.cursoSeleccionado.id);
        this.guardando = false;
      },
      error: (err) => {
        this.snack.open(err?.error?.message ?? 'Error al asignar ambiente', 'Cerrar', { duration: 5000 });
        this.guardando = false;
      }
    });
  }

  quitarRelacion(id: number): void {
    if (!confirm('¿Eliminar esta relación?')) return;
    this.guardando = true;
    this.api.delete<any>(`/cursos-ambiente/${id}`).subscribe({
      next: () => {
        this.snack.open('Relación eliminada', 'OK', { duration: 3000 });
        if (this.cursoSeleccionado) {
          this.cargarRelaciones(this.cursoSeleccionado.id);
        }
        this.guardando = false;
      },
      error: (err) => {
        this.snack.open(err?.error?.message ?? 'Error al eliminar', 'Cerrar', { duration: 5000 });
        this.guardando = false;
      }
    });
  }

  get cursosFiltrados(): any[] {
    const f = this.filtroCurso.trim().toLowerCase();
    if (!f) return this.cursos;
    return this.cursos.filter((c: any) =>
      c.nombre.toLowerCase().includes(f) || c.codigo.toLowerCase().includes(f)
    );
  }

  getAmbienteName(id: number): string {
    const a = this.ambientes.find((amb: any) => amb.id === id);
    return a ? `${a.codigo} — ${a.nombre}` : `ID ${id}`;
  }

  get ambientesDisponibles(): any[] {
    const asignados = new Set(this.relaciones.map((r: any) => `${r.ambienteId}-${r.tipo_clase}`));
    return this.ambientes.filter((a: any) =>
      !asignados.has(`${a.id}-TEORIA`) || !asignados.has(`${a.id}-LABORATORIO`)
    );
  }

  get ambientesFiltradosParaAgregar(): any[] {
    const f = this.filtroAmbienteAdd.trim().toLowerCase();
    const disponibles = this.ambientesDisponibles;
    if (!f) return disponibles;
    return disponibles.filter((a: any) =>
      a.nombre.toLowerCase().includes(f) ||
      a.codigo.toLowerCase().includes(f) ||
      (a.pabellon || '').toLowerCase().includes(f)
    );
  }

  puedeAgregarAmbiente(ambienteId: number, tipoClase: string): boolean {
    if (!this.cursoSeleccionado) return false;
    const asignados = new Set(this.relaciones.map((r: any) => `${r.ambienteId}-${r.tipo_clase}`));
    return !asignados.has(`${ambienteId}-${tipoClase}`);
  }

  esTipoCompatible(ambienteTipo: string, tipoClase: string): boolean {
    const tipo = (ambienteTipo || '').toUpperCase();
    if (tipoClase === 'TEORIA') {
      return ['AULA', 'AUDITORIO', 'SEMINARIO'].includes(tipo);
    }
    if (tipoClase === 'LABORATORIO') {
      return ['LABORATORIO', 'TALLER', 'SALA_COMPUTACION'].includes(tipo);
    }
    return true;
  }

  tooltipAmbiente(ambiente: any, tipoClase: string): string {
    if (!this.esTipoCompatible(ambiente.tipo, tipoClase)) {
      return `Un ambiente tipo "${ambiente.tipo}" no es compatible con ${tipoClase === 'TEORIA' ? 'teoría' : 'laboratorio'}`;
    }
    if (tipoClase === 'TEORIA' && (this.cursoSeleccionado?.horas_teoria || 0) <= 0) {
      return 'Este curso no tiene horas de teoría';
    }
    if (tipoClase === 'LABORATORIO' && (this.cursoSeleccionado?.horas_laboratorio || 0) <= 0) {
      return 'Este curso no tiene horas de laboratorio';
    }
    return `Agregar como ${tipoClase === 'TEORIA' ? 'teoría' : 'laboratorio'}`;
  }

  limpiarFiltroAmbiente(): void {
    this.filtroAmbienteAdd = '';
  }
}
