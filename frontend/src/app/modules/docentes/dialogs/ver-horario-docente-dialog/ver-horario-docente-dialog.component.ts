import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ApiService } from '../../../../core/services/api.service';
import { PeriodoService } from '../../../../core/services/periodo.service';
import {
  Docente,
  HorarioAsignado,
  ApiResponse,
} from '../../../../core/interfaces/entities';

export interface CeldaHorario {
  asig: HorarioAsignado | null;
  rowspan: number;
  skip: boolean;
  esAlmuerzo: boolean;
}

@Component({
  selector: 'app-ver-horario-docente-dialog',
  templateUrl: './ver-horario-docente-dialog.component.html',
  styleUrls: ['./ver-horario-docente-dialog.component.scss'],
})
export class VerHorarioDocenteDialogComponent implements OnInit, OnDestroy {
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  diasNum = [1, 2, 3, 4, 5];
  horas = Array.from({ length: 15 }, (_, i) => i + 7);

  asignaciones: HorarioAsignado[] = [];
  loading = false;
  descargando = false;

  almuerzoInicio = 12;
  almuerzoFin = 14;

  private _gridCache: Map<string, CeldaHorario> = new Map();
  private periodSub?: Subscription;

  constructor(
    private dialogRef: MatDialogRef<VerHorarioDocenteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public docente: Docente,
    private api: ApiService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
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
      .get<ApiResponse<any>>(`/horarios/docente/${this.docente.id}`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (r) => {
          const raw: HorarioAsignado[] = r.data?.items ?? r.data ?? [];
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
    this.descargando = true;
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      const periodo = this.periodoService.periodo ?? '';
      const docNombre = `${this.docente.apellidos}, ${this.docente.nombres}`;
      const codigo = this.docente.codigo ?? '';
      const categoria = (this.docente as any).categoria ?? '';
      const almuerzIni = this.almuerzoInicio;
      const almuerzFin = this.almuerzoFin;

      // ── Paleta ────────────────────────────────────────────────────────────
      const C = {
        primary: [79, 70, 229] as [number, number, number],
        primaryDark: [55, 48, 163] as [number, number, number],
        primaryLight: [237, 233, 254] as [number, number, number],
        primaryText: [55, 48, 163] as [number, number, number],
        labBg: [209, 250, 229] as [number, number, number],
        labFg: [6, 78, 59] as [number, number, number],
        labBorder: [16, 185, 129] as [number, number, number],
        rowAlt: [248, 247, 255] as [number, number, number],
        horaCol: [241, 245, 249] as [number, number, number],
        horaTxt: [51, 65, 85] as [number, number, number],
        border: [203, 213, 225] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
        gray: [100, 116, 139] as [number, number, number],
        dark: [15, 23, 42] as [number, number, number],
      };

      const PAGE_W = 297;

      // ── Cabecera principal ────────────────────────────────────────────────
      doc.setFillColor(...C.primaryDark);
      doc.rect(0, 0, PAGE_W, 22, 'F');

      // Franja decorativa inferior cabecera
      doc.setFillColor(...C.primary);
      doc.rect(0, 18, PAGE_W, 4, 'F');

      doc.setTextColor(...C.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('HORARIO ACADEMICO', 12, 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Universidad Nacional de Trujillo', 12, 15);

      // Info docente (derecha)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const infoX = PAGE_W - 12;
      doc.text(docNombre, infoX, 7, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const partes: string[] = [];
      if (codigo) partes.push(`Cod: ${codigo}`);
      if (categoria) partes.push(categoria);
      partes.push(`Periodo: ${periodo}`);
      partes.push(`${this.totalHorasSemanales} hrs/sem`);
      doc.text(partes.join('  |  '), infoX, 13, { align: 'right' });

      // ── Paleta almuerzo ───────────────────────────────────────────────────
      const C_ALM_BG: [number, number, number] = [255, 243, 205];
      const C_ALM_FG: [number, number, number] = [146, 64, 14];
      const C_ALM_BD: [number, number, number] = [251, 191, 36];

      // ── Construir matriz de datos ─────────────────────────────────────────
      // col 0 = Hora label, col 1-5 = dia 1-5 (Lunes-Viernes)
      type TipoCelda = 'TEORIA' | 'LABORATORIO' | 'ALMUERZO' | 'LIBRE';
      interface SlotInfo {
        texto: string;
        tipo: TipoCelda;
        raw: HorarioAsignado | null;
        // para rowspan en PDF: cuántas filas ocupa desde esta
        span: number;
        // si esta celda ya fue absorbida por un span superior
        absorbida: boolean;
      }

      // Primera pasada: encontrar qué slot hay en cada (hora, dia)
      const grid: SlotInfo[][] = this.horas.map((hora) => {
        const filaHora = this.fmtHStr(hora);
        const esAlm = hora >= almuerzIni && hora < almuerzFin;
        const cols: SlotInfo[] = [
          {
            texto: filaHora,
            tipo: 'LIBRE',
            raw: null,
            span: 1,
            absorbida: false,
          },
        ];
        for (const dia of this.diasNum) {
          const asig =
            this.asignaciones.find(
              (a) => a.dia_semana === dia && a.hora_inicio === filaHora,
            ) ?? null;
          if (asig) {
            const finH = asig.hora_fin
              ? parseInt(asig.hora_fin.split(':')[0], 10)
              : hora + 1;
            const span = Math.max(1, finH - hora);
            const curso = asig.curso?.nombre ?? '—';
            const amb = asig.ambiente?.codigo ?? '—';
            const tipo = asig.tipo_clase === 'LABORATORIO' ? 'LAB' : 'TEO';
            cols.push({
              texto: `[${tipo}] ${curso}\n${amb}\n${asig.hora_inicio}–${asig.hora_fin}`,
              tipo:
                asig.tipo_clase === 'LABORATORIO' ? 'LABORATORIO' : 'TEORIA',
              raw: asig,
              span,
              absorbida: false,
            });
          } else if (esAlm) {
            cols.push({
              texto: 'Almuerzo',
              tipo: 'ALMUERZO',
              raw: null,
              span: 1,
              absorbida: false,
            });
          } else {
            cols.push({
              texto: '',
              tipo: 'LIBRE',
              raw: null,
              span: 1,
              absorbida: false,
            });
          }
        }
        return cols;
      });

      // Segunda pasada: marcar celdas absorbidas por span
      for (let r = 0; r < grid.length; r++) {
        for (let c = 1; c <= 5; c++) {
          const slot = grid[r][c];
          if (slot.span > 1 && !slot.absorbida) {
            for (let s = 1; s < slot.span && r + s < grid.length; s++) {
              grid[r + s][c].absorbida = true;
            }
          }
        }
      }

      // Construir head y body (sin filas absorbidas, marcamos con texto especial)
      const head = [
        ['Hora', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'],
      ];
      const body = grid.map((fila) =>
        fila.map((s) => (s.absorbida ? '↕' : s.texto)),
      );

      // ── autoTable ─────────────────────────────────────────────────────────
      autoTable(doc, {
        startY: 27,
        head,
        body,
        styles: {
          fontSize: 7,
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          valign: 'middle',
          halign: 'center',
          lineColor: C.border,
          lineWidth: 0.25,
          textColor: C.dark,
        },
        headStyles: {
          fillColor: C.primary,
          textColor: C.white,
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center',
          cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
        },
        columnStyles: {
          0: {
            halign: 'center',
            fontStyle: 'bold',
            fillColor: C.horaCol,
            textColor: C.horaTxt,
            cellWidth: 16,
            fontSize: 7.5,
          },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 'auto' },
        },
        didParseCell: (data: any) => {
          if (data.section !== 'body') return;
          if (data.column.index === 0) return; // col hora: ya tiene estilo
          const ri = data.row.index;
          const ci = data.column.index; // 1-5 = dia 1-5
          const fila = grid[ri];
          if (!fila) return;
          const slot = fila[ci];

          // Celda absorbida por span: se oculta visualmente
          if (slot.absorbida) {
            data.cell.styles.fillColor = C.white;
            data.cell.styles.textColor = C.white;
            data.cell.styles.fontSize = 1;
            data.cell.styles.lineColor = C.white;
            return;
          }

          if (slot.tipo === 'ALMUERZO') {
            data.cell.styles.fillColor = C_ALM_BG;
            data.cell.styles.textColor = C_ALM_FG;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.lineColor = C_ALM_BD;
            return;
          }
          if (slot.tipo === 'LABORATORIO') {
            data.cell.styles.fillColor = C.labBg;
            data.cell.styles.textColor = C.labFg;
            data.cell.styles.fontStyle = 'bold';
            return;
          }
          if (slot.tipo === 'TEORIA') {
            const esPar = ri % 2 === 0;
            data.cell.styles.fillColor = esPar
              ? C.primaryLight
              : ([228, 224, 252] as [number, number, number]);
            data.cell.styles.textColor = C.primaryText;
            data.cell.styles.fontStyle = 'bold';
            return;
          }
          // LIBRE
          data.cell.styles.fillColor = C.white;
        },
        alternateRowStyles: { fillColor: C.rowAlt },
        margin: { left: 8, right: 8 },
        rowPageBreak: 'avoid',
        tableLineColor: C.border,
        tableLineWidth: 0.3,
      });

      // ── Pie de página ─────────────────────────────────────────────────────
      const finalY = (doc as any).lastAutoTable?.finalY ?? 185;
      const pieY = finalY + 7;

      // Rectángulo de leyenda
      doc.setFillColor(...C.rowAlt);
      doc.roundedRect(8, pieY - 1, 140, 9, 1.5, 1.5, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');

      doc.setFillColor(...C.primary);
      doc.rect(12, pieY + 1.5, 4, 4, 'F');
      doc.setTextColor(...C.primaryText);
      doc.text('Teoria', 18, pieY + 5);

      doc.setFillColor(...C.labBorder);
      doc.rect(38, pieY + 1.5, 4, 4, 'F');
      doc.setTextColor(...C.labFg);
      doc.text('Laboratorio', 44, pieY + 5);

      doc.setFillColor(...C_ALM_BD);
      doc.rect(70, pieY + 1.5, 4, 4, 'F');
      doc.setTextColor(...C_ALM_FG);
      doc.text(
        `Almuerzo (${this.fmtHStr(almuerzIni)}-${this.fmtHStr(almuerzFin)})`,
        76,
        pieY + 5,
      );

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.gray);
      doc.setFontSize(6.5);
      doc.text(
        `Generado el ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        PAGE_W - 8,
        pieY + 5,
        { align: 'right' },
      );

      // Línea de borde inferior
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.3);
      doc.line(8, pieY + 9, PAGE_W - 8, pieY + 9);

      doc.save(`Horario_${this.docente.apellidos}_${periodo}.pdf`);
    } catch (e) {
      console.error('PDF error:', e);
      this.snackBar.open('Error al generar el PDF', 'Cerrar', {
        duration: 3000,
      });
    } finally {
      this.descargando = false;
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
