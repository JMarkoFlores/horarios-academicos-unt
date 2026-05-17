import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { Curso, ApiResponse } from '../../../core/interfaces/entities';

@Component({
  selector: 'app-cursos-list',
  templateUrl: './cursos-list.component.html',
  styleUrls: ['./cursos-list.component.scss'],
})
export class CursosListComponent implements OnInit {
  displayedColumns = ['codigo', 'nombre', 'creditos', 'horas_teoria', 'tiene_lab', 'acciones'];
  dataSource: Curso[] = [];
  total = 0;
  pageSize = 10;
  currentPage = 0;
  loading = false;

  searchControl = new FormControl('');
  cicloFilter = '';
  ciclos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor(private api: ApiService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadCursos();
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => { this.currentPage = 0; this.loadCursos(); });
  }

  loadCursos(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: this.currentPage + 1, limit: this.pageSize };
    if (this.searchControl.value) params['busqueda'] = this.searchControl.value;
    if (this.cicloFilter) params['ciclo'] = this.cicloFilter;

    this.api.get<ApiResponse<{ items: Curso[]; total: number }>>('/cursos', params).subscribe({
      next: res => { this.dataSource = res.data.items; this.total = res.data.total; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onPageChange(e: PageEvent): void {
    this.currentPage = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadCursos();
  }

  onFilterChange(): void { this.currentPage = 0; this.loadCursos(); }

  eliminar(curso: Curso): void {
    if (!confirm(`¿Eliminar el curso "${curso.nombre}"?`)) return;
    this.api.delete<ApiResponse<any>>(`/cursos/${curso.id}`).subscribe({
      next: () => { this.snackBar.open('Curso eliminado', 'OK', { duration: 2000 }); this.loadCursos(); },
    });
  }
}
