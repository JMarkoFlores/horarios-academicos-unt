import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { ContextoAcademicoHelper } from '../../../core/services/contexto-academico.helper';
import { ConfiguracionGeneralService } from '../../../core/services/configuracion-general.service';
import { Docente, ApiResponse, Departamento, Escuela } from '../../../core/interfaces/entities';
import { VerHorarioDocenteDialogComponent } from '../dialogs/ver-horario-docente-dialog/ver-horario-docente-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-docentes-list',
  templateUrl: './docentes-list.component.html',
  styleUrls: ['./docentes-list.component.scss'],
})
export class DocentesListComponent implements OnInit {
  displayedColumns = [
    'nombre',
    'ibm',
    'email',
    'tipo_docente',
    'categoria',
    'modalidad',
    'carga',
    'antiguedad',
    'estado',
    'acciones',
  ];
  dataSource: Docente[] = [];
  total = 0;
  pageSize = 20;
  currentPage = 0;
  loading = false;
  exportando = false;
  exportFormat: 'excel' | 'pdf' = 'excel';
  cargaDocentes: Record<
    number,
    { actual: number; minimo: number; cumplimiento: number }
  > = {};
  loadingCarga = false;

  searchControl = new FormControl('');
  categoriaFilter = '';
  tipoDocenteFilter = '';
  modalidadFilter = '';
  activoFilter: boolean | null = null;
  departamentoFilter: number | null = null;
  escuelaFilter: number | null = null;
  sortBy = 'apellidos';
  sortDir: 'ASC' | 'DESC' = 'ASC';

  departamentos: Departamento[] = [];
  escuelas: Escuela[] = [];

  categorias = ['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'SIN_CATEGORIA'];
  tiposDocente = [
    { value: 'ORDINARIO', label: 'Nombrado' },
    { value: 'CONTRATADO', label: 'Contratado' },
    { value: 'JEFE_PRACTICA_CONTRATADO', label: 'Jefe de práctica contratado' },
  ];
  modalidades = [
    { value: 'DEDICACION_EXCLUSIVA', label: 'Dedicación Exclusiva' },
    { value: 'TIEMPO_COMPLETO_40', label: 'Tiempo Completo (40 h)' },
    { value: 'TIEMPO_PARCIAL_20', label: 'Tiempo Parcial 20 h' },
    { value: 'TIEMPO_PARCIAL_12', label: 'Tiempo Parcial 12 h' },
    { value: 'TIEMPO_PARCIAL_10', label: 'Tiempo Parcial 10 h' },
    { value: 'TIEMPO_PARCIAL_8', label: 'Tiempo Parcial 8 h' },
  ];

  alcanceLabel: string | null = null;

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private periodoService: PeriodoService,
    private dialog: MatDialog,
    private router: Router,
    private contextoHelper: ContextoAcademicoHelper,
    private configService: ConfiguracionGeneralService,
  ) {}

