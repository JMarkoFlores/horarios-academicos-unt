import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../../core/services/api.service';
import { PeriodoService } from '../../../../core/services/periodo.service';
import { DiasActivosService } from '../../../../core/services/dias-activos.service';
import { ConfiguracionGeneralService, ConfiguracionGeneral } from '../../../../core/services/configuracion-general.service';
import { HorarioExportService, CeldaHorario, CursoItem } from '../../../../core/services/horario-export.service';
import { Docente, HorarioAsignado, ApiResponse } from '../../../../core/interfaces/entities';

@Component({
  selector: 'app-ver-horario-docente-dialog',
  templateUrl: './ver-horario-docente-dialog.component.html',
  styleUrls: ['./ver-horario-docente-dialog.component.scss'],
})
export class VerHorarioDocenteDialogComponent implements OnInit, OnDestroy {
  dias: string[] = [];
  diasNum: number[] = [];
  horas: number[] = [];
  asignaciones: HorarioAsignado[] = [];
  loading = false;
  descargando = false;

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
  private subs: Subscription[] = [];

  private courseColorsMap = new Map<number, [number, number, number]>();
  private courseColorsHexMap = new Map<number, string>();
  cursosUnicosList: CursoItem[] = [];

  constructor(
    private dialogRef: MatDialogRef<VerHorarioDocenteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public docente: Docente,
    private api: ApiService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
    private diasActivosService: DiasActivosService,
    public configService: ConfiguracionGeneralService,
    private exportService: HorarioExportService,
  ) {}

