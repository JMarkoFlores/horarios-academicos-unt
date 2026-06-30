import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { DiasActivosService } from '../../core/services/dias-activos.service';
import { ConfiguracionGeneralService } from '../../core/services/configuracion-general.service';
import { HorarioExportService, CursoItem } from '../../core/services/horario-export.service';
import type { CeldaHorario } from '../../core/services/horario-export.service';
import { ApiResponse, HorarioAsignado } from '../../core/interfaces/entities';

@Component({
  selector: 'app-docente-horario',
  templateUrl: './docente-horario.component.html',
  styleUrls: ['./docente-horario.component.scss'],
})
export class DocenteHorarioComponent implements OnInit, OnDestroy {
  dias: string[] = [];
  diasNum: number[] = [];
  horas: number[] = [];

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

  franjaInicio = 7;
  franjaFin = 22;
  almuerzoInicio = 12;
  almuerzoFin = 14;
  horasMaxDiarias = 8;
  horasMaxSemanales = 40;
  duracionBloque = 1;

  summaryHoras = 0;
  summaryBloques = 0;
  summaryDias = 0;

  private _grid = new Map<string, CeldaHorario>();
  private periodSub?: Subscription;
  mostrarNoLectiva = false;
  declaracionEstado: string | null = null;
  puedeMostrarNoLectiva = false;
  mensajeEstadoDeclaracion = '';

