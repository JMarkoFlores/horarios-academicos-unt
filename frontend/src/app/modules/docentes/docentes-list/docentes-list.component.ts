import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as XLSX from 'xlsx-js-style';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { Docente, ApiResponse } from '../../../core/interfaces/entities';
import { VerHorarioDocenteDialogComponent } from '../dialogs/ver-horario-docente-dialog/ver-horario-docente-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-docentes-list',
  templateUrl: './docentes-list.component.html',
  styleUrls: ['./docentes-list.component.scss'],
})
export class DocentesListComponent implements OnInit {
  displayedColumns = ['nombre', 'email', 'categoria', 'tipo_contrato', 'antiguedad', 'estado', 'acciones'];
  dataSource: Docente[] = [];
  total = 0;
  pageSize = 10;
  currentPage = 0;
  loading = false;
  exportando = false;

  searchControl = new FormControl('');
  categoriaFilter = '';
  tipoContratoFilter = '';
  activoFilter: boolean | null = true;
  sortBy = 'apellidos';
  sortDir: 'ASC' | 'DESC' = 'ASC';

  categorias = ['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA'];
  tiposContrato = ['NOMBRADO', 'CONTRATADO'];

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
      .subscribe(() => { this.currentPage = 0; this.loadDocentes(); });
  }

  loadDocentes(): void {
    this.loading = true;
    const params: Record<string, string | number> = {
      page: this.currentPage + 1,
      limit: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    };
    if (this.activoFilter !== null) params['activo'] = String(this.activoFilter);
    if (this.searchControl.value) params['busqueda'] = this.searchControl.value;
    if (this.categoriaFilter) params['categoria'] = this.categoriaFilter;
    if (this.tipoContratoFilter) params['tipo_contrato'] = this.tipoContratoFilter;

    this.api.get<ApiResponse<{ items: Docente[]; total: number }>>('/docentes', params)
      .subscribe({
        next: (res) => {
          this.dataSource = res.data.items;
          this.total = res.data.total;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Error al cargar docentes', 'Cerrar', { duration: 3000 });
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

  onSortChange(sort: Sort): void {
    this.sortBy = sort.active || 'apellidos';
    this.sortDir = sort.direction === 'desc' ? 'DESC' : 'ASC';
    this.currentPage = 0;
    this.loadDocentes();
  }

  onActivoFilterChange(valor: string): void {
    if (valor === 'activos') this.activoFilter = true;
    else if (valor === 'inactivos') this.activoFilter = false;
    else this.activoFilter = null;
    this.currentPage = 0;
    this.loadDocentes();
  }

  get activoFilterValue(): string {
    if (this.activoFilter === true) return 'activos';
    if (this.activoFilter === false) return 'inactivos';
    return 'todos';
  }

  getAvatarColor(name: string): string {
    const colors = ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  exportarExcel(): void {
    this.exportando = true;
    const params: Record<string, string> = {};
    if (this.searchControl.value) params['busqueda'] = this.searchControl.value;
    if (this.categoriaFilter) params['categoria'] = this.categoriaFilter;
    if (this.tipoContratoFilter) params['tipo_contrato'] = this.tipoContratoFilter;

    this.api.get<ApiResponse<Docente[]>>('/docentes/exportar', params).subscribe({
      next: (res) => {
        const periodo = this.periodoService.periodo ?? 'S-P';
        const fecha = new Date().toLocaleDateString('es-PE');
        const wb = XLSX.utils.book_new();

        const metaRows = [
          ['SISTEMA DE HORARIOS ACADÉMICOS - UNT'],
          [`Reporte de Docentes — Período: ${periodo}`],
          [`Generado: ${fecha}   Total: ${res.data.length} docente(s)`],
          [],
        ];
        const ws = XLSX.utils.aoa_to_sheet(metaRows);

        const headers = ['Cód.', 'Apellidos', 'Nombres', 'Email', 'Teléfono', 'Categoría', 'Tipo Contrato', 'Estado', 'Fecha Ingreso', 'Años serv.', 'Meses'];
        XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A5' });

        const dataRows = res.data.map((d) => [
          d.codigo,
          d.apellidos,
          d.nombres,
          d.email,
          d.telefono ?? '',
          d.categoria,
          d.tipo_contrato,
          d.activo ? 'Activo' : 'Inactivo',
          d.fecha_ingreso ? new Date(d.fecha_ingreso).toLocaleDateString('es-PE') : '',
          d.antiguedad?.anios ?? 0,
          d.antiguedad?.meses ?? 0,
        ]);
        XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A6' });

        ws['!cols'] = [{ wch: 10 }, { wch: 26 }, { wch: 22 }, { wch: 34 }, { wch: 16 }, { wch: 14 }, { wch: 15 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 8 }];
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
        ];

        const titleStyle = { font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4F46E5' } }, alignment: { horizontal: 'center', vertical: 'center' } };
        const subStyle  = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '6D5DEB' } }, alignment: { horizontal: 'center' } };
        const infoStyle = { font: { sz: 10, italic: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '8B7FF0' } }, alignment: { horizontal: 'center' } };
        const hdrStyle  = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '3730A3' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { bottom: { style: 'medium', color: { rgb: 'FFFFFF' } } } };

        ['A1','B1','C1','D1','E1','F1','G1','H1','I1','J1','K1'].forEach(c => { if (!ws[c]) ws[c] = {}; ws[c].s = titleStyle; });
        ['A2','B2','C2','D2','E2','F2','G2','H2','I2','J2','K2'].forEach(c => { if (!ws[c]) ws[c] = {}; ws[c].s = subStyle; });
        ['A3','B3','C3','D3','E3','F3','G3','H3','I3','J3','K3'].forEach(c => { if (!ws[c]) ws[c] = {}; ws[c].s = infoStyle; });
        ['A5','B5','C5','D5','E5','F5','G5','H5','I5','J5','K5'].forEach(c => { if (!ws[c]) ws[c] = {}; ws[c].s = hdrStyle; });

        for (let i = 6; i < 6 + dataRows.length; i++) {
          const evenRow = i % 2 === 0;
          const fillRgb = evenRow ? 'F0EDFE' : 'FFFFFF';
          ['A','B','C','D','E','F','G','H','I','J','K'].forEach(col => {
            const cell = `${col}${i}`;
            if (!ws[cell]) ws[cell] = { v: '', t: 's' };
            ws[cell].s = { fill: { fgColor: { rgb: fillRgb } }, font: { sz: 9 }, alignment: { vertical: 'center', horizontal: col === 'A' ? 'center' : 'left' }, border: { bottom: { style: 'thin', color: { rgb: 'E2E8F0' } } } };
          });
          const estadoCell = `H${i}`;
          if (ws[estadoCell]) {
            const isActivo = ws[estadoCell].v === 'Activo';
            ws[estadoCell].s = { ...ws[estadoCell].s, font: { sz: 9, bold: true, color: { rgb: isActivo ? '065F46' : '991B1B' } }, fill: { fgColor: { rgb: isActivo ? 'D1FAE5' : 'FEE2E2' } } };
          }
        }

        ws['!rows'] = [{ hpt: 22 }, { hpt: 18 }, { hpt: 16 }, { hpt: 4 }, { hpt: 18 }];

        XLSX.utils.book_append_sheet(wb, ws, 'Docentes');
        XLSX.writeFile(wb, `Docentes_${periodo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        this.exportando = false;
      },
      error: () => {
        this.snackBar.open('Error al exportar docentes', 'Cerrar', { duration: 3000 });
        this.exportando = false;
      },
    });
  }

  verHorario(docente: Docente): void {
    this.dialog.open(VerHorarioDocenteDialogComponent, {
      width: '1040px', maxWidth: '98vw', data: docente, disableClose: false,
    });
  }

  desactivar(docente: Docente): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Desactivar Docente',
        message: `¿Desactivar a ${docente.apellidos}, ${docente.nombres}?`,
        detail: 'El docente no podrá ser asignado en nuevos horarios. Esta acción se puede revertir.',
        confirmLabel: 'Desactivar',
        confirmColor: 'warn',
        icon: 'person_remove',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.api.delete<ApiResponse<any>>(`/docentes/${docente.id}`).subscribe({
        next: () => {
          this.snackBar.open('Docente desactivado', 'OK', { duration: 2000 });
          this.loadDocentes();
        },
        error: () => this.snackBar.open('Error al desactivar docente', 'Cerrar', { duration: 3000 }),
      });
    });
  }

  reactivar(docente: Docente): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Reactivar Docente',
        message: `¿Reactivar a ${docente.apellidos}, ${docente.nombres}?`,
        detail: 'El docente volverá a estar disponible para asignaciones de horario.',
        confirmLabel: 'Reactivar',
        confirmColor: 'accent',
        icon: 'person_add',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.api.patch<ApiResponse<any>>(`/docentes/${docente.id}/reactivar`, {}).subscribe({
        next: () => {
          this.snackBar.open('Docente reactivado', 'OK', { duration: 2000 });
          this.loadDocentes();
        },
        error: () => this.snackBar.open('Error al reactivar docente', 'Cerrar', { duration: 3000 }),
      });
    });
  }
}
