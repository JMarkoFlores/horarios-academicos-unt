import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { ChartData, ChartOptions } from 'chart.js';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { ApiResponse, KPIs, ConflictoAsignacion } from '../../core/interfaces/entities';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  kpis: KPIs | null = null;
  conflictos: ConflictoAsignacion[] = [];
  loading = false;
  generando = false;
  private sub!: Subscription;

  conflictosColumns = ['tipo', 'descripcion', 'periodo', 'acciones'];

  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  doughnutData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { position: 'right' } },
  };

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.sub = this.periodoService.periodo$.subscribe(() => this.loadAll());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadAll(): void {
    this.loadKPIs();
    this.loadConflictos();
  }

  loadKPIs(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<KPIs>>('/dashboard/kpis', { periodo: this.periodoService.periodo })
      .subscribe({
        next: res => {
          this.kpis = res.data;
          this.buildCharts(res.data);
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
  }

  loadConflictos(): void {
    this.api
      .get<ApiResponse<ConflictoAsignacion[]>>(`/horarios/conflictos/${this.periodoService.periodo}`)
      .subscribe({ next: res => (this.conflictos = res.data.filter(c => !c.resuelto)) });
  }

  buildCharts(k: KPIs): void {
    this.barChartData = {
      labels: k.distribucion_por_categoria.map(d => d.categoria),
      datasets: [
        { data: k.distribucion_por_categoria.map(d => d.total), label: 'Total', backgroundColor: '#90CAF9' },
        { data: k.distribucion_por_categoria.map(d => d.con_horario), label: 'Con Horario', backgroundColor: '#1565C0' },
      ],
    };

    this.doughnutData = {
      labels: ['Aulas Ocupadas', 'Aulas Libres', 'Labs Ocupados', 'Labs Libres'],
      datasets: [{
        data: [
          k.aulas_ocupadas,
          k.total_aulas - k.aulas_ocupadas,
          k.laboratorios_ocupados,
          k.total_laboratorios - k.laboratorios_ocupados,
        ],
        backgroundColor: ['#1565C0', '#BBDEFB', '#FF6F00', '#FFE0B2'],
      }],
    };
  }

  generarHorario(): void {
    if (!confirm(`¿Generar horario para el período ${this.periodoService.periodo}? Esta acción sobrescribirá asignaciones existentes.`)) return;
    this.generando = true;
    this.api
      .post<ApiResponse<any>>('/horarios/generar', { periodo: this.periodoService.periodo })
      .subscribe({
        next: res => {
          this.snackBar.open(res.message, 'OK', { duration: 4000 });
          this.generando = false;
          this.loadAll();
        },
        error: () => { this.generando = false; },
      });
  }

  resolverConflicto(id: number): void {
    this.api.patch<ApiResponse<any>>(`/horarios/conflictos/${id}/resolver`, {}).subscribe({
      next: () => {
        this.snackBar.open('Conflicto resuelto', 'OK', { duration: 2000 });
        this.loadConflictos();
        this.loadKPIs();
      },
    });
  }
}
