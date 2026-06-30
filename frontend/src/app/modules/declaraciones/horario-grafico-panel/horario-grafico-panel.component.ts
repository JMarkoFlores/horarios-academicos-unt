import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  CdkDrag,
  CdkDragEnd,
  CdkDragRelease,
  CdkDragStart,
} from '@angular/cdk/drag-drop';
import {
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
  horarios: HorarioBloque[];
  horasManual: boolean;
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

const HORA_INICIO = 7;
const HORA_FIN = 20;
const DIAS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

const COLOR_RUBRO: Record<number, string> = {
  2: '#e91e63',
  3: '#2196f3',
  4: '#2196f3',
  5: '#2196f3',
  6: '#ff9800',
  7: '#ff9800',
  8: '#ff9800',
  9: '#ff9800',
  10: '#ff9800',
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
    CdkDrag,
  ],
  templateUrl: './horario-grafico-panel.component.html',
  styleUrls: ['./horario-grafico-panel.component.scss'],
})
export class HorarioGraficoPanelComponent implements OnInit, OnChanges {
  @Input() actividades: ActividadNoLectivaInput[] = [];
  @Input() horariosLectivos: HorarioLectivoRef[] = [];
  @Input() puedeEditar = false;
  @Input() totalHorasLectivas = 0;
  @Input() horasModalidad = 40;
  @Input() totalHorasCargaAdicional = 0;

  @Output() actividadesChange = new EventEmitter<ActividadNoLectivaInput[]>();
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('gradillaRef', { static: true }) gradillaRef!: ElementRef<HTMLDivElement>;

  dias = DIAS;
  horasRange: number[] = [];
  bloques: BloqueVisual[] = [];

  totalNoLectivas = 0;
  totalGeneral = 0;
  excedeLimite = false;
  preparacionExcede = false;

  private draggingBloqueOriginal: BloqueVisual | null = null;

  constructor(
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.horasRange = Array.from(
      { length: HORA_FIN - HORA_INICIO + 1 },
      (_, i) => HORA_INICIO + i
    );
    this.construirBloques();
    this.calcularTotales();
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
    return this.dias.indexOf(dia);
  }

