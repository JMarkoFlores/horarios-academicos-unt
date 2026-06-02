import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { DiasActivosService } from '../../core/services/dias-activos.service';
import { ApiResponse, HorarioAsignado } from '../../core/interfaces/entities';

export interface CeldaHorario {
  asig: HorarioAsignado | null;
  rowspan: number;
  skip: boolean;
  esAlmuerzo: boolean;
}

@Component({
  selector: 'app-docente-horario',
  templateUrl: './docente-horario.component.html',
  styleUrls: ['./docente-horario.component.scss'],
})
export class DocenteHorarioComponent implements OnInit, OnDestroy {
  dias: string[] = [];
  diasNum: number[] = [];
  horas = Array.from({ length: 15 }, (_, i) => i + 7);

  asignaciones: HorarioAsignado[] = [];
  docenteInfo: {
    id: number;
    nombres: string;
    apellidos: string;
    codigo: string;
    email: string;
    categoria: string;
  } | null = null;
  loading = false;
  descargandoPdf = false;
  descargandoExcel = false;
  descargandoIcal = false;

  almuerzoInicio = 12;
  almuerzoFin = 14;

  private _gridCache: Map<string, CeldaHorario> = new Map();
  private periodSub?: Subscription;

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
    private diasActivosService: DiasActivosService,
  ) {}

  ngOnInit(): void {
    this.diasActivosService.cargar().subscribe(() => {
      this.dias = this.diasActivosService.nombres;
      this.diasNum = this.diasActivosService.numeros;
      this._buildGrid();
    });
    this.dias = this.diasActivosService.nombres;
    this.diasNum = this.diasActivosService.numeros;
    this.cargarBloqueAlmuerzo();
    this.cargarHorario();
    this.periodSub = this.periodoService.periodo$.subscribe(() => {
      this._gridCache.clear();
      this.cargarBloqueAlmuerzo();
      this.cargarHorario();
    });
  }

  ngOnDestroy(): void {
    this.periodSub?.unsubscribe();
  }

  cargarBloqueAlmuerzo(): void {
    this.api
      .get<ApiResponse<any>>('/configuracion/restricciones', {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (r) => {
          const lista: any[] = r.data ?? [];
          const almuerzo = lista.find(
            (x) => x.tipo_restriccion === 'BLOQUE_ALMUERZO' && x.activo,
          );
          if (almuerzo?.valor?.hora_inicio && almuerzo?.valor?.hora_fin) {
            this.almuerzoInicio = parseInt(
              almuerzo.valor.hora_inicio.split(':')[0],
              10,
            );
            this.almuerzoFin = parseInt(
              almuerzo.valor.hora_fin.split(':')[0],
              10,
            );
            this._buildGrid();
          }
        },
      });
  }

  cargarHorario(): void {
    this.loading = true;
    this._gridCache.clear();
    this.api
      .get<ApiResponse<any>>('/horarios/mis-horarios', {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (r) => {
          const result = r.data;
          const raw: HorarioAsignado[] = result?.horarios ?? result?.items ?? r.data ?? [];
          this.docenteInfo = result?.docente ?? null;

          this.asignaciones = raw.map((a) => {
            const diaVal: number = (a as any).dia ?? a.dia_semana;
            return {
              ...a,
              dia_semana: diaVal,
              hora_inicio: this.normalizeHora(a.hora_inicio),
              hora_fin: this.normalizeHora(a.hora_fin),
            };
          });
          this._buildGrid();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private normalizeHora(hora: string | undefined): string {
    if (!hora) return '';
    return hora.length >= 5 ? hora.substring(0, 5) : hora;
  }

  private fmtHStr(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  private _buildGrid(): void {
    this._gridCache.clear();
    for (const dia of this.diasNum) {
      for (const hora of this.horas) {
        const key = `${dia}_${hora}`;
        const asig =
          this.asignaciones.find(
            (a) => a.dia_semana === dia && a.hora_inicio === this.fmtHStr(hora),
          ) ?? null;
        let rowspan = 1;
        if (asig?.hora_fin) {
          const finH = parseInt(asig.hora_fin.split(':')[0], 10);
          rowspan = Math.max(1, finH - hora);
        }
        const esAlmuerzo =
          hora >= this.almuerzoInicio && hora < this.almuerzoFin && !asig;
        this._gridCache.set(key, { asig, rowspan, skip: false, esAlmuerzo });
      }
      for (const hora of this.horas) {
        const key = `${dia}_${hora}`;
        const cell = this._gridCache.get(key)!;
        if (cell.asig && cell.rowspan > 1) {
          for (let s = 1; s < cell.rowspan; s++) {
            const skipKey = `${dia}_${hora + s}`;
            const sc = this._gridCache.get(skipKey);
            if (sc) sc.skip = true;
          }
        }
      }
    }
  }

  getCell(dia: number, hora: number): CeldaHorario {
    return (
      this._gridCache.get(`${dia}_${hora}`) ?? {
        asig: null,
        rowspan: 1,
        skip: false,
        esAlmuerzo: false,
      }
    );
  }

  cls(dia: number, hora: number): string {
    const cell = this.getCell(dia, hora);
    if (!cell.asig) return cell.esAlmuerzo ? 'celda-almuerzo' : 'celda-vacia';
    return cell.asig.tipo_clase === 'LABORATORIO'
      ? 'celda-lab'
      : 'celda-teoria';
  }

  esAlmuerzoHora(hora: number): boolean {
    return hora >= this.almuerzoInicio && hora < this.almuerzoFin;
  }

  fmtH(h: number): string {
    return this.fmtHStr(h);
  }

  get horasAsignadas(): number {
    return this.asignaciones.length;
  }

  get totalHorasSemanales(): number {
    return this.asignaciones.reduce((acc, a) => {
      if (!a.hora_inicio || !a.hora_fin) return acc + 1;
      const ini = parseInt(a.hora_inicio.split(':')[0], 10);
      const fin = parseInt(a.hora_fin.split(':')[0], 10);
      return acc + (fin - ini);
    }, 0);
  }

  descargarPdf(): void {
    this.descargandoPdf = true;
    this.api
      .getBlob('/reportes/mi-horario/pdf', {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario-docente-${this.periodoService.periodo}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.descargandoPdf = false;
        },
        error: () => {
          this.snackBar.open('Error al descargar PDF', 'Cerrar', {
            duration: 3000,
          });
          this.descargandoPdf = false;
        },
      });
  }

  descargarExcel(): void {
    this.descargandoExcel = true;
    this.api
      .getBlob('/reportes/mi-horario/excel', {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario-docente-${this.periodoService.periodo}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.descargandoExcel = false;
        },
        error: () => {
          this.snackBar.open('Error al descargar Excel', 'Cerrar', {
            duration: 3000,
          });
          this.descargandoExcel = false;
        },
      });
  }

  descargarIcal(): void {
    this.descargandoIcal = true;
    this.api
      .getBlob('/horarios/mis-horarios/ical', {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario_${this.periodoService.periodo}.ics`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.descargandoIcal = false;
        },
        error: () => {
          this.snackBar.open('Error al descargar iCalendar', 'Cerrar', {
            duration: 3000,
          });
          this.descargandoIcal = false;
        },
      });
  }
}
