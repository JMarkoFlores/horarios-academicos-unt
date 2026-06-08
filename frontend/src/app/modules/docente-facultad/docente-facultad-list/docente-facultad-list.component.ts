import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, Docente } from '../../../core/interfaces/entities';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-docente-facultad-list',
  templateUrl: './docente-facultad-list.component.html',
  styleUrls: ['./docente-facultad-list.component.scss'],
})
export class DocenteFacultadListComponent implements OnInit {
  displayedColumns = [
    'docente',
    'ibm',
    'departamento',
    'facultad',
    'acciones',
  ];
  docentes: Docente[] = [];
  total = 0;
  pageSize = 10;
  currentPage = 0;
  loading = false;
  searchControl = new FormControl('');
  soloSinAsignacion = false;

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargarDocentes();
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 0;
        this.cargarDocentes();
      });
  }

  cargarDocentes(): void {
    this.loading = true;
    const params: Record<string, string | number> = {
      page: this.currentPage + 1,
      limit: this.pageSize,
      sortBy: 'apellidos',
      sortDir: 'ASC',
      activo: 'true',
    };

    if (this.searchControl.value?.trim()) {
      params['busqueda'] = this.searchControl.value.trim();
    }
    if (this.soloSinAsignacion) {
      params['sin_vinculacion'] = 'true';
    }

    this.api
      .get<ApiResponse<{ items: Docente[]; total: number }>>('/docentes', params)
      .subscribe({
        next: (res) => {
          this.docentes = res.data.items;
          this.total = res.data.total;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Error al cargar docentes', 'Cerrar', {
            duration: 3000,
          });
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.cargarDocentes();
  }

  onSoloSinAsignacionChange(): void {
    this.currentPage = 0;
    this.cargarDocentes();
  }

  eliminar(docente: Docente): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar docente',
        message: `¿Desactivar a ${docente.apellidos}, ${docente.nombres}?`,
        detail:
          'El docente dejará de estar disponible. Esta acción se puede revertir desde el módulo principal de docentes.',
        confirmLabel: 'Eliminar',
        confirmColor: 'warn',
        icon: 'person_remove',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.api.delete<ApiResponse<any>>(`/docentes/${docente.id}`).subscribe({
        next: () => {
          this.snackBar.open('Docente eliminado correctamente', 'OK', {
            duration: 2500,
          });
          this.cargarDocentes();
        },
        error: () => {
          this.snackBar.open('Error al eliminar docente', 'Cerrar', {
            duration: 3000,
          });
        },
      });
    });
  }

  getNombreCompleto(docente: Docente): string {
    return `${docente.apellidos}, ${docente.nombres}`;
  }

  getDepartamento(docente: Docente): string {
    return docente.departamento?.nombre || 'No declarado';
  }

  getFacultad(docente: Docente): string {
    return docente.facultad?.nombre || 'No declarada';
  }

  requiereAsignacion(docente: Docente): boolean {
    return !docente.departamento_id || !docente.facultad_id;
  }
}
