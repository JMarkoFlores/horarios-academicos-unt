import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../../core/services/api.service';
import { Ambiente, ApiResponse } from '../../../core/interfaces/entities';
import { VerDisponibilidadDialogComponent } from '../dialogs/ver-disponibilidad-dialog/ver-disponibilidad-dialog.component';

@Component({
  selector: 'app-ambientes-list',
  templateUrl: './ambientes-list.component.html',
  styleUrls: ['./ambientes-list.component.scss'],
})
export class AmbientesListComponent implements OnInit {
  displayedColumns = [
    'codigo',
    'nombre',
    'tipo',
    'capacidad',
    'equipamiento',
    'estado',
    'acciones',
  ];
  dataSource: Ambiente[] = [];
  total = 0;
  pageSize = 10;
  currentPage = 0;
  loading = false;
  tipoFilter = '';
  estadoFilter = '';

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadAmbientes();
  }

  loadAmbientes(): void {
    this.loading = true;
    const params: Record<string, string | number> = {
      page: this.currentPage + 1,
      limit: this.pageSize,
    };
    if (this.tipoFilter) params['tipo'] = this.tipoFilter;
    if (this.estadoFilter !== '') params['activo'] = this.estadoFilter;

    this.api
      .get<
        ApiResponse<{ items: Ambiente[]; total: number }>
      >('/ambientes', params)
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

  onPageChange(e: PageEvent): void {
    this.currentPage = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadAmbientes();
  }
  onFilterChange(): void {
    this.currentPage = 0;
    this.loadAmbientes();
  }

  verDisponibilidad(a: Ambiente): void {
    this.dialog.open(VerDisponibilidadDialogComponent, {
      width: '720px',
      maxWidth: '98vw',
      data: a,
    });
  }

  activar(a: Ambiente): void {
    this.api
      .patch<ApiResponse<any>>(`/ambientes/${a.id}`, { activo: true })
      .subscribe({
        next: () => {
          this.snackBar.open('Ambiente activado', 'OK', { duration: 2000 });
          this.loadAmbientes();
        },
      });
  }

  desactivar(a: Ambiente): void {
    if (!confirm(`¿Desactivar "${a.nombre}"?`)) return;
    this.api.delete<ApiResponse<any>>(`/ambientes/${a.id}`).subscribe({
      next: () => {
        this.snackBar.open('Ambiente desactivado', 'OK', { duration: 2000 });
        this.loadAmbientes();
      },
    });
  }
}
