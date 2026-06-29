import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx-js-style';
import { ConfiguracionGeneral } from './configuracion-general.service';
import { HorarioAsignado } from '../interfaces/entities';

export interface CeldaHorario {
  asig: HorarioAsignado | null;
  rowspan: number;
  skip: boolean;
  esAlmuerzo: boolean;
  mergedTipos: string[];
  mergedAmbs: string[];
}

export interface CursoItem {
  curso: any;
  colorHex: string;
}

export interface CursoStats {
  t: number;
  p: number;
  l: number;
  grupos: number;
  total: number;
}

function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

const PASTEL_PALETTE_RGB: [number, number, number][] = [
  [254, 226, 226], [255, 237, 213], [254, 240, 138], [217, 249, 157], [220, 252, 231],
  [204, 253, 246], [207, 250, 254], [219, 234, 254], [224, 231, 255], [237, 233, 254],
  [243, 232, 255], [252, 231, 243], [255, 228, 230],
];

const PASTEL_PALETTE_HEX: string[] = [
  'FEE2E2', 'FFEDD5', 'FEF08A', 'D9F99D', 'DCFCE7', 'CCFDF6', 'CFFAFE', 'DBEAFE',
  'E0E7FF', 'EDE9FE', 'F3E8FF', 'FCE7F3', 'FFE4E6',
];

@Injectable({ providedIn: 'root' })
export class HorarioExportService {
  setupCourseColors(asignaciones: HorarioAsignado[]): {
    colorMap: Map<number, [number, number, number]>;
    hexMap: Map<number, string>;
    cursosList: CursoItem[];
  } {
    const colorMap = new Map<number, [number, number, number]>();
    const hexMap = new Map<number, string>();
    const cursosUnicos = [...new Map(asignaciones.map(a => [a.curso?.id, a.curso])).values()].filter(c => c);

    cursosUnicos.forEach((curso, idx) => {
      if (!curso?.id) return;
      const i = idx % PASTEL_PALETTE_RGB.length;
      colorMap.set(curso.id, PASTEL_PALETTE_RGB[i]);
      hexMap.set(curso.id, '#' + PASTEL_PALETTE_HEX[i]);
    });

    const cursosList = cursosUnicos.map(c => ({
      curso: c,
      colorHex: hexMap.get(c?.id ?? 0) || '#F8FAFC',
    }));

    return { colorMap, hexMap, cursosList };
  }

  getCursoColorHex(hexMap: Map<number, string>, cursoId: number): string {
    return hexMap.get(cursoId) || '#F8FAFC';
  }

  getCursoColorRGB(colorMap: Map<number, [number, number, number]>, cursoId: number): [number, number, number] {
    return colorMap.get(cursoId) || [248, 250, 252];
  }

