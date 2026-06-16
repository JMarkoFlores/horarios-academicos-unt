import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { ContextoAcademicoHelper } from '../../core/services/contexto-academico.helper';
import { ApiResponse, PaginatedData, PlanEstudios, CursoPlanEstudios } from '../../core/interfaces/entities';
import { AsignarDocenteDialogComponent } from './dialogs/asignar-docente-dialog/asignar-docente-dialog.component';

export interface AsignacionLectiva {
  id: number;
  docente_id: number;
  curso_plan_id: number;
  periodo_id: number;
  grupo_id?: number;
  tipo_clase: string;
  seccion: string;
  nro_alumnos: number;
  horas_asignadas: number;
  estado: string;
  docente: { id: number; nombres: string; apellidos: string; codigo: string };
}

@Component({
  selector: 'app-asignacion-lectiva',
  templateUrl: './asignacion-lectiva.component.html',
  styleUrls: ['./asignacion-lectiva.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class AsignacionLectivaComponent implements OnInit {
  planes: PlanEstudios[] = [];
  planControl = new FormControl<number | null>(null);

  ciclos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  selectedCiclo = 1;

  cursos: CursoPlanEstudios[] = [];
  asignaciones: AsignacionLectiva[] = [];
  loading = false;
  expandedElement: CursoPlanEstudios | null = null;

  displayedColumns = ['codigo', 'nombre', 'tipo', 'hrs_teoria', 'hrs_practica', 'hrs_lab', 'total_hrs', 'docentes', 'estado', 'acciones'];
  displayedColumnsWithExpand = ['expand', ...this.displayedColumns];

  alcanceLabel: string | null = null;

  private destroyRef = inject(DestroyRef);

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private periodoService: PeriodoService,
    private contextoHelper: ContextoAcademicoHelper,
  ) {}

  ngOnInit(): void {
    this.alcanceLabel = this.contextoHelper.getEtiquetaAlcance();
    this.cargarPlanes();
    this.planControl.valueChanges.subscribe(() => this.cargarDatos());
    
    this.periodoService.periodoActivo$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      if (this.planControl.value) {
        this.cargarDatos();
      }
    });
  }

  cargarPlanes(): void {
    this.api.get<ApiResponse<PlanEstudios[]>>('/plan-estudios', { activo: 'true' }).subscribe({
      next: (res) => {
        this.planes = res.data;
        if (res.data.length > 0) {
          this.planControl.setValue(res.data[0].id);
        }
      },
    });
  }

  cargarDatos(): void {
    const periodoActivo = this.periodoService.periodoActivo;
    const planId = this.planControl.value;
    if (!periodoActivo || !planId) return;

    this.loading = true;
    this.api.get<ApiResponse<PaginatedData<CursoPlanEstudios>>>(
      `/plan-estudios/${planId}/cursos`, {}
    ).subscribe({
      next: (res) => {
        this.cursos = Array.isArray(res.data) ? res.data : res.data.items ?? [];
        this.cargarAsignaciones(periodoActivo.id);
      },
      error: () => { this.loading = false; },
    });
  }

  cargarAsignaciones(periodoId: number): void {
    this.api.get<ApiResponse<AsignacionLectiva[]>>(
      '/asignacion-lectiva', { periodo_id: periodoId }
    ).subscribe({
      next: (res) => {
        this.asignaciones = Array.isArray(res.data) ? res.data : [];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get cursosFiltrados(): CursoPlanEstudios[] {
    if (this.selectedCiclo === 0) return this.cursos;
    return this.cursos.filter((c) => c.ciclo === this.selectedCiclo);
  }

  getAsignaciones(cursoPlan: CursoPlanEstudios): AsignacionLectiva[] {
    return this.asignaciones.filter((a) => a.curso_plan_id === cursoPlan.id);
  }

  getDocentesLabel(cursoPlan: CursoPlanEstudios): string {
    const asigs = this.getAsignaciones(cursoPlan);
    if (asigs.length === 0) return '—';
    return asigs.map((a) => `${a.docente.nombres} ${a.docente.apellidos}`).join(', ');
  }

  getEstado(cursoPlan: CursoPlanEstudios): { label: string; class: string } {
    const asigs = this.getAsignaciones(cursoPlan);
    if (asigs.length === 0) return { label: 'Sin docente', class: 'sin-docente' };
    if (asigs.some((a) => a.estado === 'PENDIENTE')) return { label: 'Pendiente', class: 'pendiente' };
    if (asigs.every((a) => a.estado === 'CONFIRMADO')) return { label: 'Asignado', class: 'asignado' };
    return { label: 'Mixto', class: 'mixto' };
  }

  totalHoras(curso: CursoPlanEstudios): number {
    return curso.horas_teoria + curso.horas_practica + curso.horas_laboratorio;
  }

  abrirAsignar(cursoPlan: CursoPlanEstudios): void {
    const periodoActivo = this.periodoService.periodoActivo;
    this.dialog.open(AsignarDocenteDialogComponent, {
      width: '650px', maxWidth: '95vw',
      data: { cursoPlan, periodoId: periodoActivo?.id },
    }).afterClosed().subscribe((ok: boolean) => {
      if (ok) this.cargarDatos();
    });
  }

  confirmar(asignacion: AsignacionLectiva): void {
    this.api.patch(`/asignacion-lectiva/${asignacion.id}/confirmar`, {}).subscribe({
      next: () => {
        this.snackBar.open('Asignación confirmada', 'OK', { duration: 2500 });
        this.cargarDatos();
      },
      error: (err) => this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 }),
    });
  }

  eliminar(asignacion: AsignacionLectiva): void {
    this.api.delete(`/asignacion-lectiva/${asignacion.id}`).subscribe({
      next: () => {
        this.snackBar.open('Asignación eliminada', 'OK', { duration: 2500 });
        this.cargarDatos();
      },
      error: (err) => this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 }),
    });
  }

  cicloLabel(ciclo: number): string {
    const romanos = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return romanos[ciclo - 1] || String(ciclo);
  }
}
