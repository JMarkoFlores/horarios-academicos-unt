import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import {
  Curso,
  Ambiente,
  ApiResponse,
} from '../../../core/interfaces/entities';
import { AsignarAmbientesDialogComponent } from '../dialogs/asignar-ambientes-dialog/asignar-ambientes-dialog.component';
import { GestionarGruposDialogComponent } from '../dialogs/gestionar-grupos-dialog/gestionar-grupos-dialog.component';

@Component({
  selector: 'app-cursos-list',
  templateUrl: './cursos-list.component.html',
  styleUrls: ['./cursos-list.component.scss'],
})
export class CursosListComponent implements OnInit {
  displayedColumns = [
    'codigo',
    'nombre',
    'creditos',
    'horas_teoria',
    'tiene_lab',
    'ambiente_teoria',
    'ambiente_laboratorio',
    'acciones',
  ];
  dataSource: Curso[] = [];
  total = 0;
  pageSize = 10;
  currentPage = 0;
  loading = false;

  searchControl = new FormControl('');
  cicloFilter = '';
  ciclos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadCursos();
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 0;
        this.loadCursos();
      });
  }

  loadCursos(): void {
    this.loading = true;
    const params: Record<string, string | number> = {
      page: this.currentPage + 1,
      limit: this.pageSize,
    };
    if (this.searchControl.value) params['busqueda'] = this.searchControl.value;
    if (this.cicloFilter) params['ciclo'] = this.cicloFilter;

    this.api
      .get<ApiResponse<{ items: Curso[]; total: number }>>('/cursos', params)
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
    this.loadCursos();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadCursos();
  }

  ambientesTeoria(curso: Curso): Ambiente[] {
    return (curso.ambientes ?? []).filter((a) => a.tipo === 'AULA');
  }

  ambientesLaboratorio(curso: Curso): Ambiente[] {
    return (curso.ambientes ?? []).filter((a) => a.tipo === 'LABORATORIO');
  }

  abrirAsignarAmbientes(curso: Curso, tipo: 'TEORIA' | 'LABORATORIO'): void {
    const dialogRef = this.dialog.open(AsignarAmbientesDialogComponent, {
      width: '540px',
      maxWidth: '95vw',
      data: { curso, tipo_clase: tipo },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) this.loadCursos();
    });
  }

  abrirGestionarGrupos(curso: Curso): void {
    const dialogRef = this.dialog.open(GestionarGruposDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: { curso },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) this.loadCursos();
    });
  }

  eliminar(curso: Curso): void {
    if (!confirm(`¿Eliminar el curso "${curso.nombre}"?`)) return;
    this.api.delete<ApiResponse<any>>(`/cursos/${curso.id}`).subscribe({
      next: () => {
        this.snackBar.open('Curso eliminado', 'OK', { duration: 2000 });
        this.loadCursos();
      },
    });
  }
}
