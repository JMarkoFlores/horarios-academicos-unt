import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { ChartData, ChartOptions } from 'chart.js';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { SocketService } from '../../core/services/socket.service';
import { TranslateService } from '@ngx-translate/core';
import { ApiResponse, KPIs, MisKPIs, ConflictoAsignacion, CargaResumen, CargaDepartamento, CargaEstado, CargaTopDocente, CargaAvance } from '../../core/interfaces/entities';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  kpis: KPIs | null = null;
  misKpis: MisKPIs | null = null;
  conflictos: ConflictoAsignacion[] = [];
  loading = signal(false);
  firstLoadDone = signal(false);
  error = false;
  errorMessage = '';
  generando = false;
  compactMode = signal(false);
  private sub!: Subscription;
  private dashSub!: Subscription;
  private langSub!: Subscription;
  private _heatmapCache = new Map<string, { color: string; tooltip: string }>();
  private _themeObserver?: MutationObserver;

  // ── Carga Académica state ──
  activeTab = signal<'horarios' | 'carga'>('horarios');
  cargaResumen: CargaResumen | null = null;
  cargaDepartamentos: CargaDepartamento[] = [];
  cargaEstados: CargaEstado[] = [];
  cargaTopDocentes: CargaTopDocente[] = [];
  cargaAvance: CargaAvance[] = [];
  cargaLoading = signal(false);
  selectedDeptCarga: number | null = null;

  funnelChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  funnelChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8, titleFont: { family: "'Inter', sans-serif", size: 13 }, bodyFont: { family: "'Inter', sans-serif", size: 12 } },
    },
    scales: { y: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif", size: 10 } } }, x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: "'Inter', sans-serif", size: 10 } } } },
  };

  deptBarChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  deptBarChartOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', font: { family: "'Inter', sans-serif", size: 11, weight: 500 } } },
      tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8, titleFont: { family: "'Inter', sans-serif", size: 13 }, bodyFont: { family: "'Inter', sans-serif", size: 12 } },
    },
    scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: "'Inter', sans-serif", size: 11 } } }, x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif", size: 11 } } } },
  };

  avanceChartData: ChartData<'line'> = { labels: [], datasets: [] };
  avanceChartOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', font: { family: "'Inter', sans-serif", size: 11, weight: 500 } } },
      tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8, titleFont: { family: "'Inter', sans-serif", size: 13 }, bodyFont: { family: "'Inter', sans-serif", size: 12 } },
    },
    scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: "'Inter', sans-serif", size: 11 } } }, x: { grid: { display: false }, ticks: { maxRotation: 45, font: { family: "'Inter', sans-serif", size: 10 } } } },
  };

  topDocentesColumns = ['posicion', 'nombre', 'categoria', 'horasLectivas', 'horasNoLectivas', 'totalHoras', 'estado'];
  deptColumns = ['departamento', 'totalDocentes', 'horasLectivas', 'promedio'];

  readonly rol = this.authService.getUsuarioActual()?.rol ?? '';
  readonly usuario = this.authService.getUsuarioActual();

  isAdmin(): boolean { return this.rol === 'administradorsistema'; }
  isCoord(): boolean { return this.rol === 'coordinadoracademico'; }
  isDirector(): boolean { return this.rol === 'directorescuela'; }
  isDocente(): boolean { return this.rol === 'docente'; }
  isSecretaria(): boolean { return this.rol === 'secretaria'; }
  isAdminOrCoord(): boolean { return this.isAdmin() || this.isCoord(); }
  canViewFullDashboard(): boolean { return this.isAdminOrCoord() || this.isDirector(); }
  canGenerateHorario(): boolean { return this.isAdminOrCoord(); }

  conflictosColumns = ['tipo', 'descripcion', 'periodo', 'acciones'];
  ambienteColumns = ['codigo', 'tipo', 'capacidad', 'porcentaje'];
  diasSemana = signal<string[]>([]);
  horasRango = Array.from(
    { length: 15 },
    (_, i) => {
      const h = String(i + 7).padStart(2, '0');
      const next = String(i + 8).padStart(2, '0');
      return `${h}:00-${next}:00`;
    },
  );

  greeting = signal('');
  currentDate = signal('');

  displayKPIs: {
    total_docentes: number;
    docentes_con_horario: number;
    porcentaje_docentes_asignados: number;
    aulas_ocupadas: number;
    total_aulas: number;
    porcentaje_ocupacion_aulas: number;
    conflictos_activos: number;
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
      legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { family: "'Inter', sans-serif", size: 12, weight: 500 } } },
      tooltip: { backgroundColor: '#1e293b', titleFont: { family: "'Inter', sans-serif", size: 13 }, bodyFont: { family: "'Inter', sans-serif", size: 12 }, padding: 12, cornerRadius: 8, displayColors: true },
    },
    scales: { y: { beginAtZero: true, grid: { display: true, color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: "'Inter', sans-serif", size: 11 } } }, x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif", size: 11 } } } },
  };

  doughnutData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: 0,
    layout: { padding: 10 },
    plugins: {
      legend: { position: 'right', align: 'center', labels: { usePointStyle: true, pointStyle: 'circle', padding: 15, font: { family: "'Inter', sans-serif", size: 11, weight: 500 } } },
      tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8, titleFont: { family: "'Inter', sans-serif", size: 13, weight: 'bold' }, bodyFont: { family: "'Inter', sans-serif", size: 12 } },
    },
    animation: { animateRotate: true, animateScale: true, duration: 1000, easing: 'easeOutQuart' },
  };

  private getLocaleCode(lang: string): string {
    const locales: Record<string, string> = {
      es: 'es-PE',
      en: 'en-US',
      pt: 'pt-BR'
    };
    return locales[lang] || 'es-PE';
  }

  private setGreeting(): void {
    const hour = new Date().getHours();
    let key = 'dashboard.greetings.evening';
    if (hour < 12) key = 'dashboard.greetings.morning';
    else if (hour < 19) key = 'dashboard.greetings.afternoon';
    this.translate.get(key).subscribe(text => this.greeting.set(text));
  }

  private setCurrentDate(): void {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const locale = this.getLocaleCode(this.translate.currentLang);
    this.currentDate.set(new Intl.DateTimeFormat(locale, options).format(new Date()));
  }

  private setDiasSemana(): void {
    const keys = ['dashboard.days.lunes', 'dashboard.days.martes', 'dashboard.days.miercoles', 'dashboard.days.jueves', 'dashboard.days.viernes'];
    this.translate.get(keys).subscribe(translations => {
      this.diasSemana.set([
        translations['dashboard.days.lunes'],
        translations['dashboard.days.martes'],
        translations['dashboard.days.miercoles'],
        translations['dashboard.days.jueves'],
        translations['dashboard.days.viernes']
      ]);
      this._heatmapCache.clear();
    });
  }

  private updateChartsLabels(): void {
    this.translate.get([
      'dashboard.totalTeachers',
      'dashboard.assigned',
      'dashboard.teachersWithSchedule',
      'dashboard.classroomOccupancy',
      'dashboard.aulasOcupadas',
      'dashboard.aulasLibres',
      'dashboard.labsOcupados',
      'dashboard.labsLibres'
    ]).subscribe(translations => {
      if (this.misKpis) {
        this.buildDocenteCharts(this.misKpis);
      }
      if (this.kpis) {
        this.buildCharts(this.kpis);
      }
    });
  }

  ngOnInit(): void {
    this.setGreeting();
    this.setCurrentDate();
    this.setDiasSemana();
    this.sub = this.periodoService.periodo$.subscribe(() => this.loadAll());
    this.dashSub = this.socketService.dashboardKpiUpdate$.subscribe(() => this.loadKPIs());
    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.setGreeting();
      this.setCurrentDate();
      this.setDiasSemana();
      this.updateChartsLabels();
    });
    // Limpiar cache del heatmap cuando cambia el tema (dark/light)
    this._themeObserver = new MutationObserver(() => this._heatmapCache.clear());
    this._themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  constructor(
    private api: ApiService,
    private authService: AuthService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
    private socketService: SocketService,
    public translate: TranslateService
  ) {}

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.dashSub?.unsubscribe();
    this.langSub?.unsubscribe();
    this._themeObserver?.disconnect();
    this.socketService.unsubscribeDashboardPeriodo(this.periodoService.periodo);
  }

  loadAll(): void {
    this.error = false;
    this.errorMessage = '';
    this.firstLoadDone.set(true);
    this.socketService.connectDashboard(this.periodoService.periodo);
    if (this.isDocente()) {
      this.loadMisKPIs();
    } else {
      this.loadKPIs();
      this.loadConflictos();
    }
  }

  loadMisKPIs(): void {
    this.loading.set(true);
    this.api.get<ApiResponse<MisKPIs>>('/dashboard/mis-kpis', { periodo: this.periodoService.periodo })
      .subscribe({
        next: (res) => { 
          this.misKpis = res.data; 
          this.buildDocenteCharts(res.data); 
          this.loading.set(false); 
        },
        error: (err) => { 
          this.loading.set(false); 
          this.error = true; 
          this.translate.get('dashboard.errorLoading').subscribe(text => this.errorMessage = err?.error?.message || text); 
        },
      });
  }

  private buildDocenteCharts(k: MisKPIs): void {
    const barColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    this.translate.get('dashboard.courses').subscribe(label => {
      this.barChartData = {
        labels: k.distribucion_dia.map((d) => {
          const dayKey = `dashboard.days.${d.dia.toLowerCase().replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('á', 'a')}`;
          return this.translate.instant(dayKey);
        }),
        datasets: [{
          data: k.distribucion_dia.map((d) => d.horas), 
          label: this.translate.instant('dashboard.courses'),
          backgroundColor: k.distribucion_dia.map((_, i) => barColors[i % barColors.length] + '80'),
          hoverBackgroundColor: k.distribucion_dia.map((_, i) => barColors[i % barColors.length]),
          borderRadius: 4, borderWidth: { right: 4, top: 4 },
          borderColor: k.distribucion_dia.map((_, i) => barColors[i % barColors.length]),
        }],
      };
    });
  }

  loadKPIs(): void {
    this.loading.set(true);
    this.api.get<ApiResponse<KPIs>>('/dashboard/kpis', { periodo: this.periodoService.periodo })
      .subscribe({
        next: (res) => {
          this.kpis = res.data;
          this._heatmapCache.clear();
          this.displayKPIs = {
            total_docentes: res.data.total_docentes,
            docentes_con_horario: res.data.docentes_con_horario,
            porcentaje_docentes_asignados: res.data.porcentaje_docentes_asignados,
            aulas_ocupadas: res.data.aulas_ocupadas,
            total_aulas: res.data.total_aulas,
            porcentaje_ocupacion_aulas: res.data.porcentaje_ocupacion_aulas,
            conflictos_activos: res.data.conflictos_activos,
          };
          this.buildCharts(res.data);
          this.loading.set(false);
          this.firstLoadDone.set(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.firstLoadDone.set(true);
          this.error = true;
          this.translate.get('dashboard.errorLoading').subscribe(text => {
            this.errorMessage = err?.error?.message || text;
            this.snackBar.open(this.errorMessage, this.translate.instant('common.close'), { duration: 3000 });
          });
        },
      });
  }

  loadConflictos(): void {
    this.api.get<ApiResponse<any>>(`/horarios/conflictos/${this.periodoService.periodo}`)
      .subscribe({
        next: (res: any) => {
          const rawData = res.data?.items ?? res.data ?? [];
          this.conflictos = Array.isArray(rawData) ? rawData.filter((c: any) => !c.resuelto) : [];
        },
        error: (err) => { 
          this.error = true; 
          this.translate.get('dashboard.errorLoading').subscribe(text => {
            this.errorMessage = err?.error?.message || text;
            this.snackBar.open(this.errorMessage, this.translate.instant('common.close'), { duration: 3000 });
          }); 
        },
      });
  }

  buildCharts(k: KPIs): void {
    const vibrantColors = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#06b6d4'];
    const darkerColors = ['#c2410c', '#15803d', '#1d4ed8', '#7e22ce', '#a16207', '#be185d', '#0e7490'];

    this.translate.get([
      'dashboard.totalTeachers',
      'dashboard.teachersWithSchedule',
      'dashboard.aulasOcupadas',
      'dashboard.aulasLibres',
      'dashboard.labsOcupados',
      'dashboard.labsLibres'
    ]).subscribe(translations => {
      this.barChartData = {
        labels: k.distribucion_por_categoria.map((d) => d.categoria),
        datasets: [
          {
            data: k.distribucion_por_categoria.map((d) => d.total), 
            label: translations['dashboard.totalTeachers'],
            backgroundColor: k.distribucion_por_categoria.map((_, i) => vibrantColors[i % vibrantColors.length] + '80'),
            hoverBackgroundColor: k.distribucion_por_categoria.map((_, i) => vibrantColors[i % vibrantColors.length]),
            borderRadius: 4, borderWidth: { right: 4, top: 4 },
            borderColor: k.distribucion_por_categoria.map((_, i) => darkerColors[i % darkerColors.length]),
          },
          {
            data: k.distribucion_por_categoria.map((d) => d.con_horario), 
            label: translations['dashboard.teachersWithSchedule'],
            backgroundColor: k.distribucion_por_categoria.map((_, i) => vibrantColors[i % vibrantColors.length]),
            hoverBackgroundColor: k.distribucion_por_categoria.map((_, i) => darkerColors[i % darkerColors.length]),
            borderRadius: 4, borderWidth: { right: 4, top: 4 },
            borderColor: k.distribucion_por_categoria.map((_, i) => darkerColors[i % darkerColors.length]),
          },
        ],
      };

      this.doughnutData = {
        labels: [
          translations['dashboard.aulasOcupadas'], 
          translations['dashboard.aulasLibres'], 
          translations['dashboard.labsOcupados'], 
          translations['dashboard.labsLibres']
        ],
        datasets: [{
          data: [k.aulas_ocupadas, k.total_aulas - k.aulas_ocupadas, k.laboratorios_ocupados, k.total_laboratorios - k.laboratorios_ocupados],
          backgroundColor: ['#f97316', '#3b82f6', '#22c55e', '#a855f7'],
          hoverBackgroundColor: ['#ea580c', '#2563eb', '#16a34a', '#9333ea'],
          borderWidth: 3, borderColor: '#ffffff', hoverOffset: 30, offset: 4,
        }],
      };
    });
  }

  switchTab(tab: 'horarios' | 'carga'): void {
    this.activeTab.set(tab);
    if (tab === 'carga' && !this.cargaResumen) {
      this.loadCargaKPIs();
    }
  }

  loadCargaKPIs(): void {
    this.cargaLoading.set(true);
    const periodo = this.periodoService.periodo;
    this.api.get<ApiResponse<CargaResumen>>('/dashboard/carga/resumen', { periodo }).subscribe({
      next: (res) => {
        this.cargaResumen = res.data;
        this.cargaLoading.set(false);
      },
      error: () => { this.cargaLoading.set(false); },
    });
    this.api.get<ApiResponse<CargaDepartamento[]>>('/dashboard/carga/departamentos', { periodo }).subscribe({
      next: (res) => { this.cargaDepartamentos = res.data; this.buildDeptChart(res.data); },
    });
    this.api.get<ApiResponse<CargaEstado[]>>('/dashboard/carga/estados', { periodo }).subscribe({
      next: (res) => { this.cargaEstados = res.data; this.buildFunnelChart(res.data); },
    });
    this.api.get<ApiResponse<CargaTopDocente[]>>('/dashboard/carga/top-docentes', { periodo, limit: '10' }).subscribe({
      next: (res) => { this.cargaTopDocentes = res.data; },
    });
    this.api.get<ApiResponse<CargaAvance[]>>('/dashboard/carga/avance', { periodo }).subscribe({
      next: (res) => { this.cargaAvance = res.data; this.buildAvanceChart(res.data); },
    });
  }

  get filteredTopDocentes(): CargaTopDocente[] {
    if (!this.selectedDeptCarga) return this.cargaTopDocentes;
    return this.cargaTopDocentes.filter((d) => d.departamento_id === this.selectedDeptCarga);
  }

  get filteredSinDeclarar(): { id: number; nombre: string; email: string; departamento_id: number }[] {
    if (!this.cargaResumen || !this.selectedDeptCarga) return this.cargaResumen?.sin_declaracion ?? [];
    return this.cargaResumen.sin_declaracion.filter((d) => d.departamento_id === this.selectedDeptCarga);
  }

  get departamentosSet(): { id: number; nombre: string }[] {
    const unique = new Map<number, string>();
    for (const d of this.cargaDepartamentos) {
      unique.set(d.departamento_id, d.departamento);
    }
    return [...unique.entries()].map(([id, nombre]) => ({ id, nombre }));
  }

  private buildFunnelChart(estados: CargaEstado[]): void {
    const colors = ['#94a3b8', '#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#10b981', '#64748b'];
    const labels = estados.map((e) => e.label);
    const datos = estados.map((e) => e.count);
    this.funnelChartData = {
      labels,
      datasets: [{
        data: datos,
        backgroundColor: datos.map((_, i) => colors[i % colors.length] + 'CC'),
        borderColor: datos.map((_, i) => colors[i % colors.length]),
        borderWidth: 2, borderRadius: 4,
      }],
    };
  }

  private buildDeptChart(deptos: CargaDepartamento[]): void {
    const sliced = deptos.slice(0, 10);
    this.deptBarChartData = {
      labels: sliced.map((d) => d.codigo),
      datasets: [
        { label: 'Hrs lectivas', data: sliced.map((d) => d.total_horas_lectivas), backgroundColor: '#3b82f680', borderColor: '#3b82f6', borderWidth: 2, borderRadius: 4 },
        { label: 'Hrs no lectivas', data: sliced.map((d) => d.total_horas_no_lectivas), backgroundColor: '#10b98180', borderColor: '#10b981', borderWidth: 2, borderRadius: 4 },
      ],
    };
  }

  private buildAvanceChart(avance: CargaAvance[]): void {
    this.avanceChartData = {
      labels: avance.map((a) => a.fecha),
      datasets: [
        { label: 'Declaraciones', data: avance.map((a) => a.total), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6 },
        { label: 'Enviadas', data: avance.map((a) => a.enviadas), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6 },
      ],
    };
  }

  get estadoDocenteColor(): Record<string, string> {
    return {
      NO_INICIADO: '#94a3b8', BORRADOR: '#f59e0b', PENDIENTE_ENVIO: '#f97316',
      ENVIADO_DOCENTE: '#3b82f6', OBSERVADO_DPTO: '#ef4444', SUBSANADO: '#a855f7',
      VALIDADO_DPTO: '#06b6d4', OBSERVADO_FACULTAD: '#ef4444', APROBADO_FACULTAD: '#10b981',
      CERRADO: '#64748b', ANULADO: '#6b7280',
    };
  }

  generarHorario(): void {
    this.translate.get('dashboard.confirmGenerateSchedule', { periodo: this.periodoService.periodo })
      .subscribe(message => {
        if (!confirm(message)) return;
        this.generando = true;
        this.api.post<ApiResponse<any>>('/horarios/generar', { periodo: this.periodoService.periodo })
          .subscribe({
            next: (res) => { 
              this.snackBar.open(res.message, 'OK', { duration: 4000 }); 
              this.generando = false; 
              this.loadAll(); 
            },
            error: () => { 
              this.generando = false; 
              this.translate.get('dashboard.errorLoading').subscribe(msg => 
                this.snackBar.open(msg, this.translate.instant('common.close'), { duration: 3000 })
              ); 
            },
          });
      });
  }

  resolverConflicto(id: number): void {
    this.api.patch<ApiResponse<any>>(`/horarios/conflictos/${id}/resolver`, {})
      .subscribe({
        next: () => { 
          this.translate.get('common.success').subscribe(msg => 
            this.snackBar.open(msg, 'OK', { duration: 2000 })
          ); 
          this.loadConflictos(); 
          this.loadKPIs(); 
        },
        error: () => { 
          this.translate.get('dashboard.errorLoading').subscribe(msg => 
            this.snackBar.open(msg, this.translate.instant('common.close'), { duration: 3000 })
          ); 
        },
      });
  }

  private _buildHeatmapCache(): void {
    if (!this.kpis?.mapa_calor || this._heatmapCache.size > 0) return;
    for (const cell of this.kpis.mapa_calor) {
      const key = `${cell.dia}|${cell.hora}`;
      const dayKey = `dashboard.days.${cell.dia.toLowerCase().replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('á', 'a')}`;
      const translatedDay = this.translate.instant(dayKey);
      const isDark = document.body.classList.contains('dark-theme');
      if (cell.intensidad === 0) {
        this._heatmapCache.set(key, { 
          color: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', 
          tooltip: this.translate.instant('dashboard.noClasses') 
        });
        continue;
      }
      // Alpha: mínimo 0.45, máximo 1.0 para máxima visibilidad
      const alpha = 0.45 + (0.55 * Math.min(1, cell.intensidad / 100));
      // En dark mode usamos colores más luminosos para contrastar con el fondo oscuro
      const color = isDark
        ? cell.tipo_clase === 'LABORATORIO'
          ? `rgba(52, 231, 120, ${alpha})`
          : cell.tipo_clase === 'MIXTO'
          ? `rgba(196, 108, 255, ${alpha})`
          : `rgba(96, 165, 250, ${alpha})`
        : cell.tipo_clase === 'LABORATORIO'
          ? `rgba(22, 163, 74, ${alpha})`
          : cell.tipo_clase === 'MIXTO'
          ? `rgba(147, 51, 234, ${alpha})`
          : `rgba(37, 99, 235, ${alpha})`;
      const cursosStr = cell.cursos?.length ? `\n${cell.cursos.join(', ')}` : '';
      let tipoClase = this.translate.instant('dashboard.classTypes.teoria');
      if (cell.tipo_clase === 'LABORATORIO') tipoClase = this.translate.instant('dashboard.classTypes.laboratorio');
      if (cell.tipo_clase === 'MIXTO') tipoClase = this.translate.instant('dashboard.classTypes.mixto');
      const tooltip = `${translatedDay} ${cell.hora} — ${tipoClase}${cursosStr}`;
      this._heatmapCache.set(key, { color, tooltip });
    }
  }

  private _startHour(hora: string): string {
    return hora.split('-')[0];
  }

  getHeatmapColor(dia: string, hora: string): string {
    this._buildHeatmapCache();
    return this._heatmapCache.get(`${dia}|${this._startHour(hora)}`)?.color ?? 'transparent';
  }

  getHeatmapTooltip(dia: string, hora: string): string {
    this._buildHeatmapCache();
    return this._heatmapCache.get(`${dia}|${this._startHour(hora)}`)?.tooltip ?? '';
  }

  estadoPeriodoTexto(estado: string): string {
    const key = `dashboard.periodStates.${estado}`;
    return this.translate.instant(key);
  }

  progresoPeriodo(): number {
    if (!this.kpis?.fecha_inicio_periodo || !this.kpis?.fecha_fin_periodo) return 0;
    const start = new Date(this.kpis.fecha_inicio_periodo).getTime();
    const end = new Date(this.kpis.fecha_fin_periodo).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  tendenciaIcon(valor?: number): string {
    if (valor === undefined || valor === null) return 'remove';
    if (valor > 0) return 'trending_up';
    if (valor < 0) return 'trending_down';
    return 'remove';
  }

  tendenciaColor(valor?: number, invert = false): string {
    if (valor === undefined || valor === null) return 'var(--text-muted)';
    const positivo = invert ? valor < 0 : valor > 0;
    if (valor > 0) return positivo ? '#10b981' : '#ef4444';
    if (valor < 0) return positivo ? '#10b981' : '#ef4444';
    return 'var(--text-muted)';
  }
}