  private courseColorsMap = new Map<number, [number, number, number]>();
  private courseColorsHexMap = new Map<number, string>();
  cursosUnicosList: CursoItem[] = [];

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
    private diasActivosService: DiasActivosService,
    private configService: ConfiguracionGeneralService,
    private exportService: HorarioExportService,
  ) {}

  ngOnInit(): void {
    this.configService.cargar();
    this.diasActivosService.cargar().subscribe(() => {
      this.dias = this.diasActivosService.nombres;
      this.diasNum = this.diasActivosService.numeros;
      this.buildHours();
      this.buildGrid();
    });
    this.dias = this.diasActivosService.nombres;
    this.diasNum = this.diasActivosService.numeros;
    this.cargarBloqueAlmuerzo();
    this.cargarHorario();
    this.cargarEstadoDeclaracion();
    this.periodSub = this.periodoService.periodo$.subscribe(() => {
      this._grid.clear();
      this.cargarBloqueAlmuerzo();
      this.cargarHorario();
      this.cargarEstadoDeclaracion();
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
          }
          const franja = lista.find(
            (x) => x.tipo_restriccion === 'FRANJA_HORARIA' && x.activo,
          );
          if (franja?.valor?.hora_inicio && franja?.valor?.hora_fin) {
            this.franjaInicio = parseInt(franja.valor.hora_inicio.split(':')[0], 10);
            this.franjaFin = parseInt(franja.valor.hora_fin.split(':')[0], 10);
          }
          const duracion = lista.find(
            (x) => x.tipo_restriccion === 'DURACION_BLOQUE' && x.activo,
          );
          if (duracion?.valor) {
            this.duracionBloque = (duracion.valor as number) / 60 || 1;
          }
          const maxDiaria = lista.find(
            (x) => x.tipo_restriccion === 'MAXIMA_DIARIA' && x.activo,
          );
          if (maxDiaria?.valor) {
            this.horasMaxDiarias = parseInt(String(maxDiaria.valor), 10) || 8;
          }
          this.buildHours();
          this.buildGrid();
        },
      });
  }

  cargarHorario(): void {
    this.loading = true;
    this._grid.clear();
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

          this.setupCourseColors();
          this.summaryBloques = this.asignaciones.length;
          this.summaryHoras = this.asignaciones.reduce((acc, a) => {
            if (!a.hora_inicio || !a.hora_fin) return acc + 1;
            return acc + (parseInt(a.hora_fin.split(':')[0], 10) - parseInt(a.hora_inicio.split(':')[0], 10));
          }, 0);
          this.summaryDias = new Set(this.asignaciones.map(a => a.dia_semana)).size;

          this.buildGrid();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  cargarEstadoDeclaracion(): void {
    this.api
      .get<ApiResponse<any>>('/declaraciones/mia')
      .subscribe({
        next: (r) => {
          const declaracion = r.data;
          this.declaracionEstado = declaracion?.estado || null;
          const estadosConfirmados = ['CONFIRMADO', 'VALIDADO_DPTO', 'APROBADO_FACULTAD', 'CERRADO'];
          this.puedeMostrarNoLectiva = !!this.declaracionEstado && estadosConfirmados.includes(this.declaracionEstado);
          if (!this.puedeMostrarNoLectiva) {
            this.mostrarNoLectiva = false;
          }
          if (this.declaracionEstado) {
            const mensajes: Record<string, string> = {
              BORRADOR: 'Complete su declaración para ver carga no lectiva',
              ENVIADO: 'Su declaración está en revisión',
              OBSERVADO_DPTO: 'Subsane las observaciones para ver carga no lectiva',
              OBSERVADO_FACULTAD: 'Subsane las observaciones para ver carga no lectiva',
              VALIDADO_DPTO: 'Carga no lectiva disponible',
              APROBADO_FACULTAD: 'Carga no lectiva disponible',
              CERRADO: 'Carga no lectiva disponible',
            };
            this.mensajeEstadoDeclaracion = mensajes[this.declaracionEstado] || '';
          } else {
            this.mensajeEstadoDeclaracion = 'No hay declaración para este período';
          }
        },
        error: () => {
          this.declaracionEstado = null;
          this.puedeMostrarNoLectiva = false;
          this.mostrarNoLectiva = false;
          this.mensajeEstadoDeclaracion = 'No hay declaración para este período';
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

  fmtH(h: number): string {
    return this.fmtHStr(h);
  }

  private buildHours(): void {
    this.horas = [];
    for (let h = this.franjaInicio; h < this.franjaFin; h += this.duracionBloque) {
      this.horas.push(h);
    }
  }

  private setupCourseColors(): void {
    const result = this.exportService.setupCourseColors(this.asignaciones);
    this.courseColorsMap = result.colorMap;
    this.courseColorsHexMap = result.hexMap;
    this.cursosUnicosList = result.cursosList;
  }

  private buildGrid(): void {
    this._grid.clear();
    for (const dia of this.diasNum) {
      for (const hora of this.horas) {
        const key = `${dia}_${hora}`;
        const asigMatches = this.asignaciones.filter(
          (a) => a.dia_semana === dia && a.hora_inicio === this.fmtHStr(hora)
        );
        let asig: HorarioAsignado | null = asigMatches.find(a => a.tipo_clase !== 'NO_LECTIVA') ?? asigMatches[0] ?? null;

        if (asig && asig.tipo_clase === 'NO_LECTIVA' && !this.mostrarNoLectiva) {
          asig = null;
        }
        let rowspan = 1;
        if (asig?.hora_fin) {
          const finH = parseInt(asig.hora_fin.split(':')[0], 10);
          rowspan = Math.max(1, finH - hora);
        }
        const esAlmuerzo =
          hora >= this.almuerzoInicio && hora < this.almuerzoFin && !asig;
        this._grid.set(key, {
          asig,
          rowspan,
          skip: false,
          esAlmuerzo,
          mergedTipos: asig ? [asig.tipo_clase ?? 'TEORIA'] : [],
          mergedAmbs: asig?.ambiente?.codigo ? [asig.ambiente.codigo] : [],
        });
      }
      for (const hora of this.horas) {
        const key = `${dia}_${hora}`;
        const cell = this._grid.get(key)!;
        if (cell.asig && cell.rowspan > 1) {
          for (let s = 1; s < cell.rowspan; s++) {
            const skipKey = `${dia}_${hora + s}`;
            const sc = this._grid.get(skipKey);
            if (sc) sc.skip = true;
          }
        }
      }
    }
  }

  getCell(dia: number, hora: number): CeldaHorario {
    return (
      this._grid.get(`${dia}_${hora}`) ?? {
        asig: null,
        rowspan: 1,
        skip: false,
        esAlmuerzo: false,
        mergedTipos: [],
        mergedAmbs: [],
      }
    );
  }

  cls(dia: number, hora: number): string {
    const cell = this.getCell(dia, hora);
    if (!cell.asig) return cell.esAlmuerzo ? 'celda-almuerzo' : 'celda-vacia';
    if (cell.asig.tipo_clase === 'NO_LECTIVA') return 'celda-no-lectiva';
    return cell.asig.tipo_clase === 'LABORATORIO'
      ? 'celda-lab'
      : 'celda-teoria';
  }

  getCursoColorHex(cursoId: number): string {
    return this.exportService.getCursoColorHex(this.courseColorsHexMap, cursoId);
  }

  getStatsCurso(cursoId: number) {
    const asigs = this.asignaciones.filter(a => a.curso?.id === cursoId);
    return this.exportService.calcularStatsCurso(asigs);
  }

  toggleNoLectiva(): void {
    this.buildGrid();
  }

  esAlmuerzoHora(hora: number): boolean {
    return hora >= this.almuerzoInicio && hora < this.almuerzoFin;
  }

  get horasAsignadas(): number {
    return this.asignaciones.length;
  }

  get totalHorasSemanales(): number {
    return this.summaryHoras;
  }

  // ── PDF (client-side via HorarioExportService) ──────────────────────────
  descargarPdf(): void {
    if (!this.docenteInfo) return;
    this.descargandoPdf = true;
    try {
      this.exportService.generarPDF(
        this.docenteInfo,
        this.asignaciones,
        this.dias,
        this.diasNum,
        this.horas,
        this._grid,
        this.cursosUnicosList,
        this.courseColorsMap,
        this.configService.config,
        this.periodoService.periodo ?? '',
        this.summaryHoras,
        this.franjaInicio,
        this.franjaFin,
        this.almuerzoInicio,
        this.almuerzoFin,
        this.horasMaxDiarias,
        this.horasMaxSemanales,
        this.duracionBloque,
        (h) => this.esAlmuerzoHora(h),
        (h) => this.fmtH(h),
      );
    } catch (e) {
      console.error('PDF error:', e);
      this.snackBar.open('Error al generar el PDF', 'Cerrar', { duration: 3000 });
    } finally {
      this.descargandoPdf = false;
    }
  }

  // ── Excel (client-side via HorarioExportService) ────────────────────────
  descargarExcel(): void {
    if (!this.docenteInfo) return;
    this.descargandoExcel = true;
    try {
      this.exportService.generarExcel(
        this.docenteInfo,
        this.asignaciones,
        this.dias,
        this.diasNum,
        this.horas,
        this._grid,
        this.cursosUnicosList,
        this.courseColorsMap,
        this.courseColorsHexMap,
        this.configService.config,
        this.periodoService.periodo ?? '',
        this.summaryHoras,
        this.summaryBloques,
        this.summaryDias,
        this.franjaInicio,
        this.franjaFin,
        this.almuerzoInicio,
        this.almuerzoFin,
        this.horasMaxDiarias,
        this.duracionBloque,
        (h) => this.fmtH(h),
      );
    } catch (e) {
      console.error('Excel error:', e);
      this.snackBar.open('Error al generar Excel', 'Cerrar', { duration: 3000 });
    } finally {
      this.descargandoExcel = false;
    }
  }

  // ── iCalendar (backend) ────────────────────────────────────────────────
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
