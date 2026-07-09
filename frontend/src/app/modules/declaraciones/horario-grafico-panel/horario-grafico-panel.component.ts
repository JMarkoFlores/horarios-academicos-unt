import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { ScheduleConfigService, ScheduleConfig } from '../../../core/services/schedule-config.service';
import {
  codigoDiaANumero,
  DIA_CODIGO_A_ETIQUETA,
  diaNumericoACodigo,
  HorarioBloque,
  HorarioLectivoRef,
  seSuperponen,
} from '../horario.utils';

/* ── Interfaces locales ───────────────────────────────────────────── */

export interface ActividadNoLectivaInput {
  id: number;
  codigo: string;
  descripcion: string;
  detalle: string;
  horas: number;
  horas_totales?: number;
  horas_distribuidas?: number;
  horas_pendientes?: number;
  horarios: HorarioBloque[];
  horasManual: boolean;
  porcentaje_completado?: number;
}

interface BloqueVisual {
  id: string;
  tipo: 'lectivo' | 'no-lectivo';
  actividadId?: number;
  titulo: string;
  dia: string;
  horaInicio: number;
  duracion: number;
  color: string;
}

/* ── Constantes ───────────────────────────────────────────────────── */

const COLOR_RUBRO: Record<number, string> = {
  2: '#e91e63',
  3: '#9c27b0',
  4: '#673ab7',
  5: '#3f51b5',
  6: '#ff9800',
  7: '#ff5722',
  8: '#795548',
  9: '#607d8b',
  10: '#009688',
};

/* ── Componente ───────────────────────────────────────────────────── */

