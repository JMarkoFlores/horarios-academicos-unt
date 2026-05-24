import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { forkJoin, map, Observable, startWith, Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { ApiResponse, Docente } from '../../core/interfaces/entities';
import {
  DiaActivo,
  DisponibilidadService,
  TurnoHorario,
} from '../disponibilidad/disponibilidad.service';
import { SharedModule } from '../../shared/shared.module';
import { NgChartsModule } from 'ng2-charts';

type CargaPorDia = {
  lunes: number;
  martes: number;
  miercoles: number;
  jueves: number;
  viernes: number;
  sabado: number;
  totalHoras?: number;
  promedioHorasPorDia?: number;
};

type DocenteCargaDesequilibrada = {
  docenteId: number;
  nombre: string;
  distribucion: CargaPorDia;
  desequilibrio: number;
};

type HeatmapSlot = {
  dia_semana?: number;
  dia?: number;
  hora_inicio?: string;
  hora_fin?: string;
  hora?: string;
  total?: number;
  conteo?: number;
  cantidad?: number;
  count?: number;
};

const DIAS_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const UMBRAL_DESEQUILIBRIO = 4;

@Component({
  selector: 'app-analisis-carga',
  standalone: true,
  imports: [SharedModule, NgChartsModule],
  templateUrl: './analisis-carga.component.html',
  styleUrls: ['./analisis-carga.component.scss'],
})
export class AnalisisCargaComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  docenteControl = new FormControl<Docente | string | null>(null);
  filteredDocentes$!: Observable<Docente[]>;
  docentes: Docente[] = [];
  selectedDocente: Docente | null = null;

  cargaPorDia: CargaPorDia | null = null;
  desequilibrados: DocenteCargaDesequilibrada[] = [];
  displayedColumns = ['nombre', 'distribucion', 'desequilibrio'];

  diasActivos: DiaActivo[] = [];
  turnos: TurnoHorario[] = [];
  rawHeatmapData: HeatmapSlot[] = [];

  loadingDocentes = false;
  loadingCarga = false;
  loadingDesequilibrio = false;
  loadingHeatmap = false;

  barChartType: ChartType = 'bar';
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
    plugins: {
      legend: { display: true, position: 'bottom' },
      tooltip: { enabled: true },
    },
  };
  barChartData: ChartData<'bar' | 'line'> = {
    labels: DIAS_LABELS,
    datasets: [],
  };

  private periodSub?: Subscription;

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private disponibilidadService: DisponibilidadService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.periodoService.cargarPeriodos();
    this.filteredDocentes$ = this.docenteControl.valueChanges.pipe(
      startWith(''),
      map((value) => this.filterDocentes(value)),
    );
    this.loadDocentes();
    this.loadDiasYTurnos();

    this.periodSub = this.periodoService.periodo$.subscribe(() => {
      this.loadDesequilibrio();
      this.loadHeatmap();
      if (this.selectedDocente) {
        this.loadCargaPorDia(this.selectedDocente.id);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.periodSub) {
      this.periodSub.unsubscribe();
    }
  }

  onPeriodoChange(periodo: string): void {
    this.periodoService.cambiarPeriodo(periodo);
  }

  displayDocente(docente: Docente | string | null): string {
    if (!docente) return '';
    if (typeof docente === 'string') return docente;
    return `${docente.nombres} ${docente.apellidos}`.trim();
  }

  onDocenteSelected(docente: Docente): void {
    this.selectedDocente = docente;
    this.loadCargaPorDia(docente.id);
  }

  selectDocenteFromRow(row: DocenteCargaDesequilibrada): void {
    const docente = this.docentes.find((d) => d.id === row.docenteId);
    if (docente) {
      this.docenteControl.setValue(docente);
      this.onDocenteSelected(docente);
      return;
    }
    this.api.get<ApiResponse<Docente>>(`/docentes/${row.docenteId}`).subscribe({
      next: (res) => {
        if (res?.data) {
          this.docentes = [...this.docentes, res.data];
          this.docenteControl.setValue(res.data);
          this.onDocenteSelected(res.data);
        }
      },
    });
  }

  getSparklinePoints(distribucion: CargaPorDia): string {
    const values = this.getDistribucionValues(distribucion);
    const width = 120;
    const height = 32;
    const padding = 4;
    const max = Math.max(...values, 1);
    const step = (width - padding * 2) / (values.length - 1);
    return values
      .map((value, index) => {
        const x = padding + step * index;
        const y =
          height - padding - ((value / max) * (height - padding * 2));
        return `${x},${y}`;
      })
      .join(' ');
  }

  getDesequilibrioClass(value: number): string {
    return value > UMBRAL_DESEQUILIBRIO ? 'badge-danger' : 'badge-neutral';
  }

  getHeatmapClass(value: number): string {
    if (value >= 4) return 'heat-strong';
    if (value >= 1) return 'heat-light';
    return 'heat-zero';
  }

  getHeatmapValue(dia: number | undefined, turno: TurnoHorario): number {
    if (!dia) return 0;
    let sum = 0;
    for (const slot of this.rawHeatmapData) {
      const slotDia = slot.dia_semana ?? slot.dia;
      if (
        slotDia === dia &&
        slot.hora_inicio &&
        slot.hora_inicio >= turno.hora_inicio &&
        slot.hora_inicio < turno.hora_fin
      ) {
        sum += Number(slot.total ?? slot.conteo ?? slot.cantidad ?? slot.count ?? 0) || 0;
      }
    }
    return sum;
  }

  formatTurno(turno: TurnoHorario): string {
    return `${turno.hora_inicio.substring(0, 5)} - ${turno.hora_fin.substring(0, 5)}`;
  }

  getHeatmapColumns(): string {
    const total = Math.max(this.diasActivos.length, 1);
    return `120px repeat(${total}, minmax(90px, 1fr))`;
  }

  private loadDocentes(): void {
    this.loadingDocentes = true;
    this.disponibilidadService.obtenerDocentes().subscribe({
      next: (docentes) => {
        this.docentes = docentes;
        this.loadingDocentes = false;
        if (!this.selectedDocente && docentes.length > 0) {
          this.docenteControl.setValue(docentes[0]);
          this.onDocenteSelected(docentes[0]);
        }
      },
      error: () => {
        this.loadingDocentes = false;
        this.snackBar.open('Error al cargar docentes', 'Cerrar', { duration: 3000 });
      },
    });
  }

  private loadCargaPorDia(docenteId: number): void {
    this.loadingCarga = true;
    this.api
      .get<ApiResponse<CargaPorDia>>(`/docentes/${docenteId}/carga-por-dia`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (res) => {
          if (!res.data) {
            this.cargaPorDia = null;
            this.updateChart({
              lunes: 0,
              martes: 0,
              miercoles: 0,
              jueves: 0,
              viernes: 0,
              sabado: 0,
              totalHoras: 0,
              promedioHorasPorDia: 0,
            });
            this.loadingCarga = false;
            return;
          }
          this.cargaPorDia = res.data;
          this.updateChart(res.data);
          this.loadingCarga = false;
        },
        error: () => {
          this.loadingCarga = false;
          this.snackBar.open('Error al cargar la carga por día', 'Cerrar', {
            duration: 3000,
          });
        },
      });
  }

  private loadDesequilibrio(): void {
    this.loadingDesequilibrio = true;
    this.api
      .get<ApiResponse<DocenteCargaDesequilibrada[]>>(
        '/docentes/carga-desequilibrada',
        { periodo: this.periodoService.periodo },
      )
      .subscribe({
        next: (res) => {
          this.desequilibrados = res.data ?? [];
          this.loadingDesequilibrio = false;
        },
        error: () => {
          this.loadingDesequilibrio = false;
          this.snackBar.open('Error al cargar carga desequilibrada', 'Cerrar', {
            duration: 3000,
          });
        },
      });
  }

  private loadDiasYTurnos(): void {
    forkJoin({
      dias: this.disponibilidadService.obtenerDiasActivos(),
      turnos: this.disponibilidadService.obtenerTurnos(),
    }).subscribe({
      next: ({ dias, turnos }) => {
        this.diasActivos = dias.filter((d) => {
          const dia = d.dia_semana ?? 0;
          return dia >= 1 && dia <= 6;
        });
        this.turnos = turnos;
      },
    });
  }

  private loadHeatmap(): void {
    this.loadingHeatmap = true;
    this.api
      .get<ApiResponse<HeatmapSlot[]>>('/horarios/ocupacion-heatmap', {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (res) => {
          this.rawHeatmapData = res.data ?? [];
          this.loadingHeatmap = false;
        },
        error: () => {
          this.loadingHeatmap = false;
          this.rawHeatmapData = [];
          this.snackBar.open('Error al cargar el heatmap de ocupación', 'Cerrar', {
            duration: 3000,
          });
        },
      });
  }

  private updateChart(carga: CargaPorDia): void {
    const values = this.getDistribucionValues(carga);
    const promedio =
      carga.promedioHorasPorDia ??
      values.reduce((sum, value) => sum + value, 0) / values.length;
    this.barChartData = {
      labels: DIAS_LABELS,
      datasets: [
        {
          data: values,
          label: 'Horas por día',
          backgroundColor: '#2563eb',
          borderRadius: 8,
          borderSkipped: false,
        },
        {
          data: values.map(() => promedio),
          label: 'Promedio',
          type: 'line',
          borderColor: '#ef4444',
          borderDash: [6, 6],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
    this.chart?.update();
  }

  private getDistribucionValues(distribucion: CargaPorDia): number[] {
    return [
      distribucion.lunes ?? 0,
      distribucion.martes ?? 0,
      distribucion.miercoles ?? 0,
      distribucion.jueves ?? 0,
      distribucion.viernes ?? 0,
      distribucion.sabado ?? 0,
    ];
  }

  private filterDocentes(value: string | Docente | null): Docente[] {
    const query =
      typeof value === 'string' ? value : value ? this.displayDocente(value) : '';
    const normalized = query.toLowerCase().trim();
    if (!normalized) {
      return this.docentes.slice();
    }
    return this.docentes.filter((docente) => {
      const label = this.displayDocente(docente).toLowerCase();
      const codigo = docente.codigo?.toLowerCase() ?? '';
      return label.includes(normalized) || codigo.includes(normalized);
    });
  }
}
