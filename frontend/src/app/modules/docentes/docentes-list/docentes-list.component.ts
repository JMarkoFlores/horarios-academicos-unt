import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { Docente, ApiResponse } from '../../../core/interfaces/entities';
import { VerHorarioDocenteDialogComponent } from '../dialogs/ver-horario-docente-dialog/ver-horario-docente-dialog.component';

@Component({
  selector: 'app-docentes-list',
  templateUrl: './docentes-list.component.html',
  styleUrls: ['./docentes-list.component.scss'],
})
export class DocentesListComponent implements OnInit, AfterViewInit {
  displayedColumns = [
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
  exportando = false;

  searchControl = new FormControl('');
  categoriaFilter = '';
  tipoContratoFilter = '';

  categorias = ['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA'];
  tiposContrato = ['NOMBRADO', 'CONTRATADO'];

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private periodoService: PeriodoService,
    private dialog: MatDialog,
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

  getAvatarColor(name: string): string {
    const colors = [
      '#4f46e5',
      '#7c3aed',
      '#ec4899',
      '#f59e0b',
      '#10b981',
      '#06b6d4',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  exportarExcel(): void {
    this.exportando = true;
    const params: Record<string, string> = {};
    if (this.searchControl.value) params['busqueda'] = this.searchControl.value;
    if (this.categoriaFilter) params['categoria'] = this.categoriaFilter;
    if (this.tipoContratoFilter)
      params['tipo_contrato'] = this.tipoContratoFilter;

    this.api
      .get<ApiResponse<Docente[]>>('/docentes/exportar', params)
      .subscribe({
        next: (res) => {
          const rows = res.data.map((d) => ({
            Código: d.codigo,
            Apellidos: d.apellidos,
            Nombres: d.nombres,
            Email: d.email,
            Teléfono: d.telefono ?? '',
            Categoría: d.categoria,
            'Tipo Contrato': d.tipo_contrato,
            'Fecha Ingreso': d.fecha_ingreso
              ? new Date(d.fecha_ingreso).toLocaleDateString('es-PE')
              : '',
            'Antigüedad (años)': d.antiguedad?.anios ?? 0,
            'Antigüedad (meses)': d.antiguedad?.meses ?? 0,
          }));

          const ws = XLSX.utils.json_to_sheet(rows);
          ws['!cols'] = [
            { wch: 10 },
            { wch: 25 },
            { wch: 22 },
            { wch: 32 },
            { wch: 14 },
            { wch: 14 },
            { wch: 14 },
            { wch: 15 },
            { wch: 18 },
            { wch: 18 },
          ];
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Docentes');
          const periodo = this.periodoService.periodo;
          XLSX.writeFile(
            wb,
            `Docentes_${periodo}_${new Date().toISOString().slice(0, 10)}.xlsx`,
          );
          this.exportando = false;
        },
        error: () => {
          this.snackBar.open('Error al exportar docentes', 'Cerrar', {
            duration: 3000,
          });
          this.exportando = false;
        },
      });
  }

  verHorario(docente: Docente): void {
    this.dialog.open(VerHorarioDocenteDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: docente,
      disableClose: false,
    });
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