@Component({
  selector: 'app-horario-grafico-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './horario-grafico-panel.component.html',
  styleUrls: ['./horario-grafico-panel.component.scss'],
})
export class HorarioGraficoPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() actividades: ActividadNoLectivaInput[] = [];
  @Input() horariosLectivos: HorarioLectivoRef[] = [];
  @Input() puedeEditar = false;
  @Input() totalHorasLectivas = 0;
  @Input() horasModalidad = 40;
  @Input() totalHorasCargaAdicional = 0;

  @Output() actividadesChange = new EventEmitter<ActividadNoLectivaInput[]>();
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('gradillaRef', { static: true }) gradillaRef!: ElementRef<HTMLDivElement>;

  dias: string[] = [];
  horasRange: number[] = [];
  bloques: BloqueVisual[] = [];

  totalNoLectivas = 0;
  totalGeneral = 0;
  excedeLimite = false;
  preparacionExcede = false;
  dragOverCell: { dia: string; hora: number } | null = null;

  private horaInicio = 7;
  private horaFin = 22;
  almuerzoInicio = 12;
  almuerzoFin = 14;
  private configLoaded = false;
  private configSub?: Subscription;

  @Input() declaracionId: number | null = null;

  // ── Native palette drag state ────────────────────────────────────
  paletaDragActiva: ActividadNoLectivaInput | null = null;
  paletaDragRange: { dia: string; horaInicio: number; horaFin: number } | null = null;
  private paletaGhostEl: HTMLElement | null = null;
  private paletaDragOffsetX = 0;
  private paletaDragOffsetY = 0;
  private paletaDragging = false;
  private paletaDragStartHora = 0;

  // ── Native block drag state ──────────────────────────────────────
  bloqueDragActivo: BloqueVisual | null = null;
  private bloqueGhostEl: HTMLElement | null = null;
  private bloqueDragOffsetX = 0;
  private bloqueDragOffsetY = 0;
  private bloqueDragging = false;

  constructor(
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private scheduleConfig: ScheduleConfigService,
  ) {}

  ngOnInit(): void {
    this.scheduleConfig.cargar();
    const apply = (config: ScheduleConfig) => {
      this.horaInicio = config.franja.inicio;
      this.horaFin = config.franja.fin;
      this.almuerzoInicio = config.almuerzo.inicio;
      this.almuerzoFin = config.almuerzo.fin;
      this.dias = config.diasNumeros.map(n => this.scheduleConfig.diaNumToCod(n));
      this.horasRange = [];
      for (let h = this.horaInicio; h < this.horaFin; h++) this.horasRange.push(h);
      this.configLoaded = true;
      this.construirBloques();
      this.calcularTotales();
      this.cdr.markForCheck();
    };

    const cfg = this.scheduleConfig.config;
    if (cfg.loaded) {
      apply(cfg);
    } else {
      this.configSub = this.scheduleConfig.ready$.subscribe(config => apply(config));
      this.dias = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
      this.horasRange = [];
      for (let h = this.horaInicio; h < this.horaFin; h++) this.horasRange.push(h);
      this.construirBloques();
      this.calcularTotales();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['actividades'] || changes['horariosLectivos']) {
      this.construirBloques();
      this.calcularTotales();
    }
  }

  /* ── Helpers de grid ────────────────────────────────────────────── */

  getDropListId(dia: string, hora: number): string {
    return `cell-${dia}-${hora}`;
  }

  getCol(dia: string): number {
    const col = this.dias.indexOf(diaNumericoACodigo(dia));
    return col;
  }

  esDiaValido(dia: string): boolean {
    return this.getCol(dia) >= 0;
  }

  getRow(horaInicio: number): number {
    return horaInicio - this.horaInicio;
  }

  esAlmuerzo(hora: number): boolean {
    return hora >= this.almuerzoInicio && hora < this.almuerzoFin;
  }

  get almuerzoDuracion(): number {
    return Math.max(0, this.almuerzoFin - this.almuerzoInicio);
  }

  get almuerzoGridRow(): string {
    const start = this.getRow(this.almuerzoInicio) + 2;
    return `${start} / span ${this.almuerzoDuracion}`;
  }

  fmtHora(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  esCeldaBloqueada(dia: string, hora: number): boolean {
    return false;
  }

  etiquetaDia(dia: string): string {
    return DIA_CODIGO_A_ETIQUETA[dia] || dia;
  }

  getColorPorRubro(id: number): string {
    return COLOR_RUBRO[id] || '#9e9e9e';
  }

  getDescripcionCorta(act: ActividadNoLectivaInput): string {
    return act.descripcion
      .replace(/^[0-9]+\.\s*/, '')
      .split(':')[0]
      .trim()
      .substring(0, 28);
  }

  trackByBloqueId(index: number, bloque: BloqueVisual): string {
    return bloque.id;
  }

  private getTituloBloque(act: ActividadNoLectivaInput): string {
    return act.descripcion.replace(/^[0-9]+\.\s*/, '').split(':')[0].trim();
  }

  /* ── Construcción de bloques ────────────────────────────────────── */

  construirBloques(): void {
    const next: BloqueVisual[] = [];

    const pushBloque = (bloque: Omit<BloqueVisual, 'duracion'> & { duracion?: number }, fin: number, ini: number): void => {
      if (!this.esDiaValido(bloque.dia)) return;
      if (isNaN(ini) || isNaN(fin) || fin <= ini) return;
      if (ini < this.horaInicio || ini >= this.horaFin) return;
      const duracion = Math.min(fin - ini, this.horaFin - ini);
      if (duracion <= 0) return;
      next.push({ ...bloque, duracion });
    };

    this.horariosLectivos.forEach((lec, idx) => {
      const dia = diaNumericoACodigo(lec.dia);
      const ini = parseInt(lec.hora_inicio.split(':')[0], 10);
      const fin = parseInt(lec.hora_fin.split(':')[0], 10);
      pushBloque({
        id: `lec-${idx}`,
        tipo: 'lectivo',
        titulo: lec.codigoCurso || lec.nombreCurso || 'Curso',
        dia,
        horaInicio: ini,
        color: '#c5cae9',
      }, fin, ini);
    });

    this.actividades.forEach((act) => {
      act.horarios.forEach((h) => {
        const dia = diaNumericoACodigo(h.dia);
        const ini = parseInt(h.hora_inicio.split(':')[0], 10);
        const fin = parseInt(h.hora_fin.split(':')[0], 10);
        const uniqueId = `${h.dia}-${h.hora_inicio.replace(':', '-')}`;
        pushBloque({
          id: `nl-${act.id}-${uniqueId}`,
          tipo: 'no-lectivo',
          actividadId: act.id,
          titulo: this.getTituloBloque(act),
          dia,
          horaInicio: ini,
          color: this.getColorPorRubro(act.id),
        }, fin, ini);
      });
    });

    this.bloques = next;
  }

  /* ── Cálculos ───────────────────────────────────────────────────── */

  get actividadesPaleta(): ActividadNoLectivaInput[] {
    return this.actividades.filter((a) => a.horas > 0);
  }

  getHorasAsignadas(actividadId: number): number {
    const act = this.actividades.find((a) => a.id === actividadId);
    if (!act) return 0;
    if ('horas_distribuidas' in act) {
      return (act as any).horas_distribuidas;
    }
    return act.horarios.reduce((sum, h) => {
      const ini = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin = parseInt(h.hora_fin.split(':')[0], 10);
      return sum + (fin - ini);
    }, 0);
  }

  getHorasPendientes(actividadId: number): number {
    const act = this.actividades.find((a) => a.id === actividadId);
    if (!act) return 0;
    if ('horas_pendientes' in act) {
      return (act as any).horas_pendientes;
    }
    const asignadas = this.getHorasAsignadas(actividadId);
    const totales = 'horas_totales' in act ? (act as any).horas_totales : act.horas;
    return Math.max(0, totales - asignadas);
  }

  getPorcentajeCompletado(actividadId: number): number {
    const act = this.actividades.find((a) => a.id === actividadId);
    if (!act) return 0;
    if ('porcentaje_completado' in act) {
      return (act as any).porcentaje_completado;
    }
    const asignadas = this.getHorasAsignadas(actividadId);
    const totales = 'horas_totales' in act ? (act as any).horas_totales : act.horas;
    return totales > 0 ? Math.round((asignadas / totales) * 100) : 0;
  }

  getTotalHorasDistribuidas(): number {
    return this.actividades.reduce((sum, a) => sum + this.getHorasAsignadas(a.id), 0);
  }

  getTotalHorasPendientes(): number {
    return this.actividades.reduce((sum, a) => sum + this.getHorasPendientes(a.id), 0);
  }

  calcularTotales(): void {
    this.totalNoLectivas = this.actividades.reduce(
      (sum, a) => sum + (Number('horas_totales' in a ? (a as any).horas_totales : a.horas) || 0),
      0
    );
    this.totalGeneral =
      this.totalHorasLectivas + this.totalNoLectivas + this.totalHorasCargaAdicional;
    this.excedeLimite = this.totalGeneral > this.horasModalidad;

    const act2 = this.actividades.find((a) => a.id === 2);
    const horasPrep = act2 ? (Number('horas_totales' in act2 ? (act2 as any).horas_totales : act2.horas) || 0) : 0;
    this.preparacionExcede = horasPrep > Math.floor(this.totalHorasLectivas * 0.5);
  }

  private recalcularYEmitir(): void {
    this.construirBloques();
    this.calcularTotales();
    this.cdr.detectChanges();
    this.actividadesChange.emit(
      this.actividades.map((a) => ({
        ...a,
        horarios: a.horarios.map((h) => ({ ...h })),
      }))
    );
  }

  /* ── Drag de paleta → celda (NATIVE MOUSE) ────────────────────── */

  onPaletaMouseDown(event: MouseEvent, actividad: ActividadNoLectivaInput): void {
    if (!this.puedeEditar) return;
    if (this.getHorasPendientes(actividad.id) === 0) return;
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.paletaDragOffsetX = event.clientX - rect.left;
    this.paletaDragOffsetY = event.clientY - rect.top;

    this.paletaDragActiva = actividad;
    this.paletaDragging = false;

    const ghost = document.createElement('div');
    ghost.className = 'paleta-drag-ghost';
    ghost.innerHTML = `
      <span class="ghost-nro" style="
        display:inline-flex;align-items:center;justify-content:center;
        width:22px;height:22px;border-radius:50%;background:#374151;color:#fff;
        font-size:11px;font-weight:800;flex-shrink:0;
      ">${actividad.id}</span>
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;">
        ${this.getDescripcionCorta(actividad)}
      </span>
      <span style="font-size:11px;font-weight:700;color:#6366f1;white-space:nowrap;">
        ${this.getHorasAsignadas(actividad.id)}/${actividad.horas}h
      </span>
    `;
    ghost.style.cssText = `
      position:fixed;z-index:2147483647;pointer-events:none;
      display:flex;align-items:center;gap:8px;
      padding:6px 10px;border-radius:8px;
      background:rgba(255,255,255,0.97);
      border:2px solid ${this.getColorPorRubro(actividad.id)};
      box-shadow:0 8px 24px rgba(0,0,0,0.25);
      opacity:0.95;max-width:260px;
      left:${event.clientX - this.paletaDragOffsetX}px;
      top:${event.clientY - this.paletaDragOffsetY}px;
    `;
    document.body.appendChild(ghost);
    this.paletaGhostEl = ghost;
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.puedeEditar) return;

    // ── Palette drag ─────────────────────────────────────────────
    if (this.paletaDragActiva && this.paletaGhostEl) {
      if (!this.paletaDragging) this.paletaDragging = true;

      this.paletaGhostEl.style.left = `${event.clientX - this.paletaDragOffsetX}px`;
      this.paletaGhostEl.style.top = `${event.clientY - this.paletaDragOffsetY}px`;

      this.paletaGhostEl.style.display = 'none';
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      this.paletaGhostEl.style.display = '';

      const celdaEl = elements.find((el) => el.classList.contains('drop-cell'));
      if (!celdaEl) {
        this.dragOverCell = null;
        return;
      }

      const dia = celdaEl.getAttribute('data-dia');
      const horaStr = celdaEl.getAttribute('data-hora');
      if (!dia || !horaStr) {
        this.dragOverCell = null;
        return;
      }

      const horaActual = parseInt(horaStr, 10);

      // Si cambió de día, reiniciar selección
      if (!this.paletaDragRange || this.paletaDragRange.dia !== dia) {
        this.paletaDragStartHora = horaActual;
        this.paletaDragRange = { dia, horaInicio: horaActual, horaFin: horaActual + 1 };
        this.dragOverCell = { dia, hora: horaActual };
        this.updateGhostDuracion(1);
        return;
      }

      const startHora = this.paletaDragStartHora;
      const duracionMax = this.getHorasPendientes(this.paletaDragActiva.id);
      
      // Calcular rango sin cambiar el punto de inicio
      let horaInicio: number;
      let horaFin: number;
      
      if (horaActual >= startHora) {
        horaInicio = startHora;
        horaFin = Math.min(horaActual + 1, startHora + duracionMax);
      } else {
        horaInicio = Math.max(horaActual, startHora - duracionMax);
        horaFin = startHora + 1;
      }

      // Limitar al rango del día
      if (horaInicio < this.horaInicio) horaInicio = this.horaInicio;
      if (horaFin > this.horaFin) horaFin = this.horaFin;
      
      const duracion = horaFin - horaInicio;
      if (duracion <= 0) return;

      this.paletaDragRange = {
        dia,
        horaInicio,
        horaFin,
      };
      this.dragOverCell = { dia, hora: horaInicio };
      this.updateGhostDuracion(duracion);
      return;
    }

    // ── Block drag ───────────────────────────────────────────────
    if (this.bloqueDragActivo && this.bloqueGhostEl) {
      if (!this.bloqueDragging) this.bloqueDragging = true;

      this.bloqueGhostEl.style.left = `${event.clientX - this.bloqueDragOffsetX}px`;
      this.bloqueGhostEl.style.top = `${event.clientY - this.bloqueDragOffsetY}px`;

      this.bloqueGhostEl.style.display = 'none';
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      this.bloqueGhostEl.style.display = '';

      const celdaEl = elements.find((el) => el.classList.contains('drop-cell'));
      if (!celdaEl) {
        this.dragOverCell = null;
        return;
      }

      const dia = celdaEl.getAttribute('data-dia');
      const horaStr = celdaEl.getAttribute('data-hora');
      if (!dia || !horaStr) {
        this.dragOverCell = null;
        return;
      }

      const hora = parseInt(horaStr, 10);
      if (!this.dragOverCell || this.dragOverCell.dia !== dia || this.dragOverCell.hora !== hora) {
        this.dragOverCell = { dia, hora };
      }
      return;
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onDocumentMouseUp(_event: MouseEvent): void {
    // ── Palette drop ─────────────────────────────────────────────
    if (this.paletaDragActiva && this.paletaGhostEl) {
      const actividad = this.paletaDragActiva;
      const range = this.paletaDragRange;

      this.paletaGhostEl.remove();
      this.paletaGhostEl = null;
      this.paletaDragActiva = null;
      this.paletaDragging = false;
      this.paletaDragRange = null;
      this.dragOverCell = null;

      if (!range || !this.puedeEditar) return;

      const duracion = range.horaFin - range.horaInicio;
      if (duracion <= 0) return;

      this.crearBloque(actividad, range.dia, range.horaInicio, duracion);
      return;
    }

    // ── Block drop ───────────────────────────────────────────────
    if (this.bloqueDragActivo && this.bloqueGhostEl) {
      const bloque = this.bloqueDragActivo;
      const target = this.dragOverCell;

      this.bloqueGhostEl.remove();
      this.bloqueGhostEl = null;
      this.bloqueDragActivo = null;
      this.bloqueDragging = false;
      this.dragOverCell = null;

      if (!target || !this.puedeEditar) return;

      if (target.dia === bloque.dia && target.hora === bloque.horaInicio) return;

      this.moverBloque(bloque, target.dia, target.hora);
    }
  }

  private updateGhostDuracion(duracion: number): void {
    if (!this.paletaGhostEl || !this.paletaDragActiva) return;
    const act = this.paletaDragActiva;
    const hrs = this.getHorasAsignadas(act.id);
    const badgeColor = duracion > 1 ? '#10b981' : '#6366f1';

    this.paletaGhostEl.innerHTML = `
      <span style="
        display:inline-flex;align-items:center;justify-content:center;
        width:22px;height:22px;border-radius:50%;background:#374151;color:#fff;
        font-size:11px;font-weight:800;flex-shrink:0;
      ">${act.id}</span>
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;">
        ${this.getDescripcionCorta(act)}
      </span>
      <span style="
        display:inline-flex;align-items:center;justify-content:center;
        min-width:28px;height:20px;border-radius:10px;padding:0 6px;
        background:${badgeColor};color:#fff;font-size:11px;font-weight:800;
      ">${duracion}h</span>
      <span style="font-size:10px;color:#9ca3af;font-weight:500;">
        ${hrs}/${act.horas}h
      </span>
    `;
  }

  ngOnDestroy(): void {
    this.configSub?.unsubscribe();
    this.limpiarGhosts();
    this.paletaDragActiva = null;
    this.bloqueDragActivo = null;
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
    this.limpiarGhosts();
  }

  private limpiarGhosts(): void {
    if (this.paletaGhostEl) {
      this.paletaGhostEl.remove();
      this.paletaGhostEl = null;
    }
    if (this.bloqueGhostEl) {
      this.bloqueGhostEl.remove();
      this.bloqueGhostEl = null;
    }
    this.paletaDragActiva = null;
    this.bloqueDragActivo = null;
    this.paletaDragging = false;
    this.bloqueDragging = false;
    this.paletaDragRange = null;
    this.dragOverCell = null;
  }

  isDragOver(dia: string, hora: number): boolean {
    // No mostrar drag-over si hay un bloque lectivo en esta celda
    const tieneLectivo = this.bloques.some(b => 
      b.tipo === 'lectivo' && 
      b.dia === dia && 
      hora >= b.horaInicio && 
      hora < b.horaInicio + b.duracion
    );
    if (tieneLectivo) return false;
    return this.dragOverCell?.dia === dia && this.dragOverCell?.hora === hora;
  }

  isInDragRange(dia: string, hora: number): boolean {
    if (!this.paletaDragRange) return false;
    // No sombrear si hay un bloque lectivo en esta celda
    const tieneLectivo = this.bloques.some(b => 
      b.tipo === 'lectivo' && 
      b.dia === dia && 
      hora >= b.horaInicio && 
      hora < b.horaInicio + b.duracion
    );
    if (tieneLectivo) return false;
    return (
      dia === this.paletaDragRange.dia &&
      hora >= this.paletaDragRange.horaInicio &&
      hora < this.paletaDragRange.horaFin
    );
  }

  /* ── Drag de bloque existente (NATIVE MOUSE) ──────────────────── */

  onBloqueMouseDown(event: MouseEvent, bloque: BloqueVisual): void {
    if (!this.puedeEditar || bloque.tipo === 'lectivo') return;
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.bloque-actions')) return;

    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.bloqueDragOffsetX = event.clientX - rect.left;
    this.bloqueDragOffsetY = event.clientY - rect.top;

    this.bloqueDragActivo = bloque;
    this.bloqueDragging = false;

    const ghost = document.createElement('div');
    ghost.className = 'bloque-drag-ghost';
    ghost.innerHTML = `
      <span style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${bloque.titulo}
      </span>
      <span style="font-size:10px;opacity:0.9;">
        ${bloque.horaInicio}:00-${bloque.horaInicio + bloque.duracion}:00 (${bloque.duracion}h)
      </span>
    `;
    ghost.style.cssText = `
      position:fixed;z-index:2147483647;pointer-events:none;
      display:flex;flex-direction:column;gap:2px;
      padding:6px 10px;border-radius:8px;
      background:${bloque.color};color:white;
      border:2px solid rgba(255,255,255,0.5);
      box-shadow:0 8px 24px rgba(0,0,0,0.3);
      opacity:0.95;min-width:120px;max-width:200px;
      left:${event.clientX - this.bloqueDragOffsetX}px;
      top:${event.clientY - this.bloqueDragOffsetY}px;
      font-size:12px;line-height:1.3;
    `;
    document.body.appendChild(ghost);
    this.bloqueGhostEl = ghost;
  }

  private moverBloque(
    bloque: BloqueVisual,
    nuevoDia: string,
    nuevaHoraInicio: number
  ): void {
    const act = this.actividades.find((a) => a.id === bloque.actividadId);
    if (!act) return;

    const idx = act.horarios.findIndex(
      (h) =>
        diaNumericoACodigo(h.dia) === bloque.dia &&
        parseInt(h.hora_inicio.split(':')[0], 10) === bloque.horaInicio
    );
    if (idx === -1) return;

    const duracion = bloque.duracion;
    const nuevaHoraFin = nuevaHoraInicio + duracion;

    if (nuevaHoraFin > this.horaFin) {
      this.snackBar.open(`No puede exceder las ${this.horaFin}:00`, 'OK', { duration: 3000 });
      return;
    }

    if (
      !this.validarSolapamiento(
        nuevoDia,
        nuevaHoraInicio,
        nuevaHoraFin,
        act.id,
        bloque.horaInicio,
        bloque.dia
      )
    ) {
      return;
    }

    act.horarios[idx] = {
      dia: nuevoDia,
      hora_inicio: `${nuevaHoraInicio.toString().padStart(2, '0')}:00`,
      hora_fin: `${nuevaHoraFin.toString().padStart(2, '0')}:00`,
    };

    this.recalcularYEmitir();
  }

  /* ── Crear bloque ────────────────────────────────────────────── */

  private crearBloque(
    actividad: ActividadNoLectivaInput,
    dia: string,
    horaInicio: number,
    duracionExplicita?: number
  ): void {
    const horasAsignadas = this.getHorasAsignadas(actividad.id);
    const horasDeclaradas = Number('horas_totales' in actividad ? (actividad as any).horas_totales : actividad.horas) || 0;
    const horasPendientes = Math.max(0, horasDeclaradas - horasAsignadas);

    const duracion = duracionExplicita
      ? Math.min(duracionExplicita, horasPendientes)
      : Math.max(1, horasPendientes);
    const horaFin = horaInicio + duracion;

    if (horaFin > this.horaFin) {
      this.snackBar.open(
        `No caben ${duracion}h desde las ${horaInicio}:00 (máx. ${this.horaFin}:00)`,
        'OK',
        { duration: 3000 }
      );
      return;
    }

    if (!this.validarSolapamiento(dia, horaInicio, horaFin)) {
      return;
    }

    if (!this.validarPresupuestoHoras(actividad.id, duracion)) {
      return;
    }

    if (!this.validarLimitesGlobales(actividad.id, duracion)) {
      return;
    }

    actividad.horarios.push({
      dia,
      hora_inicio: `${horaInicio.toString().padStart(2, '0')}:00`,
      hora_fin: `${horaFin.toString().padStart(2, '0')}:00`,
    });

    this.recalcularYEmitir();
  }

  /* ── Extender / Reducir / Eliminar ──────────────────────────────── */

  extenderBloque(bloque: BloqueVisual, delta: number, event?: MouseEvent): void {
    event?.stopPropagation();
    if (!this.puedeEditar || bloque.tipo === 'lectivo') return;

    const act = this.actividades.find((a) => a.id === bloque.actividadId);
    if (!act) return;

    const idx = act.horarios.findIndex(
      (h) =>
        diaNumericoACodigo(h.dia) === bloque.dia &&
        parseInt(h.hora_inicio.split(':')[0], 10) === bloque.horaInicio
    );
    if (idx === -1) return;

    const h = act.horarios[idx];
    const ini = parseInt(h.hora_inicio.split(':')[0], 10);
    const fin = parseInt(h.hora_fin.split(':')[0], 10);
    const nuevaFin = fin + delta;

    if (nuevaFin > this.horaFin || nuevaFin <= ini) {
      this.snackBar.open('Duración inválida', 'OK', { duration: 3000 });
      return;
    }

    if (
      !this.validarSolapamiento(
        bloque.dia,
        ini,
        nuevaFin,
        act.id,
        bloque.horaInicio,
        bloque.dia
      )
    ) {
      return;
    }

    if (delta > 0 && !this.validarPresupuestoHoras(act.id, delta)) {
      return;
    }
    if (delta > 0 && !this.validarLimitesGlobales(act.id, delta)) {
      return;
    }

    act.horarios[idx] = {
      ...h,
      hora_fin: `${nuevaFin.toString().padStart(2, '0')}:00`,
    };

    this.recalcularYEmitir();
  }

  eliminarBloque(bloque: BloqueVisual, event?: MouseEvent): void {
    event?.stopPropagation();
    if (!this.puedeEditar || bloque.tipo === 'lectivo') return;

    const act = this.actividades.find((a) => a.id === bloque.actividadId);
    if (!act) return;

    act.horarios = act.horarios.filter(
      (h) =>
        !(
          diaNumericoACodigo(h.dia) === bloque.dia &&
          parseInt(h.hora_inicio.split(':')[0], 10) === bloque.horaInicio
        )
    );

    this.recalcularYEmitir();
  }

  limpiarHorariosNoLectivos(): void {
    if (!this.puedeEditar) return;
    this.actividades.forEach((act) => {
      act.horarios = [];
    });
    this.recalcularYEmitir();
  }

  /* ── Validaciones ───────────────────────────────────────────────── */

  private validarSolapamiento(
    dia: string,
    ini: number,
    fin: number,
    excluirActividadId?: number,
    excluirHoraInicio?: number,
    excluirDia?: string
  ): boolean {
    const diaNorm = diaNumericoACodigo(dia);
    if (!this.esDiaValido(diaNorm)) {
      this.snackBar.open('Día de la semana no válido', 'OK', { duration: 3000 });
      return false;
    }

    const hIniStr = `${ini.toString().padStart(2, '0')}:00`;
    const hFinStr = `${fin.toString().padStart(2, '0')}:00`;

    // Solo ignorar conflicto con lectivos si el horario está COMPLETAMENTE dentro de la franja de almuerzo
    const completamenteEnAlmuerzo = ini >= this.almuerzoInicio && fin <= this.almuerzoFin;

    if (!completamenteEnAlmuerzo) {
      // Validar conflicto con lectivos en la parte fuera del almuerzo
      const conflictoLectivo = this.horariosLectivos.some((lec) => {
        if (diaNumericoACodigo(lec.dia) !== diaNorm) return false;
        return seSuperponen(hIniStr, hFinStr, lec.hora_inicio, lec.hora_fin);
      });
      if (conflictoLectivo) {
        this.snackBar.open('Conflicto con horario lectivo', 'OK', {
          duration: 3000,
        });
        return false;
      }
    }

    const conflictoNoLectivo = this.actividades.some((a) => {
      return a.horarios.some((h) => {
        if (diaNumericoACodigo(h.dia) !== diaNorm) return false;
        if (
          excluirActividadId !== undefined &&
          a.id === excluirActividadId &&
          parseInt(h.hora_inicio.split(':')[0], 10) === excluirHoraInicio &&
          diaNumericoACodigo(h.dia) === diaNorm
        ) {
          return false;
        }
        return seSuperponen(hIniStr, hFinStr, h.hora_inicio, h.hora_fin);
      });
    });
    if (conflictoNoLectivo) {
      this.snackBar.open('Conflicto con otra actividad no lectiva', 'OK', {
        duration: 3000,
      });
      return false;
    }

    return true;
  }

  private validarPresupuestoHoras(actividadId: number, deltaHoras: number): boolean {
    const act = this.actividades.find((a) => a.id === actividadId);
    if (!act) return false;
    const asignadas = this.getHorasAsignadas(actividadId);
    const declaradas = Number('horas_totales' in act ? (act as any).horas_totales : act.horas) || 0;
    if (asignadas + deltaHoras > declaradas) {
      this.snackBar.open(
        `Rubro ${actividadId}: ya asignó ${asignadas}h de ${declaradas}h declaradas. Quedan ${declaradas - asignadas}h disponibles.`,
        'OK',
        { duration: 4000 }
      );
      return false;
    }
    return true;
  }

  private validarLimitesGlobales(actividadId: number, deltaHoras: number): boolean {
    if (actividadId === 2) {
      const maxPrep = Math.floor(this.totalHorasLectivas * 0.5);
      const act2 = this.actividades.find((a) => a.id === 2);
      const horasPrepDeclaradas = act2 ? (Number('horas_totales' in act2 ? (act2 as any).horas_totales : act2.horas) || 0) : 0;
      if (horasPrepDeclaradas > maxPrep) {
        const asignadas = this.getHorasAsignadas(2);
        if (asignadas + deltaHoras > maxPrep) {
          this.snackBar.open(`Preparación máxima: ${maxPrep}h (ya tiene ${asignadas}h asignadas)`, 'OK', {
            duration: 4000,
          });
          return false;
        }
      }
    }

    const totalNoLectivasDeclaradas = this.actividades.reduce(
      (sum, a) => sum + (Number('horas_totales' in a ? (a as any).horas_totales : a.horas) || 0),
      0
    );
    const totalProyectado =
      this.totalHorasLectivas + totalNoLectivasDeclaradas;
    if (totalProyectado > this.horasModalidad) {
      this.snackBar.open(`Excedería ${this.horasModalidad}h totales (actual: ${totalProyectado}h)`, 'OK', {
        duration: 4000,
      });
      return false;
    }

    return true;
  }

  /* ── UI helpers ─────────────────────────────────────────────────── */

  onCerrar(): void {
    this.cerrar.emit();
  }
}
