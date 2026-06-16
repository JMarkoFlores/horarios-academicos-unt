import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/interfaces/entities';
import { PlanFormDialogComponent } from '../dialogs/plan-form-dialog/plan-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

export interface PlanEstudios {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  resolucion?: string;
  anio: number;
  activo: boolean;
  escuela_id: number;
  escuela?: { id: number; nombre: string; codigo: string };
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-plan-estudios-list',
  templateUrl: './plan-estudios-list.component.html',
  styleUrls: ['./plan-estudios-list.component.scss'],
})
export class PlanEstudiosListComponent implements OnInit {
  displayedColumns = ['codigo', 'nombre', 'anio', 'escuela', 'activo', 'acciones'];
  dataSource: PlanEstudios[] = [];
  loading = false;
  searchControl = new FormControl('');

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadPlanes();
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.loadPlanes());
  }

  loadPlanes(): void {
    this.loading = true;
    const params: Record<string, string | number> = {};
    if (this.searchControl.value) params['search'] = this.searchControl.value;
    this.api.get<ApiResponse<PlanEstudios[]>>('/plan-estudios', params).subscribe({
      next: (res) => {
        this.dataSource = res.data;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  abrirCrearPlan(): void {
    this.dialog.open(PlanFormDialogComponent, {
      width: '600px', maxWidth: '95vw',
      data: {}
    }).afterClosed().subscribe((r: boolean) => { if (r) this.loadPlanes(); });
  }

  abrirEditarPlan(plan: PlanEstudios): void {
    this.dialog.open(PlanFormDialogComponent, {
      width: '600px', maxWidth: '95vw', data: { plan },
    }).afterClosed().subscribe((r: boolean) => { if (r) this.loadPlanes(); });
  }

  toggleActivo(plan: PlanEstudios): void {
    const accion = plan.activo ? 'Desactivar' : 'Activar';
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: `${accion} Plan`,
        message: `¿${accion} "${plan.nombre}"?`,
        detail: plan.activo
          ? 'El plan dejará de estar vigente. Los datos históricos se conservan.'
          : 'El plan volverá a estar vigente. Solo puede haber un plan activo por escuela.',
        confirmText: accion,
        confirmColor: plan.activo ? 'warn' : 'primary',
      },
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.api.patch<ApiResponse<PlanEstudios>>(`/plan-estudios/${plan.id}/toggle-activo`, {}).subscribe({
        next: () => {
          this.snackBar.open(`Plan ${accion.toLowerCase()}do`, 'OK', { duration: 2500 });
          this.loadPlanes();
        },
        error: (err) => this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 }),
      });
    });
  }

  eliminar(plan: PlanEstudios): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar Plan',
        message: `¿Eliminar "${plan.nombre}"?`,
        detail: 'Esta acción solo es posible si el plan no tiene cursos asociados.',
        confirmText: 'Eliminar',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.api.delete<ApiResponse<any>>(`/plan-estudios/${plan.id}`).subscribe({
        next: () => {
          this.snackBar.open('Plan eliminado', 'OK', { duration: 2500 });
          this.loadPlanes();
        },
        error: (err) => this.snackBar.open(err?.error?.message ?? 'Error al eliminar', 'Cerrar', { duration: 4000 }),
      });
    });
  }

  cicloColor(ciclo: number): string {
    const palette = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'];
    return palette[(ciclo - 1) % palette.length];
  }
}