  getRow(horaInicio: number): number {
    return horaInicio - HORA_INICIO;
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

  getHorasActividad(act: ActividadNoLectivaInput): number {
    return act.horarios.reduce((sum, h) => {
      const ini = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin = parseInt(h.hora_fin.split(':')[0], 10);
      return sum + (fin - ini);
    }, 0);
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

    // Lectivos (referencia, no arrastrables)
    this.horariosLectivos.forEach((lec, idx) => {
      const dia = diaNumericoACodigo(lec.dia);
      const ini = parseInt(lec.hora_inicio.split(':')[0], 10);
      const fin = parseInt(lec.hora_fin.split(':')[0], 10);
      if (ini >= HORA_INICIO && ini < HORA_FIN) {
        next.push({
          id: `lec-${idx}`,
          tipo: 'lectivo',
          titulo: lec.codigoCurso || lec.nombreCurso || 'Curso',
          dia,
          horaInicio: ini,
          duracion: Math.min(fin - ini, HORA_FIN - ini),
          color: '#c5cae9',
        });
      }
    });

    // No lectivos
    this.actividades.forEach((act) => {
      act.horarios.forEach((h, idx) => {
        const dia = diaNumericoACodigo(h.dia);
        const ini = parseInt(h.hora_inicio.split(':')[0], 10);
        const fin = parseInt(h.hora_fin.split(':')[0], 10);
        if (ini >= HORA_INICIO && ini < HORA_FIN) {
          next.push({
            id: `nl-${act.id}-${idx}-${dia}-${ini}`,
            tipo: 'no-lectivo',
            actividadId: act.id,
            titulo: this.getTituloBloque(act),
            dia,
            horaInicio: ini,
            duracion: Math.min(fin - ini, HORA_FIN - ini),
            color: this.getColorPorRubro(act.id),
          });
        }
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
    return act.horarios.reduce((sum, h) => {
      const ini = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin = parseInt(h.hora_fin.split(':')[0], 10);
      return sum + (fin - ini);
    }, 0);
  }

  calcularTotales(): void {
    // Las horas no lectivas son las DECLARADAS arriba (no las de la gradilla)
    this.totalNoLectivas = this.actividades.reduce(
      (sum, a) => sum + (Number(a.horas) || 0),
      0
    );
    this.totalGeneral =
      this.totalHorasLectivas + this.totalNoLectivas + this.totalHorasCargaAdicional;
    this.excedeLimite = this.totalGeneral > this.horasModalidad;

    const act2 = this.actividades.find((a) => a.id === 2);
    const horasPrep = act2 ? (Number(act2.horas) || 0) : 0;
    this.preparacionExcede = horasPrep > Math.floor(this.totalHorasLectivas * 0.5);
  }

  private recalcularYEmitir(): void {
    this.construirBloques();
    this.calcularTotales();
    this.cdr.detectChanges();
    // Emitir copias para que el padre detecte cambio
    this.actividadesChange.emit(
      this.actividades.map((a) => ({
        ...a,
        horarios: a.horarios.map((h) => ({ ...h })),
      }))
    );
  }

  /* ── Drag de paleta → celda ─────────────────────────────────────── */

  onPaletaDragReleased(event: CdkDragRelease, actividad: ActividadNoLectivaInput): void {
    if (!this.puedeEditar) return;
    if (this.getHorasAsignadas(actividad.id) >= actividad.horas) return;

    // Pequeña demora para que el DOM del preview se retire antes de detectar
    setTimeout(() => {
      const pointerEvent = event.event as MouseEvent;
      const x = pointerEvent.clientX;
      const y = pointerEvent.clientY;
      const elements = document.elementsFromPoint(x, y);
      const celdaEl = elements.find((el) => el.classList.contains('drop-cell'));
      if (!celdaEl) return;

      const dia = celdaEl.getAttribute('data-dia');
      const horaStr = celdaEl.getAttribute('data-hora');
      if (!dia || !horaStr) return;

      const hora = parseInt(horaStr, 10);
      this.crearBloque(actividad, dia, hora);
    }, 50);
  }

  private crearBloque(
    actividad: ActividadNoLectivaInput,
    dia: string,
    horaInicio: number
  ): void {
    // Duracion = horas restantes por asignar para esta actividad
    const horasAsignadas = this.getHorasAsignadas(actividad.id);
    const horasDeclaradas = Number(actividad.horas) || 0;
    const duracion = Math.max(1, horasDeclaradas - horasAsignadas);
    const horaFin = horaInicio + duracion;

    if (horaFin > HORA_FIN) {
      this.snackBar.open(
        `No caben ${duracion}h desde las ${horaInicio}:00 (máx. ${HORA_FIN}:00)`,
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

  /* ── Drag de bloque existente ───────────────────────────────────── */

  onDragStarted(_event: CdkDragStart, bloque: BloqueVisual): void {
    this.draggingBloqueOriginal = { ...bloque };
  }

  onDragEnded(event: CdkDragEnd, bloque: BloqueVisual): void {
    if (!this.puedeEditar || bloque.tipo === 'lectivo') return;

    const { x, y } = event.dropPoint;
    const elements = document.elementsFromPoint(x, y);
    const celdaEl = elements.find((el) => el.classList.contains('drop-cell'));
    if (!celdaEl) return;

    const match = celdaEl.id.match(/cell-([A-Z]+)-(\d+)/);
    if (!match) return;

    const nuevoDia = match[1];
    const nuevaHora = parseInt(match[2], 10);

    if (nuevoDia === bloque.dia && nuevaHora === bloque.horaInicio) return;

    this.moverBloque(bloque, nuevoDia, nuevaHora);
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

    if (nuevaHoraFin > HORA_FIN) {
      this.snackBar.open('No puede exceder las 20:00', 'OK', { duration: 3000 });
      return;
    }

    // Validar que no solape con otros (excluyendo este bloque)
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

    if (nuevaFin > HORA_FIN || nuevaFin <= ini) {
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
    const hIniStr = `${ini.toString().padStart(2, '0')}:00`;
    const hFinStr = `${fin.toString().padStart(2, '0')}:00`;

    // Contra lectivos
    const conflictoLectivo = this.horariosLectivos.some((lec) => {
      if (diaNumericoACodigo(lec.dia) !== diaNorm) return false;
      const lecIni = lec.hora_inicio;
      const lecFin = lec.hora_fin;
      return seSuperponen(hIniStr, hFinStr, lecIni, lecFin);
    });
    if (conflictoLectivo) {
      this.snackBar.open('Conflicto con horario lectivo', 'OK', {
        duration: 3000,
      });
      return false;
    }

    // Contra otros no lectivos
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
    const declaradas = Number(act.horas) || 0;
    if (asignadas + deltaHoras > declaradas) {
      this.snackBar.open(
        `Rubro ${actividadId}: ya asignó ${asignadas}h de ${declaradas}h declaradas`,
        'OK',
        { duration: 3000 }
      );
      return false;
    }
    return true;
  }

  private validarLimitesGlobales(actividadId: number, deltaHoras: number): boolean {
    // Rubro 2: max 50% lectivas (basado en horas DECLARADAS, no asignadas)
    if (actividadId === 2) {
      const maxPrep = Math.floor(this.totalHorasLectivas * 0.5);
      const act2 = this.actividades.find((a) => a.id === 2);
      const horasPrepDeclaradas = act2 ? (Number(act2.horas) || 0) : 0;
      if (horasPrepDeclaradas > maxPrep) {
        // Si ya declaró más arriba, eso es problema del campo de texto
        // Pero en la gradilla solo permitimos hasta maxPrep
        const asignadas = this.getHorasAsignadas(2);
        if (asignadas + deltaHoras > maxPrep) {
          this.snackBar.open(`Preparación máxima: ${maxPrep}h`, 'OK', {
            duration: 3000,
          });
          return false;
        }
      }
    }

    // Total modalidad (usando horas DECLARADAS de la tabla)
    const totalNoLectivasDeclaradas = this.actividades.reduce(
      (sum, a) => sum + (Number(a.horas) || 0),
      0
    );
    const totalProyectado =
      this.totalHorasLectivas + totalNoLectivasDeclaradas + this.totalHorasCargaAdicional;
    if (totalProyectado > this.horasModalidad) {
      this.snackBar.open(`Excedería ${this.horasModalidad}h totales`, 'OK', {
        duration: 3000,
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
