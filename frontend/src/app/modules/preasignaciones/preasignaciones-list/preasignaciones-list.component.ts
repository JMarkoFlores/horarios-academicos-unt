import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-preasignaciones-list',
  templateUrl: './preasignaciones-list.component.html',
  styleUrls: ['./preasignaciones-list.component.scss']
})
export class PreasignacionesListComponent implements OnInit, OnDestroy {
  preasignaciones: any[] = [];
  loading = false;
  displayedColumns = ['docente', 'curso', 'grupo', 'tipo_clase', 'dia', 'hora_inicio', 'hora_fin', 'acciones'];
  filtros = {
    periodo: this.periodoService.periodo,
    docente_id: ''
  };
  private periodSub?: Subscription;

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snack: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarPreasignaciones();
    this.periodSub = this.periodoService.periodo$.subscribe((p) => {
      this.filtros.periodo = p;
      this.cargarPreasignaciones();
    });
  }

  ngOnDestroy(): void {
    this.periodSub?.unsubscribe();
  }

  cargarPreasignaciones(): void {
    this.loading = true;
    const params: any = { periodo: this.filtros.periodo };
    if (this.filtros.docente_id) params.docente_id = this.filtros.docente_id;

    this.api.get<any>('/preasignaciones', params).subscribe({
      next: (r) => {
        this.preasignaciones = r.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error al cargar preasignaciones', 'Error', { duration: 3000 });
      }
    });
  }

  eliminar(id: string): void {
    if (!confirm('¿Eliminar esta preasignación?')) return;
    this.api.delete<any>(`/preasignaciones/${id}`).subscribe({
      next: () => {
        this.snack.open('Preasignación eliminada', 'OK', { duration: 3000 });
        this.cargarPreasignaciones();
      },
      error: () => {
        this.snack.open('Error al eliminar', 'Error', { duration: 3000 });
      }
    });
  }

  getDiaLabel(dia: number): string {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    return dias[dia - 1] || '';
  }
}
