import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/interfaces/entities';
import { PlanEstudios } from '../plan-estudios-list/plan-estudios-list.component';
import { CursoPlanDialogComponent } from '../dialogs/curso-plan-dialog/curso-plan-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

export interface CursoPlan {
  id: number;
  curso_id: number;
  plan_estudios_id: number;
  ciclo: number;
  tipo_curso: string;
  horas_teoria: number;
  horas_practica: number;
  horas_laboratorio: number;
  creditos: number;
  prerequisitos: number[];
  estado: string;
  curso: {
    id: number;
    codigo: string;
    nombre: string;
    creditos: number;
    departamento?: {
      id: number;
      nombre: string;
      codigo: string;
    };
  };
}

@Component({
  selector: 'app-plan-estudios-detail',
  templateUrl: './plan-estudios-detail.component.html',
  styleUrls: ['./plan-estudios-detail.component.scss'],
})
export class PlanEstudiosDetailComponent implements OnInit {
  displayedColumns = ['codigo', 'nombre', 'tipo', 'departamento', 'horas', 'creditos', 'prerequisitos', 'estado', 'acciones'];
  plan: PlanEstudios | null = null;
  cursos: CursoPlan[] = [];
  loading = true;
  ciclos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  selectedCiclo = 0;
  cursosFiltrados: CursoPlan[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadPlan(+id);
  }

  loadPlan(id: number): void {
    this.loading = true;
    this.api.get<ApiResponse<PlanEstudios & { cursos: CursoPlan[] }>>(`/plan-estudios/${id}`).subscribe({
      next: (res) => {
        const data = res.data;
        this.plan = {
          id: data.id,
          codigo: data.codigo,
          nombre: data.nombre,
          descripcion: data.descripcion,
          resolucion: data.resolucion,
          anio: data.anio,
          activo: data.activo,
          escuela_id: data.escuela_id,
          escuela: data.escuela,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        this.cursos = (data as any).cursos || [];
        this.filtrarCursos();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al cargar el plan', 'Cerrar', { duration: 3000 });
      },
    });
  }

  selectCiclo(ciclo: number): void {
    this.selectedCiclo = ciclo;
    this.filtrarCursos();
  }

  filtrarCursos(): void {
    if (this.selectedCiclo === 0) {
      this.cursosFiltrados = this.cursos.filter(c => c.estado !== 'ELIMINADO');
    } else {
      this.cursosFiltrados = this.cursos.filter(c => c.ciclo === this.selectedCiclo && c.estado !== 'ELIMINADO');
    }
  }

  abrirAgregarCurso(): void {
    if (!this.plan) return;
    this.dialog.open(CursoPlanDialogComponent, {
      width: '600px', maxWidth: '95vw',
      data: { planId: this.plan.id, modo: 'crear' },
    }).afterClosed().subscribe((r: boolean) => { if (r) this.loadPlan(this.plan!.id); });
  }

  abrirEditarCurso(cp: CursoPlan): void {
    if (!this.plan) return;
    this.dialog.open(CursoPlanDialogComponent, {
      width: '600px', maxWidth: '95vw',
      data: { planId: this.plan.id, cursoPlan: cp, modo: 'editar' },
    }).afterClosed().subscribe((r: boolean) => { if (r) this.loadPlan(this.plan!.id); });
  }

  toggleCursoEstado(cp: CursoPlan): void {
    if (!this.plan) return;
    const accion = cp.estado === 'ACTIVO' ? 'Desactivar' : 'Activar';
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: `${accion} Curso en Plan`,
        message: `¿${accion} "${cp.curso.nombre}" en este plan?`,
        confirmText: accion,
        confirmColor: cp.estado === 'ACTIVO' ? 'warn' : 'primary',
      },
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.api.patch<ApiResponse<any>>(`/plan-estudios/${this.plan!.id}/cursos/${cp.id}/toggle-estado`, {}).subscribe({
        next: () => {
          this.snackBar.open(`Curso ${accion.toLowerCase()}do en el plan`, 'OK', { duration: 2500 });
          this.loadPlan(this.plan!.id);
        },
        error: (err) => this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 }),
      });
    });
  }

  getPrerequisitosResumen(cp: CursoPlan): string {
    if (!cp.prerequisitos || cp.prerequisitos.length === 0) return '—';
    const cursosRelacionados = this.cursos.filter(c => cp.prerequisitos!.includes(c.curso_id));
    return cursosRelacionados.map(c => c.curso.codigo).join(', ');
  }

  getPrerequisitosNombres(cp: CursoPlan): string {
    if (!cp.prerequisitos || cp.prerequisitos.length === 0) return '—';
    const cursosRelacionados = this.cursos.filter(c => cp.prerequisitos!.includes(c.curso_id));
    return cursosRelacionados.map(c => c.curso.nombre).join(', ');
  }

  totalCursosPorCiclo(ciclo: number): number {
    return this.cursos.filter(c => c.ciclo === ciclo && c.estado !== 'ELIMINADO').length;
  }

  cicloLabel(ciclo: number): string {
    const romanos = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
    return romanos[ciclo - 1] || `${ciclo}`;
  }

  cicloColor(ciclo: number): string {
    const palette = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'];
    return palette[(ciclo - 1) % palette.length];
  }

  volver(): void {
    this.router.navigate(['/app/plan-estudios']);
  }

  exportarPDF(): void {
    if (!this.plan) return;
    this.api.getBlob(`/reportes/plan-estudios/${this.plan.id}/pdf`).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Plan_Estudios_${this.plan!.codigo}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.snackBar.open('Error al exportar PDF', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