  calcularStatsCurso(asigs: HorarioAsignado[]): CursoStats {
    const uniqueBlocks = new Map<string, HorarioAsignado>();
    asigs.forEach(a => {
      const key = `${a.dia_semana}-${a.hora_inicio}-${a.hora_fin}-${a.tipo_clase}`;
      if (!uniqueBlocks.has(key)) uniqueBlocks.set(key, a);
    });

    let totalHoras = 0;
    uniqueBlocks.forEach(a => {
      const inicio = a.hora_inicio?.split(':').map(Number);
      const fin = a.hora_fin?.split(':').map(Number);
      if (inicio && fin && inicio.length >= 2 && fin.length >= 2) {
        totalHoras += (fin[0] + fin[1] / 60) - (inicio[0] + inicio[1] / 60);
      }
    });

    const gruposLab = new Set<string>();
    const gruposPra = new Set<string>();
    const gruposTeo = new Set<string>();
    asigs.forEach(a => {
      if (a.grupo?.nombre) {
        if (a.tipo_clase === 'LABORATORIO') gruposLab.add(a.grupo.nombre);
        else if (a.tipo_clase === 'PRACTICA') gruposPra.add(a.grupo.nombre);
        else if (a.tipo_clase === 'TEORIA') gruposTeo.add(a.grupo.nombre);
      }
    });

    let maxT = 0, maxP = 0, maxL = 0;
    const todosLosGrupos = new Set([...gruposLab, ...gruposPra, ...gruposTeo]);

    if (todosLosGrupos.size > 0) {
      Array.from(todosLosGrupos).forEach(gName => {
        let t = 0, p = 0, l = 0;
        const asigsGroup = asigs.filter(a => a.grupo?.nombre === gName);
        const mgBlocks = new Map<string, HorarioAsignado>();
        asigsGroup.forEach(a => {
          const key = `${a.dia_semana}-${a.hora_inicio}-${a.hora_fin}-${a.tipo_clase}`;
          mgBlocks.set(key, a);
        });
        mgBlocks.forEach(a => {
          const inicio = a.hora_inicio?.split(':').map(Number);
          const fin = a.hora_fin?.split(':').map(Number);
          if (inicio && fin) {
            const dur = (fin[0] + fin[1] / 60) - (inicio[0] + inicio[1] / 60);
            if (a.tipo_clase === 'TEORIA') t += dur;
            else if (a.tipo_clase === 'PRACTICA') p += dur;
            else if (a.tipo_clase === 'LABORATORIO') l += dur;
          }
        });
        if (t > maxT) maxT = t;
        if (p > maxP) maxP = p;
        if (l > maxL) maxL = l;
      });
    } else {
      uniqueBlocks.forEach(a => {
        const inicio = a.hora_inicio?.split(':').map(Number);
        const fin = a.hora_fin?.split(':').map(Number);
        if (inicio && fin) {
          const dur = (fin[0] + fin[1] / 60) - (inicio[0] + inicio[1] / 60);
          if (a.tipo_clase === 'TEORIA') maxT += dur;
          else if (a.tipo_clase === 'PRACTICA') maxP += dur;
          else if (a.tipo_clase === 'LABORATORIO') maxL += dur;
        }
      });
    }

    const numGrupos = maxL > 0 ? gruposLab.size : 0;
    return { t: maxT, p: maxP, l: maxL, grupos: numGrupos, total: totalHoras };
  }

  generarPDF(
    docente: any,
    asignaciones: HorarioAsignado[],
    dias: string[],
    diasNum: number[],
    horas: number[],
    grid: Map<string, CeldaHorario>,
    cursosUnicosList: CursoItem[],
    colorMap: Map<number, [number, number, number]>,
    config: ConfiguracionGeneral,
    periodo: string,
    summaryHoras: number,
    franjaInicio: number,
    franjaFin: number,
    almuerzoInicio: number,
    almuerzoFin: number,
    horasMaxDiarias: number,
    horasMaxSemanales: number,
    duracionBloque: number,
    esAlmuerzoHora: (h: number) => boolean,
    fmtH: (h: number) => string
  ): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const PW = 297, ML = 14, MR = 14, TW = PW - ML - MR;
    const nD = diasNum.length;
    const HORA_W = 16;
    const DAY_W = (TW - HORA_W) / nD;
    const ROW_H = 9;

    const P = hex2rgb(config.color_primario);
    const ink: [number, number, number] = [15, 23, 42];
    const muted: [number, number, number] = [100, 116, 139];
    const subtle: [number, number, number] = [226, 232, 240];
    const surface: [number, number, number] = [248, 250, 252];
    const white: [number, number, number] = [255, 255, 255];
    const almBg: [number, number, number] = [241, 245, 249];
    const almTx: [number, number, number] = [71, 85, 105];

    // Header
    doc.setFillColor(...white);
    doc.rect(0, 0, PW, 22, 'F');
    doc.setFillColor(...P);
    doc.rect(0, 0, 3, 22, 'F');
    doc.setDrawColor(...subtle);
    doc.setLineWidth(0.4);
    doc.line(ML, 22, PW - MR, 22);

