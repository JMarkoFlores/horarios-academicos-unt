import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { Docente, ApiResponse } from '../../../core/interfaces/entities';

@Component({
  selector: 'app-docentes-list',
  templateUrl: './docentes-list.component.html',
  styleUrls: ['./docentes-list.component.scss'],
})
export class DocentesListComponent implements OnInit, AfterViewInit {
  displayedColumns = [
    'codigo',
    'nombre',
    'categoria',
    'tipo_contrato',
    'antiguedad',
    'acciones',
  ];
  dataSource: Docente[] = [];
  total = 0;
  pageSize = 10;
  currentPage = 0;
  loading = false;

  searchControl = new FormControl('');
  categoriaFilter = '';
  tipoContratoFilter = '';

  categorias = ['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA'];
  tiposContrato = ['NOMBRADO', 'CONTRATADO'];

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadDocentes();
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 0;
        this.loadDocentes();
      });
  }

  ngAfterViewInit(): void {}

  loadDocentes(): void {
    this.loading = true;
    const params: Record<string, string | number> = {
      page: this.currentPage + 1,
      limit: this.pageSize,
    };
    if (this.searchControl.value) params['busqueda'] = this.searchControl.value;
    if (this.categoriaFilter) params['categoria'] = this.categoriaFilter;
    if (this.tipoContratoFilter)
      params['tipo_contrato'] = this.tipoContratoFilter;

    this.api
      .get<
        ApiResponse<{ items: Docente[]; total: number }>
      >('/docentes', params)
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
    this.loadDocentes();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadDocentes();
  }

  desactivar(docente: Docente): void {
    if (!confirm(`¿Desactivar a ${docente.nombres} ${docente.apellidos}?`))
      return;
    this.api.delete<ApiResponse<any>>(`/docentes/${docente.id}`).subscribe({
      next: () => {
        this.snackBar.open('Docente desactivado', 'OK', { duration: 2000 });
        this.loadDocentes();
      },
    });
  }
}
