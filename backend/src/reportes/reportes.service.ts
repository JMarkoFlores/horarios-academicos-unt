import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { Grupo } from "../entities/grupo.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import * as ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ConfiguracionService } from "../configuracion/configuracion.service";
import * as https from "https";

import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);

  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(ConflictoAsignacion)
    private readonly conflictoRepo: Repository<ConflictoAsignacion>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(DeclaracionCargaHoraria)
    private readonly declaracionRepo: Repository<DeclaracionCargaHoraria>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  async obtenerDocenteIdPorEmail(email: string): Promise<number | null> {
    const docente = await this.docenteRepo.findOne({ where: { email } });
    return docente?.id ?? null;
  }

  private async getBase64Image(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      https
        .get(url, (res) => {
          const data: any[] = [];
          res.on("data", (chunk) => data.push(chunk));
          res.on("end", () => {
            const buffer = Buffer.concat(data);
            resolve(`data:${res.headers["content-type"]};base64,${buffer.toString("base64")}`);
          });
        })
        .on("error", (err) => {
          this.logger.error(`Error al cargar imagen del logo: ${err.message}`);
          resolve(null);
        });
    });
  }

  async generarPDF(html: string): Promise<Buffer> {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });

      const headerTemplate = `
        <div style="font-size: 9px; width: 100%; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin: 0 20px; color: #555;">
          <span style="float: left; font-weight: bold;">UNIVERSIDAD NACIONAL DE TRUJILLO</span>
          <span style="float: right;">Escuela de Ingeniería de Sistemas</span>
          <div style="clear: both;"></div>
        </div>
      `;

      const footerTemplate = `
        <div style="font-size: 8px; width: 100%; text-align: center; border-top: 1px solid #ddd; padding-top: 5px; margin: 0 20px; color: #555;">
          <span style="float: left;">Generado el: <span class="date"></span></span>
          <span style="float: right;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          <div style="clear: both;"></div>
        </div>
      `;

      const buffer = await page.pdf({
        format: "A4",
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: headerTemplate,
        footerTemplate: footerTemplate,
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      });
      return Buffer.from(buffer);
    } finally {
      await browser.close();
    }
  }

  async generarReporteDocentePDF(
    docenteId: number,
    periodo: string,
  ): Promise<Buffer> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl = config?.logo_url || "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const primaryColor = config?.color_primario || "#4f46e5";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
      relations: ["departamento"]
    });
    if (!docente) throw new Error("Docente no encontrado");

    const horarios = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("horario.docente_id = :docenteId", { docenteId })
      .andWhere("horario.periodo = :periodo", { periodo })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .getMany();
    
    // Normalizar horas
    horarios.forEach(h => {
      if (h.hora_inicio && h.hora_inicio.length > 5) h.hora_inicio = h.hora_inicio.substring(0, 5);
      if (h.hora_fin && h.hora_fin.length > 5) h.hora_fin = h.hora_fin.substring(0, 5);
    });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const hexToRgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };
    const primaryRGB = hexToRgb(primaryColor);

    const PAGE_W = 297;
    const PAGE_H = 210;
    const C = {
      primary: primaryRGB,
      white: [255, 255, 255] as [number, number, number],
      text: [51, 65, 85] as [number, number, number],
      lightText: [100, 116, 139] as [number, number, number],
    };

    // PÁGINA 1: INFORMACIÓN DETALLADA
    // Cabecera premium
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, PAGE_W, 35, 'F');
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'PNG', 12, 5, 22, 22); } catch (e) {}
    }
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(`REPORTE DETALLADO DEL DOCENTE`, 40, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Periodo Académico: ${periodo}`, 40, 22);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, PAGE_W - 12, 22, { align: 'right' });

    // Sección 1: Datos Personales
    let yPos = 45;
    doc.setTextColor(...C.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("1. INFORMACIÓN DEL DOCENTE", 12, yPos);
    doc.setDrawColor(...C.primary);
    doc.setLineWidth(0.5);
    doc.line(12, yPos + 2, 80, yPos + 2);

    yPos += 12;
    autoTable(doc, {
      startY: yPos,
      body: [
        ['Apellidos y Nombres:', `${docente.apellidos}, ${docente.nombres}`, 'Código:', docente.codigo || '—'],
        ['Categoría:', docente.categoria || '—', 'Contrato:', docente.tipo_contrato || '—'],
        ['Departamento:', docente.departamento?.nombre || '—', 'Modalidad:', docente.modalidad || '—'],
        ['Email:', docente.email || '—', 'Teléfono:', docente.telefono || '—']
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: C.lightText, cellWidth: 40 },
        1: { cellWidth: 100 },
        2: { fontStyle: 'bold', textColor: C.lightText, cellWidth: 30 },
        3: { cellWidth: 50 }
      },
      margin: { left: 12 }
    });

    // Sección 2: Carga Académica Detallada
    yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setTextColor(...C.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("2. CARGA ACADÉMICA DETALLADA", 12, yPos);
    doc.setDrawColor(...C.primary);
    doc.line(12, yPos + 2, 80, yPos + 2);

    yPos += 10;
    const resumenMap = new Map<string, any>();
    horarios.forEach(h => {
      if (!h.curso) return;
      const key = `${h.curso.id}-${h.tipo_clase}-${h.grupo?.id}`;
      if (!resumenMap.has(key)) {
        resumenMap.set(key, { curso: h.curso, tipo: h.tipo_clase, horas: 0, grupo: h.grupo?.codigo, ambiente: h.ambiente?.codigo });
      }
      const hIni = this.horaToDecimal(h.hora_inicio);
      const hFin = this.horaToDecimal(h.hora_fin);
      resumenMap.get(key).horas += (hFin - hIni);
    });

    const totalHorasSemana = Array.from(resumenMap.values()).reduce((sum, r) => sum + r.horas, 0);

    autoTable(doc, {
      startY: yPos,
      head: [['Código', 'Asignatura', 'Ciclo', 'Tipo', 'Grupo', 'Ambiente', 'Horas Sem.']],
      body: Array.from(resumenMap.values()).map(r => [
        r.curso.codigo || '—',
        r.curso.nombre,
        r.curso.ciclo || '—',
        r.tipo === TipoClase.TEORIA ? 'Teoría' : r.tipo === TipoClase.PRACTICA ? 'Práctica' : 'Laboratorio',
        r.grupo || '—',
        r.ambiente || '—',
        `${r.horas} hrs`
      ]),
      foot: [['', '', '', '', '', 'TOTAL HORAS:', `${totalHorasSemana} hrs`]],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      margin: { left: 12, right: 12 }
    });

    // PÁGINA 2: HORARIO (GRID HORIZONTAL)
    doc.addPage();
    
    // Cabecera simplificada para el horario
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, PAGE_W, 20, 'F');
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`PROGRAMACIÓN SEMANAL: ${docente.apellidos}, ${docente.nombres}`, 12, 13);
    doc.setFontSize(10);
    doc.text(`Periodo: ${periodo}`, PAGE_W - 12, 13, { align: 'right' });

    const gridY = 28;
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const horas = Array.from({ length: 15 }, (_, i) => i + 7);
    const cellHeight = 10;
    const horaColWidth = 15;
    const gridWidth = PAGE_W - 24;
    const cellWidth = (gridWidth - (horaColWidth * 2)) / 6;

    doc.setFillColor(...C.primary);
    doc.rect(12, gridY, gridWidth, 10, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.text('HORA', 12 + horaColWidth / 2, gridY + 6.5, { align: 'center' });
    dias.forEach((dia, idx) => {
      doc.text(dia, 12 + horaColWidth + idx * cellWidth + cellWidth / 2, gridY + 6.5, { align: 'center' });
    });
    doc.text('HORA', 12 + gridWidth - horaColWidth / 2, gridY + 6.5, { align: 'center' });

    let currentY = gridY + 10;
    horas.forEach(hora => {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, currentY, horaColWidth, cellHeight, 'F');
      doc.rect(12 + gridWidth - horaColWidth, currentY, horaColWidth, cellHeight, 'F');
      doc.setTextColor(...C.text);
      doc.setFontSize(8);
      doc.text(`${String(hora).padStart(2, '0')}:00`, 12 + horaColWidth / 2, currentY + cellHeight / 2 + 1.5, { align: 'center' });
      doc.text(`${String(hora).padStart(2, '0')}:00`, 12 + gridWidth - horaColWidth / 2, currentY + cellHeight / 2 + 1.5, { align: 'center' });
      
      for (let i = 0; i < 6; i++) {
        doc.setDrawColor(226, 232, 240);
        doc.rect(12 + horaColWidth + i * cellWidth, currentY, cellWidth, cellHeight, 'S');
      }
      currentY += cellHeight;
    });

    // Bloques de clase con lógica de fusión
    const bloquesPorDia = new Map<number, HorarioAsignado[]>();
    horarios.forEach(h => {
      const dia = h.dia || h.dia_semana;
      if (!bloquesPorDia.has(dia)) bloquesPorDia.set(dia, []);
      bloquesPorDia.get(dia)!.push(h);
    });

    bloquesPorDia.forEach((asigs, dia) => {
      const diaIdx = dia - 1;
      const sortedAsigs = [...asigs].sort((a, b) => {
        const hA = this.horaToDecimal(a.hora_inicio);
        const hB = this.horaToDecimal(b.hora_inicio);
        return hA - hB;
      });

      const carriles: HorarioAsignado[][] = [];
      sortedAsigs.forEach(asig => {
        const hIni = this.horaToDecimal(asig.hora_inicio);
        let carrilIndex = -1;
        for (let i = 0; i < carriles.length; i++) {
          const ultimo = carriles[i][carriles[i].length - 1];
          const hFinUltimo = this.horaToDecimal(ultimo.hora_fin);
          if (Math.abs(hFinUltimo - hIni) < 0.01 && ultimo.curso?.id === asig.curso?.id) {
            carrilIndex = i;
            break;
          }
        }
        if (carrilIndex === -1) {
          for (let i = 0; i < carriles.length; i++) {
            const ultimo = carriles[i][carriles[i].length - 1];
            if (this.horaToDecimal(ultimo.hora_fin) <= hIni) {
              carrilIndex = i;
              break;
            }
          }
        }
        if (carrilIndex === -1) carriles.push([asig]);
        else carriles[carrilIndex].push(asig);
      });

      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        const fusionados: any[] = [];
        bloquesEnCarril.forEach(h => {
          const hIni = this.horaToDecimal(h.hora_inicio);
          const hFin = this.horaToDecimal(h.hora_fin);
          const dur = hFin - hIni;
          const labelPart = h.tipo_clase === TipoClase.TEORIA ? `${this.formatDurationValue(dur)}T` : 
                           h.tipo_clase === TipoClase.PRACTICA ? `${this.formatDurationValue(dur)}P` : 
                           `${this.formatDurationValue(dur)}L-G${h.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ''}`;

          if (fusionados.length > 0) {
            const ultimo = fusionados[fusionados.length - 1];
            const mismoAmbiente = ultimo.asignacion.ambiente?.id === h.ambiente?.id;
            const mismoCurso = ultimo.asignacion.curso?.id === h.curso?.id;
            const mismaReglaGrupo = h.tipo_clase === TipoClase.LABORATORIO
              ? ultimo.asignacion.grupo?.id === h.grupo?.id
              : true;
            const esTP = (ultimo.asignacion.tipo_clase === TipoClase.TEORIA && h.tipo_clase === TipoClase.PRACTICA) ||
                         (ultimo.asignacion.tipo_clase === TipoClase.PRACTICA && h.tipo_clase === TipoClase.TEORIA);
            const mismoTipoTP = ultimo.asignacion.tipo_clase === h.tipo_clase &&
                                (h.tipo_clase === TipoClase.TEORIA || h.tipo_clase === TipoClase.PRACTICA);
            const mismoLaboratorio = ultimo.asignacion.tipo_clase === TipoClase.LABORATORIO &&
                                     h.tipo_clase === TipoClase.LABORATORIO &&
                                     mismaReglaGrupo;

            if (mismoCurso && mismoAmbiente && Math.abs(ultimo.horaFin - hIni) < 0.01 &&
                (esTP || mismoTipoTP || mismoLaboratorio)) {
              ultimo.horaFin = hFin;
              ultimo.totalHoraFin = h.hora_fin;
              ultimo.asignaciones.push(h);
              ultimo.tiposClase.push(h.tipo_clase);
              ultimo.label = this.construirLabelBloque(ultimo.asignaciones);
              return;
            }
          }

          fusionados.push({
            horaInicio: hIni,
            horaFin: hFin,
            totalHoraInicio: h.hora_inicio,
            totalHoraFin: h.hora_fin,
            asignacion: h,
            asignaciones: [h],
            tiposClase: [h.tipo_clase],
            carrilIdx,
            numCarriles: carriles.length,
            label: (h.curso?.nombre || '') + ` (${labelPart})`
          });
        });

        fusionados.forEach(f => {
          const startRowIdx = horas.indexOf(f.horaInicio);
          const endRowIdx = horas.indexOf(f.horaFin);
          if (startRowIdx !== -1 && endRowIdx !== -1 && diaIdx >= 0 && diaIdx < 6) {
            const blockY = gridY + 10 + startRowIdx * cellHeight;
            const blockH = (endRowIdx - startRowIdx) * cellHeight;
            const laneWidth = cellWidth / f.numCarriles;
            const blockX = 12 + horaColWidth + diaIdx * cellWidth + (f.carrilIdx * laneWidth);
            const blockW = laneWidth;

            const color = this.getColorForProfesorCurso(docente.id, f.asignacion.curso?.id);
            doc.setFillColor(...color);
            doc.rect(blockX, blockY, blockW, blockH, 'F');
            doc.setDrawColor(150, 150, 150);
            doc.rect(blockX, blockY, blockW, blockH, 'S');

            doc.setTextColor(51, 51, 51);
            doc.setFontSize(f.numCarriles > 1 ? 6 : 7);
            doc.setFont('helvetica', 'bold');
            const cursoText = f.label;
            const ambienteText = f.asignacion.ambiente?.codigo || '';
            const grupoText = f.asignacion.grupo?.codigo || '';
            
            const splitCurso = doc.splitTextToSize(cursoText, blockW - 2);
            doc.text(splitCurso.slice(0, 2), blockX + blockW / 2, blockY + 4, { align: 'center' });
            if (blockH > 8) doc.text(ambienteText, blockX + blockW / 2, blockY + blockH - 5, { align: 'center' });
            if (blockH > 12 && f.numCarriles === 1) doc.text(grupoText, blockX + blockW / 2, blockY + blockH - 1.5, { align: 'center' });
          }
        });
      });
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  async generarReporteDeclaracionF03CADPDF(docenteId: number, periodo: string): Promise<Buffer> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl = config?.logo_url || "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
      relations: ["departamento", "facultad"]
    });
    if (!docente) throw new Error("Docente no encontrado");

    const periodoObj = await this.periodoRepo.findOne({
      where: [{ codigo: periodo }, { nombre: periodo }]
    });
    if (!periodoObj) throw new Error("Periodo no encontrado");

    const declaracion = await this.declaracionRepo.findOne({
      where: { docente_id: docenteId, periodo_academico_id: periodoObj.id }
    });

    const horarios = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("horario.docente_id = :docenteId", { docenteId })
      .andWhere("horario.periodo = :periodo", { periodo })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .getMany();

    // Organizar carga lectiva
    const cursosMap = new Map<number, any>();
    horarios.forEach(h => {
      if (!h.curso) return;
      if (!cursosMap.has(h.curso.id)) {
        cursosMap.set(h.curso.id, {
          curso: h.curso,
          horariosTeoria: [] as string[],
          horariosPractica: [] as string[],
          horariosLab: [] as string[],
          ambientes: new Set<string>(),
          horasTotales: 0
        });
      }
      
      const c = cursosMap.get(h.curso.id);
      const diaStr = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'][(h.dia || h.dia_semana || 1) - 1];
      const hStr = `${h.hora_inicio.substring(0, 5)}-${h.hora_fin.substring(0, 5)}`;
      
      if (h.tipo_clase === TipoClase.TEORIA) c.horariosTeoria.push(`${diaStr} (${hStr})`);
      else if (h.tipo_clase === TipoClase.PRACTICA) c.horariosPractica.push(`${diaStr} (${hStr})`);
      else if (h.tipo_clase === TipoClase.LABORATORIO) c.horariosLab.push(`${diaStr} (${hStr})`);

      if (h.ambiente) {
        c.ambientes.add(h.ambiente.codigo || h.ambiente.nombre);
      }

      const hIni = this.horaToDecimal(h.hora_inicio);
      const hFin = this.horaToDecimal(h.hora_fin);
      c.horasTotales += (hFin - hIni);
    });

    let trsCargaLectiva = '';
    let totalCargaLectiva = 0;
    
    Array.from(cursosMap.values()).forEach(c => {
      let horarioStrParts = [];
      if (c.horariosTeoria.length) horarioStrParts.push(`<b>T:</b> ${c.horariosTeoria.join(', ')}`);
      if (c.horariosPractica.length) horarioStrParts.push(`<b>P:</b> ${c.horariosPractica.join(', ')}`);
      if (c.horariosLab.length) horarioStrParts.push(`<b>L:</b> ${c.horariosLab.join(', ')}`);

      trsCargaLectiva += `
        <tr>
          <td>${horarioStrParts.join('<br>')}</td>
          <td>${c.curso.nombre}<br>${c.curso.ciclo || ''}-C ${c.curso.escuela || ''}</td>
          <td class="text-center">F11</td>
          <td class="text-center">${Array.from(c.ambientes).join(', ')}</td>
          <td class="text-center">${c.horasTotales}</td>
        </tr>
      `;
      totalCargaLectiva += c.horasTotales;
    });

    if (trsCargaLectiva === '') {
      trsCargaLectiva = '<tr><td colspan="5" class="text-center">No hay carga lectiva asignada</td></tr>';
    }

    // Organizar carga no lectiva
    let trsCargaNoLectiva = '';
    let totalCargaNoLectiva = 0;

    if (declaracion && declaracion.carga_no_lectiva && Array.isArray((declaracion.carga_no_lectiva as any).actividades)) {
      const actividades = (declaracion.carga_no_lectiva as any).actividades;
      actividades.forEach((a: any) => {
        if (a.horas > 0) {
          trsCargaNoLectiva += `
            <tr>
              <td></td>
              <td>${a.descripcion.replace(/^[0-9]+\.\s*/, '').split(':')[0].split('(')[0].trim()}</td>
              <td class="text-center">F11</td>
              <td class="text-center">CUBÍCULO</td>
              <td class="text-center">${a.horas}</td>
            </tr>
          `;
          totalCargaNoLectiva += Number(a.horas);
        }
      });
    }

    if (trsCargaNoLectiva === '') {
      trsCargaNoLectiva = '<tr><td colspan="5" class="text-center">No hay carga no lectiva asignada</td></tr>';
    }

    const totalAcademica = totalCargaLectiva + totalCargaNoLectiva;

    // AÑO y SEMESTRE a partir de periodo (ej. 2025-II)
    const partesPeriodo = periodo.split('-');
    const anio = partesPeriodo[0] || new Date().getFullYear();
    const semestre = partesPeriodo[1] || 'I';

    const dateIni = periodoObj.fecha_inicio ? new Date(periodoObj.fecha_inicio).toLocaleDateString('es-PE') : '';
    const dateFin = periodoObj.fecha_fin ? new Date(periodoObj.fecha_fin).toLocaleDateString('es-PE') : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; }
          .container { width: 100%; margin: 0 auto; }
          .header-title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          table, th, td { border: 1px solid #000; }
          th, td { padding: 4px; vertical-align: middle; }
          .bg-light-blue { background-color: #DCE6F1; font-weight: bold; text-align: center; }
          .text-center { text-align: center; }
          .text-bold { font-weight: bold; }
          .info-table td { border: 1px solid #000; padding: 4px; }
          .signatures { margin-top: 50px; width: 100%; }
          .signature-box { width: 32%; display: inline-block; text-align: center; vertical-align: bottom; }
          .signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto 5px auto; }
          .footer-text { font-size: 9px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header-title">HORARIO SEMANAL DE LA CARGA ACADÉMICA DOCENTE (F03-CAD)</div>

          <table class="info-table">
            <tr>
              <td colspan="2">Facultad / Filial: <b>${docente.facultad?.nombre || ''}</b></td>
              <td colspan="2">Dpto. Académico: <b>${docente.departamento?.nombre || ''}</b></td>
            </tr>
            <tr>
              <td>DNI</td>
              <td class="text-bold text-center">${docente.codigo || ''}</td>
              <td>Docente: <b>${docente.apellidos.toUpperCase()} ${docente.nombres.toUpperCase()}</b></td>
              <td class="text-center text-bold">${docente.categoria || 'ASOCIADO'}<br>${docente.modalidad || 'TC'}</td>
            </tr>
            <tr>
              <td colspan="2" class="text-center">AÑO ACADEMICO: <b>${anio}</b> SEMESTRE: <b>${semestre}</b></td>
              <td colspan="2" class="text-center">Fecha de Inicio: <b>${dateIni}</b> Fecha de término: <b>${dateFin}</b></td>
            </tr>
          </table>

          <table>
            <tr class="bg-light-blue">
              <td width="20%">HORARIO</td>
              <td width="40%">CARGA HORARIA LECTIVA (CHL)</td>
              <td width="10%">LUGAR</td>
              <td width="20%">AULA</td>
              <td width="10%">TOTAL</td>
            </tr>
            ${trsCargaLectiva}
            <tr class="bg-light-blue">
              <td>HORARIO</td>
              <td>CARGA HORARIA NO LECTIVA (CHNL)</td>
              <td>LUGAR</td>
              <td>AULA</td>
              <td>TOTAL</td>
            </tr>
            ${trsCargaNoLectiva}
            <tr class="bg-light-blue">
              <td colspan="4">TOTAL HORAS CARGA ACADÉMICA</td>
              <td>${totalAcademica}</td>
            </tr>
          </table>

          <div class="footer-text">
            T: TEORIA - P: PRACTICA<br>
            LU (LUNES); MA (MARTES); MI (MIERCOLES); JU (JUEVES); VI (VIERNES); SA (SABADO); DO (DOMINGO); TIEMPO EN FORMATO DE 24 HORAS.<br><br>
            LUGAR: (F01: "CC. Agropecuarias", F02: "CC. Biológicas", F03: "CC. Económicas", F04: "CC. Físicas y Matemáticas", F05: "CC. Sociales", F06: "Derecho y Ciencias Políticas", F07: "Educación y Comunicación", F08: "Enfermería", F09: "Estomatología", F10: "Farmacia y Bioquímica", F11: "Ingeniería", F12: "Ingeniería Química", F13: "Medicina", F14: "Filial Valle Jequetepeque", F15: "Filial Huamachuco", F16: "Filial Santiago de Chuco", OA: "Oficina Administrativa", SC: "Salida de Campo")
          </div>

          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line"></div>
              <b>FIRMA DEL DOCENTE</b>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <b>FIRMA Y SELLO DEL DIRECTOR DE DPTO.ACADEMICO</b>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <b>V°B° DECANO</b>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });

      const buffer = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      });
      return Buffer.from(buffer);
    } finally {
      await browser.close();
    }
  }

  async generarReporteDiaPDF(dia: number, periodo: string, ciclo?: number, tipo?: string, search?: string): Promise<Buffer> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl =
      config?.logo_url ||
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const primaryColor = config?.color_primario || "#4f46e5";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const hexToRgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };
    const primaryRGB = hexToRgb(primaryColor);

    let queryBuilder = this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("docente.departamento", "departamento")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("horario.dia = :dia", { dia })
      .andWhere("horario.periodo = :periodo", { periodo });

    if (ciclo) {
      queryBuilder = queryBuilder.andWhere("curso.ciclo = :ciclo", { ciclo });
    }

    if (tipo) {
      queryBuilder = queryBuilder.andWhere("horario.tipo_clase = :tipo", { tipo });
    }

    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      queryBuilder = queryBuilder.andWhere(
        "(LOWER(docente.apellidos) LIKE :search OR LOWER(docente.nombres) LIKE :search OR LOWER(curso.nombre) LIKE :search OR LOWER(ambiente.nombre) LIKE :search OR LOWER(grupo.codigo) LIKE :search)",
        { search: searchLower }
      );
    }

    const horarios = await queryBuilder
      .orderBy("horario.hora_inicio", "ASC")
      .getMany();

    const nombresDias = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    const nombreDia = nombresDias[dia - 1] || "Día";

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const PAGE_W = 297;
    const C = {
      primary: primaryRGB,
      white: [255, 255, 255] as [number, number, number],
      text: [51, 65, 85] as [number, number, number],
    };

    // Cabecera premium
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, PAGE_W, 25, "F");
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", 12, 3, 18, 18);
      } catch (e) {}
    }
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`PROGRAMACIÓN DIARIA: ${nombreDia.toUpperCase()}`, 35, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Periodo Académico: ${periodo}`, 35, 18);
    doc.text(`Total Asignaciones: ${horarios.length}`, PAGE_W - 12, 15, {
      align: "right",
    });

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "Horario",
          "Asignatura",
          "Ciclo",
          "Docente",
          "Ambiente",
          "Grupo",
          "Tipo",
        ],
      ],
      body: horarios.map((h) => [
        `${h.hora_inicio.substring(0, 5)} - ${h.hora_fin.substring(0, 5)}`,
        h.curso?.nombre || "—",
        h.curso?.ciclo || "—",
        `${h.docente?.apellidos}, ${h.docente?.nombres}`,
        h.ambiente?.nombre || h.ambiente?.codigo || "—",
        h.grupo?.codigo || "—",
        h.tipo_clase,
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: C.primary,
        textColor: C.white,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 70 },
        3: { cellWidth: 60 },
      },
      margin: { left: 12, right: 12 },
    });

    return Buffer.from(doc.output("arraybuffer"));
  }

  async generarReporteAulaPDF(
    ambienteId: number,
    periodo: string,
  ): Promise<Buffer> {
    const ambiente = await this.ambienteRepo.findOne({
      where: { id: ambienteId },
    });
    if (!ambiente) throw new Error("Ambiente no encontrado");

    const horarios = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("horario.ambiente_id = :ambienteId", { ambienteId })
      .andWhere("horario.periodo = :periodo", { periodo })
      .getMany();

    const gridHtml = this.generarGrillaSemanal(horarios);

    const ocupacion = this.calcularPorcentajeOcupacion(horarios);

    const html = this.htmlWrapper(`
      <div class="content-header">
        <h1>REPORTE DE HORARIO POR AULA</h1>
        <div class="meta-info">
          <p><strong>Aula:</strong> ${ambiente.codigo} - ${ambiente.nombre}</p>
          <p><strong>Capacidad:</strong> ${ambiente.capacidad} alumnos</p>
          <p><strong>Ubicación:</strong> Piso ${ambiente.piso}, Pabellón ${ambiente.pabellon}</p>
          <p><strong>Período:</strong> ${periodo}</p>
        </div>
      </div>
      ${gridHtml}
      <div class="summary">
        <p><strong>Porcentaje de ocupación:</strong> ${ocupacion.toFixed(1)}%</p>
      </div>
    `);

    return this.generarPDF(html);
  }

  async generarReporteLaboratorioPDF(
    ambienteId: number,
    periodo: string,
  ): Promise<Buffer> {
    const ambiente = await this.ambienteRepo.findOne({
      where: { id: ambienteId },
    });
    if (!ambiente) throw new Error("Ambiente no encontrado");
    if (ambiente.tipo !== TipoAmbiente.LABORATORIO)
      throw new Error("El ambiente no es un laboratorio");

    const horarios = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("horario.ambiente_id = :ambienteId", { ambienteId })
      .andWhere("horario.periodo = :periodo", { periodo })
      .getMany();

    const gridHtml = this.generarGrillaSemanal(horarios, true);
    const ocupacion = this.calcularPorcentajeOcupacion(horarios);

    const html = this.htmlWrapper(
      `
      <div class="content-header">
        <h1>REPORTE DE HORARIO POR LABORATORIO</h1>
        <div class="meta-info">
          <p><strong>Laboratorio:</strong> ${ambiente.codigo} - ${ambiente.nombre}</p>
          <p><strong>Capacidad:</strong> ${ambiente.capacidad} alumnos</p>
          <p><strong>Ubicación:</strong> Piso ${ambiente.piso}, Pabellón ${ambiente.pabellon}</p>
          <p><strong>Período:</strong> ${periodo}</p>
        </div>
      </div>
      <div class="equipment-section">
        <h3>Equipamiento Disponible</h3>
        <p>${ambiente.equipamiento || "No especificado"}</p>
      </div>
      ${gridHtml}
      <div class="summary">
        <p><strong>Porcentaje de ocupación:</strong> ${ocupacion.toFixed(1)}%</p>
      </div>
    `,
      true,
    );

    return this.generarPDF(html);
  }

  private getColorForProfesorCurso(docenteId: number | undefined, cursoId: number | undefined): [number, number, number] {
    if (!docenteId || !cursoId) return [240, 240, 240];
    const colors: [number, number, number][] = [
      [232, 245, 233], [225, 245, 254], [255, 243, 224], [243, 229, 245], [252, 228, 236],
      [224, 242, 241], [232, 234, 246], [255, 235, 238], [249, 248, 227], [224, 247, 250]
    ];
    const index = (docenteId * 7 + cursoId * 13) % colors.length;
    return colors[index];
  }

  private horaToDecimal(hora?: string): number {
    if (!hora) return 0;
    const [h, m] = hora.split(':').map(Number);
    return h + ((m || 0) / 60);
  }

  private formatDurationValue(duration: number): string {
    if (Number.isInteger(duration)) return String(duration);
    return duration.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1');
  }

  private construirLabelBloque(asignaciones: HorarioAsignado[]): string {
    const cursoNombre = asignaciones[0]?.curso?.nombre || '';
    const duraciones: Record<string, number> = {};
    asignaciones.forEach(a => {
      const dur = this.horaToDecimal(a.hora_fin) - this.horaToDecimal(a.hora_inicio);
      const key = a.tipo_clase === TipoClase.LABORATORIO
        ? `L-G${a.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ''}`
        : a.tipo_clase === TipoClase.TEORIA ? 'T' : 'P';
      duraciones[key] = (duraciones[key] ?? 0) + dur;
    });
    const partes = Object.entries(duraciones).map(([key, dur]) => `${this.formatDurationValue(dur)}${key}`);
    return `${cursoNombre} (${partes.join('+')})`;
  }

  private async dibujarPaginaAmbiente(doc: jsPDF, ambienteId: number, periodo: string, logoBase64: string | null, primaryRGB: [number, number, number]): Promise<void> {
    const ambiente = await this.ambienteRepo.findOne({ where: { id: ambienteId } });
    if (!ambiente) return;

    const horarios = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("horario.ambiente_id = :ambienteId", { ambienteId })
      .andWhere("horario.periodo = :periodo", { periodo })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .getMany();

    const PAGE_W = 297;
    const PAGE_H = 210;
    const C = {
      primary: primaryRGB,
      white: [255, 255, 255] as [number, number, number],
      border: [203, 213, 225] as [number, number, number],
      text: [51, 65, 85] as [number, number, number],
    };

    // Cabecera
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, PAGE_W, 25, 'F');
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'PNG', 10, 3, 18, 18); } catch (e) {}
    }
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`HORARIO POR AMBIENTE: ${ambiente.nombre}`, 32, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${ambiente.tipo === TipoAmbiente.LABORATORIO ? 'Laboratorio' : 'Aula'} | Capacidad: ${ambiente.capacidad} alumnos`, 32, 18);
    doc.setFontSize(10);
    doc.text(`Periodo: ${periodo}`, PAGE_W - 12, 15, { align: 'right' });

    let yPos = 32;

    // Resumen de Cursos en este ambiente
    const resumenMap = new Map<string, any>();
    horarios.forEach(h => {
      if (!h.curso || !h.docente) return;
      const key = `${h.docente.id}-${h.curso.id}`;
      if (!resumenMap.has(key)) {
        resumenMap.set(key, { curso: h.curso, docente: h.docente, horas: 0 });
      }
      const hIni = this.horaToDecimal(h.hora_inicio);
      const hFin = this.horaToDecimal(h.hora_fin);
      resumenMap.get(key).horas += (hFin - hIni);
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Docente', 'Asignatura', 'Horas Semanales']],
      body: Array.from(resumenMap.values()).map(r => [
        `${r.docente.apellidos}, ${r.docente.nombres}`,
        r.curso.nombre,
        `${r.horas} hrs`
      ]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold' },
      margin: { left: 10, right: 10 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Grid de Horarios
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const horas = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 a 22:00
    const cellHeight = 8;
    const horaColWidth = 15;
    const gridWidth = PAGE_W - 20;
    const cellWidth = (gridWidth - (horaColWidth * 2)) / 6;

    doc.setFillColor(...C.primary);
    doc.rect(10, yPos, gridWidth, 8, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.text('HORA', 10 + horaColWidth / 2, yPos + 5, { align: 'center' });
    dias.forEach((dia, idx) => {
      doc.text(dia, 10 + horaColWidth + idx * cellWidth + cellWidth / 2, yPos + 5, { align: 'center' });
    });
    doc.text('HORA', 10 + gridWidth - horaColWidth / 2, yPos + 5, { align: 'center' });

    let currentY = yPos + 8;
    horas.forEach(hora => {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, currentY, horaColWidth, cellHeight, 'F');
      doc.rect(10 + gridWidth - horaColWidth, currentY, horaColWidth, cellHeight, 'F');
      doc.setTextColor(...C.text);
      doc.setFontSize(7);
      doc.text(`${String(hora).padStart(2, '0')}:00`, 10 + horaColWidth / 2, currentY + cellHeight / 2 + 1.5, { align: 'center' });
      doc.text(`${String(hora).padStart(2, '0')}:00`, 10 + gridWidth - horaColWidth / 2, currentY + cellHeight / 2 + 1.5, { align: 'center' });
      
      for (let i = 0; i < 6; i++) {
        doc.setDrawColor(226, 232, 240);
        doc.rect(10 + horaColWidth + i * cellWidth, currentY, cellWidth, cellHeight, 'S');
      }
      currentY += cellHeight;
    });

    // Bloques de clase con lógica de fusión (Teoría + Práctica consecutivo)
    const bloquesPorDia = new Map<number, HorarioAsignado[]>();
    horarios.forEach(h => {
      const dia = h.dia || h.dia_semana;
      if (!bloquesPorDia.has(dia)) bloquesPorDia.set(dia, []);
      bloquesPorDia.get(dia)!.push(h);
    });

    bloquesPorDia.forEach((asigs, dia) => {
      const diaIdx = dia - 1;
      const sortedAsigs = [...asigs].sort((a, b) => {
        const hA = this.horaToDecimal(a.hora_inicio);
        const hB = this.horaToDecimal(b.hora_inicio);
        return hA - hB;
      });

      const carriles: HorarioAsignado[][] = [];
      sortedAsigs.forEach(asig => {
        const hIni = this.horaToDecimal(asig.hora_inicio);
        let carrilIndex = -1;
        for (let i = 0; i < carriles.length; i++) {
          const ultimo = carriles[i][carriles[i].length - 1];
          const hFinUltimo = this.horaToDecimal(ultimo.hora_fin);
          if (Math.abs(hFinUltimo - hIni) < 0.01 && ultimo.curso?.id === asig.curso?.id && ultimo.docente?.id === asig.docente?.id) {
            carrilIndex = i;
            break;
          }
        }
        if (carrilIndex === -1) {
          for (let i = 0; i < carriles.length; i++) {
            const ultimo = carriles[i][carriles[i].length - 1];
            if (this.horaToDecimal(ultimo.hora_fin) <= hIni) {
              carrilIndex = i;
              break;
            }
          }
        }
        if (carrilIndex === -1) carriles.push([asig]);
        else carriles[carrilIndex].push(asig);
      });

      const todosLosBloquesDelDia: any[] = [];
      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        bloquesEnCarril.forEach(asig => {
          todosLosBloquesDelDia.push({
            asig,
            carrilIdx,
            hIni: this.horaToDecimal(asig.hora_inicio),
            hFin: this.horaToDecimal(asig.hora_fin)
          });
        });
      });

      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        const fusionados: any[] = [];
        bloquesEnCarril.forEach(h => {
          const hIni = this.horaToDecimal(h.hora_inicio);
          const hFin = this.horaToDecimal(h.hora_fin);
          const dur = hFin - hIni;
          const labelPart = h.tipo_clase === TipoClase.TEORIA ? `${this.formatDurationValue(dur)}T` : 
                           h.tipo_clase === TipoClase.PRACTICA ? `${this.formatDurationValue(dur)}P` : 
                           `${this.formatDurationValue(dur)}L-G${h.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ''}`;

          // Calcular el número máximo de carriles ocupados durante este bloque específico
          let maxCarrilIdxEnIntervalo = 0;
          todosLosBloquesDelDia.forEach(otro => {
            if (hIni < otro.hFin && otro.hIni < hFin) {
              if (otro.carrilIdx > maxCarrilIdxEnIntervalo) {
                maxCarrilIdxEnIntervalo = otro.carrilIdx;
              }
            }
          });
          
          const numCarrilesLocales = maxCarrilIdxEnIntervalo + 1;
          const widthPorBloqueLocal = (cellWidth - 1) / numCarrilesLocales;

          if (fusionados.length > 0) {
            const ultimo = fusionados[fusionados.length - 1];
            const mismoAmbiente = ultimo.asignacion.ambiente?.id === h.ambiente?.id;
            const mismoCurso = ultimo.asignacion.curso?.id === h.curso?.id;
            const mismaReglaGrupo = h.tipo_clase === TipoClase.LABORATORIO
              ? ultimo.asignacion.grupo?.id === h.grupo?.id
              : true;
            const esTP = (ultimo.asignacion.tipo_clase === TipoClase.TEORIA && h.tipo_clase === TipoClase.PRACTICA) ||
                         (ultimo.asignacion.tipo_clase === TipoClase.PRACTICA && h.tipo_clase === TipoClase.TEORIA);
            const mismoTipoTP = ultimo.asignacion.tipo_clase === h.tipo_clase &&
                                (h.tipo_clase === TipoClase.TEORIA || h.tipo_clase === TipoClase.PRACTICA);
            const mismoLaboratorio = ultimo.asignacion.tipo_clase === TipoClase.LABORATORIO &&
                                     h.tipo_clase === TipoClase.LABORATORIO &&
                                     mismaReglaGrupo;

            if (mismoCurso && mismoAmbiente && Math.abs(ultimo.horaFin - hIni) < 0.01 &&
                (esTP || mismoTipoTP || mismoLaboratorio)) {
              ultimo.horaFin = hFin;
              ultimo.totalHoraFin = h.hora_fin;
              ultimo.asignaciones.push(h);
              ultimo.tiposClase.push(h.tipo_clase);
              ultimo.label = this.construirLabelBloque(ultimo.asignaciones);
              
              // Actualizar el ancho y posición si el nuevo bloque fusionado tiene más colisiones
              if (numCarrilesLocales > Math.round((cellWidth - 1) / ultimo.width)) {
                ultimo.width = (cellWidth - 1) / numCarrilesLocales;
                ultimo.left = carrilIdx * ultimo.width;
              }
              return;
            }
          }

          fusionados.push({
            horaInicio: hIni,
            horaFin: hFin,
            totalHoraInicio: h.hora_inicio,
            totalHoraFin: h.hora_fin,
            asignacion: h,
            asignaciones: [h],
            tiposClase: [h.tipo_clase],
            left: carrilIdx * widthPorBloqueLocal,
            width: widthPorBloqueLocal,
            label: (h.curso?.nombre || '') + ` (${labelPart})`
          });
        });

        fusionados.forEach(f => {
          const startRowIdx = horas.indexOf(f.horaInicio);
          const endRowIdx = horas.indexOf(f.horaFin);
          if (startRowIdx !== -1 && endRowIdx !== -1 && diaIdx >= 0 && diaIdx < 6) {
            const blockY = yPos + 8 + startRowIdx * cellHeight;
            const blockH = (endRowIdx - startRowIdx) * cellHeight;
            const blockW = f.width || (cellWidth / 1);
            const blockX = 10 + horaColWidth + diaIdx * cellWidth + 0.5 + (f.left || 0);
            const numCarriles = Math.max(1, Math.round((cellWidth - 1) / blockW));

            const color = this.getColorForProfesorCurso(f.asignacion.docente?.id, f.asignacion.curso?.id);
            doc.setFillColor(...color);
            doc.rect(blockX, blockY, blockW, blockH, 'F');
            doc.setDrawColor(150, 150, 150);
            doc.rect(blockX, blockY, blockW, blockH, 'S');

            doc.setTextColor(51, 51, 51);
            doc.setFontSize(numCarriles > 1 ? 5 : 6);
            doc.setFont('helvetica', 'bold');
            const cursoText = f.label;
            const docenteText = f.asignacion.docente?.apellidos || '';
            const grupoText = f.asignacion.grupo?.codigo || '';
            
            const splitCurso = doc.splitTextToSize(cursoText, blockW - 2);
            doc.text(splitCurso.slice(0, 2), blockX + blockW / 2, blockY + 3, { align: 'center' });
            if (blockH > 6) doc.text(docenteText, blockX + blockW / 2, blockY + blockH - 4, { align: 'center' });
            if (blockH > 9 && numCarriles === 1) doc.text(grupoText, blockX + blockW / 2, blockY + blockH - 1.5, { align: 'center' });
          }
        });
      });
    });
  }

  async generarReporteAmbienteExcel(ambienteId: number, periodo: string): Promise<Buffer> {
    const ambiente = await this.ambienteRepo.findOne({ where: { id: ambienteId } });
    if (!ambiente) throw new Error("Ambiente no encontrado");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Horario Ambiente');
    await this.dibujarCicloEnExcel(sheet, 0, periodo, ambienteId); // Modificar dibujarCicloEnExcel para aceptar ambienteId opcional
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async generarReporteAmbientePDF(
    ambienteId: number,
    periodo: string,
  ): Promise<{ buffer: Buffer; tipo: string }> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl = config?.logo_url || "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const primaryColor = config?.color_primario || "#1a237e";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    const hexToRgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };
    const primaryRGB = hexToRgb(primaryColor);

    await this.dibujarPaginaAmbiente(doc, ambienteId, periodo, logoBase64, primaryRGB);

    const ambiente = await this.ambienteRepo.findOne({ where: { id: ambienteId } });
    return { 
      buffer: Buffer.from(doc.output('arraybuffer')), 
      tipo: ambiente?.tipo === TipoAmbiente.LABORATORIO ? "laboratorio" : "aula" 
    };
  }

  async generarReporteOperacionalPDF(periodo: string): Promise<Buffer> {
    const horarios = await this.horarioRepo.find({
      where: { periodo },
      relations: ["docente", "ambiente", "curso", "grupo"],
      order: { dia: "ASC", hora_inicio: "ASC" },
    });

    const dias = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

    const filas = horarios
      .map((h) => {
        const duracion = this.calcularDuracionHoras(h.hora_inicio, h.hora_fin);
        return `
        <tr>
          <td>${dias[h.dia] || h.dia}</td>
          <td>${h.hora_inicio.substring(0, 5)}</td>
          <td>${h.hora_fin.substring(0, 5)}</td>
          <td>${h.curso?.nombre || "-"}</td>
          <td>${h.grupo?.codigo || "-"}</td>
          <td>${h.docente ? `${h.docente.apellidos}, ${h.docente.nombres}` : "-"}</td>
          <td>${h.ambiente?.codigo || "-"}</td>
          <td>${h.tipo_clase === TipoClase.TEORIA ? "Teoría" : "Laboratorio"}</td>
          <td>${duracion.toFixed(1)}</td>
        </tr>
      `;
      })
      .join("");

    const totalHoras = horarios.reduce(
      (sum, h) => sum + this.calcularDuracionHoras(h.hora_inicio, h.hora_fin),
      0,
    );

    const html = this.htmlWrapper(`
      <div class="content-header">
        <h1>REPORTE CONSOLIDADO DE ASIGNACIONES</h1>
        <p>Período Académico: ${periodo}</p>
      </div>

      <div class="summary">
        <p><strong>Total asignaciones:</strong> ${horarios.length}</p>
        <p><strong>Total horas programadas:</strong> ${totalHoras.toFixed(1)}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Día</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Curso</th>
            <th>Grupo</th>
            <th>Docente</th>
            <th>Ambiente</th>
            <th>Tipo</th>
            <th>Horas</th>
          </tr>
        </thead>
        <tbody>
          ${filas || '<tr><td colspan="9" style="text-align:center">Sin asignaciones registradas</td></tr>'}
        </tbody>
      </table>
    `);

    return this.generarPDF(html);
  }

  async generarReporteGestionPDF(periodo: string): Promise<Buffer> {
    const [
      totalDocentes,
      docentesConHorario,
      totalAulas,
      totalLabs,
      horarios,
      conflictos,
      cursos,
      grupos,
    ] = await Promise.all([
      this.docenteRepo.count({ where: { activo: true } }),
      this.docenteRepo
        .createQueryBuilder("docente")
        .innerJoin("docente.horarios", "horario")
        .where("horario.periodo = :periodo", { periodo })
        .getCount(),
      this.ambienteRepo.count({
        where: { tipo: TipoAmbiente.AULA, activo: true },
      }),
      this.ambienteRepo.count({
        where: { tipo: TipoAmbiente.LABORATORIO, activo: true },
      }),
      this.horarioRepo.find({
        where: { periodo },
        relations: ["docente", "ambiente", "curso"],
      }),
      this.conflictoRepo.find({
        where: { periodo_academico: periodo, resuelto: false },
        relations: ["docente", "ambiente"],
      }),
      this.cursoRepo.find({ where: { activo: true } }),
      this.grupoRepo.find({ relations: ["curso", "periodo_academico"] }),
    ]);

    const ocupacionAulas = this.calcularOcupacionTipo(
      horarios,
      TipoAmbiente.AULA,
      totalAulas,
    );
    const ocupacionLabs = this.calcularOcupacionTipo(
      horarios,
      TipoAmbiente.LABORATORIO,
      totalLabs,
    );

    const cargaPorCategoria = this.calcularCargaPorCategoria(horarios);

    const horasDocentes = this.calcularHorasPorDocente(horarios);
    const top5Mayor = horasDocentes.slice(0, 5);
    const top5Menor = [...horasDocentes].reverse().slice(0, 5);

    const cursosIncompletos = this.calcularCursosIncompletos(cursos, horarios);

    const html = this.htmlWrapper(`
      <div class="content-header">
        <h1>REPORTE DE GESTIÓN Y RENDIMIENTO</h1>
        <p>Período Académico: ${periodo}</p>
      </div>

      <div class="section">
        <h2>1. Indicadores Clave (KPIs)</h2>
        <div class="kpi-grid">
          <div class="kpi-card"><span>Total Docentes:</span> <strong>${totalDocentes}</strong></div>
          <div class="kpi-card"><span>% Docentes con Horario:</span> <strong>${totalDocentes > 0 ? ((docentesConHorario / totalDocentes) * 100).toFixed(1) : 0}%</strong></div>
          <div class="kpi-card"><span>% Ocupación Aulas:</span> <strong>${ocupacionAulas.toFixed(1)}%</strong></div>
          <div class="kpi-card"><span>% Ocupación Labs:</span> <strong>${ocupacionLabs.toFixed(1)}%</strong></div>
          <div class="kpi-card"><span>Conflictos Pendientes:</span> <strong>${conflictos.length}</strong></div>
        </div>
      </div>

      <div class="section">
        <h2>2. Distribución de Carga por Categoría Docente</h2>
        <table>
          <thead>
            <tr><th>Categoría</th><th>Total Horas</th><th>% del Total</th></tr>
          </thead>
          <tbody>
            ${cargaPorCategoria.map((c) => `<tr><td>${c.categoria}</td><td>${c.horas.toFixed(1)}</td><td>${c.porcentaje.toFixed(1)}%</td></tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>3. Top 5 Docentes</h2>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1;">
            <h3>Mayor Carga</h3>
            <table>
              <thead><tr><th>Docente</th><th>Horas</th></tr></thead>
              <tbody>
                ${top5Mayor.map((d) => `<tr><td>${d.nombre}</td><td>${d.horas.toFixed(1)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
          <div style="flex: 1;">
            <h3>Menor Carga</h3>
            <table>
              <thead><tr><th>Docente</th><th>Horas</th></tr></thead>
              <tbody>
                ${top5Menor.map((d) => `<tr><td>${d.nombre}</td><td>${d.horas.toFixed(1)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>4. Cursos sin Asignar Completamente</h2>
        <table>
          <thead>
            <tr><th>Curso</th><th>Horas Requeridas</th><th>Horas Asignadas</th></tr>
          </thead>
          <tbody>
            ${cursosIncompletos.map((c) => `<tr><td>${c.nombre}</td><td>${c.requeridas}</td><td>${c.asignadas.toFixed(1)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>5. Lista de Conflictos No Resueltos</h2>
        <table>
          <thead>
            <tr><th>Tipo</th><th>Descripción</th><th>Docente/Ambiente</th></tr>
          </thead>
          <tbody>
            ${conflictos.map((c) => `<tr><td>${c.tipo_conflicto}</td><td>${c.descripcion}</td><td>${c.docente?.apellidos || c.ambiente?.codigo || "-"}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    `);

    return this.generarPDF(html);
  }

  async generarReporteDocenteExcel(
    docenteId: number,
    periodo: string,
  ): Promise<Buffer> {
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    if (!docente) throw new Error("Docente no encontrado");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Horario Docente');
    
    await this.dibujarCicloEnExcel(sheet, 0, periodo, undefined, docenteId);
    
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async generarReporteCompletoExcel(periodo: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Hoja Resumen (already added)
    // Hoja Docentes (already added)
    const sheetDocentes = workbook.addWorksheet("Docentes");
    sheetDocentes.columns = [
      { header: "ID", key: "id" },
      { header: "Nombre", key: "nombre", width: 40 },
      { header: "Horas Asignadas", key: "horas", width: 15 },
    ];

    const docentesData = await this.docenteRepo.find();
    for (const d of docentesData) {
      // Calculate total hours per docente
      const horariosDocente = await this.horarioRepo.find({
        where: { docente_id: d.id, periodo },
        relations: ["curso"],
      });
      const totalHoras = horariosDocente.reduce(
        (sum, h) => sum + this.calcularDuracionHoras(h.hora_inicio, h.hora_fin),
        0,
      );
      sheetDocentes.addRow({
        id: d.id,
        nombre: `${d.apellidos}, ${d.nombres}`,
        horas: totalHoras,
      });
    }

    // Hoja Aulas
    const sheetAulas = workbook.addWorksheet("Aulas");
    sheetAulas.columns = [
      { header: "ID", key: "id" },
      { header: "Código", key: "codigo" },
      { header: "Nombre", key: "nombre" },
      { header: "Capacidad", key: "capacidad" },
      { header: "Horas Asignadas", key: "horas", width: 15 },
    ];
    const aulas = await this.ambienteRepo.find({
      where: { tipo: TipoAmbiente.AULA, activo: true },
    });
    for (const aula of aulas) {
      const horariosAula = await this.horarioRepo.find({
        where: { ambiente_id: aula.id, periodo },
      });
      const totalHoras = horariosAula.reduce(
        (sum, h) => sum + this.calcularDuracionHoras(h.hora_inicio, h.hora_fin),
        0,
      );
      sheetAulas.addRow({
        id: aula.id,
        codigo: aula.codigo,
        nombre: aula.nombre,
        capacidad: aula.capacidad,
        horas: totalHoras,
      });
    }

    // Hoja Laboratorios
    const sheetLabs = workbook.addWorksheet("Laboratorios");
    sheetLabs.columns = [
      { header: "ID", key: "id" },
      { header: "Código", key: "codigo" },
      { header: "Nombre", key: "nombre" },
      { header: "Capacidad", key: "capacidad" },
      { header: "Horas Asignadas", key: "horas", width: 15 },
    ];
    const labs = await this.ambienteRepo.find({
      where: { tipo: TipoAmbiente.LABORATORIO, activo: true },
    });
    for (const lab of labs) {
      const horariosLab = await this.horarioRepo.find({
        where: { ambiente_id: lab.id, periodo },
      });
      const totalHoras = horariosLab.reduce(
        (sum, h) => sum + this.calcularDuracionHoras(h.hora_inicio, h.hora_fin),
        0,
      );
      sheetLabs.addRow({
        id: lab.id,
        codigo: lab.codigo,
        nombre: lab.nombre,
        capacidad: lab.capacidad,
        horas: totalHoras,
      });
    }

    // Return buffer
    return (await workbook.xlsx.writeBuffer()) as any;
  }



  private htmlWrapper(contenido: string, isLab = false): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #333; line-height: 1.4; }
          .content-header { text-align: center; margin-bottom: 20px; }
          .content-header h1 { font-size: 18px; color: #003366; margin-bottom: 5px; }
          .meta-info { display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; font-size: 10px; color: #666; }
          .meta-info p { margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { background-color: #003366; color: white; padding: 6px; text-align: left; font-size: 10px; }
          td { border: 1px solid #ddd; padding: 5px; font-size: 9px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary { text-align: right; font-size: 12px; margin-top: 10px; }
          .signature-section { margin-top: 40px; display: flex; justify-content: center; }
          .signature-box { text-align: center; width: 200px; }
          .signature-box .line { border-top: 1px solid #333; margin-bottom: 5px; }
          .kpi-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; }
          .kpi-card { background: #f0f4f8; padding: 10px; border-radius: 4px; flex: 1; min-width: 120px; text-align: center; }
          .kpi-card span { display: block; font-size: 9px; color: #666; }
          .kpi-card strong { font-size: 14px; color: #003366; }
          .equipment-section { background: #eef2f7; padding: 10px; border-radius: 4px; margin-bottom: 15px; }
          ${isLab ? ".grid-cell-lab { background-color: #e6f7ff !important; }" : ""}
        </style>
      </head>
      <body>
        ${contenido}
      </body>
      </html>
    `;
  }

  private calcularDuracionHoras(inicio: string, fin: string): number {
    const [hi, mi] = inicio.split(":").map(Number);
    const [hf, mf] = fin.split(":").map(Number);
    return (hf * 60 + mf - hi * 60 - mi) / 60;
  }

  private calcularAntiguedad(fechaIngreso: Date): number {
    const diff = Date.now() - new Date(fechaIngreso).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  private generarGrillaSemanal(
    horarios: HorarioAsignado[],
    isLab = false,
  ): string {
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const horas = [
      "07:00",
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
      "19:00",
      "20:00",
      "21:00",
    ];

    let html = "<table><thead><tr><th>Hora</th>";
    dias.forEach((d) => (html += `<th>${d}</th>`));
    html += "</tr></thead><tbody>";

    horas.forEach((hora) => {
      html += `<tr><td>${hora}</td>`;
      for (let dia = 1; dia <= 5; dia++) {
        const hFound = horarios.find(
          (h) =>
            h.dia === dia && h.hora_inicio.startsWith(hora.substring(0, 2)),
        );
        if (hFound) {
          const className = isLab ? "grid-cell-lab" : "";
          html += `<td class="${className}">${hFound.curso?.nombre || ""}<br>${hFound.docente?.apellidos || ""}<br>${hFound.grupo?.codigo || ""}</td>`;
        } else {
          html += "<td></td>";
        }
      }
      html += "</tr>";
    });

    html += "</tbody></table>";
    return html;
  }

  private calcularPorcentajeOcupacion(horarios: HorarioAsignado[]): number {
    const totalHorasDisponibles = 15 * 5; // 15 horas x 5 días
    let horasOcupadas = 0;
    horarios.forEach(
      (h) =>
        (horasOcupadas += this.calcularDuracionHoras(
          h.hora_inicio,
          h.hora_fin,
        )),
    );
    return (horasOcupadas / totalHorasDisponibles) * 100;
  }

  private calcularOcupacionTipo(
    horarios: HorarioAsignado[],
    tipo: TipoAmbiente,
    totalAmbientes: number,
  ): number {
    if (totalAmbientes === 0) return 0;
    const filtrados = horarios.filter((h) => h.ambiente?.tipo === tipo);
    const ambientesOcupados = new Set(filtrados.map((h) => h.ambiente_id)).size;
    return (ambientesOcupados / totalAmbientes) * 100;
  }

  private calcularCargaPorCategoria(horarios: HorarioAsignado[]): any[] {
    const map = new Map<string, number>();
    let total = 0;
    horarios.forEach((h) => {
      if (h.docente?.categoria) {
        const dur = this.calcularDuracionHoras(h.hora_inicio, h.hora_fin);
        map.set(h.docente.categoria, (map.get(h.docente.categoria) || 0) + dur);
        total += dur;
      }
    });

    return Array.from(map.entries()).map(([categoria, horas]) => ({
      categoria,
      horas,
      porcentaje: total > 0 ? (horas / total) * 100 : 0,
    }));
  }

  private calcularHorasPorDocente(horarios: HorarioAsignado[]): any[] {
    const map = new Map<string, number>();
    horarios.forEach((h) => {
      if (h.docente) {
        const nombre = `${h.docente.apellidos}, ${h.docente.nombres}`;
        const dur = this.calcularDuracionHoras(h.hora_inicio, h.hora_fin);
        map.set(nombre, (map.get(nombre) || 0) + dur);
      }
    });

    return Array.from(map.entries())
      .map(([nombre, horas]) => ({ nombre, horas }))
      .sort((a, b) => b.horas - a.horas);
  }

  async generarReporteCicloPDF(ciclo: number, periodo: string): Promise<Buffer> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl = config?.logo_url || "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const primaryColor = config?.color_primario || "#1a237e";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    const hexToRgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };
    const primaryRGB = hexToRgb(primaryColor);

    await this.dibujarPaginaCiclo(doc, ciclo, periodo, logoBase64, primaryRGB);

    // Agregar pie de página para reporte individual
    const pW = doc.internal.pageSize.getWidth();
    const pH = doc.internal.pageSize.getHeight();
    doc.setPage(1);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pH - 12, pW, 12, 'F');
    doc.setDrawColor(230, 230, 230);
    doc.line(10, pH - 12, pW - 10, pH - 12);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 15, pH - 6);
    doc.text(`Página 1 de 1`, pW - 15, pH - 6, { align: 'right' });

    return Buffer.from(doc.output('arraybuffer'));
  }

  async generarReporteTodosCiclosPDF(periodo: string): Promise<Buffer> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl = config?.logo_url || "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const primaryColor = config?.color_primario || "#1a237e";

    // Cargar logo como base64
    const logoBase64 = await this.getBase64Image(logoUrl);

    const ciclos = [1, 3, 5, 7, 9];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PAGE_W = 210;
    const PAGE_H = 297;

    // Convertir hexadecimal a RGB para jsPDF
    const hexToRgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };
    const primaryRGB = hexToRgb(primaryColor);

    // --- PÁGINA 1: INFORMACIÓN GENERAL (VERTICAL) ---
    doc.setFillColor(...primaryRGB);
    doc.rect(0, 0, PAGE_W, 45, 'F');
    
    // Logo en la primera página
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);
      } catch (e) {
        this.logger.warn("No se pudo cargar el logo en la primera página del PDF");
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('PROGRAMACIÓN ACADÉMICA', PAGE_W / 2 + 10, 22, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`SEMESTRE ACADÉMICO ${periodo}`, PAGE_W / 2 + 10, 32, { align: 'center' });

    doc.setTextColor(33, 33, 33);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    let currentY = 60;
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DE LA INSTITUCIÓN', 20, currentY);
    currentY += 10;
    doc.setFont('helvetica', 'normal');
    doc.text(config?.nombre_institucional || 'Universidad Nacional de Trujillo', 25, currentY); currentY += 7;
    doc.text('Facultad de Ingeniería', 25, currentY); currentY += 7;
    doc.text('Escuela Profesional de Ingeniería de Sistemas', 25, currentY); currentY += 15;

    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE CICLOS INCLUIDOS', 20, currentY);
    currentY += 10;
    
    const tableData = [];
    for (const ciclo of ciclos) {
      const count = await this.horarioRepo
        .createQueryBuilder("horario")
        .innerJoin("horario.curso", "curso")
        .where("curso.ciclo = :ciclo", { ciclo })
        .andWhere("horario.periodo = :periodo", { periodo })
        .getCount();
      tableData.push([`Ciclo ${ciclo}`, `${count} asignaciones`]);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Ciclo', 'N° Asignaciones']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: primaryRGB },
      margin: { left: 25, right: 25 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 25;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Este documento contiene la programación detallada de horarios para los ciclos impares del periodo.', 20, currentY);
    currentY += 6;
    doc.text('Generado automáticamente por el Sistema de Gestión de Horarios UNT.', 20, currentY);

    // --- SIGUIENTES PÁGINAS: HORARIOS (HORIZONTAL) ---
    for (const ciclo of ciclos) {
      doc.addPage('a4', 'landscape');
      await this.dibujarPaginaCiclo(doc, ciclo, periodo, logoBase64, primaryRGB);
    }

    // --- AGREGAR PIE DE PÁGINA (NÚMEROS Y FECHA) ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const isLandscape = doc.internal.pageSize.getWidth() > doc.internal.pageSize.getHeight();
      const pW = doc.internal.pageSize.getWidth();
      const pH = doc.internal.pageSize.getHeight();
      
      // Fondo para el pie de página para que no se superponga
      doc.setFillColor(255, 255, 255);
      doc.rect(0, pH - 12, pW, 12, 'F');
      
      doc.setDrawColor(230, 230, 230);
      doc.line(10, pH - 12, pW - 10, pH - 12);
      
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 15, pH - 6);
      doc.text(`Página ${i} de ${pageCount}`, pW - 15, pH - 6, { align: 'right' });
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async dibujarPaginaCiclo(doc: jsPDF, ciclo: number, periodo: string, logoBase64: string | null, primaryRGB: [number, number, number]): Promise<void> {
    const horarios = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("docente.departamento", "departamento")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("curso.ciclo = :ciclo", { ciclo })
      .andWhere("horario.periodo = :periodo", { periodo })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .getMany();
    
    horarios.forEach(h => {
      if (h.hora_inicio && h.hora_inicio.length > 5) h.hora_inicio = h.hora_inicio.substring(0, 5);
      if (h.hora_fin && h.hora_fin.length > 5) h.hora_fin = h.hora_fin.substring(0, 5);
    });

    let almuerzoInicio = 13;
    let almuerzoFin = 14;
    try {
      const restricciones = await this.configuracionService.getRestriccionesMap(periodo);
      const bloqueAlmuerzo = restricciones['BLOQUE_ALMUERZO'] as any;
      if (bloqueAlmuerzo && bloqueAlmuerzo.hora_inicio && bloqueAlmuerzo.hora_fin) {
        almuerzoInicio = parseInt(bloqueAlmuerzo.hora_inicio.split(':')[0], 10);
        almuerzoFin = parseInt(bloqueAlmuerzo.hora_fin.split(':')[0], 10);
      }
    } catch (error) {}

    const PAGE_W = 297;
    const PAGE_H = 210;
    const C = {
      primary: primaryRGB,
      white: [255, 255, 255] as [number, number, number],
      border: [203, 213, 225] as [number, number, number],
      text: [51, 65, 85] as [number, number, number],
    };

    // Cabecera con Logo
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, PAGE_W, 25, 'F');
    
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 10, 3, 18, 18);
      } catch (e) {}
    }

    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`HORARIO ACADÉMICO - CICLO ${ciclo}`, 32, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Universidad Nacional de Trujillo | Ingeniería de Sistemas', 32, 18);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Periodo: ${periodo}`, PAGE_W - 12, 15, { align: 'right' });

    let yPos = 30;

    // Profesores Table (Resumen)
    const profesoresCursosMap = new Map<string, any>();
    horarios.forEach(a => {
      if (!a.docente || !a.curso) return;
      const key = `${a.docente.id}-${a.curso.id}`;
      if (!profesoresCursosMap.has(key)) {
        profesoresCursosMap.set(key, { 
          docente: a.docente, 
          curso: a.curso, 
          horas: 0,
          hTeoria: 0,
          hPractica: 0,
          hLaboratorio: 0,
          gruposIds: new Set<number>(),
        });
      }
      const entry = profesoresCursosMap.get(key);
      const hInicio = parseInt(a.hora_inicio.split(':')[0], 10);
      const hFin = parseInt(a.hora_fin.split(':')[0], 10);
      const duration = (hFin - hInicio);
      entry.horas += duration;
      
      if (a.tipo_clase === TipoClase.TEORIA) entry.hTeoria += duration;
      else if (a.tipo_clase === TipoClase.PRACTICA) entry.hPractica += duration;
      else if (a.tipo_clase === TipoClase.LABORATORIO) {
        entry.hLaboratorio += duration;
        if (a.grupo?.id) entry.gruposIds.add(a.grupo.id);
      }
    });

    for (const entry of profesoresCursosMap.values()) {
      const ng = entry.gruposIds.size || 1;
      entry.hLaboratorio = entry.hLaboratorio / ng;
    }
    
    const hierarchy: { [key: string]: number } = {
      'PRINCIPAL': 1,
      'ASOCIADO': 2,
      'AUXILIAR': 3,
      'SIN_CATEGORIA': 4
    };

    const profesoresCursos = Array.from(profesoresCursosMap.values()).sort((a, b) => {
      const docA = a.docente;
      const docB = b.docente;
      const isSistemasA = docA?.departamento?.nombre === 'Ing. de Sistemas' ? 1 : 0;
      const isSistemasB = docB?.departamento?.nombre === 'Ing. de Sistemas' ? 1 : 0;
      if (isSistemasA !== isSistemasB) return isSistemasB - isSistemasA;
      const rankA = hierarchy[docA?.categoria] || 99;
      const rankB = hierarchy[docB?.categoria] || 99;
      if (rankA !== rankB) return rankA - rankB;
      return (docA?.apellidos || '').localeCompare(docB?.apellidos || '');
    });

    const profesorColorsCiclo: [number, number, number][] = [
      [255, 235, 238], [252, 228, 236], [243, 229, 245], [237, 231, 246], [232, 234, 246],
      [227, 242, 253], [224, 247, 250], [224, 242, 241], [232, 245, 233], [241, 248, 233]
    ];
    const profesorCursoColorMapCiclo = new Map<string, [number, number, number]>();
    profesoresCursos.forEach((item, idx) => {
      const key = `${item.docente.id}-${item.curso.id}`;
      profesorCursoColorMapCiclo.set(key, profesorColorsCiclo[idx % profesorColorsCiclo.length]);
    });

    autoTable(doc, {
      startY: yPos,
      head: [['N°', 'Profesor', 'Departamento', 'Asignatura', 'T', 'P', 'L', 'T. Horas']],
      body: profesoresCursos.map((item, idx) => [
        idx + 1,
        `${item.docente.apellidos}, ${item.docente.nombres}`,
        item.docente.departamento?.nombre || '—',
        item.curso.nombre,
        item.hTeoria || '-',
        item.hPractica || '-',
        item.hLaboratorio || '-',
        item.horas
      ]),
      theme: 'grid',
      styles: {
        fontSize: 5.5,
        cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
        valign: 'middle',
        halign: 'left',
        lineColor: C.border,
        lineWidth: 0.25,
        textColor: [51, 51, 51],
      },
      headStyles: {
        fillColor: C.primary,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 6.5,
        halign: 'center',
        cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        2: { cellWidth: 35 },
        4: { halign: 'center', cellWidth: 8 },
        5: { halign: 'center', cellWidth: 8 },
        6: { halign: 'center', cellWidth: 8 },
        7: { halign: 'center', cellWidth: 12, fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const rowIndex = data.row.index;
        const item = profesoresCursos[rowIndex];
        if (item?.docente?.id && item?.curso?.id) {
          const key = `${item.docente.id}-${item.curso.id}`;
          const rgb = profesorCursoColorMapCiclo.get(key);
          if (rgb) data.cell.styles.fillColor = rgb;
        }
      },
      margin: { left: 8, right: 8 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 6;

    // Grid de Horarios
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const diasNum = [1, 2, 3, 4, 5, 6];
    const horas = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 a 22:00
    const cellHeight = 6.5; // Reducido un poco más para asegurar que quepa con el footer
    const horaColWidth = 15;
    const gridWidth = PAGE_W - 20;
    const cellWidth = (gridWidth - (horaColWidth * 2)) / 6;

    // Dibujar Encabezado Grid
    doc.setFillColor(...C.primary);
    doc.rect(10, yPos, gridWidth, 8, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.text('HORA', 10 + horaColWidth / 2, yPos + 5, { align: 'center' });
    dias.forEach((dia, idx) => {
      doc.text(dia, 10 + horaColWidth + idx * cellWidth + cellWidth / 2, yPos + 5, { align: 'center' });
    });
    doc.text('HORA', 10 + gridWidth - horaColWidth / 2, yPos + 5, { align: 'center' });
    
    let currentY = yPos + 8;
    
    // Dibujar Filas de Horas
    horas.forEach((hora) => {
      // Fondos de columnas de horas
      doc.setFillColor(248, 250, 252);
      doc.rect(10, currentY, horaColWidth, cellHeight, 'F');
      doc.rect(10 + gridWidth - horaColWidth, currentY, horaColWidth, cellHeight, 'F');
      
      doc.setTextColor(...C.text);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(`${String(hora).padStart(2, '0')}:00`, 10 + horaColWidth / 2, currentY + cellHeight / 2 + 1.5, { align: 'center' });
      doc.text(`${String(hora).padStart(2, '0')}:00`, 10 + gridWidth - horaColWidth / 2, currentY + cellHeight / 2 + 1.5, { align: 'center' });
      
      // Dibujar celdas de días y almuerzo
      diasNum.forEach((d, idx) => {
        const cellX = 10 + horaColWidth + idx * cellWidth;
        const isAlmuerzo = hora >= almuerzoInicio && hora < almuerzoFin;
        
        if (isAlmuerzo) {
          doc.setFillColor(255, 248, 225);
          doc.rect(cellX, currentY, cellWidth, cellHeight, 'F');
          doc.setTextColor(180, 120, 0);
          doc.setFontSize(6);
          doc.text('ALMUERZO', cellX + cellWidth / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
        }
        
        // Bordes de celda
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.1);
        doc.rect(cellX, currentY, cellWidth, cellHeight, 'S');
      });
      
      // Bordes de columna de hora
      doc.rect(10, currentY, horaColWidth, cellHeight, 'S');
      doc.rect(10 + gridWidth - horaColWidth, currentY, horaColWidth, cellHeight, 'S');
      
      currentY += cellHeight;
    });

    // Dibujar Bloques de Clase
    const bloquesPorDia = new Map<number, any[]>();
    horarios.forEach(h => {
      const dia = h.dia ?? h.dia_semana;
      if (!bloquesPorDia.has(dia)) bloquesPorDia.set(dia, []);
      bloquesPorDia.get(dia).push(h);
    });

    bloquesPorDia.forEach((bloques, dia) => {
      const diaIdx = dia - 1;
      
      // Ordenar bloques por hora de inicio
      const bloquesOrdenados = [...bloques].sort((a, b) => {
        const hIniA = this.horaToDecimal(a.hora_inicio);
        const hIniB = this.horaToDecimal(b.hora_inicio);
        if (hIniA !== hIniB) return hIniA - hIniB;
        return a.id - b.id;
      });

      // Lane assignment algorithm (Interval Scheduling)
      const carriles: any[][] = [];
      
      bloquesOrdenados.forEach(bloque => {
        const hIni = this.horaToDecimal(bloque.hora_inicio);
        
        // Buscar primer carril libre
        let carrilIndex = -1;

        // 1. Prioridad: Mismo curso consecutivo
        for (let i = 0; i < carriles.length; i++) {
          const ultimoBloque = carriles[i][carriles[i].length - 1];
          const hFinUltimo = this.horaToDecimal(ultimoBloque.hora_fin);
          if (Math.abs(hFinUltimo - hIni) < 0.01 && ultimoBloque.curso?.id === bloque.curso?.id) {
            carrilIndex = i;
            break;
          }
        }

        // 2. Segunda opción: Cualquier carril libre
        if (carrilIndex === -1) {
          for (let i = 0; i < carriles.length; i++) {
            const ultimoBloque = carriles[i][carriles[i].length - 1];
            const hFinUltimo = this.horaToDecimal(ultimoBloque.hora_fin);
            if (hFinUltimo <= hIni) {
              carrilIndex = i;
              break;
            }
          }
        }

        if (carrilIndex === -1) {
          carriles.push([bloque]);
        } else {
          carriles[carrilIndex].push(bloque);
        }
      });

      const numCarriles = carriles.length;
      
      // Pre-procesar bloques para calcular anchos dinámicos (Igual que en el frontend)
      const todosLosBloquesDelDia: any[] = [];
      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        bloquesEnCarril.forEach(asig => {
          todosLosBloquesDelDia.push({
            asig,
            carrilIdx,
            hIni: this.horaToDecimal(asig.hora_inicio),
            hFin: this.horaToDecimal(asig.hora_fin)
          });
        });
      });

      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        const fusionados: any[] = [];
        bloquesEnCarril.forEach(h => {
          const hIni = this.horaToDecimal(h.hora_inicio);
          const hFin = this.horaToDecimal(h.hora_fin);
          const dur = hFin - hIni;
          const labelPart = h.tipo_clase === TipoClase.TEORIA ? `${this.formatDurationValue(dur)}T` : 
                           h.tipo_clase === TipoClase.PRACTICA ? `${this.formatDurationValue(dur)}P` : 
                           `${this.formatDurationValue(dur)}L-G${h.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ''}`;

          // Calcular el número máximo de carriles ocupados durante este bloque específico
          let maxCarrilIdxEnIntervalo = 0;
          todosLosBloquesDelDia.forEach(otro => {
            if (hIni < otro.hFin && otro.hIni < hFin) {
              if (otro.carrilIdx > maxCarrilIdxEnIntervalo) {
                maxCarrilIdxEnIntervalo = otro.carrilIdx;
              }
            }
          });
          
          const numCarrilesLocales = maxCarrilIdxEnIntervalo + 1;
          const widthPorBloqueLocal = (cellWidth - 1) / numCarrilesLocales;

          if (fusionados.length > 0) {
            const ultimo = fusionados[fusionados.length - 1];
            const mismoAmbiente = ultimo.asignacion.ambiente?.id === h.ambiente?.id;
            const mismoCurso = ultimo.asignacion.curso?.id === h.curso?.id;
            const mismaReglaGrupo = h.tipo_clase === TipoClase.LABORATORIO
              ? ultimo.asignacion.grupo?.id === h.grupo?.id
              : true;
            const esTP = (ultimo.asignacion.tipo_clase === TipoClase.TEORIA && h.tipo_clase === TipoClase.PRACTICA) ||
                         (ultimo.asignacion.tipo_clase === TipoClase.PRACTICA && h.tipo_clase === TipoClase.TEORIA);
            const mismoTipoTP = ultimo.asignacion.tipo_clase === h.tipo_clase &&
                                (h.tipo_clase === TipoClase.TEORIA || h.tipo_clase === TipoClase.PRACTICA);
            const mismoLaboratorio = ultimo.asignacion.tipo_clase === TipoClase.LABORATORIO &&
                                     h.tipo_clase === TipoClase.LABORATORIO &&
                                     mismaReglaGrupo;

            if (mismoCurso && mismoAmbiente && Math.abs(ultimo.horaFin - hIni) < 0.01 &&
                (esTP || mismoTipoTP || mismoLaboratorio)) {
              ultimo.horaFin = hFin;
              ultimo.totalHoraFin = h.hora_fin;
              ultimo.asignaciones.push(h);
              ultimo.tiposClase.push(h.tipo_clase);
              ultimo.label = this.construirLabelBloque(ultimo.asignaciones);
              
              // Actualizar el ancho y posición si el nuevo bloque fusionado tiene más colisiones
              if (numCarrilesLocales > Math.round((cellWidth - 1) / ultimo.width)) {
                ultimo.width = (cellWidth - 1) / numCarrilesLocales;
                ultimo.left = carrilIdx * ultimo.width;
              }
              return;
            }
          }

          fusionados.push({
            dia: dia,
            horaInicio: hIni,
            horaFin: hFin,
            totalHoraInicio: h.hora_inicio,
            totalHoraFin: h.hora_fin,
            asignacion: h,
            asignaciones: [h],
            tiposClase: [h.tipo_clase],
            left: carrilIdx * widthPorBloqueLocal,
            width: widthPorBloqueLocal,
            label: (h.curso?.nombre || '') + ` (${labelPart})`
          });
        });

        fusionados.forEach(f => {
          const rowStart = horas.indexOf(f.horaInicio);
          const rowEnd = horas.indexOf(f.horaFin);
          
          if (rowStart !== -1 && rowEnd !== -1) {
            const blockX = 10 + horaColWidth + diaIdx * cellWidth + 0.5 + f.left;
            const blockY = yPos + 8 + rowStart * cellHeight + 0.5;
            const blockW = f.width - 0.5;
            const blockH = (rowEnd - rowStart) * cellHeight - 1;

            const colorKey = `${f.asignacion.docente?.id}-${f.asignacion.curso?.id}`;
            const color = profesorCursoColorMapCiclo.get(colorKey) || [255, 255, 255];
            doc.setFillColor(...color as [number, number, number]);
            doc.rect(blockX, blockY, blockW, blockH, 'F');
            
            doc.setDrawColor(...C.primary);
            doc.setLineWidth(0.1);
            doc.rect(blockX, blockY, blockW, blockH, 'S');

            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            
            let fontSize = 5.5;
            const numCarrilesBlock = Math.round((cellWidth - 1) / f.width);
            if (numCarrilesBlock > 1) fontSize = 4;
            if (numCarrilesBlock > 2) fontSize = 3;
            doc.setFontSize(fontSize);
            
            const cursoNombre = f.label;
            const docenteApellidos = f.asignacion.docente?.apellidos || '';
            const ambienteNombre = f.asignacion.ambiente?.nombre || f.asignacion.ambiente?.codigo || '';
            
            const splitCurso = doc.splitTextToSize(cursoNombre, blockW - 1);
            doc.text(splitCurso.slice(0, 2), blockX + blockW / 2, blockY + (fontSize / 2) + 1, { align: 'center' });
            
            if (blockH > 10) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(fontSize - 0.5);
              doc.text(docenteApellidos, blockX + blockW / 2, blockY + blockH - (fontSize) - 1, { align: 'center' });
              
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...C.primary);
              const splitAmb = doc.splitTextToSize(ambienteNombre, blockW - 1);
              doc.text(splitAmb[0], blockX + blockW / 2, blockY + blockH - 1.5, { align: 'center' });
            }
          }
        });
      });
    });
  }

  async generarReporteCicloExcel(ciclo: number, periodo: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Ciclo ${ciclo}`);
    await this.dibujarCicloEnExcel(sheet, ciclo, periodo);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async generarReporteTodosCiclosExcel(periodo: string): Promise<Buffer> {
    const ciclos = [1, 3, 5, 7, 9];
    const workbook = new ExcelJS.Workbook();

    for (const ciclo of ciclos) {
      const sheet = workbook.addWorksheet(`Ciclo ${ciclo}`);
      await this.dibujarCicloEnExcel(sheet, ciclo, periodo);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async dibujarCicloEnExcel(sheet: ExcelJS.Worksheet, ciclo: number, periodo: string, ambienteId?: number, docenteId?: number): Promise<void> {
    const query = this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("docente.departamento", "departamento")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("horario.periodo = :periodo", { periodo });

    if (ambienteId) {
      query.andWhere("horario.ambiente_id = :ambienteId", { ambienteId });
    } else if (docenteId) {
      query.andWhere("horario.docente_id = :docenteId", { docenteId });
    } else {
      query.andWhere("curso.ciclo = :ciclo", { ciclo });
    }

    const horarios = await query
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .getMany();

    const ambiente = ambienteId ? await this.ambienteRepo.findOne({ where: { id: ambienteId } }) : null;
    const docente = docenteId ? await this.docenteRepo.findOne({ where: { id: docenteId } }) : null;

    const primaryColor = '4F46E5'; // Indigo-600
    const primaryDark = '3730A3'; // Indigo-800
    const white = 'FFFFFF';

    // 1. Cabecera
    sheet.mergeCells('A1:H2');
    const headerCell = sheet.getCell('A1');
    if (ambienteId) {
      headerCell.value = `HORARIO DE AMBIENTE: ${ambiente?.nombre || ''} | Periodo: ${periodo}`;
    } else if (docenteId) {
      headerCell.value = `HORARIO PERSONAL: ${docente?.apellidos}, ${docente?.nombres} | Periodo: ${periodo}`;
    } else {
      headerCell.value = `HORARIO ACADÉMICO - CICLO ${ciclo} | Periodo: ${periodo}`;
    }
    headerCell.font = { bold: true, size: 14, color: { argb: white } };
    headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryDark } };

    // 2. Tabla de Profesores
    const profesoresCursosMap = new Map<string, any>();
    horarios.forEach(a => {
      if (!a.docente || !a.curso) return;
      const key = `${a.docente.id}-${a.curso.id}`;
      if (!profesoresCursosMap.has(key)) {
        profesoresCursosMap.set(key, { 
          docente: a.docente, 
          curso: a.curso, 
          horas: 0, hTeoria: 0, hPractica: 0, hLaboratorio: 0,
          gruposIds: new Set<number>(),
        });
      }
      const entry = profesoresCursosMap.get(key);
      const hInicio = parseInt(a.hora_inicio.split(':')[0], 10);
      const hFin = parseInt(a.hora_fin.split(':')[0], 10);
      const duration = (hFin - hInicio);
      entry.horas += duration;
      if (a.tipo_clase === TipoClase.TEORIA) entry.hTeoria += duration;
      else if (a.tipo_clase === TipoClase.PRACTICA) entry.hPractica += duration;
      else if (a.tipo_clase === TipoClase.LABORATORIO) {
        entry.hLaboratorio += duration;
        if (a.grupo?.id) entry.gruposIds.add(a.grupo.id);
      }
    });

    for (const entry of profesoresCursosMap.values()) {
      const ng = entry.gruposIds.size || 1;
      entry.hLaboratorio = entry.hLaboratorio / ng;
    }

    const hierarchy: { [key: string]: number } = { 'PRINCIPAL': 1, 'ASOCIADO': 2, 'AUXILIAR': 3, 'SIN_CATEGORIA': 4 };
    const profesoresCursos = Array.from(profesoresCursosMap.values()).sort((a, b) => {
      const docA = a.docente; const docB = b.docente;
      const isSistemasA = docA?.departamento?.nombre === 'Ing. de Sistemas' ? 1 : 0;
      const isSistemasB = docB?.departamento?.nombre === 'Ing. de Sistemas' ? 1 : 0;
      if (isSistemasA !== isSistemasB) return isSistemasB - isSistemasA;
      const rankA = hierarchy[docA?.categoria] || 99; const rankB = hierarchy[docB?.categoria] || 99;
      if (rankA !== rankB) return rankA - rankB;
      return (docA?.apellidos || '').localeCompare(docB?.apellidos || '');
    });

    let currentRow = 4;
    sheet.getCell(`A${currentRow}`).value = 'RESUMEN DE DOCENTES Y ASIGNATURAS';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 11 };
    currentRow++;

    const tableHeaders = ['N°', 'Profesor', 'Departamento', 'Asignatura', 'T', 'P', 'L', 'T. Horas'];
    tableHeaders.forEach((h, i) => {
      const cell = sheet.getCell(currentRow, i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
      cell.alignment = { horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    currentRow++;

    // Colores para profesores (los mismos que en el PDF para consistencia)
    const rowColors = [
      'FFEBEE', 'FCE4EC', 'F3E5F5', 'EDE7F6', 'E8EAF6', 
      'E3F2FD', 'E0F7FA', 'E0F2F1', 'E8F5E9', 'F1F8E9'
    ];
    const profesorCursoColorMap = new Map<string, string>();

    profesoresCursos.forEach((item, idx) => {
      const color = rowColors[idx % rowColors.length];
      const key = `${item.docente.id}-${item.curso.id}`;
      profesorCursoColorMap.set(key, color);

      const row = [
        idx + 1, 
        `${item.docente.apellidos}, ${item.docente.nombres}`, 
        item.docente.departamento?.nombre || '—', 
        item.curso.nombre, 
        item.hTeoria || '-', 
        item.hPractica || '-', 
        item.hLaboratorio || '-', 
        item.horas
      ];
      row.forEach((val, i) => {
        const cell = sheet.getCell(currentRow, i + 1);
        cell.value = val;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        if (i === 0 || i >= 4) cell.alignment = { horizontal: 'center' };
      });
      currentRow++;
    });

    currentRow += 2;

    // 3. Grid de Horarios
    sheet.getCell(`A${currentRow}`).value = 'PROGRAMACIÓN SEMANAL';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 11 };
    currentRow++;

    // --- LÓGICA DINÁMICA DE COLUMNAS ---
    // 1. Agrupar asignaciones por día y calcular peak lanes por día
    const asignacionesPorDia = new Map<number, HorarioAsignado[]>();
    horarios.forEach(h => {
      const dia = h.dia || h.dia_semana;
      if (dia >= 1 && dia <= 6) {
        if (!asignacionesPorDia.has(dia)) asignacionesPorDia.set(dia, []);
        asignacionesPorDia.get(dia).push(h);
      }
    });

    const peakLanesPorDia = new Map<number, number>();
    const carrilesPorDia = new Map<number, HorarioAsignado[][]>();

    for (let d = 1; d <= 6; d++) {
      const asigs = asignacionesPorDia.get(d) || [];
      const sortedAsigs = [...asigs].sort((a, b) => {
        const hA = parseInt(a.hora_inicio.split(':')[0], 10);
        const hB = parseInt(b.hora_inicio.split(':')[0], 10);
        return hA - hB;
      });

      const carriles: HorarioAsignado[][] = [];
      sortedAsigs.forEach(asig => {
        const hIni = parseInt(asig.hora_inicio.split(':')[0], 10);
        let carrilIndex = -1;
        for (let i = 0; i < carriles.length; i++) {
          const ultimo = carriles[i][carriles[i].length - 1];
          const hFinUltimo = parseInt(ultimo.hora_fin.split(':')[0], 10);
          if (hFinUltimo <= hIni) { carrilIndex = i; break; }
        }
        if (carrilIndex === -1) carriles.push([asig]);
        else carriles[carrilIndex].push(asig);
      });

      // Calcular el peak real en cualquier momento del día
      let peak = 1;
      const horasCheck = Array.from({ length: 15 }, (_, i) => i + 7);
      horasCheck.forEach(hCheck => {
        let count = 0;
        asigs.forEach(a => {
          const start = parseInt(a.hora_inicio.split(':')[0], 10);
          const end = parseInt(a.hora_fin.split(':')[0], 10);
          if (hCheck >= start && hCheck < end) count++;
        });
        if (count > peak) peak = count;
      });

      peakLanesPorDia.set(d, peak);
      carrilesPorDia.set(d, carriles);
    }

    // 2. Mapear columnas a días
    const dayToStartCol = new Map<number, number>();
    let currentColumn = 2; // Empezamos en B (la A es para HORA)
    const diasHeaders = ["HORA", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    
    diasHeaders.forEach((d, i) => {
      if (i === 0) { // HORA
        const cell = sheet.getCell(currentRow, 1);
        cell.value = d;
        cell.font = { bold: true, color: { argb: white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      } else { // Días
        const diaNum = i;
        const peak = peakLanesPorDia.get(diaNum);
        dayToStartCol.set(diaNum, currentColumn);
        
        const startCol = currentColumn;
        const endCol = currentColumn + peak - 1;
        
        if (startCol !== endCol) sheet.mergeCells(currentRow, startCol, currentRow, endCol);
        const cell = sheet.getCell(currentRow, startCol);
        cell.value = d;
        cell.font = { bold: true, color: { argb: white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        
        currentColumn += peak;
      }
    });
    currentRow++;

    const horasArr = Array.from({ length: 15 }, (_, i) => i + 7);
    const horaToRowMap = new Map<number, number>();
    
    // Obtener almuerzo
    let almuerzoInicio = 13; let almuerzoFin = 14;
    try {
      const restricciones = await this.configuracionService.getRestriccionesMap(periodo);
      const bAlm = restricciones['BLOQUE_ALMUERZO'] as any;
      if (bAlm?.hora_inicio && bAlm?.hora_fin) {
        almuerzoInicio = parseInt(bAlm.hora_inicio.split(':')[0], 10);
        almuerzoFin = parseInt(bAlm.hora_fin.split(':')[0], 10);
      }
    } catch (e) {}

    const startGridRow = currentRow;
    horasArr.forEach(h => {
      horaToRowMap.set(h, currentRow);
      const cellHora = sheet.getCell(currentRow, 1);
      cellHora.value = `${String(h).padStart(2, '0')}:00`;
      cellHora.font = { bold: true };
      cellHora.alignment = { horizontal: 'center', vertical: 'middle' };
      cellHora.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      cellHora.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

      for (let dayIdx = 1; dayIdx <= 6; dayIdx++) {
        const startCol = dayToStartCol.get(dayIdx);
        const peak = peakLanesPorDia.get(dayIdx);
        const endCol = startCol + peak - 1;
        
        for (let col = startCol; col <= endCol; col++) {
          const cell = sheet.getCell(currentRow, col);
          cell.border = { 
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: col === startCol ? { style: 'thin' } : undefined,
            right: col === endCol ? { style: 'thin' } : undefined
          };
          if (h >= almuerzoInicio && h < almuerzoFin) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8E1' } };
          }
        }
        if (h >= almuerzoInicio && h < almuerzoFin) {
          try {
            if (startCol !== endCol) sheet.mergeCells(currentRow, startCol, currentRow, endCol);
            const cell = sheet.getCell(currentRow, startCol);
            cell.value = 'ALMUERZO';
            cell.font = { color: { argb: 'B47800' }, size: 8, italic: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } catch (e) {}
        }
      }
      currentRow++;
    });

    // Dibujar bloques usando carriles dinámicos
    for (let dia = 1; dia <= 6; dia++) {
      const asigs = asignacionesPorDia.get(dia) || [];
      const carriles = carrilesPorDia.get(dia) || [];
      const dayStartCol = dayToStartCol.get(dia);
      const dayPeak = peakLanesPorDia.get(dia);

      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        const fusionados: any[] = [];
        bloquesEnCarril.forEach(h => {
          const hIni = this.horaToDecimal(h.hora_inicio);
          const hFin = this.horaToDecimal(h.hora_fin);
          const dur = hFin - hIni;
          const labelPart = h.tipo_clase === TipoClase.TEORIA ? `${this.formatDurationValue(dur)}T` : 
                           h.tipo_clase === TipoClase.PRACTICA ? `${this.formatDurationValue(dur)}P` : 
                           `${this.formatDurationValue(dur)}L-G${h.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ''}`;

          if (fusionados.length > 0) {
            const ultimo = fusionados[fusionados.length - 1];
            const mismoAmbiente = ultimo.asignacion.ambiente?.id === h.ambiente?.id;
            const mismoCurso = ultimo.asignacion.curso?.id === h.curso?.id;
            const mismaReglaGrupo = h.tipo_clase === TipoClase.LABORATORIO
              ? ultimo.asignacion.grupo?.id === h.grupo?.id
              : true;
            const esTP = (ultimo.asignacion.tipo_clase === TipoClase.TEORIA && h.tipo_clase === TipoClase.PRACTICA) ||
                         (ultimo.asignacion.tipo_clase === TipoClase.PRACTICA && h.tipo_clase === TipoClase.TEORIA);
            const mismoTipoTP = ultimo.asignacion.tipo_clase === h.tipo_clase &&
                                (h.tipo_clase === TipoClase.TEORIA || h.tipo_clase === TipoClase.PRACTICA);
            const mismoLaboratorio = ultimo.asignacion.tipo_clase === TipoClase.LABORATORIO &&
                                     h.tipo_clase === TipoClase.LABORATORIO &&
                                     mismaReglaGrupo;
            if (mismoCurso && mismoAmbiente && Math.abs(ultimo.horaFin - hIni) < 0.01 &&
                (esTP || mismoTipoTP || mismoLaboratorio)) {
              ultimo.horaFin = hFin;
              ultimo.label = this.construirLabelBloque(ultimo.asignaciones);
              ultimo.asignaciones.push(h);
              ultimo.tiposClase.push(h.tipo_clase);
              return;
            }
          }

          fusionados.push({
            horaInicio: hIni,
            horaFin: hFin,
            asignacion: h,
            asignaciones: [h],
            tiposClase: [h.tipo_clase],
            carrilIdx,
            label: `${h.curso?.nombre} (${labelPart})`
          });
        });

        fusionados.forEach(f => {
          const hIni = f.horaInicio;
          const hFin = f.horaFin;
          const rowStart = horaToRowMap.get(hIni);
          const rowEnd = horaToRowMap.get(hFin - 1);

          if (rowStart && rowEnd) {
            // Calcular colSpan: si este bloque no choca con nada en otros carriles, expandir
            let puedeExpandirse = true;
            carriles.forEach((otros, idx) => {
              if (idx !== carrilIdx) {
                otros.forEach(o => {
                  const oIni = parseInt(o.hora_inicio.split(':')[0], 10);
                  const oFin = parseInt(o.hora_fin.split(':')[0], 10);
                  if (hIni < oFin && oIni < hFin) puedeExpandirse = false;
                });
              }
            });

            const startCol = puedeExpandirse ? dayStartCol : dayStartCol + carrilIdx;
            const endCol = puedeExpandirse ? dayStartCol + dayPeak - 1 : startCol;

            const cell = sheet.getCell(rowStart, startCol);
            cell.value = `${f.label}\n${f.asignacion.docente?.apellidos}\n${f.asignacion.ambiente?.nombre || f.asignacion.ambiente?.codigo || ''}`;
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.font = { size: !puedeExpandirse ? 7 : 8, bold: true };
            
            const colorKey = `${f.asignacion.docente?.id}-${f.asignacion.curso?.id}`;
            const color = profesorCursoColorMap.get(colorKey) || 'FFFFFF';
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

            try {
              if (rowStart !== rowEnd || startCol !== endCol) {
                sheet.mergeCells(rowStart, startCol, rowEnd, endCol);
              }
            } catch (e) {}
          }
        });
      });
    }

    // Ajustar anchos
    sheet.getColumn(1).width = 10;
    for (let c = 2; c < currentColumn; c++) {
      sheet.getColumn(c).width = 10; // Ancho base por sub-columna
    }

    // Altura de filas
    for (let r = startGridRow; r < currentRow; r++) {
      sheet.getRow(r).height = 55;
    }
  }

  private calcularCursosIncompletos(
    cursos: Curso[],
    horarios: HorarioAsignado[],
  ): any[] {
    // Simplificado por brevedad, asumiendo que si no hay horarios asignados o menos de lo esperado, está incompleto.
    return cursos
      .map((c) => {
        const asignadas = horarios
          .filter((h) => h.curso_id === c.id)
          .reduce(
            (acc, h) =>
              acc + this.calcularDuracionHoras(h.hora_inicio, h.hora_fin),
            0,
          );
        const requeridas = c.horas_teoria + c.horas_laboratorio;
        return { nombre: c.nombre, requeridas, asignadas };
      })
      .filter((c) => c.asignadas < c.requeridas);
  }
}