    doc.setTextColor(...ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('HORARIO ACADEMICO', ML, 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text('Universidad Nacional de Trujillo', ML, 15);

    const rx = PW - MR;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...ink);
    doc.text(`${docente.apellidos}, ${docente.nombres}`, rx, 8, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    const parts: string[] = [];
    if (docente.codigo) parts.push(docente.codigo);
    parts.push(periodo ?? '');
    parts.push(`${summaryHoras}h/sem`);
    doc.text(parts.join('  ·  '), rx, 14, { align: 'right' });

    // Rules bar
    const ry = 25;
    doc.setFontSize(6);
    doc.setTextColor(...muted);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Franja: ${fmtH(franjaInicio)}–${fmtH(franjaFin)}  |  Almuerzo: ${fmtH(almuerzoInicio)}–${fmtH(almuerzoFin)}  |  Max diaria: ${horasMaxDiarias}h  |  Max semanal: ${horasMaxSemanales}h`,
      ML, ry,
    );

    // Cursos list table
    let cursosY = ry + 4;

    if (cursosUnicosList.length > 0) {
      doc.setDrawColor(...subtle);
      doc.setLineWidth(0.2);
      doc.line(ML, cursosY, PW - MR, cursosY);
      cursosY += 3;

      const cursosData = cursosUnicosList.map((item, idx) => {
        const curso = item.curso;
        const asigs = asignaciones.filter(a => a.curso?.id === curso.id);
        const stats = this.calcularStatsCurso(asigs);
        return {
          n: idx + 1,
          nombre: curso.nombre || '',
          codigo: curso.codigo || '',
          t: stats.t.toFixed(1),
          p: stats.p.toFixed(1),
          l: stats.l.toFixed(1),
          g: stats.grupos,
          total: stats.total.toFixed(1),
          color: this.getCursoColorRGB(colorMap, curso.id),
        };
      });

      const tableY = cursosY + 2;
      const colWidths = [8, 50, 15, 15, 15, 12, 15];
      const colX = [ML, ML + colWidths[0], ML + colWidths[0] + colWidths[1], ML + colWidths[0] + colWidths[1] + colWidths[2], ML + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], ML + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], ML + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5]];
      const headers = ['N', 'Asignatura', 'T', 'P', 'L', 'G', 'Total'];

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...ink);
      headers.forEach((h, i) => {
        doc.text(h, colX[i] + colWidths[i] / 2, tableY + 4, { align: 'center' });
      });

      let rowY = tableY + 8;
      cursosData.forEach((c: any) => {
        const bg = c.color as [number, number, number];
        const fg = ink;

        doc.setFillColor(...bg);
        doc.rect(ML, rowY, TW, 6, 'F');
        doc.setDrawColor(...subtle);
        doc.setLineWidth(0.1);
        doc.rect(ML, rowY, TW, 6, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...fg);

        doc.text(String(c.n), colX[0] + colWidths[0] / 2, rowY + 4, { align: 'center' });
        doc.text(`${c.codigo} ${c.nombre}`, colX[1] + 2, rowY + 4, { align: 'left' });
        doc.text(c.t, colX[2] + colWidths[2] / 2, rowY + 4, { align: 'center' });
        doc.text(c.p, colX[3] + colWidths[3] / 2, rowY + 4, { align: 'center' });
        doc.text(c.l, colX[4] + colWidths[4] / 2, rowY + 4, { align: 'center' });
        doc.text(String(c.g), colX[5] + colWidths[5] / 2, rowY + 4, { align: 'center' });
        doc.text(c.total, colX[6] + colWidths[6] / 2, rowY + 4, { align: 'center' });

        rowY += 6;
      });

      doc.setDrawColor(...subtle);
      doc.setLineWidth(0.2);
      doc.line(ML, rowY + 2, PW - MR, rowY + 2);

      doc.addPage();
      var y = 22;
    } else {
      var y = ry + 6;
    }

    // Schedule header on new page
    doc.setFillColor(...P);
    doc.rect(ML, y, TW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...white);
    doc.text('Hora', ML + HORA_W / 2, y + 5, { align: 'center' });
    dias.forEach((d, i) => doc.text(d.toUpperCase(), ML + HORA_W + i * DAY_W + DAY_W / 2, y + 5, { align: 'center' }));
    y += 7;

    const wrapText = (text: string, maxW: number, doc: jsPDF): string[] => {
      if (doc.getTextWidth(text) <= maxW) return [text];
      const words = text.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (doc.getTextWidth(test) > maxW && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines.length > 0 ? lines : [text];
    };

    const draw = (x: number, cy: number, w: number, h: number,
      bg: [number, number, number], fg: [number, number, number],
      lines: string[], font = 'bold', fs = 7) => {
      doc.setFillColor(...bg);
      doc.rect(x, cy, w, h, 'F');
      doc.setDrawColor(...subtle);
      doc.setLineWidth(0.15);
      doc.rect(x, cy, w, h, 'S');
      if (!lines.length) return;
      doc.setFont('helvetica', font);
      doc.setFontSize(fs);
      doc.setTextColor(...fg);
      const maxW = w - 4;
      const allLines: string[] = [];
      for (const raw of lines) {
        allLines.push(...wrapText(raw, maxW, doc));
      }
      const lh = fs * 0.45;
      const total = allLines.length * lh;
      let sy = cy + (h - total) / 2 + lh * 0.8;
      for (const t of allLines) {
        doc.text(t, x + w / 2, sy, { align: 'center' });
        sy += lh;
      }
    };

    for (let hi = 0; hi < horas.length; hi++) {
      const hora = horas[hi];
      const esAlm = esAlmuerzoHora(hora);
      const horaInicio = fmtH(hora);
      const horaFin = hi < horas.length - 1 ? fmtH(horas[hi + 1]) : fmtH(franjaFin);

      const baseCellH = ROW_H * (duracionBloque || 1);

      // Hora cell
      doc.setFillColor(...surface);
      doc.rect(ML, y, HORA_W, baseCellH, 'F');
      doc.setDrawColor(...subtle);
      doc.setLineWidth(0.15);
      doc.rect(ML, y, HORA_W, baseCellH, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...P);
      doc.text(`${horaInicio}-${horaFin}`, ML + HORA_W / 2, y + baseCellH / 2 + 1, { align: 'center' });
      if (esAlm) {
        doc.setFontSize(5.5);
        doc.setTextColor(...muted);
        doc.text('ALM', ML + HORA_W / 2, y + baseCellH / 2 + 3.5, { align: 'center' });
      }

      diasNum.forEach((dia, di) => {
        const x = ML + HORA_W + di * DAY_W;
        const cell = grid.get(`${dia}_${hora}`);
        if (!cell || cell.skip) return;

        if (cell.asig) {
          const pf = `[${cell.mergedTipos?.join('/') ?? 'TEO'}]`;
          const ambStr = cell.mergedAmbs?.length ? cell.mergedAmbs.join(' / ') : '—';
          const bg = this.getCursoColorRGB(colorMap, cell.asig.curso?.id || 0);
          const fg = ink;
          const blockH = baseCellH * cell.rowspan;
          draw(x, y, DAY_W, blockH, bg, fg, [pf, cell.asig.curso?.nombre ?? '—', `${ambStr}  ${cell.asig.hora_inicio}–${cell.asig.hora_fin}`], 'bold', 6.5);
        } else if (cell.esAlmuerzo) {
          const blockH = baseCellH * cell.rowspan;
          draw(x, y, DAY_W, blockH, almBg, almTx, ['Almuerzo'], 'italic', 6.5);
        } else {
          doc.setFillColor(...white);
          doc.rect(x, y, DAY_W, baseCellH, 'F');
          doc.setDrawColor(...subtle);
          doc.setLineWidth(0.15);
          doc.rect(x, y, DAY_W, baseCellH, 'S');
        }
      });

      y += baseCellH;
    }

    // Legend
    const ly = y + 5;
    doc.setDrawColor(...subtle);
    doc.setLineWidth(0.3);
    doc.line(ML, y + 2, PW - MR, y + 2);

    let lx = ML + 2;

    // Course-based legend
    if (cursosUnicosList.length > 0) {
      const cLegs = cursosUnicosList.map(c => ({
        bg: this.getCursoColorRGB(colorMap, c.curso.id),
        fg: ink,
        l: c.curso.codigo || 'Curso',
      }));
      for (const leg of cLegs) {
        doc.setFillColor(...leg.bg);
        doc.roundedRect(lx, ly - 0.5, 4, 4, 1, 1, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...leg.fg);
        doc.text(leg.l, lx + 6, ly + 2.5);
        lx += doc.getTextWidth(leg.l) + 14;
      }
    }

    // Almuerzo legend
    doc.setFillColor(...almBg);
    doc.roundedRect(lx, ly - 0.5, 4, 4, 1, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...almTx);
    doc.text('Almuerzo', lx + 6, ly + 2.5);

    doc.setFontSize(6);
    doc.setTextColor(...muted);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}`, PW - MR, ly + 2.5, { align: 'right' });

    doc.save(`Horario_${docente.apellidos}_${periodo}.pdf`);
  }

