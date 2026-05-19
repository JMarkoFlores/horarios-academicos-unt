import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { ChartData, ChartOptions } from 'chart.js';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PeriodoService } from '../../core/services/periodo.service';
import {
  ApiResponse,
  KPIs,
  ConflictoAsignacion,
} from '../../core/interfaces/entities';

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
  ambienteColumns = ['codigo', 'tipo', 'capacidad', 'porcentaje'];
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  horasRango = Array.from(
    { length: 15 },
    (_, i) => `${String(i + 7).padStart(2, '0')}:00`,
  );

  greeting = '';
  currentDate = '';

  // KPI values for animation
  displayKPIs: {
    total_docentes: number;
    docentes_con_horario: number;
    porcentaje_docentes_asignados: number;
    aulas_ocupadas: number;
    total_aulas: number;
    porcentaje_ocupacion_aulas: number;
    conflictos_activos: number;
    [key: string]: unknown;
  } = {
    total_docentes: 0,
    docentes_con_horario: 0,
    porcentaje_docentes_asignados: 0,
    aulas_ocupadas: 0,
    total_aulas: 0,
    porcentaje_ocupacion_aulas: 0,
    conflictos_activos: 0,
  };

  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { family: "'Inter', sans-serif", size: 12, weight: 500 },
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: "'Inter', sans-serif", size: 13 },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: true, color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { family: "'Inter', sans-serif", size: 11 } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Inter', sans-serif", size: 11 } },
      },
    },
  };

  doughnutData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: 0,
    layout: {
      padding: 10, // Reducido drásticamente para que el gráfico crezca
    },
    plugins: {
      legend: {
        position: 'right', // Movido a la derecha para formar una columna
        align: 'center',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: { family: "'Inter', sans-serif", size: 11, weight: 500 },
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: "'Inter', sans-serif", size: 13, weight: 'bold' },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeOutQuart',
    },
  };

  ngOnInit(): void {
    this.setGreeting();
    this.setCurrentDate();
    this.sub = this.periodoService.periodo$.subscribe(() => this.loadAll());
  }

  private setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Buenos días';
    else if (hour < 19) this.greeting = 'Buenas tardes';
    else this.greeting = 'Buenas noches';
  }

  private setCurrentDate(): void {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    this.currentDate = new Intl.DateTimeFormat('es-PE', options).format(
      new Date(),
    );
  }

  get usuario() {
    return this.authService.getUsuarioActual();
  }

  constructor(
    private api: ApiService,
    private authService: AuthService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
  ) {}

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
      .get<
        ApiResponse<KPIs>
      >('/dashboard/kpis', { periodo: this.periodoService.periodo })
      .subscribe({
        next: (res) => {
          this.kpis = res.data;
          this.animateCounters(res.data);
          this.buildCharts(res.data);
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private animateCounters(data: KPIs): void {
    const duration = 1500;
    const steps = 60;
    const interval = duration / steps;

    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      this.displayKPIs.total_docentes = Math.round(
        data.total_docentes * progress,
      );
      this.displayKPIs.docentes_con_horario = Math.round(
        data.docentes_con_horario * progress,
      );
      this.displayKPIs.porcentaje_docentes_asignados = Math.round(
        data.porcentaje_docentes_asignados * progress,
      );
      this.displayKPIs.aulas_ocupadas = Math.round(
        data.aulas_ocupadas * progress,
      );
      this.displayKPIs.total_aulas = Math.round(data.total_aulas * progress);
      this.displayKPIs.porcentaje_ocupacion_aulas = Math.round(
        data.porcentaje_ocupacion_aulas * progress,
      );
      this.displayKPIs.conflictos_activos = Math.round(
        data.conflictos_activos * progress,
      );

      if (currentStep === steps) {
        clearInterval(timer);
        this.displayKPIs = { ...data };
      }
    }, interval);
  }

  loadConflictos(): void {
    this.api
      .get<
        ApiResponse<any>
      >(`/horarios/conflictos/${this.periodoService.periodo}`)
      .subscribe({
        next: (res: any) => {
          const rawData = res.data?.items ?? res.data ?? [];
          this.conflictos = Array.isArray(rawData)
            ? rawData.filter((c: any) => !c.resuelto)
            : [];
        },
      });
  }

  buildCharts(k: KPIs): void {
    const vibrantColors = [
      '#f97316', // Orange
      '#22c55e', // Green
      '#3b82f6', // Blue
      '#a855f7', // Purple
      '#eab308', // Yellow
      '#ec4899', // Pink
      '#06b6d4', // Cyan
    ];

    const darkerColors = [
      '#c2410c',
      '#15803d',
      '#1d4ed8',
      '#7e22ce',
      '#a16207',
      '#be185d',
      '#0e7490',
    ];

    this.barChartData = {
      labels: k.distribucion_por_categoria.map((d) => d.categoria),
      datasets: [
        {
          data: k.distribucion_por_categoria.map((d) => d.total),
          label: 'Total',
          backgroundColor: k.distribucion_por_categoria.map(
            (_, i) => vibrantColors[i % vibrantColors.length] + '80',
          ), // 50% opacity
          hoverBackgroundColor: k.distribucion_por_categoria.map(
            (_, i) => vibrantColors[i % vibrantColors.length],
          ),
          borderRadius: 4,
          borderWidth: { right: 4, top: 4 },
          borderColor: k.distribucion_por_categoria.map(
            (_, i) => darkerColors[i % darkerColors.length],
          ),
        },
        {
          data: k.distribucion_por_categoria.map((d) => d.con_horario),
          label: 'Con Horario',
          backgroundColor: k.distribucion_por_categoria.map(
            (_, i) => vibrantColors[i % vibrantColors.length],
          ),
          hoverBackgroundColor: k.distribucion_por_categoria.map(
            (_, i) => darkerColors[i % darkerColors.length],
          ),
          borderRadius: 4,
          borderWidth: { right: 4, top: 4 },
          borderColor: k.distribucion_por_categoria.map(
            (_, i) => darkerColors[i % darkerColors.length],
          ),
        },
      ],
    };

    this.doughnutData = {
      labels: [
        'Aulas Ocupadas',
        'Aulas Libres',
        'Labs Ocupados',
        'Labs Libres',
      ],
      datasets: [
        {
          data: [
            k.aulas_ocupadas,
            k.total_aulas - k.aulas_ocupadas,
            k.laboratorios_ocupados,
            k.total_laboratorios - k.laboratorios_ocupados,
          ],
          backgroundColor: [
            '#f97316', // Naranja intenso (Ocupadas)
            '#3b82f6', // Azul intenso (Libres)
            '#22c55e', // Verde intenso (Labs Ocupados)
            '#a855f7', // Púrpura intenso (Labs Libres)
          ],
          hoverBackgroundColor: ['#ea580c', '#2563eb', '#16a34a', '#9333ea'],
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverOffset: 30, // Aumentado para efecto de "salto" sólido
          offset: 4, // Pequeño espacio entre piezas para simular profundidad
        },
      ],
    };
  }

  generarHorario(): void {
    if (
      !confirm(
        `¿Generar horario para el período ${this.periodoService.periodo}? Esta acción sobrescribirá asignaciones existentes.`,
      )
    )
      return;
    this.generando = true;
    this.api
      .post<
        ApiResponse<any>
      >('/horarios/generar', { periodo: this.periodoService.periodo })
      .subscribe({
        next: (res) => {
          this.snackBar.open(res.message, 'OK', { duration: 4000 });
          this.generando = false;
          this.loadAll();
        },
        error: () => {
          this.generando = false;
        },
      });
  }

  resolverConflicto(id: number): void {
    this.api
      .patch<ApiResponse<any>>(`/horarios/conflictos/${id}/resolver`, {})
      .subscribe({
        next: () => {
          this.snackBar.open('Conflicto resuelto', 'OK', { duration: 2000 });
          this.loadConflictos();
          this.loadKPIs();
        },
      });
  }

  getHeatmapColor(dia: string, hora: string): string {
    if (!this.kpis?.mapa_calor) return 'transparent';
    const cell = this.kpis.mapa_calor.find(
      (c) => c.dia === dia && c.hora === hora,
    );
    if (!cell || cell.intensidad === 0) return 'rgba(0,0,0,0.04)';
    const alpha = Math.min(0.9, cell.intensidad / 100);
    if (cell.tipo_clase === 'LABORATORIO') return `rgba(34, 197, 94, ${alpha})`;
    return `rgba(59, 130, 246, ${alpha})`;
  }

  getHeatmapTooltip(dia: string, hora: string): string {
    if (!this.kpis?.mapa_calor) return '';
    const cell = this.kpis.mapa_calor.find(
      (c) => c.dia === dia && c.hora === hora,
    );
    if (!cell || cell.intensidad === 0) return 'Sin clases';
    return `${dia} ${hora} — Intensidad: ${cell.intensidad}% (${cell.tipo_clase})`;
  }
}