  ngOnInit(): void {
    this.configService.cargar();
    this.subs.push(
      this.periodoService.periodo$.subscribe(() => {
        this._grid.clear();
        this.loadAll();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadAll(): void {
    this.loading = true;
    forkJoin({
      dias: this.diasActivosService.cargar(),
      restricciones: this.api.get<ApiResponse<any>>('/configuracion/restricciones', {
        periodo: this.periodoService.periodo,
      }),
      horarios: this.api.get<ApiResponse<any>>(`/horarios/docente/${this.docente.id}`, {
        periodo: this.periodoService.periodo,
      }),
    }).subscribe({
      next: (res) => {
        this.applyDias();
        this.applyRestricciones(res.restricciones?.data);
        this.applyHorarios(res.horarios?.data);
        this.loading = false;
      },
      error: () => {
        this.applyDias();
        this.buildHours();
        this.loading = false;
      },
    });
  }

  private applyDias(): void {
    this.dias = this.diasActivosService.nombres;
    this.diasNum = this.diasActivosService.numeros;
  }

  private applyRestricciones(lista: any[]): void {
    if (!Array.isArray(lista)) { this.buildHours(); return; }
    for (const r of lista) {
      if (r.tipo_restriccion === 'FRANJA_HORARIA' && r.activo && r.valor) {
        if (r.valor.hora_inicio) {
          const [h, m] = r.valor.hora_inicio.split(':').map(Number);
          this.franjaInicio = h + (m || 0) / 60;
        }
        if (r.valor.hora_fin) {
          const [h, m] = r.valor.hora_fin.split(':').map(Number);
          this.franjaFin = h + (m || 0) / 60;
        }
      }
      if (r.tipo_restriccion === 'BLOQUE_ALMUERZO' && r.activo && r.valor) {
        if (r.valor.hora_inicio) {
          const [h, m] = r.valor.hora_inicio.split(':').map(Number);
          this.almuerzoInicio = h + (m || 0) / 60;
        }
        if (r.valor.hora_fin) {
          const [h, m] = r.valor.hora_fin.split(':').map(Number);
          this.almuerzoFin = h + (m || 0) / 60;
        }
      }
      if (r.tipo_restriccion === 'DURACION_BLOQUE' && r.activo && r.valor) {
        const v = r.valor.duracion_minutos || r.valor.valor || r.valor.minutos;
        if (v) this.duracionBloque = (v as number) / 60;
      }
      if (r.tipo_restriccion === 'MAX_HORAS_DIARIAS' && r.activo && r.valor) {
        const v = r.valor.max || r.valor.horas || r.valor.maximo;
        if (v) this.horasMaxDiarias = parseInt(String(v), 10);
      }
    }
    this.buildHours();
  }

  private applyHorarios(data: any): void {
    const raw: HorarioAsignado[] = data?.items ?? data ?? [];
    this.asignaciones = raw.map(a => ({
      ...a,
      dia_semana: (a as any).dia ?? a.dia_semana,
      hora_inicio: this.norm(a.hora_inicio),
      hora_fin: this.norm(a.hora_fin),
    }));

    this.setupCourseColors();
    this.buildGrid();

    this.summaryBloques = this.asignaciones.length;
    this.summaryHoras = this.asignaciones.reduce((acc, a) => {
      if (!a.hora_inicio || !a.hora_fin) return acc + 1;
      return acc + (parseInt(a.hora_fin.split(':')[0], 10) - parseInt(a.hora_inicio.split(':')[0], 10));
    }, 0);
    this.summaryDias = new Set(this.asignaciones.map(a => a.dia_semana)).size;
  }

  private setupCourseColors(): void {
    const result = this.exportService.setupCourseColors(this.asignaciones);
    this.courseColorsMap = result.colorMap;
    this.courseColorsHexMap = result.hexMap;
    this.cursosUnicosList = result.cursosList;
  }

  getCursoColorHex(cursoId: number): string {
    return this.exportService.getCursoColorHex(this.courseColorsHexMap, cursoId);
  }

  getStatsCurso(cursoId: number) {
    const asigs = this.asignaciones.filter(a => a.curso?.id === cursoId);
    return this.exportService.calcularStatsCurso(asigs);
  }

  private norm(h: string | undefined): string { return h && h.length >= 5 ? h.substring(0, 5) : h ?? ''; }
  fmtH(h: number): string {
    const hour = Math.floor(h);
    const minutes = Math.round((h - hour) * 60);
    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private buildHours(): void {
    this.horas = [];
    for (let h = this.franjaInicio; h < this.franjaFin; h += this.duracionBloque) {
      this.horas.push(h);
    }
  }

  private buildGrid(): void {
    this._grid.clear();

    const timeToDecimal = (timeStr: string): number => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h + (m || 0) / 60;
    };

    for (const dia of this.diasNum) {
      for (const hora of this.horas) {
        const key = `${dia}_${hora}`;
        const asig = this.asignaciones.find(a => {
          if (a.dia_semana !== dia) return false;
          const asigInicio = timeToDecimal(a.hora_inicio);
          return Math.abs(asigInicio - hora) < 0.01;
        }) ?? null;

        let rowspan = 1;
        if (asig?.hora_fin) {
          const asigFin = timeToDecimal(asig.hora_fin);
          const asigInicio = timeToDecimal(asig.hora_inicio);
          const duration = asigFin - asigInicio;
          rowspan = Math.max(1, Math.round(duration / this.duracionBloque));
        }

        const esAlm = hora >= this.almuerzoInicio && hora < this.almuerzoFin && !asig;
        this._grid.set(key, {
          asig,
          rowspan,
          skip: false,
          esAlmuerzo: esAlm,
          mergedTipos: asig ? [asig.tipo_clase === 'LABORATORIO' ? 'LAB' : asig.tipo_clase === 'PRACTICA' ? 'PRA' : 'TEO'] : [],
          mergedAmbs: asig && asig.ambiente?.codigo ? [asig.ambiente.codigo] : [],
        });
      }
    }

    // Merge TEORIA+PRACTICA of same course (matching detail page logic)
    for (const dia of this.diasNum) {
      for (let i = 0; i < this.horas.length; i++) {
        const hora = this.horas[i];
        const key = `${dia}_${hora}`;
        const c = this._grid.get(key);

        if (c?.asig && !c.skip) {
          let endIndex = i + c.rowspan;

          while (endIndex < this.horas.length) {
            const nextHora = this.horas[endIndex];
            const nextKey = `${dia}_${nextHora}`;
            const nextC = this._grid.get(nextKey);

            if (nextC?.asig && !nextC.skip && !nextC.esAlmuerzo &&
                nextC.asig.curso?.id === c.asig.curso?.id) {

              const t1 = c.asig.tipo_clase || 'TEORIA';
              const t2 = nextC.asig.tipo_clase || 'TEORIA';
              const allowedMerge = (t1 !== t2) &&
                                   ([t1, t2].every(t => t === 'TEORIA' || t === 'PRACTICA'));

              if (!allowedMerge) break;

              if (nextC.mergedTipos) {
                nextC.mergedTipos.forEach(t => {
                  if (!c.mergedTipos.includes(t)) c.mergedTipos.push(t);
                });
              }
              if (nextC.mergedAmbs) {
                nextC.mergedAmbs.forEach(a => {
                  if (!c.mergedAmbs.includes(a)) c.mergedAmbs.push(a);
                });
              }

              c.asig.hora_fin = nextC.asig.hora_fin;
              c.rowspan += nextC.rowspan;
              nextC.skip = true;
              nextC.asig = null;

              endIndex = i + c.rowspan;
            } else {
              break;
            }
          }
        }
      }
    }

    // Mark skipped cells for merged blocks
    for (const dia of this.diasNum) {
      for (const hora of this.horas) {
        const c = this._grid.get(`${dia}_${hora}`)!;
        if (c?.asig && c.rowspan > 1) {
          for (let s = 1; s < c.rowspan; s++) {
            const nextHoraIdx = this.horas.indexOf(hora) + s;
            if (nextHoraIdx < this.horas.length) {
              const nextHora = this.horas[nextHoraIdx];
              const sk = this._grid.get(`${dia}_${nextHora}`);
              if (sk) sk.skip = true;
            }
          }
        }
      }
    }
  }

  getCell(dia: number, hora: number): CeldaHorario {
    return this._grid.get(`${dia}_${hora}`) ?? { asig: null, rowspan: 1, skip: false, esAlmuerzo: false, mergedTipos: [], mergedAmbs: [] };
  }

  esAlmuerzoHora(h: number): boolean { return h >= this.almuerzoInicio && h < this.almuerzoFin; }

  // ── PDF ────────────────────────────────────────────────────────────────
  descargarPdf(): void {
    if (!this.docente) return;
    this.descargando = true;
    try {
      this.exportService.generarPDF(
        this.docente,
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
      this.descargando = false;
    }
  }

  // ── EXCEL ─────────────────────────────────────────────────────────────
  descargarExcel(): void {
    if (!this.docente) return;
    this.descargando = true;
    try {
      this.exportService.generarExcel(
        this.docente,
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
      this.snackBar.open('Error al generar el Excel', 'Cerrar', { duration: 3000 });
    } finally {
      this.descargando = false;
    }
  }

  cerrar(): void { this.dialogRef.close(); }
}
