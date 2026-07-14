import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { Docente, Ambiente } from '../../core/interfaces/entities';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss'],
})
export class ReportesComponent implements OnInit, OnDestroy {
  todosDocentes: Docente[] = [];
  todosAmbientes: Ambiente[] = [];
  docenteSeleccionado: Docente | null = null;
  ambienteSeleccionado: Ambiente | null = null;
  descargando: Record<string, boolean> = {};

  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.api.get<any>('/docentes', { limit: 200 }).pipe(
      catchError(() => {
        this.snackBar.open('Error al cargar docentes', 'Cerrar', { duration: 3000 });
        return of({ data: { items: [] } });
      }),
      takeUntil(this.destroy$),
    ).subscribe((r: any) => {
      this.todosDocentes = r?.data?.items ?? [];
    });

    this.api.get<any>('/ambientes', { limit: 200, activo: 'true' }).pipe(
      catchError(() => {
        this.snackBar.open('Error al cargar ambientes', 'Cerrar', { duration: 3000 });
        return of({ data: [] });
      }),
      takeUntil(this.destroy$),
    ).subscribe((r: any) => {
      this.todosAmbientes = r?.data?.items ?? r?.data ?? [];
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private notificar(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
  }

  descargar(
    reportKey: string,
    path: string,
    params?: Record<string, string>,
    filename?: string,
  ): void {
    this.descargando[reportKey] = true;
    this.api.getBlob(path, params).pipe(
      catchError(() => {
        this.notificar('Error al generar el reporte');
        this.descargando[reportKey] = false;
        return of(null);
      }),
      takeUntil(this.destroy$),
    ).subscribe((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? `reporte-${reportKey}-${this.periodoService.periodo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      this.descargando[reportKey] = false;
    });
  }

  private get periodo(): string {
    return this.periodoService.periodo;
  }

  private validarDocente(): boolean {
    if (!this.docenteSeleccionado) {
      this.notificar('Seleccione un docente');
      return false;
    }
    return true;
  }

  descargarDocente(): void {
    if (!this.validarDocente()) return;
    this.descargar('docente', `/reportes/docente/${this.docenteSeleccionado!.id}/pdf`, { periodo: this.periodo }, `F03-CAD-${this.docenteSeleccionado!.apellidos}-${this.periodo}.pdf`);
  }

  descargarF01Cad(): void {
    if (!this.validarDocente()) return;
    this.descargar('f01-cad', `/reportes/f01-cad/${this.docenteSeleccionado!.id}/pdf`, { periodo: this.periodo }, `F01-CAD-${this.docenteSeleccionado!.apellidos}-${this.periodo}.pdf`);
  }

  descargarAmbiente(): void {
    if (!this.ambienteSeleccionado) {
      this.notificar('Seleccione un ambiente');
      return;
    }
    this.descargar('ambiente', `/reportes/ambiente/${this.ambienteSeleccionado.id}/pdf`, { periodo: this.periodo }, `ambiente-${this.ambienteSeleccionado.codigo}-${this.periodo}.pdf`);
  }

  descargarOperacional(): void {
    this.descargar('operacional', '/reportes/operacional/pdf', { periodo: this.periodo }, `consolidado-general-${this.periodo}.pdf`);
  }

  descargarGestion(): void {
    this.descargar('gestion', '/reportes/gestion/pdf', { periodo: this.periodo }, `reporte-gestion-${this.periodo}.pdf`);
  }

  descargarConsolidadoCarga(): void {
    this.descargar('consolidado-carga', '/reportes/consolidado-carga/pdf', { periodo: this.periodo }, `consolidado-carga-${this.periodo}.pdf`);
  }

  descargarCargaPorModalidad(): void {
    this.descargar('carga-por-modalidad', '/reportes/carga-por-modalidad/pdf', { periodo: this.periodo }, `distribucion-modalidad-${this.periodo}.pdf`);
  }

  descargarConsolidadoExcel(): void {
    this.descargar('consolidado-excel', '/reportes/consolidado-carga/excel', { periodo: this.periodo }, `consolidado-carga-${this.periodo}.xlsx`);
  }

  descargarGestionCarga(): void {
    this.descargar('gestion-carga', '/reportes/gestion/carga/pdf', { periodo: this.periodo }, `gestion-carga-${this.periodo}.pdf`);
  }

  descargarCumplimiento(): void {
    this.descargar('cumplimiento', '/reportes/gestion/cumplimiento/pdf', { periodo: this.periodo }, `cumplimiento-${this.periodo}.pdf`);
  }

  descargarEjecutivo(): void {
    this.descargar('ejecutivo', '/reportes/gestion/ejecutivo/pdf', { periodo: this.periodo }, `ejecutivo-${this.periodo}.pdf`);
  }
}
