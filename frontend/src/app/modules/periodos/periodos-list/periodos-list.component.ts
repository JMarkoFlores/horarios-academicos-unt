import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import {
  ApiResponse,
  PeriodoAcademico,
} from '../../../core/interfaces/entities';

@Component({
  selector: 'app-periodos-list',
  templateUrl: './periodos-list.component.html',
  styleUrls: ['./periodos-list.component.scss'],
})
export class PeriodosListComponent implements OnInit {
  dataSource: PeriodoAcademico[] = [];
  loading = false;
  total = 0;
  currentPage = 0;
  pageSize = 10;
  displayedColumns = [
    'codigo',
    'nombre',
    'fecha_inicio',
    'fecha_fin',
    'estado',
    'acciones',
  ];

  estadoLabels: Record<string, string> = {
    planificacion: 'Planificación',
    asignacionhorarios: 'Asignación Horarios',
    encurso: 'En curso',
    finalizado: 'Finalizado',
  };

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private periodoService: PeriodoService,
  ) {}

  ngOnInit(): void {
    this.loadPeriodos();
  }

  loadPeriodos(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<{ items: PeriodoAcademico[]; total: number }>>(
        '/periodos',
        {
          page: this.currentPage + 1,
          limit: this.pageSize,
        },
      )
      .subscribe({
        next: (res) => {
          this.dataSource = res.data.items;
          this.total = res.data.total;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPeriodos();
  }

  eliminar(p: PeriodoAcademico): void {
    if (!confirm(`¿Eliminar el periodo "${p.nombre}"?`)) return;
    this.api.delete<ApiResponse<any>>(`/periodos/${p.id}`).subscribe({
      next: () => {
        this.snackBar.open('Periodo eliminado', 'OK', { duration: 2000 });
        this.periodoService.cargarPeriodos();
        this.loadPeriodos();
      },
    });
  }

  finalizarPeriodo(p: PeriodoAcademico): void {
    const msg = `⚠️ ¡ATENCIÓN! ⚠️\n\n¿Estás seguro de FINALIZAR el periodo "${p.nombre}"?\n\nEsta acción es IRREVERSIBLE e implica:\n1. Cerrar todas las declaraciones aprobadas.\n2. Anular las declaraciones en otros estados.\n3. Bloquear nuevas cargas horarias en este periodo.`;
    if (!confirm(msg)) return;

    this.api.post<ApiResponse<any>>(`/periodos/${p.id}/finalizar`, {}).subscribe({
      next: (res) => {
        this.snackBar.open(res.message || 'Periodo finalizado con éxito', 'OK', { duration: 4000 });
        this.periodoService.cargarPeriodos();
        this.loadPeriodos();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al finalizar el periodo', 'OK', { duration: 4000 });
      }
    });
  }
}
