import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../../core/services/api.service';
import { Ambiente, ApiResponse } from '../../../core/interfaces/entities';

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
    'piso',
    'pabellon',
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

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
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