  ngOnInit(): void {
    this.alcanceLabel = this.contextoHelper.getEtiquetaAlcance();
    this.loadDocentes();
    this.loadCargaDocentes();
    this.loadDepartamentos();
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 0;
        this.loadDocentes();
      });
  }

  loadDepartamentos(): void {
    this.api.get<ApiResponse<Departamento[]>>('/departamentos?con_docentes=true').subscribe({
      next: (res) => { this.departamentos = res.data || []; },
      error: () => {},
    });
  }

  loadEscuelas(): void {
    if (this.departamentoFilter) {
      this.api.get<ApiResponse<Departamento>>(`/departamentos/${this.departamentoFilter}`).subscribe({
        next: (res) => {
          if (res.data?.escuela) {
            this.escuelas = [res.data.escuela];
            this.escuelaFilter = res.data.escuela.id;
          }
        },
        error: () => {},
      });
    } else {
      this.api.get<ApiResponse<Escuela[]>>('/escuelas').subscribe({
        next: (res) => { this.escuelas = res.data || []; },
        error: () => {},
      });
    }
  }

  onDepartamentoChange(): void {
    this.escuelaFilter = null;
    this.loadEscuelas();
    this.currentPage = 0;
    this.loadDocentes();
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
    if (this.tipoDocenteFilter) params['tipo_docente'] = this.tipoDocenteFilter;
    if (this.modalidadFilter) params['modalidad'] = this.modalidadFilter;
    if (this.departamentoFilter) params['departamento_id'] = this.departamentoFilter;
    if (this.escuelaFilter) params['escuela_id'] = this.escuelaFilter;

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
          this.snackBar.open('Error al cargar docentes', 'Cerrar', {
            duration: 3000,
          });
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

  hasActiveFilters(): boolean {
    return this.activoFilter !== null || !!this.categoriaFilter || !!this.tipoDocenteFilter || !!this.modalidadFilter || !!this.searchControl.value || !!this.departamentoFilter || !!this.escuelaFilter;
  }

  clearFilters(): void {
    this.activoFilter = null;
    this.categoriaFilter = '';
    this.tipoDocenteFilter = '';
    this.modalidadFilter = '';
    this.departamentoFilter = null;
    this.escuelaFilter = null;
    this.searchControl.setValue('');
    this.currentPage = 0;
    this.loadDocentes();
  }

  get activoFilterValue(): string {
    if (this.activoFilter === true) return 'activos';
    if (this.activoFilter === false) return 'inactivos';
    return 'todos';
  }

  getModalidadLabel(value: string | undefined): string {
    if (!value) return '—';
    return this.modalidades.find((m) => m.value === value)?.label ?? value;
  }

  getDepartamentoNombre(): string {
    const dep = this.departamentos.find((d) => d.id === this.departamentoFilter);
    return dep?.nombre ?? '';
  }

  clearDepartamento(): void {
    this.departamentoFilter = null;
    this.onDepartamentoChange();
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#06b6d4',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  getTipoDocenteLabel(value: string | undefined): string {
    if (!value) return '—';
    return this.tiposDocente.find((t) => t.value === value)?.label ?? value;
  }

  getCategoriaLabel(value: string | undefined): string {
    if (!value) return '—';
    if (value === 'SIN_CATEGORIA') return 'Sin categoría';
    const map: Record<string, string> = {
      PRINCIPAL: 'Principal',
      ASOCIADO: 'Asociado',
      AUXILIAR: 'Auxiliar',
    };
    return map[value] ?? value;
  }

  loadCargaDocentes(): void {
    const periodo = this.periodoService.periodo;
    if (!periodo) return;

    this.loadingCarga = true;
    this.api
      .get<ApiResponse<any>>('/docentes/carga-desequilibrada', { periodo })
      .subscribe({
        next: (res) => {
          this.cargaDocentes = {};
          (res.data || []).forEach((d: any) => {
            const totalHoras = d.distribucion?.totalHoras || 0;
            const minimo = this.getMinimoNormativo(d);
            const cumplimiento = minimo > 0 ? (totalHoras / minimo) * 100 : 0;
            this.cargaDocentes[d.docenteId] = {
              actual: totalHoras,
              minimo,
              cumplimiento: Math.min(100, cumplimiento),
            };
          });
          this.loadingCarga = false;
        },
        error: () => { this.loadingCarga = false; },
      });
  }

  getMinimoNormativo(docente: any): number {
    const minimos: Record<string, number> = {
      DEDICACION_EXCLUSIVA: 40,
      TIEMPO_COMPLETO_40: 40,
      TIEMPO_PARCIAL_20: 20,
      TIEMPO_PARCIAL_12: 12,
      TIEMPO_PARCIAL_10: 10,
      TIEMPO_PARCIAL_8: 8,
    };
    return minimos[docente.modalidad] || 0;
  }

  getCargaIndicator(docenteId: number): { color: string; icon: string } {
    const carga = this.cargaDocentes[docenteId];
    if (!carga) return { color: 'gray', icon: 'help_outline' };
    if (carga.cumplimiento >= 100) return { color: 'green', icon: 'check_circle' };
    if (carga.cumplimiento >= 80) return { color: 'blue', icon: 'trending_up' };
    if (carga.cumplimiento >= 50) return { color: 'orange', icon: 'warning' };
    return { color: 'red', icon: 'error' };
  }

  round(value: number): number {
    return Math.round(value);
  }

  verDetalle(docente: Docente): void {
    this.router.navigate(['/app/docentes', docente.id]);
  }

  verHorario(docente: Docente): void {
    this.dialog.open(VerHorarioDocenteDialogComponent, {
      width: '1040px',
      maxWidth: '98vw',
      data: docente,
      disableClose: false,
    });
  }

  exportar(): void {
    if (this.exportFormat === 'pdf') {
      this.exportarPDF();
    } else {
      this.exportarExcel();
    }
  }

  exportarExcel(): void {
    this.exportando = true;
    const params: Record<string, string> = {};
    if (this.searchControl.value) params['busqueda'] = this.searchControl.value;
    if (this.categoriaFilter) params['categoria'] = this.categoriaFilter;
    if (this.tipoDocenteFilter) params['tipo_docente'] = this.tipoDocenteFilter;
    if (this.modalidadFilter) params['modalidad'] = this.modalidadFilter;
    if (this.departamentoFilter) params['departamento_id'] = String(this.departamentoFilter);
    if (this.escuelaFilter) params['escuela_id'] = String(this.escuelaFilter);
    if (this.activoFilter !== null) params['activo'] = String(this.activoFilter);

    this.api
      .get<ApiResponse<Docente[]>>('/docentes/exportar', params)
      .subscribe({
        next: (res) => {
          const config = this.configService.config;
          const primaryHex = config?.color_primario || '#1a237e';
          const accentHex = config?.color_acento || '#e91e63';
          const primaryRgb = this.hexToRgb(primaryHex);
          const accentRgb = this.hexToRgb(accentHex);
          const lightBg = this.hexToRgb('#F0EDFE');
          const whiteRgb = this.hexToRgb('#FFFFFF');
          const periodo = this.periodoService.periodo ?? 'S-P';
          const fecha = new Date().toLocaleDateString('es-PE');
          const instName = config?.nombre_institucional || 'Universidad Nacional de Trujillo';

          const wb = XLSX.utils.book_new();
          const metaRows = [
            [instName.toUpperCase()],
            ['SISTEMA DE GESTIÓN DE CARGA ACADÉMICA'],
            [`Reporte de Docentes — Período: ${periodo}`],
            [`Generado: ${fecha}   Total: ${res.data.length} docente(s)`],
            [],
          ];
          const ws = XLSX.utils.aoa_to_sheet(metaRows);

          const headers = [
            'Cód.', 'IBM', 'DNI', 'Apellidos', 'Nombres', 'Email', 'Teléfono',
            'Condición', 'Categoría', 'Modalidad', 'Depto.', 'Escuela',
            'Estado', 'Fecha Ingreso', 'Años serv.',
          ];
          XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A6' });

          const dataRows = res.data.map((d) => [
            d.codigo,
            d.ibm ?? '',
            d.dni ?? '',
            d.apellidos,
            d.nombres,
            d.email,
            d.telefono ?? '',
            this.getTipoDocenteLabel(d.tipo_docente),
            this.getCategoriaLabel(d.categoria),
            this.getModalidadLabel(d.modalidad),
            d.departamento?.nombre ?? '',
            d.departamento?.escuela?.nombre ?? '',
            d.activo ? 'Activo' : 'Inactivo',
            d.fecha_ingreso ? new Date(d.fecha_ingreso).toLocaleDateString('es-PE') : '',
            d.antiguedad?.anios ?? 0,
          ]);
          XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A7' });

          ws['!cols'] = [
            { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 26 }, { wch: 22 },
            { wch: 34 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 22 },
            { wch: 24 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
          ];
          ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 14 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 14 } },
          ];

          const titleStyle = {
            font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: primaryRgb } },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
          const subStyle = {
            font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: this.lightenColor(primaryHex, 20) } },
            alignment: { horizontal: 'center' },
          };
          const infoStyle = {
            font: { sz: 10, italic: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: this.lightenColor(primaryHex, 40) } },
            alignment: { horizontal: 'center' },
          };
          const hdrStyle = {
            font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: primaryRgb } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: { bottom: { style: 'medium', color: { rgb: 'FFFFFF' } } },
          };

          for (let col = 0; col < 15; col++) {
            const colLetter = XLSX.utils.encode_col(col);
            for (let row = 0; row < 4; row++) {
              const cell = `${colLetter}${row + 1}`;
              if (!ws[cell]) ws[cell] = {};
              ws[cell].s = row === 0 ? titleStyle : row === 1 ? subStyle : infoStyle;
            }
          }
          for (let col = 0; col < 15; col++) {
            const colLetter = XLSX.utils.encode_col(col);
            const cell = `${colLetter}6`;
            if (!ws[cell]) ws[cell] = {};
            ws[cell].s = hdrStyle;
          }

          for (let i = 7; i < 7 + dataRows.length; i++) {
            const evenRow = i % 2 === 0;
            const fillRgb = evenRow ? lightBg : whiteRgb;
            for (let col = 0; col < 15; col++) {
              const colLetter = XLSX.utils.encode_col(col);
              const cell = `${colLetter}${i}`;
              if (!ws[cell]) ws[cell] = { v: '', t: 's' };
              ws[cell].s = {
                fill: { fgColor: { rgb: fillRgb } },
                font: { sz: 9 },
                alignment: { vertical: 'center', horizontal: col <= 1 ? 'center' : 'left' },
                border: { bottom: { style: 'thin', color: { rgb: 'E2E8F0' } } },
              };
            }
            const estadoCell = `M${i}`;
            if (ws[estadoCell]) {
              const isActivo = ws[estadoCell].v === 'Activo';
              ws[estadoCell].s = {
                ...ws[estadoCell].s,
                font: { sz: 9, bold: true, color: { rgb: isActivo ? '065F46' : '991B1B' } },
                fill: { fgColor: { rgb: isActivo ? 'D1FAE5' : 'FEE2E2' } },
              };
            }
          }

          ws['!rows'] = [
            { hpt: 24 }, { hpt: 20 }, { hpt: 18 }, { hpt: 16 }, { hpt: 4 }, { hpt: 20 },
          ];

          // Add auto-filter on header row
          ws['!autofilter'] = { ref: `A6:O${6 + dataRows.length}` };

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

  exportarPDF(): void {
    this.exportando = true;
    const params: Record<string, string> = {};
    if (this.searchControl.value) params['busqueda'] = this.searchControl.value;
    if (this.categoriaFilter) params['categoria'] = this.categoriaFilter;
    if (this.tipoDocenteFilter) params['tipo_docente'] = this.tipoDocenteFilter;
    if (this.modalidadFilter) params['modalidad'] = this.modalidadFilter;
    if (this.departamentoFilter) params['departamento_id'] = String(this.departamentoFilter);
    if (this.escuelaFilter) params['escuela_id'] = String(this.escuelaFilter);
    if (this.activoFilter !== null) params['activo'] = String(this.activoFilter);

    this.api
      .get<ApiResponse<Docente[]>>('/docentes/exportar', params)
      .subscribe({
        next: (res) => {
          const config = this.configService.config;
          const primaryHex = config?.color_primario || '#1a237e';
          const instName = config?.nombre_institucional || 'Universidad Nacional de Trujillo';
          const periodo = this.periodoService.periodo ?? 'S-P';
          const fecha = new Date().toLocaleDateString('es-PE');

          const primaryRgb = this.hexToRgbArray(primaryHex);

          const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
          const pageW = doc.internal.pageSize.getWidth();
          const pageH = doc.internal.pageSize.getHeight();

          // Header background
          doc.setFillColor(...primaryRgb);
          doc.rect(0, 0, pageW, 28, 'F');

          // Header text
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(15);
          doc.setFont('helvetica', 'bold');
          doc.text(instName.toUpperCase(), pageW / 2, 11, { align: 'center' });
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('SISTEMA DE GESTION DE CARGA ACADEMICA', pageW / 2, 17, { align: 'center' });
          doc.setFontSize(8);
          doc.text(
            `Reporte de Docentes  |  Periodo: ${periodo}  |  Generado: ${fecha}  |  Total: ${res.data.length} docente(s)`,
            pageW / 2,
            23,
            { align: 'center' }
          );

          // Table
          const head = [['Cod.', 'IBM', 'DNI', 'Apellidos', 'Nombres', 'Email', 'Condicion', 'Categoria', 'Modalidad', 'Depto.', 'Estado']];
          const body = res.data.map((d) => [
            d.codigo || '',
            d.ibm || '',
            d.dni || '',
            d.apellidos,
            d.nombres,
            d.email,
            this.getTipoDocenteLabel(d.tipo_docente),
            this.getCategoriaLabel(d.categoria),
            this.getModalidadLabel(d.modalidad),
            d.departamento?.nombre || '',
            d.activo ? 'Activo' : 'Inactivo',
          ]);

          autoTable(doc, {
            startY: 34,
            head,
            body,
            theme: 'grid',
            styles: {
              fontSize: 7.5,
              cellPadding: 2,
              textColor: [30, 41, 59],
              lineColor: [226, 232, 240],
              lineWidth: 0.3,
            },
            headStyles: {
              fillColor: primaryRgb,
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 7,
              halign: 'center',
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252],
            },
            columnStyles: {
              0: { cellWidth: 18 },
              5: { cellWidth: 42 },
              10: { cellWidth: 16, halign: 'center' },
            },
            margin: { top: 34, left: 10, right: 10 },
            didDrawPage: (data) => {
              // Footer on every page
              doc.setFontSize(7);
              doc.setTextColor(148, 163, 184);
              doc.text(
                `Documento generado automaticamente - ${instName}`,
                10,
                pageH - 8
              );
              doc.text(
                `Pagina ${data.pageNumber}`,
                pageW - 10,
                pageH - 8,
                { align: 'right' }
              );
            },
          });

          const safeName = instName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
          doc.save(`Docentes_${safeName}_${periodo}.pdf`);
          this.exportando = false;
        },
        error: () => {
          this.snackBar.open('Error al exportar PDF', 'Cerrar', { duration: 3000 });
          this.exportando = false;
        },
      });
  }

  private hexToRgb(hex: string): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  private hexToRgbArray(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }

  private lightenColor(hex: string, percent: number): string {
    const h = hex.replace('#', '');
    let r = parseInt(h.substring(0, 2), 16);
    let g = parseInt(h.substring(2, 4), 16);
    let b = parseInt(h.substring(4, 6), 16);
    r = Math.min(255, r + Math.round((255 - r) * (percent / 100)));
    g = Math.min(255, g + Math.round((255 - g) * (percent / 100)));
    b = Math.min(255, b + Math.round((255 - b) * (percent / 100)));
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
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
      this.api
        .patch<ApiResponse<any>>(`/docentes/${docente.id}/reactivar`, {})
        .subscribe({
          next: () => {
            this.snackBar.open('Docente reactivado', 'OK', { duration: 2000 });
            this.loadDocentes();
          },
          error: () => this.snackBar.open('Error al reactivar docente', 'Cerrar', { duration: 3000 }),
        });
    });
  }
}
