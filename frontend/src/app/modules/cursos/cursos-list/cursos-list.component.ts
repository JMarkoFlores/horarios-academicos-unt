import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as XLSX from 'xlsx-js-style';
import { ApiService } from '../../../core/services/api.service';
import { Curso, Ambiente, ApiResponse } from '../../../core/interfaces/entities';
import { AsignarAmbientesDialogComponent } from '../dialogs/asignar-ambientes-dialog/asignar-ambientes-dialog.component';
import { GestionarGruposDialogComponent } from '../dialogs/gestionar-grupos-dialog/gestionar-grupos-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-cursos-list',
  templateUrl: './cursos-list.component.html',
  styleUrls: ['./cursos-list.component.scss'],
})
export class CursosListComponent implements OnInit {
  displayedColumns = [
    'codigo', 'nombre', 'creditos', 'horas_teoria',
    'prerequisitos', 'completitud', 'ambiente_teoria', 'ambiente_laboratorio', 'acciones',
  ];

  dataSource: Curso[] = [];
  total       = 0;
  pageSize    = 10;
  currentPage = 0;
  loading     = false;
  exportando  = false;

  searchControl      = new FormControl('');
  cicloFilter        = '';
  labFilter          = '';       // '', 'true', 'false'
  activoFilter       = 'true';  // 'true' | 'false' | ''
  ciclos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  sortBy  = 'ciclo';
  sortDir: 'ASC' | 'DESC' = 'ASC';

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadCursos();
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => { this.currentPage = 0; this.loadCursos(); });
  }

  loadCursos(): void {
    this.loading = true;
    const params: Record<string, string | number> = {
      page: this.currentPage + 1,
      limit: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    };
    if (this.searchControl.value)  params['busqueda']          = this.searchControl.value;
    if (this.cicloFilter)          params['ciclo']             = this.cicloFilter;
    if (this.labFilter !== '')     params['tiene_laboratorio'] = this.labFilter;
    if (this.activoFilter !== '')  params['activo']            = this.activoFilter;

    this.api.get<ApiResponse<{ items: Curso[]; total: number }>>('/cursos', params).subscribe({
      next: (res) => {
        this.dataSource = res.data.items;
        this.total      = res.data.total;
        this.loading    = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onPageChange(e: PageEvent): void {
    this.currentPage = e.pageIndex;
    this.pageSize    = e.pageSize;
    this.loadCursos();
  }

  onFilterChange(): void { this.currentPage = 0; this.loadCursos(); }

  onSort(s: Sort): void {
    this.sortBy  = s.active || 'ciclo';
    this.sortDir = s.direction === 'desc' ? 'DESC' : 'ASC';
    this.currentPage = 0;
    this.loadCursos();
  }

  // ── Indicadores de completitud ─────────────────────────────────────────
  ambientesTeoria(curso: Curso): Ambiente[] {
    return (curso.ambientes ?? []).filter((a) => a.tipo === 'AULA');
  }

  ambientesLaboratorio(curso: Curso): Ambiente[] {
    return (curso.ambientes ?? []).filter((a) => a.tipo === 'LABORATORIO');
  }

  completitudClass(curso: Curso): string {
    const tieneAmb = this.ambientesTeoria(curso).length > 0 &&
      (!curso.tiene_laboratorio || this.ambientesLaboratorio(curso).length > 0);
    if (!tieneAmb) return 'comp-warn';
    return 'comp-ok';
  }

  completitudTip(curso: Curso): string {
    const msgs: string[] = [];
    if (!this.ambientesTeoria(curso).length)
      msgs.push('Sin ambiente de teoría');
    if (curso.tiene_laboratorio && !this.ambientesLaboratorio(curso).length)
      msgs.push('Sin ambiente de laboratorio');
    return msgs.length ? msgs.join(' · ') : 'Configuración completa';
  }

  cicloColor(ciclo: number): string {
    const palette = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
                     '#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'];
    return palette[(ciclo - 1) % palette.length];
  }

  getPrerequisitosResumen(prerequisitos: string): string {
    if (!prerequisitos) return '';
    const codigos = prerequisitos.split(',').map((c) => c.trim());
    if (codigos.length <= 2) return prerequisitos;
    return `${codigos.slice(0, 2).join(', ')}... (+${codigos.length - 2})`;
  }

  // ── Dialogs ────────────────────────────────────────────────────────────
  abrirAsignarAmbientes(curso: Curso, tipo: 'TEORIA' | 'LABORATORIO'): void {
    this.dialog.open(AsignarAmbientesDialogComponent, {
      width: '540px', maxWidth: '95vw', data: { curso, tipo_clase: tipo },
    }).afterClosed().subscribe((r: boolean) => { if (r) this.loadCursos(); });
  }

  abrirGestionarGrupos(curso: Curso): void {
    this.dialog.open(GestionarGruposDialogComponent, {
      width: '780px', maxWidth: '95vw', data: { curso },
    }).afterClosed().subscribe((r: boolean) => { if (r) this.loadCursos(); });
  }

  eliminar(curso: Curso): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Desactivar Curso',
        message: `¿Desactivar "${curso.nombre}"?`,
        detail: 'El curso no podrá ser asignado en nuevos horarios. Puede reactivarse después.',
        confirmText: 'Desactivar',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.api.delete<ApiResponse<any>>(`/cursos/${curso.id}`).subscribe({
        next: () => { this.snackBar.open('Curso desactivado', 'OK', { duration: 2500 }); this.loadCursos(); },
        error: (err) => { this.snackBar.open(err?.error?.message ?? 'Error al desactivar', 'Cerrar', { duration: 4000 }); },
      });
    });
  }

  reactivar(curso: Curso): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Reactivar Curso',
        message: `¿Reactivar "${curso.nombre}"?`,
        detail: 'El curso volverá a estar disponible para asignaciones.',
        confirmText: 'Reactivar',
        confirmColor: 'primary',
      },
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.api.patch<ApiResponse<any>>(`/cursos/${curso.id}/reactivar`, {}).subscribe({
        next: () => { this.snackBar.open('Curso reactivado', 'OK', { duration: 2500 }); this.loadCursos(); },
        error: (err) => { this.snackBar.open(err?.error?.message ?? 'Error al reactivar', 'Cerrar', { duration: 4000 }); },
      });
    });
  }

  // ── Exportar Excel ─────────────────────────────────────────────────────
  exportarExcel(): void {
    this.exportando = true;
    const params: Record<string, string | number> = { limit: 1000 };
    if (this.searchControl.value)  params['busqueda']          = this.searchControl.value;
    if (this.cicloFilter)          params['ciclo']             = this.cicloFilter;
    if (this.labFilter !== '')     params['tiene_laboratorio'] = this.labFilter;
    if (this.activoFilter !== '')  params['activo']            = this.activoFilter;

    this.api.get<ApiResponse<{ items: Curso[] }>>('/cursos', params).subscribe({
      next: (res) => {
        const items = res.data.items;
        const wb = XLSX.utils.book_new();
        const meta = [
          ['PLAN DE ESTUDIOS — GESTIÓN DE CURSOS'],
          [`Exportado: ${new Date().toLocaleDateString('es-PE')}   Total: ${items.length} cursos`],
          [],
        ];
        const ws = XLSX.utils.aoa_to_sheet(meta);
        const hdrs = ['Código','Nombre','Ciclo','Créditos','H.Teoría','H.Lab','Laboratorio','Ambientes Teoría','Ambientes Lab','Estado'];
        XLSX.utils.sheet_add_aoa(ws, [hdrs], { origin: 'A4' });
        const rows = items.map((c) => [
          c.codigo, c.nombre, c.ciclo, c.creditos,
          c.horas_teoria, c.horas_laboratorio ?? 0,
          c.tiene_laboratorio ? 'Sí' : 'No',
          (c.ambientes ?? []).filter(a => a.tipo === 'AULA').map(a => a.codigo).join(', '),
          (c.ambientes ?? []).filter(a => a.tipo === 'LABORATORIO').map(a => a.codigo).join(', '),
          (c as any).activo !== false ? 'Activo' : 'Inactivo',
        ]);
        XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A5' });
        ws['!cols'] = [{ wch:10 },{ wch:42 },{ wch:7 },{ wch:9 },{ wch:9 },{ wch:7 },{ wch:12 },{ wch:22 },{ wch:22 },{ wch:10 }];
        ws['!merges'] = [
          { s:{r:0,c:0}, e:{r:0,c:9} },
          { s:{r:1,c:0}, e:{r:1,c:9} },
        ];
        const P = '4F46E5', PD = '3730A3', W = 'FFFFFF', G = 'F0EDFE';
        const tS = { font:{bold:true,sz:13,color:{rgb:W}}, fill:{fgColor:{rgb:PD}}, alignment:{horizontal:'center'} };
        const sS = { font:{sz:9,italic:true,color:{rgb:W}}, fill:{fgColor:{rgb:P}}, alignment:{horizontal:'center'} };
        const hS = { font:{bold:true,sz:9,color:{rgb:W}}, fill:{fgColor:{rgb:'3730A3'}}, alignment:{horizontal:'center'} };
        ['A1','B1','C1','D1','E1','F1','G1','H1','I1','J1'].forEach(c => { ws[c] = ws[c] ?? {}; ws[c].s = tS; });
        ['A2','B2','C2','D2','E2','F2','G2','H2','I2','J2'].forEach(c => { ws[c] = ws[c] ?? {}; ws[c].s = sS; });
        ['A4','B4','C4','D4','E4','F4','G4','H4','I4','J4'].forEach(c => { ws[c] = ws[c] ?? {}; ws[c].s = hS; });
        for (let i = 5; i < 5 + rows.length; i++) {
          const fill = i % 2 === 0 ? G : W;
          ['A','B','C','D','E','F','G','H','I','J'].forEach(col => {
            const cell = `${col}${i}`;
            if (!ws[cell]) ws[cell] = { v:'', t:'s' };
            ws[cell].s = { fill:{fgColor:{rgb:fill}}, font:{sz:9}, alignment:{vertical:'center', horizontal: col === 'A' || col === 'C' || col === 'D' || col === 'E' || col === 'F' ? 'center' : 'left'} };
          });
          const jCell = `J${i}`;
          if (ws[jCell]) {
            const isAct = ws[jCell].v === 'Activo';
            ws[jCell].s = { fill:{fgColor:{rgb: isAct ? 'D1FAE5' : 'FEE2E2'}}, font:{sz:9,bold:true,color:{rgb: isAct ? '065F46' : '991B1B'}} };
          }
        }
        ws['!rows'] = [{ hpt:20 },{ hpt:14 },{},{ hpt:16 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Cursos');
        XLSX.writeFile(wb, `Cursos_${new Date().toISOString().slice(0,10)}.xlsx`);
        this.exportando = false;
      },
      error: () => {
        this.snackBar.open('Error al exportar', 'Cerrar', { duration: 3000 });
        this.exportando = false;
      },
    });
  }
}
