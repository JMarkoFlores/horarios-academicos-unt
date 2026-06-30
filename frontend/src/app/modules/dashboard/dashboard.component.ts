import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ChartData } from 'chart.js';
import { ApiService } from '../../core/services/api.service';
import { ROLES } from '../../core/constants/roles';
import { AuthService } from '../../core/services/auth.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { SocketService } from '../../core/services/socket.service';
import { TranslateService } from '@ngx-translate/core';
import { DiasActivosService } from '../../core/services/dias-activos.service';
import { ApiResponse, KPIs, MisKPIs, ConflictoAsignacion, CargaResumen, CargaDepartamento, CargaEstado, CargaTopDocente, CargaAvance } from '../../core/interfaces/entities';
import {
  getFunnelChartOptions,
  getDeptBarChartOptions,
  getAvanceChartOptions,
  getBarChartOptions,
  getDoughnutOptions,
} from './dashboard-chart.config';
import { HeatmapDetailsDialogComponent, HeatmapDetailsData } from './heatmap-details-dialog.component';

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
  funnelChartOptions = getFunnelChartOptions();

  deptBarChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  deptBarChartOptions = getDeptBarChartOptions();

  avanceChartData: ChartData<'line'> = { labels: [], datasets: [] };
  avanceChartOptions = getAvanceChartOptions();

  topDocentesColumns = ['posicion', 'nombre', 'categoria', 'horasLectivas', 'horasNoLectivas', 'totalHoras', 'estado'];
  deptColumns = ['departamento', 'totalDocentes', 'horasLectivas', 'promedio'];
  barChartOptions = getBarChartOptions();
  doughnutOptions = getDoughnutOptions();

  readonly rol = this.authService.getUsuarioActual()?.rol ?? '';
  readonly usuario = this.authService.getUsuarioActual();

  isAdmin(): boolean { return this.rol === ROLES.ADMINISTRADOR_SISTEMA; }
  isCoord(): boolean { return this.rol === ROLES.COORDINADOR_ACADEMICO; }
  isDirector(): boolean { return this.rol === ROLES.DIRECTOR_ESCUELA; }
  isDirectorDepto(): boolean { return this.rol === ROLES.DIRECTOR_DEPARTAMENTO; }
  isDocente(): boolean { return this.rol === ROLES.DOCENTE; }
  isSecretaria(): boolean { return this.rol === ROLES.SECRETARIA; }
  isAdminOrCoord(): boolean { return this.isAdmin() || this.isCoord(); }
  canViewFullDashboard(): boolean { return this.isAdminOrCoord() || this.isDirector() || this.isDirectorDepto(); }
  canGenerateHorario(): boolean { return this.isAdminOrCoord(); }

  conflictosColumns = ['tipo', 'descripcion', 'periodo', 'acciones'];
  ambienteColumns = ['codigo', 'tipo', 'capacidad', 'porcentaje'];
  diasSemana = signal<string[]>([]);
  horasRango = signal<string[]>([]);
  heatmapConfig: any = null;
  allHorarios: any[] = [];
  coloresConfig: any = null;
  private configSub?: Subscription;

  greeting = signal('');
  currentDate = signal(new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date()));

  getOcupacionLevel(pct: number): 'low' | 'mid' | 'high' {
    if (pct <= 60) return 'low';
    if (pct <= 80) return 'mid';
    return 'high';
  }

  getSystemStatusText(): string {
    if (!this.kpis) return 'Desconocido';
    if (this.kpis.conflictos_activos === 0) return 'Operativo';
    if (this.kpis.conflictos_activos < 5) return 'Atención requerida';
    return 'Crítico';
  }

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

  doughnutData: ChartData<'doughnut'> = { labels: [], datasets: [] };

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
    const diasActivos = this.diasActivosService.nombres;
    if (diasActivos.length === 0) {
      // Fallback to default days
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
      return;
    }
    const keys = diasActivos.map(nombre => {
      const key = `dashboard.days.${nombre.toLowerCase().replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('á', 'a')}`;
      return key;
    });
    this.translate.get(keys).subscribe(translations => {
      const translatedDays = diasActivos.map(nombre => {
        const key = `dashboard.days.${nombre.toLowerCase().replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('á', 'a')}`;
        return translations[key] || nombre;
      });
      this.diasSemana.set(translatedDays);
      this._heatmapCache.clear();
    });
  }

  private generateHorasRangoFromConfig(config: any): void {
    const { hora_inicio, hora_fin, duracion_bloque } = config;
    const horas: string[] = [];
    for (let h = hora_inicio; h < hora_fin; h += duracion_bloque) {
      const hEnd = h + duracion_bloque;
      // Don't create a slot if it would exceed hora_fin
      if (hEnd > hora_fin) break;
      const hStr = this.formatDecimalTime(h);
      const nextStr = this.formatDecimalTime(hEnd);
      horas.push(`${hStr}-${nextStr}`);
    }
    this.horasRango.set(horas);
    this._heatmapCache.clear();
  }

  private formatDecimalTime(decimalHours: number): string {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private extractHorariosFromMapaCalor(): void {
    // Since mapa_calor only has aggregated data, we need to fetch full horarios
    // The endpoint has pagination, so we need to request all with a high limit
    this.api.get<any>(`/horarios/periodo/${this.periodoService.periodo}?page=1&limit=1000`).subscribe({
      next: (res) => {
        // The response structure is { data: { items: [...] } }
        if (res.data?.items && Array.isArray(res.data.items)) {
          this.allHorarios = res.data.items;
        } else if (Array.isArray(res.data)) {
          this.allHorarios = res.data;
        } else if (res.data?.horarios && Array.isArray(res.data.horarios)) {
          this.allHorarios = res.data.horarios;
        } else if (res.data?.data && Array.isArray(res.data.data)) {
          this.allHorarios = res.data.data;
        } else {
          this.allHorarios = [];
        }
        console.log('[Dashboard] Horarios loaded:', this.allHorarios.length);
      },
      error: (err) => {
        console.error('[Dashboard] Error loading horarios:', err);
        this.allHorarios = [];
      },
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
    this.diasActivosService.cargar().subscribe();
    this.sub = this.periodoService.periodo$.subscribe(() => {
      this.cargaResumen = null;
      this.cargaDepartamentos = [];
      this.cargaEstados = [];
      this.cargaTopDocentes = [];
      this.cargaAvance = [];
      this.diasActivosService.cargar().subscribe();
      this.loadAll();
      if (this.activeTab() === 'carga') {
        this.loadCargaKPIs();
      }
    });
    this.dashSub = this.socketService.dashboardKpiUpdate$.subscribe(() => this.loadKPIs());
    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.setGreeting();
      this.setCurrentDate();
      this.setDiasSemana();
      this.updateChartsLabels();
    });
    // Limpiar cache del heatmap cuando cambia el tema (dark/light)
    this._themeObserver = new MutationObserver(() => {
      this._heatmapCache.clear();
      // Reapply color configuration when theme changes
      if (this.coloresConfig) {
        this.applyColorConfiguration(this.coloresConfig);
      }
      // Rebuild charts with new theme colors
      if (this.kpis) {
        this.buildCharts(this.kpis);
      }
      if (this.misKpis) {
        this.buildDocenteCharts(this.misKpis);
      }
    });
    this._themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  constructor(
    private api: ApiService,
    private authService: AuthService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
    private socketService: SocketService,
    public translate: TranslateService,
    private diasActivosService: DiasActivosService,
    private dialog: MatDialog,
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
          this.errorMessage = err?.error?.message || this.translate.instant('dashboard.errorLoading'); 
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
          console.log('[Dashboard Frontend] KPIs received:', res.data);
          console.log('[Dashboard Frontend] Heatmap config:', res.data.heatmap_config);
          this.kpis = res.data;
          this._heatmapCache.clear();
          // Use heatmap config from backend
          if (res.data.heatmap_config) {
            this.heatmapConfig = res.data.heatmap_config;
            this.diasSemana.set(res.data.heatmap_config.dias);
            this.generateHorasRangoFromConfig(res.data.heatmap_config);
            console.log('[Dashboard Frontend] Using backend config:', {
              dias: res.data.heatmap_config.dias,
              horaInicio: res.data.heatmap_config.hora_inicio,
              horaFin: res.data.heatmap_config.hora_fin,
              duracionBloque: res.data.heatmap_config.duracion_bloque,
            });
          } else {
            console.log('[Dashboard Frontend] No heatmap config, using fallback');
            // Fallback to diasActivosService
            this.setDiasSemana();
            this.heatmapConfig = null;
          }
          // Extract horarios from mapa_calor for heatmap details
          this.extractHorariosFromMapaCalor();
          // Apply color configuration
          this.applyColorConfiguration(res.data.colores_config);
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
          this.errorMessage = err?.error?.message || this.translate.instant('dashboard.errorLoading');
          this.snackBar.open(this.errorMessage, this.translate.instant('common.close'), { duration: 3000 });
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
          this.errorMessage = err?.error?.message || this.translate.instant('dashboard.errorLoading');
          this.snackBar.open(this.errorMessage, this.translate.instant('common.close'), { duration: 3000 });
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
    let pending = 5;
    const dec = () => { pending--; if (pending === 0) this.cargaLoading.set(false); };
    const onError = (msg: string) => {
      this.snackBar.open(msg, this.translate.instant('common.close'), { duration: 3000 });
      dec();
    };
    this.api.get<ApiResponse<CargaResumen>>('/dashboard/carga/resumen', { periodo }).subscribe({
      next: (res) => { this.cargaResumen = res.data; dec(); },
      error: () => onError('Error al cargar resumen de carga'),
    });
    this.api.get<ApiResponse<CargaDepartamento[]>>('/dashboard/carga/departamentos', { periodo }).subscribe({
      next: (res) => { this.cargaDepartamentos = res.data; this.buildDeptChart(res.data); dec(); },
      error: () => onError('Error al cargar datos por departamento'),
    });
    this.api.get<ApiResponse<CargaEstado[]>>('/dashboard/carga/estados', { periodo }).subscribe({
      next: (res) => { this.cargaEstados = res.data; this.buildFunnelChart(res.data); dec(); },
      error: () => onError('Error al cargar estados de carga'),
    });
    this.api.get<ApiResponse<CargaTopDocente[]>>('/dashboard/carga/top-docentes', { periodo, limit: '10' }).subscribe({
      next: (res) => { this.cargaTopDocentes = res.data; dec(); },
      error: () => onError('Error al cargar top docentes'),
    });
    this.api.get<ApiResponse<CargaAvance[]>>('/dashboard/carga/avance', { periodo }).subscribe({
      next: (res) => { this.cargaAvance = res.data; this.buildAvanceChart(res.data); dec(); },
      error: () => onError('Error al cargar avance'),
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
    this.funnelChartOptions = getFunnelChartOptions();
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
    this.deptBarChartOptions = getDeptBarChartOptions();
  }

  private buildAvanceChart(avance: CargaAvance[]): void {
    this.avanceChartData = {
      labels: avance.map((a) => a.fecha),
      datasets: [
        { label: 'Declaraciones', data: avance.map((a) => a.total), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6 },
        { label: 'Enviadas', data: avance.map((a) => a.enviadas), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6 },
      ],
    };
    this.avanceChartOptions = getAvanceChartOptions();
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
    const message = this.translate.instant('dashboard.confirmGenerateSchedule', { periodo: this.periodoService.periodo });
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
          this.snackBar.open(this.translate.instant('dashboard.errorLoading'), this.translate.instant('common.close'), { duration: 3000 }); 
        },
      });
  }

  resolverConflicto(id: number): void {
    this.api.patch<ApiResponse<any>>(`/horarios/conflictos/${id}/resolver`, {})
      .subscribe({
        next: () => { 
          this.snackBar.open(this.translate.instant('common.success'), 'OK', { duration: 2000 }); 
          this.loadConflictos(); 
          this.loadKPIs(); 
        },
        error: () => { 
          this.snackBar.open(this.translate.instant('dashboard.errorLoading'), this.translate.instant('common.close'), { duration: 3000 }); 
        },
      });
  }

  private _buildHeatmapCache(): void {
    if (!this.kpis?.mapa_calor || this._heatmapCache.size > 0) return;
    for (const cell of this.kpis.mapa_calor) {
      // cell.hora is now in format "HH:00-HH:00" from backend
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

  formatHoraRango(hora: string): string {
    return hora; // Already in format "HH:00-HH:00"
  }

  onHeatmapCellClick(dia: string, hora: string): void {
    if (!this.kpis?.mapa_calor) return;
    
    // Map day name to number (1=Lunes, 2=Martes, etc.)
    const diaNumero = this.diaNombreANumero(dia);
    console.log('[Dashboard] Clicked cell:', { dia, diaNumero, hora });
    
    // Find horarios for this day and time range
    const [horaInicio, horaFin] = hora.split('-');
    const horariosFiltrados = this.allHorarios?.filter(h => {
      // The horario has 'dia' as a number (1, 2, 3, etc.)
      if (h.dia !== diaNumero) return false;
      // Check if the horario overlaps with the selected time range
      const hiMinutes = this.timeToMinutes(h.hora_inicio);
      const hfMinutes = this.timeToMinutes(h.hora_fin);
      const slotIniMinutes = this.timeToMinutes(horaInicio);
      const slotFinMinutes = this.timeToMinutes(horaFin);
      const overlaps = hiMinutes < slotFinMinutes && hfMinutes > slotIniMinutes;
      return overlaps;
    }) || [];

    console.log('[Dashboard] Filtered horarios:', horariosFiltrados.length);

    const dialogRef = this.dialog.open(HeatmapDetailsDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: {
        dia,
        hora,
        horarios: horariosFiltrados,
      } as HeatmapDetailsData,
    });
  }

  private diaNombreANumero(nombre: string): number {
    const mapa: Record<string, number> = {
      'Lunes': 1,
      'Martes': 2,
      'Miércoles': 3,
      'Miercoles': 3,
      'Jueves': 4,
      'Viernes': 5,
      'Sábado': 6,
      'Domingo': 7,
    };
    return mapa[nombre] || 1;
  }

  private applyColorConfiguration(config: any): void {
    const root = document.documentElement;
    const isDarkMode = document.body.classList.contains('dark-theme');
    
    // Only apply custom colors if config exists and has theme-specific colors
    if (config) {
      this.coloresConfig = config;
      const colors = isDarkMode ? config.dark : config.light;
      
      if (colors) {
        // Apply only accent/brand colors, let global CSS handle background/text
        root.style.setProperty('--color-accent', colors.dominante);
        root.style.setProperty('--color-success', colors.exito);
        root.style.setProperty('--color-warning', colors.advertencia);
        root.style.setProperty('--color-danger', colors.critico);
        
        // Apply card gradient colors
        if (isDarkMode) {
          root.style.setProperty('--card-metric-gradient-start', colors.contenedores);
          root.style.setProperty('--card-metric-gradient-end', colors.contenedores);
          root.style.setProperty('--card-chart-gradient-start', colors.contenedores);
          root.style.setProperty('--card-chart-gradient-end', colors.contenedores);
          root.style.setProperty('--card-activity-gradient-start', colors.contenedores);
          root.style.setProperty('--card-activity-gradient-end', colors.contenedores);
          root.style.setProperty('--card-list-gradient-start', colors.contenedores);
          root.style.setProperty('--card-list-gradient-end', colors.contenedores);
          root.style.setProperty('--card-table-gradient-start', colors.contenedores);
          root.style.setProperty('--card-table-gradient-end', colors.contenedores);
          root.style.setProperty('--card-heatmap-gradient-start', colors.contenedores);
          root.style.setProperty('--card-heatmap-gradient-end', colors.contenedores);
          root.style.setProperty('--card-alert-gradient-start', '#2D1F1F');
          root.style.setProperty('--card-alert-gradient-end', '#2D1F1F');
        } else {
          root.style.setProperty('--card-metric-gradient-start', '#FFFFFF');
          root.style.setProperty('--card-metric-gradient-end', '#F1F5F9');
          root.style.setProperty('--card-chart-gradient-start', '#FFFFFF');
          root.style.setProperty('--card-chart-gradient-end', '#F8FAFC');
          root.style.setProperty('--card-activity-gradient-start', '#FFFFFF');
          root.style.setProperty('--card-activity-gradient-end', '#FDF4FF');
          root.style.setProperty('--card-list-gradient-start', '#FFFFFF');
          root.style.setProperty('--card-list-gradient-end', '#FFFBEB');
          root.style.setProperty('--card-table-gradient-start', '#FFFFFF');
          root.style.setProperty('--card-table-gradient-end', '#F0F9FF');
          root.style.setProperty('--card-heatmap-gradient-start', '#FFFFFF');
          root.style.setProperty('--card-heatmap-gradient-end', '#F0FDF4');
          root.style.setProperty('--card-alert-gradient-start', '#FEF2F2');
          root.style.setProperty('--card-alert-gradient-end', '#FEE2E2');
        }
        console.log('[Dashboard] Custom color configuration applied:', { isDarkMode, colors });
      }
    }
    // Background and text colors are handled by global styles.scss theme system
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  getHeatmapColor(dia: string, hora: string): string {
    this._buildHeatmapCache();
    // hora is now in format "HH:00-HH:00", use it directly as key
    return this._heatmapCache.get(`${dia}|${hora}`)?.color ?? 'transparent';
  }

  getHeatmapTooltip(dia: string, hora: string): string {
    this._buildHeatmapCache();
    // hora is now in format "HH:00-HH:00", use it directly as key
    return this._heatmapCache.get(`${dia}|${hora}`)?.tooltip ?? '';
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