  generarExcel(
    docente: any,
    asignaciones: HorarioAsignado[],
    dias: string[],
    diasNum: number[],
    horas: number[],
    grid: Map<string, CeldaHorario>,
    cursosUnicosList: CursoItem[],
    colorMap: Map<number, [number, number, number]>,
    hexMap: Map<number, string>,
    config: ConfiguracionGeneral,
    periodo: string,
    summaryHoras: number,
    summaryBloques: number,
    summaryDias: number,
    franjaInicio: number,
    franjaFin: number,
    almuerzoInicio: number,
    almuerzoFin: number,
    horasMaxDiarias: number,
    duracionBloque: number,
    fmtH: (h: number) => string
  ): void {
    const wsData: any[][] = [];
    const merges: XLSX.Range[] = [];
    const colCount = 1 + dias.length + 1; // Hora | days... | Hora

    wsData.push(['HORARIO ACADEMICO', ...Array(colCount - 1).fill('')]);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } });

    wsData.push([`${docente.apellidos}, ${docente.nombres}`, ...Array(colCount - 1).fill('')]);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } });

    wsData.push([`${periodo}  ·  ${summaryHoras}h/sem  ·  ${summaryBloques} bloques  ·  ${summaryDias} dias`, ...Array(colCount - 1).fill('')]);
    merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } });

    wsData.push([`Franja: ${fmtH(franjaInicio)}-${fmtH(franjaFin)}  |  Almuerzo: ${fmtH(almuerzoInicio)}-${fmtH(almuerzoFin)}  |  Max diaria: ${horasMaxDiarias}h`, ...Array(colCount - 1).fill('')]);
    merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } });

    const headerLegend = ['N° / Código', 'Asignatura', 'Teoría', 'Práctica', 'Laboratorio', 'Grupos', 'Total Horas'];
    const maxCols = Math.max(colCount, headerLegend.length);
    const padLegend = Math.max(0, maxCols - headerLegend.length);

    // Resize already-inserted rows to maxCols
    wsData[0] = ['HORARIO ACADEMICO', ...Array(maxCols - 1).fill('')];
    merges[0] = { s: { r: 0, c: 0 }, e: { r: 0, c: maxCols - 1 } };
    wsData[1] = [`${docente.apellidos}, ${docente.nombres}`, ...Array(maxCols - 1).fill('')];
    merges[1] = { s: { r: 1, c: 0 }, e: { r: 1, c: maxCols - 1 } };
    wsData[2] = [`${periodo}  ·  ${summaryHoras}h/sem  ·  ${summaryBloques} bloques  ·  ${summaryDias} dias`, ...Array(maxCols - 1).fill('')];
    merges[2] = { s: { r: 2, c: 0 }, e: { r: 2, c: maxCols - 1 } };
    wsData[3] = [`Franja: ${fmtH(franjaInicio)}-${fmtH(franjaFin)}  |  Almuerzo: ${fmtH(almuerzoInicio)}-${fmtH(almuerzoFin)}  |  Max diaria: ${horasMaxDiarias}h`, ...Array(maxCols - 1).fill('')];
    merges[3] = { s: { r: 3, c: 0 }, e: { r: 3, c: maxCols - 1 } };

    const cursosStartRow = wsData.length;
    let cursosCount = 0;
    if (cursosUnicosList.length > 0) {
      wsData.push(['Cursos Asignados', ...Array(maxCols - 1).fill('')]);
      merges.push({ s: { r: cursosStartRow, c: 0 }, e: { r: cursosStartRow, c: maxCols - 1 } });
      cursosCount++;

      wsData.push([...headerLegend, ...Array(padLegend).fill('')]);
      cursosCount++;

      cursosUnicosList.forEach((item, idx) => {
        const curso = item.curso;
        const asigs = asignaciones.filter(a => a.curso?.id === curso.id);
        const stats = this.calcularStatsCurso(asigs);

        const rowData = [
          `${idx + 1}. ${curso.codigo}`,
          curso.nombre,
          `${stats.t.toFixed(1)} h`,
          `${stats.p.toFixed(1)} h`,
          `${stats.l.toFixed(1)} h`,
          `${stats.grupos}`,
          `${stats.total.toFixed(1)} h`,
          ...Array(padLegend).fill(''),
        ];
        wsData.push(rowData);
        cursosCount++;
      });

      wsData.push(Array(maxCols).fill(''));
    } else {
      wsData.push(Array(maxCols).fill(''));
    }

    wsData.push(Array(maxCols).fill(''));

    // Header row: Hora | Días... | (padding) | Hora
    // Build header with enough columns for maxCols, last column = 'Hora'
    const headerDays: string[] = ['Hora'];
    for (let i = 0; i < maxCols - 2; i++) {
      headerDays.push(i < dias.length ? dias[i].toUpperCase() : '');
    }
    headerDays.push('Hora');
    wsData.push(headerDays);
    const headerRow = wsData.length - 1;

    for (let hi = 0; hi < horas.length; hi++) {
      const hora = horas[hi];
      const horaInicio = fmtH(hora);
      const horaFin = hi < horas.length - 1 ? fmtH(horas[hi + 1]) : fmtH(franjaFin);
      const row: any[] = [`${horaInicio}-${horaFin}`];

      for (let di = 0; di < diasNum.length; di++) {
        const dia = diasNum[di];
        const cell = grid.get(`${dia}_${hora}`);

        if (cell?.skip) {
          row.push('');
          continue;
        }

        if (cell?.asig) {
          const pf = `[${cell.mergedTipos?.join('/') ?? 'TEO'}]`;
          const ambStr = cell.mergedAmbs?.length ? cell.mergedAmbs.join(' / ') : '—';
          row.push(`${pf}\n${cell.asig.curso?.nombre ?? ''}\n${ambStr}  ${cell.asig.hora_inicio}-${cell.asig.hora_fin}`);
          if (cell.rowspan > 1) {
            merges.push({ s: { r: headerRow + 1 + hi, c: 1 + di }, e: { r: headerRow + 1 + hi + cell.rowspan - 1, c: 1 + di } });
          }
        } else if (cell?.esAlmuerzo) {
          row.push('Almuerzo');
          if (cell.rowspan > 1) {
            merges.push({ s: { r: headerRow + 1 + hi, c: 1 + di }, e: { r: headerRow + 1 + hi + cell.rowspan - 1, c: 1 + di } });
          }
        } else {
          row.push('');
        }
      }

      // Trailing Hora column
      row.push(`${horaInicio}-${horaFin}`);
      while (row.length < maxCols) row.push('');
      wsData.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    // Style Table Header
    for (let c = 0; c < maxCols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRow, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
          fill: { fgColor: { rgb: '0F172A' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top: { style: 'medium', color: { rgb: '0F172A' } },
            bottom: { style: 'medium', color: { rgb: '0F172A' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } },
          },
        };
      }
    }

    // Style Document Header
    for (let r = 0; r <= 3; r++) {
      for (let c = 0; c < maxCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          if (r === 0) {
            ws[cellRef].s = {
              font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '0F172A' } },
              alignment: { horizontal: 'center', vertical: 'center' },
            };
          } else if (r === 1) {
            ws[cellRef].s = {
              font: { bold: true, sz: 12, color: { rgb: '0F172A' } },
              fill: { fgColor: { rgb: 'F8FAFC' } },
              alignment: { horizontal: 'left', vertical: 'center' },
            };
          } else {
            ws[cellRef].s = {
              font: { sz: 10, color: { rgb: '64748B' } },
              alignment: { horizontal: 'left', vertical: 'center' },
            };
          }
        }
      }
    }

    // Fill padding cells
    const headerFills = ['0F172A', 'F8FAFC', 'FFFFFF', 'FFFFFF'];
    for (let r = 0; r <= 3; r++) {
      for (let c = colCount; c < maxCols; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        ws[ref].s = { fill: { fgColor: { rgb: headerFills[r] } }, border: {} };
      }
    }

    // Style Cursos Legend
    if (cursosUnicosList.length > 0) {
      for (let c = 0; c < maxCols; c++) {
        const titleRef = XLSX.utils.encode_cell({ r: cursosStartRow, c });
        if (ws[titleRef]) {
          ws[titleRef].s = {
            font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '334155' } },
            alignment: { horizontal: 'left', vertical: 'center' },
          };
        }
      }
      for (let c = 0; c < maxCols; c++) {
        const subTitleRef = XLSX.utils.encode_cell({ r: cursosStartRow + 1, c });
        if (ws[subTitleRef]) {
          ws[subTitleRef].s = {
            font: { bold: true, sz: 10, color: { rgb: '0F172A' } },
            fill: { fgColor: { rgb: 'F1F5F9' } },
            alignment: { horizontal: 'left', vertical: 'center' },
            border: { bottom: { style: 'medium', color: { rgb: 'CBD5E1' } } },
          };
        }
      }
      cursosUnicosList.forEach((item, idx) => {
        const rowIdx = cursosStartRow + 2 + idx;
        const hexColor = this.getCursoColorHex(hexMap, item.curso.id).replace('#', '');
        for (let c = 0; c < maxCols; c++) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c });
          if (ws[cellRef]) {
            ws[cellRef].s = {
              font: { sz: 10, color: { rgb: '0F172A' }, bold: c === 0 },
              fill: { fgColor: { rgb: hexColor } },
              alignment: { horizontal: 'left', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: 'E2E8F0' } },
                bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
                left: { style: 'thin', color: { rgb: 'E2E8F0' } },
                right: { style: 'thin', color: { rgb: 'E2E8F0' } },
              },
            };
          }
        }
      });
    }

    // Style grid cells
    for (let hi = 0; hi < horas.length; hi++) {
      const r = headerRow + 1 + hi;
      const hora = horas[hi];

      for (let di = 0; di < maxCols; di++) {
        const cellRef = XLSX.utils.encode_cell({ r, c: di });
        if (!ws[cellRef]) continue;

        const isHoraCol = di === 0 || di === maxCols - 1;

        if (isHoraCol) {
          ws[cellRef].s = {
            font: { bold: true, color: { rgb: '4F46E5' }, sz: 10 },
            fill: { fgColor: { rgb: 'F8FAFC' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              right: { style: 'medium', color: { rgb: 'E2E8F0' } },
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              left: { style: 'medium', color: { rgb: 'E2E8F0' } },
            },
          };
        } else if (di >= 1 && di <= dias.length) {
          const diaNum = diasNum[di - 1];
          const cellData = grid.get(`${diaNum}_${hora}`);

          let bgColor = 'FFFFFF';
          let textColor = '0F172A';
          let isBold = false;

          let origenData = cellData;
          if (cellData?.skip) {
            for (let prevH = hi - 1; prevH >= 0; prevH--) {
              const prevData = grid.get(`${diaNum}_${horas[prevH]}`);
              if (!prevData?.skip && prevData && prevData.rowspan > (hi - prevH)) {
                origenData = prevData;
                break;
              }
            }
          }

          if (origenData?.asig) {
            bgColor = this.getCursoColorHex(hexMap, origenData.asig.curso?.id || 0).replace('#', '');
            isBold = true;
          } else if (origenData?.esAlmuerzo) {
            bgColor = 'F1F5F9';
            textColor = '64748B';
          }

          ws[cellRef].s = {
            font: { bold: isBold, color: { rgb: textColor }, sz: 9 },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } },
            },
          };
        }
      }
    }

    const rowsHeight: any[] = [
      { hpt: 30 }, { hpt: 20 }, { hpt: 18 }, { hpt: 18 },
    ];

    if (cursosUnicosList.length > 0) {
      rowsHeight.push({ hpt: 22 });
      rowsHeight.push({ hpt: 18 });
      cursosUnicosList.forEach(() => rowsHeight.push({ hpt: 20 }));
      rowsHeight.push({ hpt: 10 });
    } else {
      rowsHeight.push({ hpt: 10 });
    }

    rowsHeight.push({ hpt: 24 });
    for (let hi = 0; hi < horas.length; hi++) {
      rowsHeight.push({ hpt: 40 });
    }

    ws['!rows'] = rowsHeight;

    const colWidths: any[] = [
      { wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
    ];
    for (let i = 1; i < colCount; i++) {
      if (i < colWidths.length) {
        colWidths[i] = { wch: Math.max(colWidths[i].wch, 22) };
      } else {
        colWidths.push({ wch: 22 });
      }
    }
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horario');
    XLSX.writeFile(wb, `Horario_${docente.apellidos}_${periodo}.xlsx`);
  }
}
