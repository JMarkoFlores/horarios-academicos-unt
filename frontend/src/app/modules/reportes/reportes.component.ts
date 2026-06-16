import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { Docente, Ambiente } from '../../core/interfaces/entities';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss'],
})
export class ReportesComponent implements OnInit {
  todosDocentes: Docente[] = [];
  todosAmbientes: Ambiente[] = [];
  docenteSeleccionado: Docente | null = null;
  ambienteSeleccionado: Ambiente | null = null;
  descargando: Record<string, boolean> = {};

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.api.get<any>('/docentes', { limit: 100 }).subscribe({
      next: (r: any) => {
        this.todosDocentes = r?.data?.items ?? [];
      },
    });

    this.api.get<any>('/ambientes', { limit: 100, activo: 'true' }).subscribe({
      next: (r: any) => {
        this.todosAmbientes = r?.data?.items ?? r?.data ?? [];
      },
    });
  }

  descargar(
    reportKey: string,
    path: string,
    params?: Record<string, string>,
  ): void {
    this.descargando[reportKey] = true;
    this.api.getBlob(path, params).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${reportKey}-${this.periodoService.periodo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.descargando[reportKey] = false;
      },
      error: () => {
        this.snackBar.open('Error al generar el reporte', 'Cerrar', {
          duration: 3000,
        });
        this.descargando[reportKey] = false;
      },
    });
  }

  descargarDocente(): void {
    if (!this.docenteSeleccionado) {
      this.snackBar.open('Seleccione un docente', 'OK', { duration: 2000 });
      return;
    }
    this.descargar(
      'docente',
      `/reportes/docente/${this.docenteSeleccionado.id}/pdf`,
      { periodo: this.periodoService.periodo },
    );
  }

  descargarAmbiente(): void {
    if (!this.ambienteSeleccionado) {
      this.snackBar.open('Seleccione un ambiente', 'OK', { duration: 2000 });
      return;
    }
    this.descargar(
      'ambiente',
      `/reportes/ambiente/${this.ambienteSeleccionado.id}/pdf`,
      { periodo: this.periodoService.periodo },
    );
  }

  descargarOperacional(): void {
    this.descargar('operacional', '/reportes/operacional/pdf', {
      periodo: this.periodoService.periodo,
    });
  }

  descargarGestion(): void {
    this.descargar('gestion', '/reportes/gestion/pdf', {
      periodo: this.periodoService.periodo,
    });
  }

  descargarF01Cad(): void {
    if (!this.docenteSeleccionado) {
      this.snackBar.open('Seleccione un docente', 'OK', { duration: 2000 });
      return;
    }
    this.descargar(
      'f01-cad',
      `/reportes/f01-cad/${this.docenteSeleccionado.id}/pdf`,
      { periodo: this.periodoService.periodo },
    );
  }

  descargarConsolidadoCarga(): void {
    this.descargar('consolidado-carga', '/reportes/consolidado-carga/pdf', {
      periodo: this.periodoService.periodo,
    });
  }

  descargarCargaPorModalidad(): void {
    this.descargar('carga-por-modalidad', '/reportes/carga-por-modalidad/pdf', {
      periodo: this.periodoService.periodo,
    });
  }

  descargarConsolidadoExcel(): void {
    this.descargar('consolidado-excel', '/reportes/consolidado-carga/excel', {
      periodo: this.periodoService.periodo,
    });
  }

  descargarGestionCarga(): void {
    this.descargar('gestion-carga', '/reportes/gestion/carga/pdf', {
      periodo: this.periodoService.periodo,
    });
  }

  descargarCumplimiento(): void {
    this.descargar('cumplimiento', '/reportes/gestion/cumplimiento/pdf', {
      periodo: this.periodoService.periodo,
    });
  }

  descargarEjecutivo(): void {
    this.descargar('ejecutivo', '/reportes/gestion/ejecutivo/pdf', {
      periodo: this.periodoService.periodo,
    });
  }
}
