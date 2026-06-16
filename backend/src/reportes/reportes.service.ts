import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not } from "typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { Grupo } from "../entities/grupo.entity";
import { PlanEstudios } from "../entities/plan-estudios.entity";
import { CursoPlanEstudios } from "../entities/curso-plan-estudios.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import * as ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ConfiguracionService } from "../configuracion/configuracion.service";
import * as https from "https";

import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Departamento } from "../entities/departamento.entity";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";

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
    @InjectRepository(PlanEstudios)
    private readonly planEstudiosRepo: Repository<PlanEstudios>,
    @InjectRepository(CursoPlanEstudios)
    private readonly cursoPlanEstudiosRepo: Repository<CursoPlanEstudios>,
    @InjectRepository(DeclaracionCargaHoraria)
    private readonly declaracionRepo: Repository<DeclaracionCargaHoraria>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(Departamento)
    private readonly departamentoRepo: Repository<Departamento>,
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
            resolve(
              `data:${res.headers["content-type"]};base64,${buffer.toString("base64")}`,
            );
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
    const logoUrl =
      config?.logo_url ||
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const primaryColor = config?.color_primario || "#4f46e5";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
      relations: ["departamento"],
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
    horarios.forEach((h) => {
      if (h.hora_inicio && h.hora_inicio.length > 5)
        h.hora_inicio = h.hora_inicio.substring(0, 5);
      if (h.hora_fin && h.hora_fin.length > 5)
        h.hora_fin = h.hora_fin.substring(0, 5);
    });

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
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
    doc.rect(0, 0, PAGE_W, 35, "F");
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", 12, 5, 22, 22);
      } catch (e) {}
    }
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`REPORTE DETALLADO DEL DOCENTE`, 40, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Periodo Académico: ${periodo}`, 40, 22);
    doc.text(
      `Generado el: ${new Date().toLocaleDateString()}`,
      PAGE_W - 12,
      22,
      { align: "right" },
    );

    // Sección 1: Datos Personales
    let yPos = 45;
    doc.setTextColor(...C.primary);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. INFORMACIÓN DEL DOCENTE", 12, yPos);
    doc.setDrawColor(...C.primary);
    doc.setLineWidth(0.5);
    doc.line(12, yPos + 2, 80, yPos + 2);

    yPos += 12;
    autoTable(doc, {
      startY: yPos,
      body: [
        [
          "Apellidos y Nombres:",
          `${docente.apellidos}, ${docente.nombres}`,
          "Código:",
          docente.codigo || "—",
        ],
        [
          "Categoría:",
          docente.categoria || "—",
          "Contrato:",
          docente.tipo_contrato || "—",
        ],
        [
          "Departamento:",
          docente.departamento?.nombre || "—",
          "Modalidad:",
          docente.modalidad || "—",
        ],
        ["Email:", docente.email || "—", "Teléfono:", docente.telefono || "—"],
      ],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: "bold", textColor: C.lightText, cellWidth: 40 },
        1: { cellWidth: 100 },
        2: { fontStyle: "bold", textColor: C.lightText, cellWidth: 30 },
        3: { cellWidth: 50 },
      },
      margin: { left: 12 },
    });

    // Sección 2: Carga Académica Detallada
    yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setTextColor(...C.primary);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2. CARGA ACADÉMICA DETALLADA", 12, yPos);
    doc.setDrawColor(...C.primary);
    doc.line(12, yPos + 2, 80, yPos + 2);

    yPos += 10;
    const resumenMap = new Map<string, any>();
    horarios.forEach((h) => {
      if (!h.curso) return;
      const key = `${h.curso.id}-${h.tipo_clase}-${h.grupo?.id}`;
      if (!resumenMap.has(key)) {
        resumenMap.set(key, {
          curso: h.curso,
          tipo: h.tipo_clase,
          horas: 0,
          grupo: h.grupo?.codigo,
          ambiente: h.ambiente?.codigo,
        });
      }
      const hIni = this.horaToDecimal(h.hora_inicio);
      const hFin = this.horaToDecimal(h.hora_fin);
      resumenMap.get(key).horas += hFin - hIni;
    });

    const totalHorasSemana = Array.from(resumenMap.values()).reduce(
      (sum, r) => sum + r.horas,
      0,
    );

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          "Código",
          "Asignatura",
          "Ciclo",
          "Tipo",
          "Grupo",
          "Ambiente",
          "Horas Sem.",
        ],
      ],
      body: Array.from(resumenMap.values()).map((r) => [
        r.curso.codigo || "—",
        r.curso.nombre,
        r.curso.ciclo || "—",
        r.tipo === TipoClase.TEORIA
          ? "Teoría"
          : r.tipo === TipoClase.PRACTICA
            ? "Práctica"
            : "Laboratorio",
        r.grupo || "—",
        r.ambiente || "—",
        `${r.horas} hrs`,
      ]),
      foot: [["", "", "", "", "", "TOTAL HORAS:", `${totalHorasSemana} hrs`]],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: C.primary,
        textColor: C.white,
        fontStyle: "bold",
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
      },
      margin: { left: 12, right: 12 },
    });

    // PÁGINA 2: HORARIO (GRID HORIZONTAL)
    doc.addPage();

    // Cabecera simplificada para el horario
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, PAGE_W, 20, "F");
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(
      `PROGRAMACIÓN SEMANAL: ${docente.apellidos}, ${docente.nombres}`,
      12,
      13,
    );
    doc.setFontSize(10);
    doc.text(`Periodo: ${periodo}`, PAGE_W - 12, 13, { align: "right" });

    const gridY = 28;
    const dias = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    const horas = Array.from({ length: 15 }, (_, i) => i + 7);
    const cellHeight = 10;
    const horaColWidth = 15;
    const gridWidth = PAGE_W - 24;
    const cellWidth = (gridWidth - horaColWidth * 2) / 6;

    doc.setFillColor(...C.primary);
    doc.rect(12, gridY, gridWidth, 10, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.text("HORA", 12 + horaColWidth / 2, gridY + 6.5, { align: "center" });
    dias.forEach((dia, idx) => {
      doc.text(
        dia,
        12 + horaColWidth + idx * cellWidth + cellWidth / 2,
        gridY + 6.5,
        { align: "center" },
      );
    });
    doc.text("HORA", 12 + gridWidth - horaColWidth / 2, gridY + 6.5, {
      align: "center",
    });

    let currentY = gridY + 10;
    horas.forEach((hora) => {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, currentY, horaColWidth, cellHeight, "F");
      doc.rect(
        12 + gridWidth - horaColWidth,
        currentY,
        horaColWidth,
        cellHeight,
        "F",
      );
      doc.setTextColor(...C.text);
      doc.setFontSize(8);
      doc.text(
        `${String(hora).padStart(2, "0")}:00`,
        12 + horaColWidth / 2,
        currentY + cellHeight / 2 + 1.5,
        { align: "center" },
      );
      doc.text(
        `${String(hora).padStart(2, "0")}:00`,
        12 + gridWidth - horaColWidth / 2,
        currentY + cellHeight / 2 + 1.5,
        { align: "center" },
      );

      for (let i = 0; i < 6; i++) {
        doc.setDrawColor(226, 232, 240);
        doc.rect(
          12 + horaColWidth + i * cellWidth,
          currentY,
          cellWidth,
          cellHeight,
          "S",
        );
      }
      currentY += cellHeight;
    });

    // Bloques de clase con lógica de fusión
    const bloquesPorDia = new Map<number, HorarioAsignado[]>();
    horarios.forEach((h) => {
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
      sortedAsigs.forEach((asig) => {
        const hIni = this.horaToDecimal(asig.hora_inicio);
        let carrilIndex = -1;
        for (let i = 0; i < carriles.length; i++) {
          const ultimo = carriles[i][carriles[i].length - 1];
          const hFinUltimo = this.horaToDecimal(ultimo.hora_fin);
          if (
            Math.abs(hFinUltimo - hIni) < 0.01 &&
            ultimo.curso?.id === asig.curso?.id
          ) {
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
        bloquesEnCarril.forEach((h) => {
          const hIni = this.horaToDecimal(h.hora_inicio);
          const hFin = this.horaToDecimal(h.hora_fin);
          const dur = hFin - hIni;
          const labelPart =
            h.tipo_clase === TipoClase.TEORIA
              ? `${this.formatDurationValue(dur)}T`
              : h.tipo_clase === TipoClase.PRACTICA
                ? `${this.formatDurationValue(dur)}P`
                : `${this.formatDurationValue(dur)}L-G${h.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ""}`;

          if (fusionados.length > 0) {
            const ultimo = fusionados[fusionados.length - 1];
            const mismoAmbiente =
              ultimo.asignacion.ambiente?.id === h.ambiente?.id;
            const mismoCurso = ultimo.asignacion.curso?.id === h.curso?.id;
            const mismaReglaGrupo =
              h.tipo_clase === TipoClase.LABORATORIO
                ? ultimo.asignacion.grupo?.id === h.grupo?.id
                : true;
            const esTP =
              (ultimo.asignacion.tipo_clase === TipoClase.TEORIA &&
                h.tipo_clase === TipoClase.PRACTICA) ||
              (ultimo.asignacion.tipo_clase === TipoClase.PRACTICA &&
                h.tipo_clase === TipoClase.TEORIA);
            const mismoTipoTP =
              ultimo.asignacion.tipo_clase === h.tipo_clase &&
              (h.tipo_clase === TipoClase.TEORIA ||
                h.tipo_clase === TipoClase.PRACTICA);
            const mismoLaboratorio =
              ultimo.asignacion.tipo_clase === TipoClase.LABORATORIO &&
              h.tipo_clase === TipoClase.LABORATORIO &&
              mismaReglaGrupo;

            if (
              mismoCurso &&
              mismoAmbiente &&
              Math.abs(ultimo.horaFin - hIni) < 0.01 &&
              (esTP || mismoTipoTP || mismoLaboratorio)
            ) {
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
            label: (h.curso?.nombre || "") + ` (${labelPart})`,
          });
        });

        fusionados.forEach((f) => {
          const startRowIdx = horas.indexOf(f.horaInicio);
          const endRowIdx = horas.indexOf(f.horaFin);
          if (
            startRowIdx !== -1 &&
            endRowIdx !== -1 &&
            diaIdx >= 0 &&
            diaIdx < 6
          ) {
            const blockY = gridY + 10 + startRowIdx * cellHeight;
            const blockH = (endRowIdx - startRowIdx) * cellHeight;
            const laneWidth = cellWidth / f.numCarriles;
            const blockX =
              12 + horaColWidth + diaIdx * cellWidth + f.carrilIdx * laneWidth;
            const blockW = laneWidth;

            const color = this.getColorForProfesorCurso(
              docente.id,
              f.asignacion.curso?.id,
            );
            doc.setFillColor(...color);
            doc.rect(blockX, blockY, blockW, blockH, "F");
            doc.setDrawColor(150, 150, 150);
            doc.rect(blockX, blockY, blockW, blockH, "S");

            doc.setTextColor(51, 51, 51);
            doc.setFontSize(f.numCarriles > 1 ? 6 : 7);
            doc.setFont("helvetica", "bold");
            const cursoText = f.label;
            const ambienteText = f.asignacion.ambiente?.codigo || "";
            const grupoText = f.asignacion.grupo?.codigo || "";

            const splitCurso = doc.splitTextToSize(cursoText, blockW - 2);
            doc.text(splitCurso.slice(0, 2), blockX + blockW / 2, blockY + 4, {
              align: "center",
            });
            if (blockH > 8)
              doc.text(ambienteText, blockX + blockW / 2, blockY + blockH - 5, {
                align: "center",
              });
            if (blockH > 12 && f.numCarriles === 1)
              doc.text(grupoText, blockX + blockW / 2, blockY + blockH - 1.5, {
                align: "center",
              });
          }
        });
      });
    });

    return Buffer.from(doc.output("arraybuffer"));
  }

  async generarReporteDeclaracionF03CADPDF(
    docenteId: number,
    periodo: string,
  ): Promise<Buffer> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl =
      config?.logo_url ||
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
      relations: ["departamento", "facultad"],
    });
    if (!docente) throw new Error("Docente no encontrado");

    const periodoObj = await this.periodoRepo.findOne({
      where: [{ codigo: periodo }, { nombre: periodo }],
    });
    if (!periodoObj) throw new Error("Periodo no encontrado");

    const declaracion = await this.declaracionRepo.findOne({
      where: { docente_id: docenteId, periodo_academico_id: periodoObj.id },
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

    const estadoDeclaracion = declaracion?.estado || "NO_INICIADO";
    const estadosAprobados = ["VALIDADO_DPTO", "APROBADO_FACULTAD", "CERRADO"];
    const esOficial = estadosAprobados.includes(estadoDeclaracion);
    const watermarkText = esOficial ? "DOCUMENTO OFICIAL" : "BORRADOR";
    const watermarkOpacity = esOficial ? "0.08" : "0.12";

    const modalidadLabel: Record<string, string> = {
      DEDICACION_EXCLUSIVA: "DEDICACIÓN EXCLUSIVA",
      TIEMPO_COMPLETO_40: "TIEMPO COMPLETO 40 H",
      TIEMPO_PARCIAL_20: "TIEMPO PARCIAL 20 H",
      TIEMPO_PARCIAL_12: "TIEMPO PARCIAL 12 H",
      TIEMPO_PARCIAL_10: "TIEMPO PARCIAL 10 H",
      TIEMPO_PARCIAL_8: "TIEMPO PARCIAL 8 H",
    };

    const partesPeriodo = periodo.split("-");
    const anio = partesPeriodo[0] || new Date().getFullYear().toString();
    const semestre = partesPeriodo[1] || "I";

    const dateIni = periodoObj.fecha_inicio
      ? new Date(periodoObj.fecha_inicio).toLocaleDateString("es-PE")
      : "";
    const dateFin = periodoObj.fecha_fin
      ? new Date(periodoObj.fecha_fin).toLocaleDateString("es-PE")
      : "";

    const nombreCompleto = `${docente.apellidos.toUpperCase()}, ${docente.nombres.toUpperCase()}`;
    const ibm = docente.ibm || 0;
    const categoriaLabel =
      docente.categoria === "PRINCIPAL"
        ? "Principal"
        : docente.categoria === "ASOCIADO"
          ? "Asociado"
          : docente.categoria === "AUXILIAR"
            ? "Auxiliar"
            : docente.categoria || "";
    const modalidadDisplay = modalidadLabel[docente.modalidad] || docente.modalidad || "TC";

    // --- MATRIZ SEMANAL ---
    const diasNom = ["LU", "MA", "MI", "JU", "VI", "SA"];
    const horasSlot = [
      "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
      "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
      "19:00", "20:00", "21:00", "22:00",
    ];

    const tipoColors: Record<string, { bg: string; text: string; label: string }> = {
      TEORIA: { bg: "#E3F2FD", text: "#1565C0", label: "T" },
      PRACTICA: { bg: "#E8F5E9", text: "#2E7D32", label: "P" },
      LABORATORIO: { bg: "#FFF3E0", text: "#E65100", label: "L" },
      NO_LECTIVA: { bg: "#F3E5F5", text: "#6A1B9A", label: "NL" },
    };

    // Build matrix: horarios indexed by (dia, hora_inicio)
    const matrixMap = new Map<string, HorarioAsignado[]>();
    horarios.forEach((h) => {
      if (!h.curso) return;
      const key = `${h.dia || h.dia_semana || 1}_${h.hora_inicio.substring(0, 5)}`;
      if (!matrixMap.has(key)) matrixMap.set(key, []);
      matrixMap.get(key)!.push(h);
    });

    let gridRows = "";
    // Track hours per day for total
    const horasPorDia = [0, 0, 0, 0, 0, 0];

    horasSlot.forEach((horaSlot) => {
      const slotHour = horaSlot.substring(0, 2);
      gridRows += `<tr><td class="hora-cell">${horaSlot}</td>`;
      for (let diaIdx = 1; diaIdx <= 6; diaIdx++) {
        const key = `${diaIdx}_${horaSlot}`;
        const asignaciones = matrixMap.get(key);
        if (asignaciones && asignaciones.length > 0) {
          const first = asignaciones[0];
          const tColor = tipoColors[first.tipo_clase] || tipoColors.TEORIA;
          const dur = this.horaToDecimal(first.hora_fin) - this.horaToDecimal(first.hora_inicio);
          horasPorDia[diaIdx - 1] += dur;

          const grupoCod = first.grupo?.codigo || "";
          const ambCod = first.ambiente?.codigo || first.ambiente?.nombre || "";
          gridRows += `<td class="grid-cell" style="background:${tColor.bg};color:${tColor.text};border-left:3px solid ${tColor.text}">
            <div class="cell-tipo">${tColor.label}</div>
            <div class="cell-curso">${first.curso.nombre}</div>
            <div class="cell-meta">${grupoCod} ${ambCod}</div>
            <div class="cell-hours">${dur}h</div>
          </td>`;
        } else {
          gridRows += `<td class="grid-cell-empty"></td>`;
        }
      }
      gridRows += "</tr>";
    });

    // Totals row
    gridRows += `<tr class="total-row"><td class="hora-cell total-label">TOTAL</td>`;
    let totalSemanal = 0;
    for (let diaIdx = 0; diaIdx < 6; diaIdx++) {
      const h = Math.round(horasPorDia[diaIdx] * 100) / 100;
      totalSemanal += h;
      gridRows += `<td class="total-cell">${h > 0 ? h.toFixed(1) + "h" : ""}</td>`;
    }
    gridRows += "</tr>";

    // --- DETAILED LECTIVA TABLE ---
    let totalCargaLectiva = 0;
    let trsCargaLectivaDetalle = "";
    const processedCursos = new Map<string, boolean>();

    horarios.forEach((h) => {
      if (!h.curso) return;
      const diaIdx = h.dia || h.dia_semana || 1;
      const diaStr = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"][diaIdx - 1];
      const hStr = `${h.hora_inicio.substring(0, 5)}-${h.hora_fin.substring(0, 5)}`;
      const dur = this.horaToDecimal(h.hora_fin) - this.horaToDecimal(h.hora_inicio);
      totalCargaLectiva += dur;
      const tColor = tipoColors[h.tipo_clase] || tipoColors.TEORIA;

      const key = `${h.curso.id}_${h.tipo_clase}`;
      const isFirst = !processedCursos.has(key);
      processedCursos.set(key, true);

      trsCargaLectivaDetalle += `
        <tr class="${isFirst ? "" : "gris-row"}">
          <td>${isFirst ? `<span class="tipo-badge" style="background:${tColor.bg};color:${tColor.text}">${tColor.label}</span>` : ""} ${diaStr} (${hStr})</td>
          <td>${isFirst ? `${h.curso.nombre}<br><small>Ciclo ${h.curso.ciclo || ""}</small>` : "<small>Continuación</small>"}</td>
          <td class="text-center">${h.grupo?.codigo || ""}</td>
          <td class="text-center">${h.ambiente?.codigo || h.ambiente?.nombre || ""}</td>
          <td class="text-center">${dur}h</td>
        </tr>`;
    });

    if (trsCargaLectivaDetalle === "") {
      trsCargaLectivaDetalle = '<tr><td colspan="5" class="text-center">No hay carga lectiva asignada</td></tr>';
    }

    // --- CARGA NO LECTIVA ---
    let totalCargaNoLectiva = 0;
    let trsCargaNoLectivaDetalle = "";

    if (declaracion?.carga_no_lectiva && Array.isArray((declaracion.carga_no_lectiva as any).actividades)) {
      const actividades = (declaracion.carga_no_lectiva as any).actividades;
      actividades.forEach((a: any) => {
        if (a.horas > 0) {
          const horarioStr = Array.isArray(a.horarios)
            ? a.horarios.map((ha: any) => `${ha.dia} ${(ha.hora_inicio || "").substring(0, 5)}-${(ha.hora_fin || "").substring(0, 5)}`).join(", ")
            : a.horario || "";
          const descLabel = a.descripcion
            .replace(/^[0-9]+\.\s*/, "")
            .split(":")[0]
            .split("(")[0]
            .trim();
          totalCargaNoLectiva += Number(a.horas);
          trsCargaNoLectivaDetalle += `
            <tr>
              <td>${horarioStr || "—"}</td>
              <td>${descLabel}</td>
              <td class="text-center">F11</td>
              <td class="text-center">CUBÍCULO</td>
              <td class="text-center">${a.horas}h</td>
            </tr>`;
        }
      });
    }

    if (trsCargaNoLectivaDetalle === "") {
      trsCargaNoLectivaDetalle = '<tr><td colspan="5" class="text-center" style="color:#999">Sin actividades no lectivas registradas</td></tr>';
    }

    const totalAcademica = totalCargaLectiva + totalCargaNoLectiva;

    const estadoLabel: Record<string, string> = {
      NO_INICIADO: "No Iniciado", BORRADOR: "Borrador", PENDIENTE_ENVIO: "Pendiente",
      ENVIADO_DOCENTE: "Enviado", OBSERVADO_DPTO: "Observado Dpto", SUBSANADO: "Subsanado",
      VALIDADO_DPTO: "Validado Dpto", OBSERVADO_FACULTAD: "Observado Facultad",
      APROBADO_FACULTAD: "Aprobado Facultad", CERRADO: "Cerrado", ANULADO: "Anulado",
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0; }
          .container { width: 100%; margin: 0 auto; position: relative; }
          .watermark {
            position: fixed; top: 40%; left: 0; width: 100%; text-align: center;
            font-size: 80px; font-weight: bold; color: rgba(0,0,0,${watermarkOpacity});
            transform: rotate(-30deg); pointer-events: none; z-index: 1000;
            font-family: 'Arial', sans-serif; letter-spacing: 10px;
          }
          .header-title { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 12px; }
          .header-sub { font-size: 11px; text-align: center; margin-bottom: 14px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          table, th, td { border: 1px solid #333; }
          th, td { padding: 3px 5px; vertical-align: middle; }
          .bg-header { background-color: #1a237e; color: white; font-weight: bold; text-align: center; font-size: 10px; }
          .text-center { text-align: center; }
          .text-bold { font-weight: bold; }
          .info-table td { border: 1px solid #333; padding: 4px 6px; font-size: 10px; }
          .info-label { font-weight: 600; color: #555; width: 18%; }
          .gris-row { background: #f5f5f5; }

          /* Grid matrix */
          .grid-table th { background: #1a237e; color: white; font-size: 9px; padding: 4px; text-align: center; }
          .hora-cell { font-size: 8px; font-weight: 600; color: #333; background: #fafafa; text-align: center; width: 60px; }
          .grid-cell { font-size: 8px; padding: 2px 4px; vertical-align: top; }
          .grid-cell-empty { background: #fafafa; }
          .grid-cell .cell-tipo { font-weight: bold; font-size: 7px; text-transform: uppercase; }
          .grid-cell .cell-curso { font-weight: 600; font-size: 8px; line-height: 1.2; margin: 1px 0; }
          .grid-cell .cell-meta { font-size: 7px; color: #666; }
          .grid-cell .cell-hours { font-size: 7px; font-weight: 700; margin-top: 1px; }
          .total-row td { background: #fff8e1; font-weight: bold; font-size: 9px; }
          .total-cell { text-align: center; font-weight: 700; background: #fff8e1; color: #e65100; }

          /* Detail table */
          .detail-table th { background: #283593; color: white; font-size: 9px; }
          .tipo-badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: bold; }
          .sub-header { background: #e8eaf6; font-weight: bold; text-align: center; font-size: 10px; }
          .total-academica { background: #1a237e; color: white; font-weight: bold; font-size: 11px; }

          /* Legend */
          .legend { display: flex; gap: 20px; justify-content: center; margin: 10px 0; font-size: 9px; }
          .legend-item { display: flex; align-items: center; gap: 6px; }
          .legend-color { width: 16px; height: 16px; border-radius: 3px; border: 1px solid #999; }

          /* Signatures */
          .signatures { margin-top: 30px; width: 100%; text-align: center; }
          .sig-block { display: inline-block; width: 30%; margin: 0 1.5%; text-align: center; vertical-align: top; }
          .sig-line { border-top: 1px solid #000; width: 80%; margin: 0 auto 4px auto; }
          .sig-label { font-size: 9px; font-weight: bold; }
          .sig-sub { font-size: 8px; color: #555; }

          .estado-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 9px; font-weight: bold; }
          .estado-oficial { background: #e8f5e9; color: #2e7d32; }
          .estado-borrador { background: #fff3e0; color: #e65100; }

          .footer-note { font-size: 8px; color: #666; margin-top: 10px; text-align: center; }

          .page-break { page-break-before: always; }

          .no-lectiva-row td { background: #f3e5f5; }
          .no-lectiva-label { background: #6a1b9a; color: white; text-align: center; font-weight: bold; font-size: 9px; }

          @media print {
            .watermark { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          .grid-cell, .tipo-badge, .estado-badge, .bg-header, .total-academica { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        </style>
      </head>
      <body>
        <div class="watermark">${watermarkText}</div>
        <div class="container">
          <div class="header-title">UNIVERSIDAD NACIONAL DE TRUJILLO</div>
          <div class="header-sub">HORARIO SEMANAL DE LA CARGA ACADÉMICA DOCENTE — F03-CAD</div>

          <table class="info-table">
            <tr>
              <td class="info-label">Docente:</td>
              <td><b>${nombreCompleto}</b></td>
              <td class="info-label">IBM / DNI:</td>
              <td><b>${ibm}</b></td>
            </tr>
            <tr>
              <td class="info-label">Facultad:</td>
              <td>${docente.facultad?.nombre || "—"}</td>
              <td class="info-label">Departamento:</td>
              <td>${docente.departamento?.nombre || "—"}</td>
            </tr>
            <tr>
              <td class="info-label">Categoría:</td>
              <td>${categoriaLabel}</td>
              <td class="info-label">Modalidad:</td>
              <td>${modalidadDisplay}</td>
            </tr>
            <tr>
              <td class="info-label">Periodo:</td>
              <td><b>${periodo}</b> (${semestre} Semestre)</td>
              <td class="info-label">Estado:</td>
              <td><span class="estado-badge ${esOficial ? "estado-oficial" : "estado-borrador"}">${estadoLabel[estadoDeclaracion] || estadoDeclaracion}</span></td>
            </tr>
            <tr>
              <td class="info-label">Fecha Inicio:</td>
              <td>${dateIni}</td>
              <td class="info-label">Fecha Término:</td>
              <td>${dateFin}</td>
            </tr>
          </table>

          <!-- MATRIZ SEMANAL -->
          <table class="grid-table">
            <thead>
              <tr>
                <th style="width:7%">HORA</th>
                <th style="width:15.5%">LUNES</th>
                <th style="width:15.5%">MARTES</th>
                <th style="width:15.5%">MIÉRCOLES</th>
                <th style="width:15.5%">JUEVES</th>
                <th style="width:15.5%">VIERNES</th>
                <th style="width:15.5%">SÁBADO</th>
              </tr>
            </thead>
            <tbody>
              ${gridRows}
            </tbody>
          </table>

          <!-- LEYENDA -->
          <div class="legend">
            <div class="legend-item"><div class="legend-color" style="background:#E3F2FD;border-color:#1565C0"></div> Teoría</div>
            <div class="legend-item"><div class="legend-color" style="background:#E8F5E9;border-color:#2E7D32"></div> Práctica</div>
            <div class="legend-item"><div class="legend-color" style="background:#FFF3E0;border-color:#E65100"></div> Laboratorio</div>
            <div class="legend-item"><div class="legend-color" style="background:#F3E5F5;border-color:#6A1B9A"></div> No Lectiva</div>
          </div>

          <div class="page-break"></div>

          <!-- DETALLE CARGA LECTIVA -->
          <table class="detail-table">
            <thead>
              <tr>
                <th width="22%">HORARIO</th>
                <th width="33%">CARGA HORARIA LECTIVA (CHL)</th>
                <th width="12%">GRUPO</th>
                <th width="18%">AULA</th>
                <th width="15%">TOTAL H</th>
              </tr>
            </thead>
            <tbody>
              ${trsCargaLectivaDetalle}
            </tbody>
          </table>

          <!-- DETALLE CARGA NO LECTIVA -->
          <table class="detail-table">
            <thead>
              <tr>
                <th width="22%">HORARIO</th>
                <th width="33%">CARGA HORARIA NO LECTIVA (CHNL)</th>
                <th width="12%">LUGAR</th>
                <th width="18%">AULA</th>
                <th width="15%">TOTAL H</th>
              </tr>
            </thead>
            <tbody class="no-lectiva-row">
              ${trsCargaNoLectivaDetalle}
            </tbody>
          </table>

          <!-- TOTALES -->
          <table>
            <tr class="total-academica">
              <td colspan="4" style="text-align:right;padding-right:16px">
                TOTAL HORAS LECTIVAS: <b>${totalCargaLectiva.toFixed(1)}h</b> &nbsp;|&nbsp;
                TOTAL HORAS NO LECTIVAS: <b>${totalCargaNoLectiva.toFixed(1)}h</b> &nbsp;|&nbsp;
                TOTAL SEMANAL: <b>${totalAcademica.toFixed(1)}h</b>
              </td>
              <td style="text-align:center;font-size:12px">
                <b>${totalAcademica.toFixed(1)}h</b>
              </td>
            </tr>
          </table>

          <div class="footer-note">
            T: TEORÍA &nbsp; P: PRÁCTICA &nbsp; L: LABORATORIO &nbsp; NL: NO LECTIVA<br>
            LU (LUNES); MA (MARTES); MI (MIÉRCOLES); JU (JUEVES); VI (VIERNES); SA (SÁBADO)
          </div>

          <div class="signatures">
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-label">FIRMA DEL DOCENTE</div>
              <div class="sig-sub">${nombreCompleto}</div>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-label">DIRECTOR DE DPTO. ACADÉMICO</div>
              <div class="sig-sub">${docente.departamento?.nombre || ""}</div>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-label">V°B° DECANO</div>
              <div class="sig-sub">${docente.facultad?.nombre || ""}</div>
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
        margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
      });
      return Buffer.from(buffer);
    } finally {
      await browser.close();
    }
  }

  async generarReporteDeclaracionF02CADPDF(
    docenteId: number,
    periodo: string,
  ): Promise<Buffer> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
      relations: ["departamento", "facultad"],
    });
    if (!docente) throw new Error("Docente no encontrado");

    const periodoObj = await this.periodoRepo.findOne({
      where: [{ codigo: periodo }, { nombre: periodo }],
    });
    if (!periodoObj) throw new Error("Periodo no encontrado");

    const nombreCompleto = `${docente.apellidos.toUpperCase()}, ${docente.nombres.toUpperCase()}`;
    const departamento = docente.departamento?.nombre || "No asignado";
    const facultad = docente.facultad?.nombre || "No asignada";
    const ibm = docente.ibm || 0;
    const codigo = docente.codigo || "";

    const modalidad = docente.modalidad || "TIEMPO_COMPLETO_40";
    let tipoDeclaracion = "COMPATIBILIDAD_TOTAL";
    let textoSegunModalidad = "";

    if (modalidad === "DEDICACION_EXCLUSIVA") {
      tipoDeclaracion = "EXCLUSIVIDAD";
      textoSegunModalidad =
        "Declaro no tener otro empleo ni ejercer actividad profesional fuera de la Universidad Nacional de Trujillo, y que mi horario académico es exclusivo para la UNT, no existiendo incompatibilidad horaria con ninguna otra actividad laboral, cargo público o actividad privada durante el horario académico establecido.";
    } else if (modalidad.startsWith("TIEMPO_COMPLETO")) {
      tipoDeclaracion = "COMPATIBILIDAD_TOTAL";
      textoSegunModalidad =
        "Declaro que mi horario académico es compatible con mi actividad laboral, no existiendo superposición de horarios con otras actividades profesionales, cargos públicos o actividades privadas que pudieran generar incompatibilidad laboral.";
    } else {
      tipoDeclaracion = "COMPATIBILIDAD_PARCIAL";
      textoSegunModalidad =
        "Declaro que mi horario académico es compatible parcialmente con mi actividad laboral externa, la cual se desarrolla fuera del horario establecido por la Universidad Nacional de Trujillo, no existiendo incompatibilidad horaria.";
    }

    const modalidadLabel: Record<string, string> = {
      DEDICACION_EXCLUSIVA: "DEDICACIÓN EXCLUSIVA",
      TIEMPO_COMPLETO_40: "TIEMPO COMPLETO 40 H",
      TIEMPO_PARCIAL_20: "TIEMPO PARCIAL 20 H",
      TIEMPO_PARCIAL_12: "TIEMPO PARCIAL 12 H",
      TIEMPO_PARCIAL_10: "TIEMPO PARCIAL 10 H",
      TIEMPO_PARCIAL_8: "TIEMPO PARCIAL 8 H",
    };
    const modalidadDisplay = modalidadLabel[modalidad] || modalidad;

    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl =
      config?.logo_url ||
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const fechaActual = new Date().toLocaleDateString("es-PE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 12px; color: #000; margin: 30px 40px; }
          .header { text-align: center; margin-bottom: 5px; }
          .header-line { font-size: 11px; font-weight: bold; margin: 2px 0; }
          .title { text-align: center; font-size: 14px; font-weight: bold; margin: 20px 0 5px 0; text-decoration: underline; }
          .subtitle { text-align: center; font-size: 13px; font-weight: bold; margin: 0 0 25px 0; }
          .content { text-align: justify; line-height: 1.6; }
          .content p { margin: 8px 0; }
          .salutation { margin: 15px 0; }
          .declaration-text { margin: 15px 30px; padding: 10px; border-left: 3px solid #333; font-style: italic; }
          .closing { margin: 20px 0; }
          .fecha { text-align: right; margin: 30px 0 10px 0; }
          .firma-area { text-align: center; margin-top: 50px; }
          .firma-line { border-top: 1px solid #000; width: 250px; margin: 0 auto 5px auto; }
          .firma-label { font-size: 11px; font-weight: bold; }
          .firma-data { font-size: 10px; }
          .nota { font-size: 9px; margin-top: 40px; border-top: 1px solid #ccc; padding-top: 8px; }
          hr { border: none; border-top: 1px solid #000; margin: 8px 0; }
          .logo-area { text-align: center; margin-bottom: 10px; }
          .logo-area img { max-height: 70px; }
        </style>
      </head>
      <body>
        <div class="logo-area">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Logo UNT">` : ""}
        </div>
        <div class="header">
          <div class="header-line">UNIVERSIDAD NACIONAL DE TRUJILLO</div>
          <div class="header-line">${facultad.toUpperCase()}</div>
          <div class="header-line">DEPARTAMENTO ACADÉMICO DE ${departamento.toUpperCase()}</div>
        </div>

        <hr>

        <div class="title">DECLARACIÓN JURADA DE INCOMPATIBILIDAD</div>
        <div class="subtitle">F02-CAD</div>

        <div class="content">
          <p>Yo, <b>${nombreCompleto}</b>,</p>
          <p>Identificado con DNI / IBM N° <b>${ibm}</b>,</p>
          <p>Docente del Departamento Académico de <b>${departamento}</b>,</p>
          <p>Con modalidad <b>${modalidadDisplay}</b>,</p>

          <div class="salutation"><b>DECLARO BAJO JURAMENTO:</b></div>

          <div class="declaration-text">
            ${textoSegunModalidad}
          </div>

          <p>Asimismo, declaro no estar incurso en las causales de incompatibilidad o impedimento laboral previstas en el Estatuto Institucional vigente de la Universidad Nacional de Trujillo, y en caso de faltar a la verdad me someto a las sanciones previstas por ley.</p>

          <p>Autorizo al funcionario competente disponer el descuento de mi planilla de haberes, del monto que la unidad de remuneraciones liquide como pagos indebidos por el lapso de tiempo laborado ilegalmente, de encontrarme incurso en situación de incompatibilidad o impedimento para ejercer la docencia en la U.N.T.</p>
        </div>

        <div class="fecha">
          <p>Trujillo, ${fechaActual}</p>
        </div>

        <div class="firma-area">
          <div class="firma-line"></div>
          <div class="firma-label">FIRMA DEL DOCENTE</div>
          <div class="firma-data">${nombreCompleto}</div>
          <div class="firma-data">IBM: ${ibm}</div>
        </div>

        <div class="nota">
          Nota: Los docentes deben suscribir de forma obligatoria el presente formato en cada Semestre Académico.
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
        printBackground: true,
        margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      });
      return Buffer.from(buffer);
    } finally {
      await browser.close();
    }
  }

  async generarReporteF01CADPDF(
    docenteId: number,
    periodo: string,
  ): Promise<Buffer> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
      relations: ["departamento", "facultad"],
    });
    if (!docente) throw new Error("Docente no encontrado");

    const periodoObj = await this.periodoRepo.findOne({
      where: [{ codigo: periodo }, { nombre: periodo }],
    });
    if (!periodoObj) throw new Error("Periodo no encontrado");

    const declaracion = await this.declaracionRepo.findOne({
      where: { docente_id: docenteId, periodo_academico_id: periodoObj.id },
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

    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl = config?.logo_url ||
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const estadoDeclaracion = declaracion?.estado || "NO_INICIADO";
    const estadosAprobados = ["VALIDADO_DPTO", "APROBADO_FACULTAD", "CERRADO"];
    const esOficial = estadosAprobados.includes(estadoDeclaracion);
    const watermarkText = esOficial ? "DOCUMENTO OFICIAL" : "BORRADOR";
    const watermarkOpacity = esOficial ? "0.08" : "0.12";

    const partesPeriodo = periodo.split("-");
    const anio = partesPeriodo[0] || new Date().getFullYear().toString();
    const semestre = partesPeriodo[1] || "I";

    const nombreCompleto = `${docente.apellidos.toUpperCase()}, ${docente.nombres.toUpperCase()}`;
    const ibm = docente.ibm || 0;
    const categoriaLabel: Record<string, string> = { PRINCIPAL: "Principal", ASOCIADO: "Asociado", AUXILIAR: "Auxiliar", SIN_CATEGORIA: "Sin categoría" };
    const contratoLabel: Record<string, string> = { NOMBRADO: "Nombrado", CONTRATADO: "Contratado" };
    const modalidadLabel: Record<string, string> = {
      DEDICACION_EXCLUSIVA: "Dedicación Exclusiva", TIEMPO_COMPLETO_40: "Tiempo Completo 40 H",
      TIEMPO_PARCIAL_20: "Tiempo Parcial 20 H", TIEMPO_PARCIAL_12: "Tiempo Parcial 12 H",
      TIEMPO_PARCIAL_10: "Tiempo Parcial 10 H", TIEMPO_PARCIAL_8: "Tiempo Parcial 8 H",
    };

    const dateIni = periodoObj.fecha_inicio ? new Date(periodoObj.fecha_inicio).toLocaleDateString("es-PE") : "";
    const dateFin = periodoObj.fecha_fin ? new Date(periodoObj.fecha_fin).toLocaleDateString("es-PE") : "";
    const fechaGen = new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });

    // Build carga lectiva rows from horarios
    let trsLectiva = "";
    let totalHorasTeo = 0, totalHorasPra = 0, totalHorasLab = 0, totalGeneral = 0;
    const cursoMap = new Map<string, any>();

    horarios.forEach((h) => {
      if (!h.curso) return;
      const key = `${h.curso.id}_${h.tipo_clase}`;
      if (!cursoMap.has(key)) {
        const dur = this.horaToDecimal(h.hora_fin) - this.horaToDecimal(h.hora_inicio);
        const isTeo = h.tipo_clase === TipoClase.TEORIA;
        const isPra = h.tipo_clase === TipoClase.PRACTICA;
        const isLab = h.tipo_clase === TipoClase.LABORATORIO;
        cursoMap.set(key, {
          codigo: h.curso.codigo,
          nombre: h.curso.nombre,
          tipo: isTeo ? "TEORÍA" : isPra ? "PRÁCTICA" : "LABORATORIO",
          seccion: h.grupo?.codigo || "",
          escuela: "",
          ciclo: h.curso.ciclo || "",
          alumnos: h.curso.creditos || 0,
          hrsTeo: isTeo ? dur : 0,
          hrsPra: isPra ? dur : 0,
          hrsLab: isLab ? dur : 0,
          total: dur,
        });
      } else {
        const existing = cursoMap.get(key);
        const dur = this.horaToDecimal(h.hora_fin) - this.horaToDecimal(h.hora_inicio);
        const isTeo = h.tipo_clase === TipoClase.TEORIA;
        const isPra = h.tipo_clase === TipoClase.PRACTICA;
        const isLab = h.tipo_clase === TipoClase.LABORATORIO;
        if (isTeo) existing.hrsTeo += dur;
        if (isPra) existing.hrsPra += dur;
        if (isLab) existing.hrsLab += dur;
        existing.total += dur;
      }
    });

    Array.from(cursoMap.values()).forEach((c) => {
      totalHorasTeo += c.hrsTeo;
      totalHorasPra += c.hrsPra;
      totalHorasLab += c.hrsLab;
      totalGeneral += c.total;
      trsLectiva += `
        <tr>
          <td>${c.codigo}</td>
          <td class="text-left">${c.nombre}</td>
          <td class="text-center">${c.tipo}</td>
          <td class="text-center">${c.escuela}</td>
          <td class="text-center">${c.ciclo}</td>
          <td class="text-center">${c.seccion}</td>
          <td class="text-center">${c.alumnos}</td>
          <td class="text-center">${c.hrsTeo.toFixed(1)}</td>
          <td class="text-center">${c.hrsPra.toFixed(1)}</td>
          <td class="text-center">${c.hrsLab.toFixed(1)}</td>
          <td class="text-center total-h">${c.total.toFixed(1)}</td>
        </tr>`;
    });

    if (trsLectiva === "") {
      trsLectiva = '<tr><td colspan="11" class="text-center no-data">Sin carga lectiva asignada</td></tr>';
    }

    // Build carga no lectiva
    let trsNoLectiva = "";
    let totalNoLectiva = 0;
    const rubroLabels: Record<number, string> = {
      1: "GESTIÓN ACADÉMICA", 2: "PREPARACIÓN Y EVALUACIÓN", 3: "CONSEJERÍA Y TUTORÍA",
      4: "INVESTIGACIÓN", 5: "CAPACITACIÓN", 6: "ACTIVIDADES DE GOBIERNO",
      7: "ACTIVIDADES DE ADMINISTRACIÓN", 8: "ASESORÍA DE TESIS",
      9: "RESPONSABILIDAD SOCIAL UNIVERSITARIA", 10: "COMITÉS TÉCNICOS Y COMISIONES",
    };

    if (declaracion?.carga_no_lectiva && Array.isArray((declaracion.carga_no_lectiva as any).actividades)) {
      const actividades = (declaracion.carga_no_lectiva as any).actividades;
      actividades.forEach((a: any) => {
        if (a.horas > 0) {
          totalNoLectiva += Number(a.horas);
          const label = rubroLabels[a.id] || a.descripcion.replace(/^[0-9]+\.\s*/, "").split(":")[0].trim();
          trsNoLectiva += `
            <tr>
              <td class="text-center">${a.id}</td>
              <td class="text-left">${label}</td>
              <td class="text-left">${a.detalle || ""}</td>
              <td class="text-center">${a.horas}h</td>
            </tr>`;
        }
      });
    }

    if (trsNoLectiva === "") {
      trsNoLectiva = '<tr><td colspan="4" class="text-center no-data">Sin carga no lectiva registrada</td></tr>';
    }

    const totalFinal = totalGeneral + totalNoLectiva;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0; }
          .watermark { position: fixed; top: 40%; left: 0; width: 100%; text-align: center;
            font-size: 80px; font-weight: bold; color: rgba(0,0,0,${watermarkOpacity});
            transform: rotate(-30deg); pointer-events: none; z-index: 1000; letter-spacing: 10px; }
          .container { width: 100%; margin: 0 auto; position: relative; }
          .logo-area { text-align: center; margin-bottom: 6px; }
          .header { text-align: center; margin-bottom: 4px; }
          .header .line1 { font-size: 14px; font-weight: bold; }
          .header .line2 { font-size: 11px; font-weight: bold; }
          .header .line3 { font-size: 11px; }
          .title { text-align: center; font-size: 13px; font-weight: bold; margin: 14px 0 4px 0; text-decoration: underline; }
          .subtitle { text-align: center; font-size: 11px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          table, th, td { border: 1px solid #333; }
          th, td { padding: 3px 5px; vertical-align: middle; }
          th { background: #1a237e; color: white; font-size: 8px; text-align: center; }
          .info-table td { border: 1px solid #333; padding: 3px 6px; font-size: 10px; }
          .info-label { font-weight: 600; color: #555; width: 16%; background: #f5f5f5; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .total-h { font-weight: bold; background: #e8f5e9; }
          .subtotal-row td { background: #fff8e1; font-weight: bold; }
          .grand-total td { background: #1a237e; color: white; font-weight: bold; font-size: 11px; }
          .no-data { color: #999; padding: 12px; }
          .firma-section { margin-top: 40px; width: 100%; text-align: center; }
          .firma-box { display: inline-block; width: 30%; margin: 0 1.5%; text-align: center; vertical-align: top; }
          .firma-line { border-top: 1px solid #000; width: 80%; margin: 0 auto 4px auto; }
          .firma-label { font-size: 9px; font-weight: bold; }
          .firma-sub { font-size: 8px; color: #555; }
          .fecha-gen { text-align: right; font-size: 9px; color: #666; margin-top: 8px; }
          @media print { .watermark { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="watermark">${watermarkText}</div>
        <div class="container">
          <div class="logo-area">${logoBase64 ? `<img src="${logoBase64}" style="max-height:60px">` : ""}</div>
          <div class="header">
            <div class="line1">UNIVERSIDAD NACIONAL DE TRUJILLO</div>
            <div class="line2">${docente.facultad?.nombre?.toUpperCase() || "FACULTAD"}</div>
            <div class="line3">DEPARTAMENTO ACADÉMICO DE ${(docente.departamento?.nombre || "").toUpperCase()}</div>
          </div>
          <div class="title">DECLARACIÓN DE CARGA ACADÉMICA DOCENTE</div>
          <div class="subtitle">F01-CAD</div>

          <table class="info-table">
            <tr><td class="info-label">Docente:</td><td><b>${nombreCompleto}</b></td><td class="info-label">DNI / IBM:</td><td><b>${ibm}</b></td></tr>
            <tr><td class="info-label">Condición:</td><td>${contratoLabel[docente.tipo_contrato] || docente.tipo_contrato}</td><td class="info-label">Categoría:</td><td>${categoriaLabel[docente.categoria] || docente.categoria}</td></tr>
            <tr><td class="info-label">Dedicación:</td><td>${modalidadLabel[docente.modalidad] || docente.modalidad || "—"}</td><td class="info-label">Facultad:</td><td>${docente.facultad?.nombre || "—"}</td></tr>
            <tr><td class="info-label">Año Académico:</td><td><b>${anio}</b></td><td class="info-label">Semestre:</td><td><b>${semestre}</b></td></tr>
            <tr><td class="info-label">Fecha Inicio:</td><td>${dateIni}</td><td class="info-label">Fecha Término:</td><td>${dateFin}</td></tr>
          </table>

          <table>
            <thead>
              <tr>
                <th width="8%">CÓD.</th>
                <th width="22%">DENOMINACIÓN</th>
                <th width="8%">TIPO</th>
                <th width="8%">ESCUELA</th>
                <th width="5%">CICLO</th>
                <th width="6%">SECC.</th>
                <th width="5%">ALUM.</th>
                <th width="8%">HRS TEO</th>
                <th width="8%">HRS PRA</th>
                <th width="8%">HRS LAB</th>
                <th width="8%">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${trsLectiva}
              <tr class="subtotal-row">
                <td colspan="7" style="text-align:right;padding-right:12px">SUBTOTAL CARGA LECTIVA</td>
                <td class="text-center">${totalHorasTeo.toFixed(1)}</td>
                <td class="text-center">${totalHorasPra.toFixed(1)}</td>
                <td class="text-center">${totalHorasLab.toFixed(1)}</td>
                <td class="text-center">${totalGeneral.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>

          <table>
            <thead>
              <tr>
                <th width="6%">N°</th>
                <th width="44%">CARGA HORARIA NO LECTIVA (CHNL)</th>
                <th width="35%">DETALLE</th>
                <th width="15%">TOTAL H</th>
              </tr>
            </thead>
            <tbody>
              ${trsNoLectiva}
              <tr class="subtotal-row">
                <td colspan="3" style="text-align:right;padding-right:12px">TOTAL HORAS NO LECTIVAS</td>
                <td class="text-center">${totalNoLectiva.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>

          <table>
            <tr class="grand-total">
              <td style="text-align:right;padding-right:16px">
                TOTAL HORAS LECTIVAS: <b>${totalGeneral.toFixed(1)}h</b> &nbsp;|&nbsp;
                TOTAL HORAS NO LECTIVAS: <b>${totalNoLectiva.toFixed(1)}h</b> &nbsp;|&nbsp;
                <span style="font-size:13px">TOTAL GENERAL: <b>${totalFinal.toFixed(1)}h</b></span>
              </td>
              <td width="12%" style="text-align:center;font-size:13px"><b>${totalFinal.toFixed(1)}h</b></td>
            </tr>
          </table>

          <div class="fecha-gen">Generado el: ${fechaGen}</div>

          <div class="firma-section">
            <div class="firma-box">
              <div class="firma-line"></div>
              <div class="firma-label">FIRMA DEL DOCENTE</div>
              <div class="firma-sub">${nombreCompleto}</div>
            </div>
            <div class="firma-box">
              <div class="firma-line"></div>
              <div class="firma-label">DIRECTOR DE DEPARTAMENTO</div>
              <div class="firma-sub">${docente.departamento?.nombre || ""}</div>
            </div>
            <div class="firma-box">
              <div class="firma-line"></div>
              <div class="firma-label">V°B° DECANO</div>
              <div class="firma-sub">${docente.facultad?.nombre || ""}</div>
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
        printBackground: true,
        margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
      });
      return Buffer.from(buffer);
    } finally {
      await browser.close();
    }
  }

  async generarReporteConsolidadoCargaPDF(
    periodo: string,
    departamentoId?: number,
  ): Promise<Buffer> {
    const periodoObj = await this.periodoRepo.findOne({
      where: [{ codigo: periodo }, { nombre: periodo }],
    });
    if (!periodoObj) throw new Error("Periodo no encontrado");

    const whereDecl: any = { periodo_academico_id: periodoObj.id };
    const whereDocente: any = { activo: true };
    if (departamentoId) whereDocente.departamento_id = departamentoId;

    const docentes = await this.docenteRepo.find({
      where: whereDocente,
      relations: ["departamento", "facultad"],
    });

    const declaraciones = await this.declaracionRepo.find({
      where: { periodo_academico_id: periodoObj.id },
    });
    const declMap = new Map(declaraciones.map((d) => [d.docente_id, d]));

    const modalidadLabel: Record<string, string> = {
      DEDICACION_EXCLUSIVA: "DE", TIEMPO_COMPLETO_40: "TC40",
      TIEMPO_PARCIAL_20: "TP20", TIEMPO_PARCIAL_12: "TP12",
      TIEMPO_PARCIAL_10: "TP10", TIEMPO_PARCIAL_8: "TP8",
    };

    let totalLectivas = 0, totalNoLectivas = 0, totalGeneral = 0;
    let trsBody = "";
    let deptActual = "";

    docentes.forEach((d) => {
      const decl = declMap.get(d.id);
      const hLect = decl?.total_horas_lectivas || 0;
      const hNoLect = decl?.total_horas_no_lectivas || 0;
      const hTotal = decl?.total_horas_general || 0;
      totalLectivas += hLect;
      totalNoLectivas += hNoLect;
      totalGeneral += hTotal;

      const dept = d.departamento?.nombre || "Sin departamento";
      if (dept !== deptActual) {
        deptActual = dept;
        trsBody += `<tr class="dept-header"><td colspan="7"><b>${dept}</b></td></tr>`;
      }

      trsBody += `
        <tr>
          <td>${d.apellidos}, ${d.nombres}</td>
          <td class="text-center">${d.tipo_contrato === "NOMBRADO" ? "Nomb" : "Cont"}</td>
          <td class="text-center">${modalidadLabel[d.modalidad] || d.modalidad || "—"}</td>
          <td class="text-center">${hLect}</td>
          <td class="text-center">${hNoLect}</td>
          <td class="text-center total-h">${hTotal}</td>
          <td class="text-center">${decl?.estado || "SIN INICIAR"}</td>
        </tr>`;
    });

    const html = `
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; font-size: 9px; color: #000; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table, th, td { border: 1px solid #333; }
        th, td { padding: 3px 5px; vertical-align: middle; }
        th { background: #1a237e; color: white; font-size: 8px; text-align: center; }
        .text-center { text-align: center; }
        .total-h { font-weight: bold; }
        .dept-header td { background: #e8eaf6; font-weight: bold; font-size: 10px; padding: 5px 8px; }
        .total-row td { background: #1a237e; color: white; font-weight: bold; font-size: 10px; }
        .title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 16px; }
      </style></head><body>
        <div class="title">REPORTE CONSOLIDADO DE CARGA ACADÉMICA<br><span style="font-size:11px">Período: ${periodo}</span></div>
        <table>
          <thead><tr>
            <th width="26%">DOCENTE</th><th width="8%">COND.</th><th width="10%">MOD.</th>
            <th width="12%">HRS LECT.</th><th width="12%">HRS NO LECT.</th><th width="12%">TOTAL</th><th width="20%">ESTADO</th>
          </tr></thead>
          <tbody>${trsBody}</tbody>
          <tfoot><tr class="total-row">
            <td colspan="3" style="text-align:right;padding-right:12px">TOTAL GENERAL</td>
            <td class="text-center">${totalLectivas}</td>
            <td class="text-center">${totalNoLectivas}</td>
            <td class="text-center">${totalGeneral}</td>
            <td class="text-center">${docentes.length} docentes</td>
          </tr></tfoot>
        </table>
      </body></html>`;

    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const buffer = await page.pdf({ format: "A4", landscape: true, printBackground: true, margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" } });
      return Buffer.from(buffer);
    } finally { await browser.close(); }
  }

  async generarReporteCargaPorModalidadPDF(
    periodo: string,
  ): Promise<Buffer> {
    const periodoObj = await this.periodoRepo.findOne({
      where: [{ codigo: periodo }, { nombre: periodo }],
    });
    if (!periodoObj) throw new Error("Periodo no encontrado");

    const docentes = await this.docenteRepo.find({ where: { activo: true } });
    const declaraciones = await this.declaracionRepo.find({
      where: { periodo_academico_id: periodoObj.id },
    });
    const declMap = new Map(declaraciones.map((d) => [d.docente_id, d]));

    const modalidadLabels: Record<string, string> = {
      DEDICACION_EXCLUSIVA: "Dedicación Exclusiva", TIEMPO_COMPLETO_40: "Tiempo Completo 40 H",
      TIEMPO_PARCIAL_20: "Tiempo Parcial 20 H", TIEMPO_PARCIAL_12: "Tiempo Parcial 12 H",
      TIEMPO_PARCIAL_10: "Tiempo Parcial 10 H", TIEMPO_PARCIAL_8: "Tiempo Parcial 8 H",
    };

    const modalidadData = new Map<string, { count: number; sumLect: number; sumNoLect: number; sumTotal: number }>();
    docentes.forEach((d) => {
      const mod = d.modalidad || "SIN_MODALIDAD";
      if (!modalidadData.has(mod)) modalidadData.set(mod, { count: 0, sumLect: 0, sumNoLect: 0, sumTotal: 0 });
      const data = modalidadData.get(mod)!;
      data.count++;
      const decl = declMap.get(d.id);
      data.sumLect += decl?.total_horas_lectivas || 0;
      data.sumNoLect += decl?.total_horas_no_lectivas || 0;
      data.sumTotal += decl?.total_horas_general || 0;
    });

    let trsBody = "";
    let totalDocs = 0, totalSum = 0;
    modalidadData.forEach((data, mod) => {
      totalDocs += data.count;
      totalSum += data.sumTotal;
      const avg = data.count > 0 ? (data.sumTotal / data.count).toFixed(1) : "0";
      trsBody += `
        <tr>
          <td>${modalidadLabels[mod] || mod}</td>
          <td class="text-center">${data.count}</td>
          <td class="text-center">${data.sumLect.toFixed(1)}</td>
          <td class="text-center">${data.sumNoLect.toFixed(1)}</td>
          <td class="text-center total-h">${data.sumTotal.toFixed(1)}</td>
          <td class="text-center">${avg}</td>
        </tr>`;
    });

    const html = `
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; font-size: 10px; margin: 20px; }
        table { width: 100%; border-collapse: collapse; }
        table, th, td { border: 1px solid #333; }
        th, td { padding: 4px 6px; }
        th { background: #1a237e; color: white; font-size: 9px; text-align: center; }
        .text-center { text-align: center; }
        .total-h { font-weight: bold; }
        .title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 16px; }
        .total-row td { background: #1a237e; color: white; font-weight: bold; }
      </style></head><body>
        <div class="title">REPORTE DE CARGA POR MODALIDAD<br><span style="font-size:11px">Período: ${periodo}</span></div>
        <table>
          <thead><tr>
            <th width="30%">MODALIDAD</th><th width="12%">DOCENTES</th><th width="15%">HRS LECTIVAS</th>
            <th width="15%">HRS NO LECT.</th><th width="15%">TOTAL</th><th width="13%">PROMEDIO</th>
          </tr></thead>
          <tbody>${trsBody}</tbody>
          <tfoot><tr class="total-row">
            <td style="text-align:right;padding-right:12px">TOTAL</td>
            <td class="text-center">${totalDocs}</td>
            <td class="text-center" colspan="3">${totalSum.toFixed(1)}</td>
            <td class="text-center">${totalDocs > 0 ? (totalSum / totalDocs).toFixed(1) : "0"}</td>
          </tr></tfoot>
        </table>
      </body></html>`;

    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const buffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" } });
      return Buffer.from(buffer);
    } finally { await browser.close(); }
  }

  async generarReporteConsolidadoCargaExcel(
    periodo: string,
    departamentoId?: number,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Consolidado Carga");

    sheet.columns = [
      { header: "Docente", key: "docente", width: 35 },
      { header: "Condición", key: "condicion", width: 12 },
      { header: "Modalidad", key: "modalidad", width: 22 },
      { header: "Departamento", key: "departamento", width: 30 },
      { header: "Hrs Lectivas", key: "hrsLectivas", width: 14 },
      { header: "Hrs No Lectivas", key: "hrsNoLectivas", width: 14 },
      { header: "Total", key: "total", width: 12 },
      { header: "Estado", key: "estado", width: 20 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A237E" } };

    const periodoObj = await this.periodoRepo.findOne({
      where: [{ codigo: periodo }, { nombre: periodo }],
    });
    if (!periodoObj) throw new Error("Periodo no encontrado");

    const whereDocente: any = { activo: true };
    if (departamentoId) whereDocente.departamento_id = departamentoId;

    const docentes = await this.docenteRepo.find({
      where: whereDocente,
      relations: ["departamento"],
    });
    const declaraciones = await this.declaracionRepo.find({
      where: { periodo_academico_id: periodoObj.id },
    });
    const declMap = new Map(declaraciones.map((d) => [d.docente_id, d]));

    docentes.forEach((d) => {
      const decl = declMap.get(d.id);
      sheet.addRow({
        docente: `${d.apellidos}, ${d.nombres}`,
        condicion: d.tipo_contrato === "NOMBRADO" ? "Nombrado" : "Contratado",
        modalidad: d.modalidad || "—",
        departamento: d.departamento?.nombre || "—",
        hrsLectivas: decl?.total_horas_lectivas || 0,
        hrsNoLectivas: decl?.total_horas_no_lectivas || 0,
        total: decl?.total_horas_general || 0,
        estado: decl?.estado || "SIN INICIAR",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generarReporteDiaPDF(
    dia: number,
    periodo: string,
    ciclo?: number,
    tipo?: string,
    search?: string,
  ): Promise<Buffer> {
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
      queryBuilder = queryBuilder.andWhere("horario.tipo_clase = :tipo", {
        tipo,
      });
    }

    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      queryBuilder = queryBuilder.andWhere(
        "(LOWER(docente.apellidos) LIKE :search OR LOWER(docente.nombres) LIKE :search OR LOWER(curso.nombre) LIKE :search OR LOWER(ambiente.nombre) LIKE :search OR LOWER(grupo.codigo) LIKE :search)",
        { search: searchLower },
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

  private getColorForProfesorCurso(
    docenteId: number | undefined,
    cursoId: number | undefined,
  ): [number, number, number] {
    if (!docenteId || !cursoId) return [240, 240, 240];
    const colors: [number, number, number][] = [
      [232, 245, 233],
      [225, 245, 254],
      [255, 243, 224],
      [243, 229, 245],
      [252, 228, 236],
      [224, 242, 241],
      [232, 234, 246],
      [255, 235, 238],
      [249, 248, 227],
      [224, 247, 250],
    ];
    const index = (docenteId * 7 + cursoId * 13) % colors.length;
    return colors[index];
  }

  private horaToDecimal(hora?: string): number {
    if (!hora) return 0;
    const [h, m] = hora.split(":").map(Number);
    return h + (m || 0) / 60;
  }

  private formatDurationValue(duration: number): string {
    if (Number.isInteger(duration)) return String(duration);
    return duration
      .toFixed(2)
      .replace(/\.0+$/, "")
      .replace(/(\.\d)0$/, "$1");
  }

  private construirLabelBloque(asignaciones: HorarioAsignado[]): string {
    const cursoNombre = asignaciones[0]?.curso?.nombre || "";
    const duraciones: Record<string, number> = {};
    asignaciones.forEach((a) => {
      const dur =
        this.horaToDecimal(a.hora_fin) - this.horaToDecimal(a.hora_inicio);
      const key =
        a.tipo_clase === TipoClase.LABORATORIO
          ? `L-G${a.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ""}`
          : a.tipo_clase === TipoClase.TEORIA
            ? "T"
            : "P";
      duraciones[key] = (duraciones[key] ?? 0) + dur;
    });
    const partes = Object.entries(duraciones).map(
      ([key, dur]) => `${this.formatDurationValue(dur)}${key}`,
    );
    return `${cursoNombre} (${partes.join("+")})`;
  }

  private async dibujarPaginaAmbiente(
    doc: jsPDF,
    ambienteId: number,
    periodo: string,
    logoBase64: string | null,
    primaryRGB: [number, number, number],
  ): Promise<void> {
    const ambiente = await this.ambienteRepo.findOne({
      where: { id: ambienteId },
    });
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
    doc.rect(0, 0, PAGE_W, 25, "F");
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", 10, 3, 18, 18);
      } catch (e) {}
    }
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`HORARIO POR AMBIENTE: ${ambiente.nombre}`, 32, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `${ambiente.tipo === TipoAmbiente.LABORATORIO ? "Laboratorio" : "Aula"} | Capacidad: ${ambiente.capacidad} alumnos`,
      32,
      18,
    );
    doc.setFontSize(10);
    doc.text(`Periodo: ${periodo}`, PAGE_W - 12, 15, { align: "right" });

    let yPos = 32;

    // Resumen de Cursos en este ambiente
    const resumenMap = new Map<string, any>();
    horarios.forEach((h) => {
      if (!h.curso || !h.docente) return;
      const key = `${h.docente.id}-${h.curso.id}`;
      if (!resumenMap.has(key)) {
        resumenMap.set(key, { curso: h.curso, docente: h.docente, horas: 0 });
      }
      const hIni = this.horaToDecimal(h.hora_inicio);
      const hFin = this.horaToDecimal(h.hora_fin);
      resumenMap.get(key).horas += hFin - hIni;
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Docente", "Asignatura", "Horas Semanales"]],
      body: Array.from(resumenMap.values()).map((r) => [
        `${r.docente.apellidos}, ${r.docente.nombres}`,
        r.curso.nombre,
        `${r.horas} hrs`,
      ]),
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: {
        fillColor: C.primary,
        textColor: C.white,
        fontStyle: "bold",
      },
      margin: { left: 10, right: 10 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Grid de Horarios
    const dias = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    const horas = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 a 22:00
    const cellHeight = 8;
    const horaColWidth = 15;
    const gridWidth = PAGE_W - 20;
    const cellWidth = (gridWidth - horaColWidth * 2) / 6;

    doc.setFillColor(...C.primary);
    doc.rect(10, yPos, gridWidth, 8, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.text("HORA", 10 + horaColWidth / 2, yPos + 5, { align: "center" });
    dias.forEach((dia, idx) => {
      doc.text(
        dia,
        10 + horaColWidth + idx * cellWidth + cellWidth / 2,
        yPos + 5,
        { align: "center" },
      );
    });
    doc.text("HORA", 10 + gridWidth - horaColWidth / 2, yPos + 5, {
      align: "center",
    });

    let currentY = yPos + 8;
    horas.forEach((hora) => {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, currentY, horaColWidth, cellHeight, "F");
      doc.rect(
        10 + gridWidth - horaColWidth,
        currentY,
        horaColWidth,
        cellHeight,
        "F",
      );
      doc.setTextColor(...C.text);
      doc.setFontSize(7);
      doc.text(
        `${String(hora).padStart(2, "0")}:00`,
        10 + horaColWidth / 2,
        currentY + cellHeight / 2 + 1.5,
        { align: "center" },
      );
      doc.text(
        `${String(hora).padStart(2, "0")}:00`,
        10 + gridWidth - horaColWidth / 2,
        currentY + cellHeight / 2 + 1.5,
        { align: "center" },
      );

      for (let i = 0; i < 6; i++) {
        doc.setDrawColor(226, 232, 240);
        doc.rect(
          10 + horaColWidth + i * cellWidth,
          currentY,
          cellWidth,
          cellHeight,
          "S",
        );
      }
      currentY += cellHeight;
    });

    // Bloques de clase con lógica de fusión (Teoría + Práctica consecutivo)
    const bloquesPorDia = new Map<number, HorarioAsignado[]>();
    horarios.forEach((h) => {
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
      sortedAsigs.forEach((asig) => {
        const hIni = this.horaToDecimal(asig.hora_inicio);
        let carrilIndex = -1;
        for (let i = 0; i < carriles.length; i++) {
          const ultimo = carriles[i][carriles[i].length - 1];
          const hFinUltimo = this.horaToDecimal(ultimo.hora_fin);
          if (
            Math.abs(hFinUltimo - hIni) < 0.01 &&
            ultimo.curso?.id === asig.curso?.id &&
            ultimo.docente?.id === asig.docente?.id
          ) {
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
        bloquesEnCarril.forEach((asig) => {
          todosLosBloquesDelDia.push({
            asig,
            carrilIdx,
            hIni: this.horaToDecimal(asig.hora_inicio),
            hFin: this.horaToDecimal(asig.hora_fin),
          });
        });
      });

      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        const fusionados: any[] = [];
        bloquesEnCarril.forEach((h) => {
          const hIni = this.horaToDecimal(h.hora_inicio);
          const hFin = this.horaToDecimal(h.hora_fin);
          const dur = hFin - hIni;
          const labelPart =
            h.tipo_clase === TipoClase.TEORIA
              ? `${this.formatDurationValue(dur)}T`
              : h.tipo_clase === TipoClase.PRACTICA
                ? `${this.formatDurationValue(dur)}P`
                : `${this.formatDurationValue(dur)}L-G${h.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ""}`;

          // Calcular el número máximo de carriles ocupados durante este bloque específico
          let maxCarrilIdxEnIntervalo = 0;
          todosLosBloquesDelDia.forEach((otro) => {
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
            const mismoAmbiente =
              ultimo.asignacion.ambiente?.id === h.ambiente?.id;
            const mismoCurso = ultimo.asignacion.curso?.id === h.curso?.id;
            const mismaReglaGrupo =
              h.tipo_clase === TipoClase.LABORATORIO
                ? ultimo.asignacion.grupo?.id === h.grupo?.id
                : true;
            const esTP =
              (ultimo.asignacion.tipo_clase === TipoClase.TEORIA &&
                h.tipo_clase === TipoClase.PRACTICA) ||
              (ultimo.asignacion.tipo_clase === TipoClase.PRACTICA &&
                h.tipo_clase === TipoClase.TEORIA);
            const mismoTipoTP =
              ultimo.asignacion.tipo_clase === h.tipo_clase &&
              (h.tipo_clase === TipoClase.TEORIA ||
                h.tipo_clase === TipoClase.PRACTICA);
            const mismoLaboratorio =
              ultimo.asignacion.tipo_clase === TipoClase.LABORATORIO &&
              h.tipo_clase === TipoClase.LABORATORIO &&
              mismaReglaGrupo;

            if (
              mismoCurso &&
              mismoAmbiente &&
              Math.abs(ultimo.horaFin - hIni) < 0.01 &&
              (esTP || mismoTipoTP || mismoLaboratorio)
            ) {
              ultimo.horaFin = hFin;
              ultimo.totalHoraFin = h.hora_fin;
              ultimo.asignaciones.push(h);
              ultimo.tiposClase.push(h.tipo_clase);
              ultimo.label = this.construirLabelBloque(ultimo.asignaciones);

              // Actualizar el ancho y posición si el nuevo bloque fusionado tiene más colisiones
              if (
                numCarrilesLocales > Math.round((cellWidth - 1) / ultimo.width)
              ) {
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
            label: (h.curso?.nombre || "") + ` (${labelPart})`,
          });
        });

        fusionados.forEach((f) => {
          const startRowIdx = horas.indexOf(f.horaInicio);
          const endRowIdx = horas.indexOf(f.horaFin);
          if (
            startRowIdx !== -1 &&
            endRowIdx !== -1 &&
            diaIdx >= 0 &&
            diaIdx < 6
          ) {
            const blockY = yPos + 8 + startRowIdx * cellHeight;
            const blockH = (endRowIdx - startRowIdx) * cellHeight;
            const blockW = f.width || cellWidth / 1;
            const blockX =
              10 + horaColWidth + diaIdx * cellWidth + 0.5 + (f.left || 0);
            const numCarriles = Math.max(
              1,
              Math.round((cellWidth - 1) / blockW),
            );

            const color = this.getColorForProfesorCurso(
              f.asignacion.docente?.id,
              f.asignacion.curso?.id,
            );
            doc.setFillColor(...color);
            doc.rect(blockX, blockY, blockW, blockH, "F");
            doc.setDrawColor(150, 150, 150);
            doc.rect(blockX, blockY, blockW, blockH, "S");

            doc.setTextColor(51, 51, 51);
            doc.setFontSize(numCarriles > 1 ? 5 : 6);
            doc.setFont("helvetica", "bold");
            const cursoText = f.label;
            const docenteText = f.asignacion.docente?.apellidos || "";
            const grupoText = f.asignacion.grupo?.codigo || "";

            const splitCurso = doc.splitTextToSize(cursoText, blockW - 2);
            doc.text(splitCurso.slice(0, 2), blockX + blockW / 2, blockY + 3, {
              align: "center",
            });
            if (blockH > 6)
              doc.text(docenteText, blockX + blockW / 2, blockY + blockH - 4, {
                align: "center",
              });
            if (blockH > 9 && numCarriles === 1)
              doc.text(grupoText, blockX + blockW / 2, blockY + blockH - 1.5, {
                align: "center",
              });
          }
        });
      });
    });
  }

  async generarReporteAmbienteExcel(
    ambienteId: number,
    periodo: string,
  ): Promise<Buffer> {
    const ambiente = await this.ambienteRepo.findOne({
      where: { id: ambienteId },
    });
    if (!ambiente) throw new Error("Ambiente no encontrado");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Horario Ambiente");
    await this.dibujarCicloEnExcel(sheet, 0, periodo, ambienteId); // Modificar dibujarCicloEnExcel para aceptar ambienteId opcional
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async generarReporteAmbientePDF(
    ambienteId: number,
    periodo: string,
  ): Promise<{ buffer: Buffer; tipo: string }> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl =
      config?.logo_url ||
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const primaryColor = config?.color_primario || "#1a237e";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const hexToRgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };
    const primaryRGB = hexToRgb(primaryColor);

    await this.dibujarPaginaAmbiente(
      doc,
      ambienteId,
      periodo,
      logoBase64,
      primaryRGB,
    );

    const ambiente = await this.ambienteRepo.findOne({
      where: { id: ambienteId },
    });
    return {
      buffer: Buffer.from(doc.output("arraybuffer")),
      tipo:
        ambiente?.tipo === TipoAmbiente.LABORATORIO ? "laboratorio" : "aula",
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

  // ═══════════════════════════════════════════════════════════════════
  // FASE 8 — Reportes de Gestión (Carga Académica)
  // ═══════════════════════════════════════════════════════════════════

  async generarReporteGestionCargaPDF(periodo: string): Promise<Buffer> {
    const [totalDocentes, declaraciones, periodoAnterior, periodoActual] =
      await Promise.all([
        this.docenteRepo.count({ where: { activo: true } }),
        this.declaracionRepo.find({
          where: { periodo_academico_id: Not(null) },
          relations: ["periodo_academico", "docente"],
        }),
        this.periodoRepo.findOne({
          where: { codigo: this.periodoAnterior(periodo) },
        }),
        this.periodoRepo.findOne({ where: { codigo: periodo } }),
      ]);

    const declPeriodo = declaraciones.filter(
        (d) => d.periodo_academico?.codigo === periodo,
    );
    const declAnterior = declaraciones.filter(
      (d) => d.periodo_academico?.codigo === this.periodoAnterior(periodo),
    );

    const enviadas = declPeriodo.filter(
      (d) =>
        this.estadoValor(d.estado) >=
        this.estadoValor(EstadoDeclaracionCarga.ENVIADO_DOCENTE),
    );
    const aprobadas = declPeriodo.filter(
      (d) => d.estado === EstadoDeclaracionCarga.APROBADO_FACULTAD,
    );
    const observadas = declPeriodo.filter(
      (d) =>
        d.estado === EstadoDeclaracionCarga.OBSERVADO_DPTO ||
        d.estado === EstadoDeclaracionCarga.OBSERVADO_FACULTAD,
    );

    const horasArr = declPeriodo.map((d) => d.total_horas_lectivas);
    const cargaPromedio =
      horasArr.length > 0
        ? horasArr.reduce((a, b) => a + b, 0) / horasArr.length
        : 0;

    const categorias = this.agruparPorCategoria(declPeriodo);

    // Tiempo promedio
    let tiempoPromedioHoras = 0;
    const conFechas = declPeriodo.filter(
      (d) => d.fecha_firma_docente && d.fecha_firma_decano,
    );
    if (conFechas.length > 0) {
      const totalDias = conFechas.reduce((s, d) => {
        const diff =
          d.fecha_firma_decano.getTime() - d.fecha_firma_docente.getTime();
        return s + diff;
      }, 0);
      tiempoPromedioHoras = Math.round(
        totalDias / conFechas.length / (1000 * 3600),
      );
    }

    // Comparativa
    const envAnterior = declAnterior.filter(
      (d) =>
        this.estadoValor(d.estado) >=
        this.estadoValor(EstadoDeclaracionCarga.ENVIADO_DOCENTE),
    ).length;
    const pctAnterior =
      declAnterior.length > 0
        ? Math.round((envAnterior / declAnterior.length) * 100)
        : 0;
    const variacion = pctAnterior > 0
      ? Math.round(
          ((enviadas.length / Math.max(declPeriodo.length, 1)) * 100 -
            pctAnterior) /
            pctAnterior *
            100,
        )
      : 0;

    const html = this.htmlWrapper(`
      <div class="content-header">
        <h1>REPORTE DE GESTIÓN DE CARGA ACADÉMICA</h1>
        <p>Período: ${periodo}</p>
      </div>

      <div class="section">
        <h2>1. Indicadores Clave (KPIs) — Carga Académica</h2>
        <div class="kpi-grid">
          <div class="kpi-card"><span>Total Docentes</span><strong>${totalDocentes}</strong></div>
          <div class="kpi-card"><span>Declaraciones Enviadas</span><strong>${enviadas.length}</strong></div>
          <div class="kpi-card"><span>% Enviadas</span><strong>${totalDocentes > 0 ? ((enviadas.length / totalDocentes) * 100).toFixed(1) : 0}%</strong></div>
          <div class="kpi-card"><span>% Aprobadas</span><strong>${totalDocentes > 0 ? ((aprobadas.length / totalDocentes) * 100).toFixed(1) : 0}%</strong></div>
          <div class="kpi-card"><span>Docentes con Observaciones</span><strong>${observadas.length}</strong></div>
          <div class="kpi-card"><span>Carga Lectiva Promedio</span><strong>${cargaPromedio.toFixed(1)}h</strong></div>
          <div class="kpi-card"><span>Tiempo Promedio Proceso</span><strong>${tiempoPromedioHoras}h</strong></div>
          <div class="kpi-card"><span>Variación vs Período Anterior</span><strong style="color: ${variacion >= 0 ? '#10b981' : '#ef4444'}">${variacion >= 0 ? '+' : ''}${variacion}%</strong></div>
        </div>
      </div>

      <div class="section">
        <h2>2. Distribución de Carga Lectiva por Categoría</h2>
        <table>
          <thead><tr><th>Categoría</th><th>Docentes</th><th>Total Horas Lectivas</th><th>Promedio</th></tr></thead>
          <tbody>
            ${categorias.map((c) => `<tr><td>${c.categoria}</td><td>${c.docentes}</td><td>${c.horas.toFixed(1)}</td><td>${c.promedio.toFixed(1)}h</td></tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>3. Estados de Declaración</h2>
        <table>
          <thead><tr><th>Estado</th><th>Cantidad</th><th>% del Total</th></tr></thead>
          <tbody>
            ${this.estadosConLabels(declPeriodo).map((e) => `<tr><td>${e.label}</td><td>${e.count}</td><td>${e.porcentaje.toFixed(1)}%</td></tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>4. Docentes Pendientes de Declarar</h2>
        <p>Docentes activos sin declaración registrada en el período.</p>
      </div>

      <div class="section">
        <h2>5. Resumen</h2>
        <p>Total de docentes: <strong>${totalDocentes}</strong></p>
        <p>Declaraciones enviadas: <strong>${enviadas.length}</strong> (${totalDocentes > 0 ? ((enviadas.length / totalDocentes) * 100).toFixed(1) : 0}%)</p>
        <p>Declaraciones aprobadas: <strong>${aprobadas.length}</strong> (${totalDocentes > 0 ? ((aprobadas.length / totalDocentes) * 100).toFixed(1) : 0}%)</p>
        <p>Docentes con observaciones: <strong>${observadas.length}</strong></p>
      </div>

      <div class="signature-section">
        <div class="signature-box">
          <div class="line"></div>
          <p>Director de Departamento</p>
        </div>
      </div>
    `);

    return this.generarPDF(html);
  }

  async generarReporteCumplimientoPDF(periodo: string): Promise<Buffer> {
    const periodoId = await this.obtenerIdPeriodo(periodo);
    const [deptos, todasDecl] = await Promise.all([
      this.departamentoRepo.find({ where: { activo: true } }),
      this.declaracionRepo.find({
        where: periodoId
          ? { periodo_academico_id: periodoId }
          : { periodo_academico_id: Not(null) },
        relations: ["periodo_academico"],
      }),
    ]);

    const declPeriodo = periodoId
      ? todasDecl
      : todasDecl.filter((d) => d.periodo_academico?.codigo === periodo);

    const filas = deptos.map((dept) => {
      const dDept = declPeriodo.filter((d) => d.departamento_id === dept.id);
      const total = dDept.length;
      const enviados = dDept.filter(
        (d) =>
          this.estadoValor(d.estado) >=
          this.estadoValor(EstadoDeclaracionCarga.ENVIADO_DOCENTE),
      ).length;
      const validados = dDept.filter(
        (d) =>
          this.estadoValor(d.estado) >=
          this.estadoValor(EstadoDeclaracionCarga.VALIDADO_DPTO),
      ).length;
      const aprobados = dDept.filter(
        (d) => d.estado === EstadoDeclaracionCarga.APROBADO_FACULTAD,
      ).length;
      const pct = total > 0 ? Math.round((enviados / total) * 100) : 0;
      const semaforo =
        pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
      return {
        departamento: dept.nombre,
        codigo: dept.codigo,
        total,
        enviados,
        validados,
        aprobados,
        porcentaje: pct,
        semaforo,
      };
    });

    const html = this.htmlWrapper(`
      <div class="content-header">
        <h1>REPORTE DE CUMPLIMIENTO POR DEPARTAMENTO</h1>
        <p>Período: ${periodo}</p>
      </div>

      <div class="section">
        <h2>Cumplimiento de Declaraciones por Departamento</h2>
        <table>
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Docentes</th>
              <th>Declarados</th>
              <th>Validados</th>
              <th>Aprobados</th>
              <th>% Avance</th>
            </tr>
          </thead>
          <tbody>
            ${filas
              .map(
                (f) => `
            <tr>
              <td><strong>${f.departamento}</strong></td>
              <td>${f.total}</td>
              <td>${f.enviados}</td>
              <td>${f.validados}</td>
              <td>${f.aprobados}</td>
              <td style="color: ${f.semaforo}; font-weight: bold;">${f.porcentaje}%</td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>Leyenda de Semáforo</h3>
        <p><span style="color: #10b981; font-weight: bold;">Verde</span> ≥ 80% — Buen avance</p>
        <p><span style="color: #f59e0b; font-weight: bold;">Amarillo</span> ≥ 50% — En proceso</p>
        <p><span style="color: #ef4444; font-weight: bold;">Rojo</span> &lt; 50% — Requiere atención</p>
      </div>

      <div class="signature-section">
        <div class="signature-box">
          <div class="line"></div>
          <p>Dirección Académica</p>
        </div>
      </div>
    `);

    return this.generarPDF(html);
  }

  async generarReporteEjecutivoPDF(periodo: string): Promise<Buffer> {
    const totalDocentes = await this.docenteRepo.count({
      where: { activo: true },
    });
    const declaraciones = await this.declaracionRepo.find({
      relations: ["periodo_academico", "docente"],
    });
    const declPeriodo = declaraciones.filter(
      (d) => d.periodo_academico?.codigo === periodo,
    );

    const enviadas = declPeriodo.filter(
      (d) =>
        this.estadoValor(d.estado) >=
        this.estadoValor(EstadoDeclaracionCarga.ENVIADO_DOCENTE),
    );
    const aprobadas = declPeriodo.filter(
      (d) => d.estado === EstadoDeclaracionCarga.APROBADO_FACULTAD,
    );
    const observadas = declPeriodo.filter(
      (d) =>
        d.estado === EstadoDeclaracionCarga.OBSERVADO_DPTO ||
        d.estado === EstadoDeclaracionCarga.OBSERVADO_FACULTAD,
    );
    const sinDeclarar = totalDocentes - declPeriodo.length;

    const horasTotales = declPeriodo.reduce(
      (s, d) => s + d.total_horas_general,
      0,
    );
    const horasPromedio =
      declPeriodo.length > 0
        ? Math.round((horasTotales / declPeriodo.length) * 10) / 10
        : 0;

    const deptos = await this.departamentoRepo.find({
      where: { activo: true },
    });
    const tablaDeptos = deptos
      .map((d) => {
        const dd = declPeriodo.filter((dec) => dec.departamento_id === d.id);
        const total = dd.length;
        const declarados = dd.filter(
          (dec) =>
            this.estadoValor(dec.estado) >=
            this.estadoValor(EstadoDeclaracionCarga.ENVIADO_DOCENTE),
        ).length;
        const pct = total > 0 ? Math.round((declarados / total) * 100) : 0;
        const semaforo =
          pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
        return {
          departamento: d.nombre,
          total,
          declarados,
          porcentaje: pct,
          semaforo,
        };
      })
      .filter((d) => d.total > 0);

    const html = this.htmlWrapper(`
      <div class="content-header">
        <h1>REPORTE EJECUTIVO — DECANATURA</h1>
        <p>Resumen de Carga Académica · Período ${periodo}</p>
      </div>

      <div class="section">
        <h2>Resumen General de la Facultad</h2>
        <div class="kpi-grid">
          <div class="kpi-card"><span>Total Docentes</span><strong>${totalDocentes}</strong></div>
          <div class="kpi-card"><span>Declaraciones Recibidas</span><strong>${enviadas.length}</strong></div>
          <div class="kpi-card"><span>Aprobadas</span><strong>${aprobadas.length}</strong></div>
          <div class="kpi-card"><span>Con Observaciones</span><strong>${observadas.length}</strong></div>
          <div class="kpi-card"><span>Sin Declarar</span><strong>${sinDeclarar}</strong></div>
          <div class="kpi-card"><span>Horas Totales</span><strong>${horasTotales}h</strong></div>
          <div class="kpi-card"><span>Promedio x Docente</span><strong>${horasPromedio}h</strong></div>
          <div class="kpi-card"><span>Cumplimiento Global</span><strong>${totalDocentes > 0 ? ((enviadas.length / totalDocentes) * 100).toFixed(1) : 0}%</strong></div>
        </div>
      </div>

      <div class="section">
        <h2>Tabla de Departamentos con Semáforo</h2>
        <table>
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Docentes</th>
              <th>Declarados</th>
              <th>% Avance</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${tablaDeptos
              .map(
                (d) => `
            <tr>
              <td><strong>${d.departamento}</strong></td>
              <td>${d.total}</td>
              <td>${d.declarados}</td>
              <td style="color: ${d.semaforo}; font-weight: bold;">${d.porcentaje}%</td>
              <td style="background: ${d.semaforo}; color: white; text-align: center; font-weight: bold;">
                ${d.porcentaje >= 80 ? "✓ BUENO" : d.porcentaje >= 50 ? "⚠ MEDIO" : "✗ CRÍTICO"}
              </td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>Leyenda</h3>
        <p style="color: #10b981; font-weight: bold;">Verde — Buen avance (≥ 80%)</p>
        <p style="color: #f59e0b; font-weight: bold;">Amarillo — En proceso (≥ 50%)</p>
        <p style="color: #ef4444; font-weight: bold;">Rojo — Requiere atención (&lt; 50%)</p>
      </div>

      <div class="signature-section">
        <div class="signature-box">
          <div class="line"></div>
          <p>Decano / Director de Escuela</p>
        </div>
        <div style="width: 40px;"></div>
        <div class="signature-box">
          <div class="line"></div>
          <p>Secretario Académico</p>
        </div>
      </div>
    `);

    return this.generarPDF(html);
  }

  // ── Helpers Fase 8 ──

  private periodoAnterior(periodo: string): string {
    const [anio, ciclo] = periodo.split("-");
    return ciclo === "I" ? `${Number(anio) - 1}-II` : `${anio}-I`;
  }

  private estadoValor(estado: EstadoDeclaracionCarga): number {
    const orden: Record<string, number> = {
      NO_INICIADO: 0,
      BORRADOR: 1,
      PENDIENTE_ENVIO: 2,
      ENVIADO_DOCENTE: 3,
      OBSERVADO_DPTO: 4,
      SUBSANADO: 5,
      VALIDADO_DPTO: 6,
      OBSERVADO_FACULTAD: 7,
      APROBADO_FACULTAD: 8,
      CERRADO: 9,
      ANULADO: -1,
    };
    return orden[estado] ?? 0;
  }

  private agruparPorCategoria(
    declaraciones: DeclaracionCargaHoraria[],
  ): { categoria: string; docentes: number; horas: number; promedio: number }[] {
    const map = new Map<
      string,
      { docentes: Set<number>; horas: number }
    >();
    for (const d of declaraciones) {
      if (!d.docente) continue;
      const cat = d.docente.categoria || "Sin categoría";
      if (!map.has(cat))
        map.set(cat, { docentes: new Set(), horas: 0 });
      const grupo = map.get(cat);
      grupo.docentes.add(d.docente_id);
      grupo.horas += d.total_horas_lectivas;
    }
    return [...map.entries()]
      .map(([categoria, data]) => ({
        categoria,
        docentes: data.docentes.size,
        horas: data.horas,
        promedio:
          data.docentes.size > 0
            ? Math.round((data.horas / data.docentes.size) * 10) / 10
            : 0,
      }))
      .sort((a, b) => b.horas - a.horas);
  }

  private estadosConLabels(
    declaraciones: DeclaracionCargaHoraria[],
  ): { estado: string; label: string; count: number; porcentaje: number }[] {
    const labels: Record<string, string> = {
      NO_INICIADO: "No iniciado",
      BORRADOR: "Borrador",
      PENDIENTE_ENVIO: "Pendiente envío",
      ENVIADO_DOCENTE: "Enviado",
      OBSERVADO_DPTO: "Observado (dpto)",
      SUBSANADO: "Subsanado",
      VALIDADO_DPTO: "Validado (dpto)",
      OBSERVADO_FACULTAD: "Observado (facultad)",
      APROBADO_FACULTAD: "Aprobado",
      CERRADO: "Cerrado",
    };
    const orden = [
      "NO_INICIADO",
      "BORRADOR",
      "PENDIENTE_ENVIO",
      "ENVIADO_DOCENTE",
      "OBSERVADO_DPTO",
      "SUBSANADO",
      "VALIDADO_DPTO",
      "OBSERVADO_FACULTAD",
      "APROBADO_FACULTAD",
      "CERRADO",
    ];
    const total = declaraciones.length || 1;
    return orden
      .map((est) => {
        const count = declaraciones.filter((d) => d.estado === est).length;
        return {
          estado: est,
          label: labels[est] || est,
          count,
          porcentaje: (count / total) * 100,
        };
      })
      .filter((e) => e.count > 0);
  }

  private async obtenerIdPeriodo(
    periodo: string,
  ): Promise<number | null> {
    try {
      const p = await this.periodoRepo.findOne({
        where: { codigo: periodo },
        select: ["id"],
      });
      return p?.id ?? null;
    } catch {
      return null;
    }
  }

  async generarReporteDocenteExcel(
    docenteId: number,
    periodo: string,
  ): Promise<Buffer> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) throw new Error("Docente no encontrado");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Horario Docente");

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

  async generarReporteCicloPDF(
    ciclo: number,
    periodo: string,
  ): Promise<Buffer> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl =
      config?.logo_url ||
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const primaryColor = config?.color_primario || "#1a237e";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

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
    doc.rect(0, pH - 12, pW, 12, "F");
    doc.setDrawColor(230, 230, 230);
    doc.line(10, pH - 12, pW - 10, pH - 12);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 15, pH - 6);
    doc.text(`Página 1 de 1`, pW - 15, pH - 6, { align: "right" });

    return Buffer.from(doc.output("arraybuffer"));
  }

  async generarReporteTodosCiclosPDF(periodo: string): Promise<Buffer> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl =
      config?.logo_url ||
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const primaryColor = config?.color_primario || "#1a237e";

    // Cargar logo como base64
    const logoBase64 = await this.getBase64Image(logoUrl);

    const ciclos = [1, 3, 5, 7, 9];
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
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
    doc.rect(0, 0, PAGE_W, 45, "F");

    // Logo en la primera página
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", 15, 10, 25, 25);
      } catch (e) {
        this.logger.warn(
          "No se pudo cargar el logo en la primera página del PDF",
        );
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("PROGRAMACIÓN ACADÉMICA", PAGE_W / 2 + 10, 22, {
      align: "center",
    });
    doc.setFontSize(14);
    doc.text(`SEMESTRE ACADÉMICO ${periodo}`, PAGE_W / 2 + 10, 32, {
      align: "center",
    });

    doc.setTextColor(33, 33, 33);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    let currentY = 60;
    doc.setFont("helvetica", "bold");
    doc.text("INFORMACIÓN DE LA INSTITUCIÓN", 20, currentY);
    currentY += 10;
    doc.setFont("helvetica", "normal");
    doc.text(
      config?.nombre_institucional || "Universidad Nacional de Trujillo",
      25,
      currentY,
    );
    currentY += 7;
    doc.text("Facultad de Ingeniería", 25, currentY);
    currentY += 7;
    doc.text("Escuela Profesional de Ingeniería de Sistemas", 25, currentY);
    currentY += 15;

    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN DE CICLOS INCLUIDOS", 20, currentY);
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
      head: [["Ciclo", "N° Asignaciones"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: primaryRGB },
      margin: { left: 25, right: 25 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 25;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Este documento contiene la programación detallada de horarios para los ciclos impares del periodo.",
      20,
      currentY,
    );
    currentY += 6;
    doc.text(
      "Generado automáticamente por el Sistema de Gestión de Horarios UNT.",
      20,
      currentY,
    );

    // --- SIGUIENTES PÁGINAS: HORARIOS (HORIZONTAL) ---
    for (const ciclo of ciclos) {
      doc.addPage("a4", "landscape");
      await this.dibujarPaginaCiclo(
        doc,
        ciclo,
        periodo,
        logoBase64,
        primaryRGB,
      );
    }

    // --- AGREGAR PIE DE PÁGINA (NÚMEROS Y FECHA) ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const isLandscape =
        doc.internal.pageSize.getWidth() > doc.internal.pageSize.getHeight();
      const pW = doc.internal.pageSize.getWidth();
      const pH = doc.internal.pageSize.getHeight();

      // Fondo para el pie de página para que no se superponga
      doc.setFillColor(255, 255, 255);
      doc.rect(0, pH - 12, pW, 12, "F");

      doc.setDrawColor(230, 230, 230);
      doc.line(10, pH - 12, pW - 10, pH - 12);

      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 15, pH - 6);
      doc.text(`Página ${i} de ${pageCount}`, pW - 15, pH - 6, {
        align: "right",
      });
    }

    return Buffer.from(doc.output("arraybuffer"));
  }

  private async dibujarPaginaCiclo(
    doc: jsPDF,
    ciclo: number,
    periodo: string,
    logoBase64: string | null,
    primaryRGB: [number, number, number],
  ): Promise<void> {
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

    horarios.forEach((h) => {
      if (h.hora_inicio && h.hora_inicio.length > 5)
        h.hora_inicio = h.hora_inicio.substring(0, 5);
      if (h.hora_fin && h.hora_fin.length > 5)
        h.hora_fin = h.hora_fin.substring(0, 5);
    });

    let almuerzoInicio = 13;
    let almuerzoFin = 14;
    try {
      const restricciones =
        await this.configuracionService.getRestriccionesMap(periodo);
      const bloqueAlmuerzo = restricciones["BLOQUE_ALMUERZO"] as any;
      if (
        bloqueAlmuerzo &&
        bloqueAlmuerzo.hora_inicio &&
        bloqueAlmuerzo.hora_fin
      ) {
        almuerzoInicio = parseInt(bloqueAlmuerzo.hora_inicio.split(":")[0], 10);
        almuerzoFin = parseInt(bloqueAlmuerzo.hora_fin.split(":")[0], 10);
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
    doc.rect(0, 0, PAGE_W, 25, "F");

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", 10, 3, 18, 18);
      } catch (e) {}
    }

    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`HORARIO ACADÉMICO - CICLO ${ciclo}`, 32, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      "Universidad Nacional de Trujillo | Ingeniería de Sistemas",
      32,
      18,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Periodo: ${periodo}`, PAGE_W - 12, 15, { align: "right" });

    let yPos = 30;

    // Profesores Table (Resumen)
    const profesoresCursosMap = new Map<string, any>();
    horarios.forEach((a) => {
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
      const hInicio = parseInt(a.hora_inicio.split(":")[0], 10);
      const hFin = parseInt(a.hora_fin.split(":")[0], 10);
      const duration = hFin - hInicio;
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
      PRINCIPAL: 1,
      ASOCIADO: 2,
      AUXILIAR: 3,
      SIN_CATEGORIA: 4,
    };

    const profesoresCursos = Array.from(profesoresCursosMap.values()).sort(
      (a, b) => {
        const docA = a.docente;
        const docB = b.docente;
        const isSistemasA =
          docA?.departamento?.nombre === "Ing. de Sistemas" ? 1 : 0;
        const isSistemasB =
          docB?.departamento?.nombre === "Ing. de Sistemas" ? 1 : 0;
        if (isSistemasA !== isSistemasB) return isSistemasB - isSistemasA;
        const rankA = hierarchy[docA?.categoria] || 99;
        const rankB = hierarchy[docB?.categoria] || 99;
        if (rankA !== rankB) return rankA - rankB;
        return (docA?.apellidos || "").localeCompare(docB?.apellidos || "");
      },
    );

    const profesorColorsCiclo: [number, number, number][] = [
      [255, 235, 238],
      [252, 228, 236],
      [243, 229, 245],
      [237, 231, 246],
      [232, 234, 246],
      [227, 242, 253],
      [224, 247, 250],
      [224, 242, 241],
      [232, 245, 233],
      [241, 248, 233],
    ];
    const profesorCursoColorMapCiclo = new Map<
      string,
      [number, number, number]
    >();
    profesoresCursos.forEach((item, idx) => {
      const key = `${item.docente.id}-${item.curso.id}`;
      profesorCursoColorMapCiclo.set(
        key,
        profesorColorsCiclo[idx % profesorColorsCiclo.length],
      );
    });

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          "N°",
          "Profesor",
          "Departamento",
          "Asignatura",
          "T",
          "P",
          "L",
          "T. Horas",
        ],
      ],
      body: profesoresCursos.map((item, idx) => [
        idx + 1,
        `${item.docente.apellidos}, ${item.docente.nombres}`,
        item.docente.departamento?.nombre || "—",
        item.curso.nombre,
        item.hTeoria || "-",
        item.hPractica || "-",
        item.hLaboratorio || "-",
        item.horas,
      ]),
      theme: "grid",
      styles: {
        fontSize: 5.5,
        cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
        valign: "middle",
        halign: "left",
        lineColor: C.border,
        lineWidth: 0.25,
        textColor: [51, 51, 51],
      },
      headStyles: {
        fillColor: C.primary,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 6.5,
        halign: "center",
        cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        2: { cellWidth: 35 },
        4: { halign: "center", cellWidth: 8 },
        5: { halign: "center", cellWidth: 8 },
        6: { halign: "center", cellWidth: 8 },
        7: { halign: "center", cellWidth: 12, fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const rowIndex = data.row.index;
        const item = profesoresCursos[rowIndex];
        if (item?.docente?.id && item?.curso?.id) {
          const key = `${item.docente.id}-${item.curso.id}`;
          const rgb = profesorCursoColorMapCiclo.get(key);
          if (rgb) data.cell.styles.fillColor = rgb;
        }
      },
      margin: { left: 8, right: 8 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;

    // Grid de Horarios
    const dias = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    const diasNum = [1, 2, 3, 4, 5, 6];
    const horas = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 a 22:00
    const cellHeight = 6.5; // Reducido un poco más para asegurar que quepa con el footer
    const horaColWidth = 15;
    const gridWidth = PAGE_W - 20;
    const cellWidth = (gridWidth - horaColWidth * 2) / 6;

    // Dibujar Encabezado Grid
    doc.setFillColor(...C.primary);
    doc.rect(10, yPos, gridWidth, 8, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.text("HORA", 10 + horaColWidth / 2, yPos + 5, { align: "center" });
    dias.forEach((dia, idx) => {
      doc.text(
        dia,
        10 + horaColWidth + idx * cellWidth + cellWidth / 2,
        yPos + 5,
        { align: "center" },
      );
    });
    doc.text("HORA", 10 + gridWidth - horaColWidth / 2, yPos + 5, {
      align: "center",
    });

    let currentY = yPos + 8;

    // Dibujar Filas de Horas
    horas.forEach((hora) => {
      // Fondos de columnas de horas
      doc.setFillColor(248, 250, 252);
      doc.rect(10, currentY, horaColWidth, cellHeight, "F");
      doc.rect(
        10 + gridWidth - horaColWidth,
        currentY,
        horaColWidth,
        cellHeight,
        "F",
      );

      doc.setTextColor(...C.text);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(
        `${String(hora).padStart(2, "0")}:00`,
        10 + horaColWidth / 2,
        currentY + cellHeight / 2 + 1.5,
        { align: "center" },
      );
      doc.text(
        `${String(hora).padStart(2, "0")}:00`,
        10 + gridWidth - horaColWidth / 2,
        currentY + cellHeight / 2 + 1.5,
        { align: "center" },
      );

      // Dibujar celdas de días y almuerzo
      diasNum.forEach((d, idx) => {
        const cellX = 10 + horaColWidth + idx * cellWidth;
        const isAlmuerzo = hora >= almuerzoInicio && hora < almuerzoFin;

        if (isAlmuerzo) {
          doc.setFillColor(255, 248, 225);
          doc.rect(cellX, currentY, cellWidth, cellHeight, "F");
          doc.setTextColor(180, 120, 0);
          doc.setFontSize(6);
          doc.text(
            "ALMUERZO",
            cellX + cellWidth / 2,
            currentY + cellHeight / 2 + 1,
            { align: "center" },
          );
        }

        // Bordes de celda
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.1);
        doc.rect(cellX, currentY, cellWidth, cellHeight, "S");
      });

      // Bordes de columna de hora
      doc.rect(10, currentY, horaColWidth, cellHeight, "S");
      doc.rect(
        10 + gridWidth - horaColWidth,
        currentY,
        horaColWidth,
        cellHeight,
        "S",
      );

      currentY += cellHeight;
    });

    // Dibujar Bloques de Clase
    const bloquesPorDia = new Map<number, any[]>();
    horarios.forEach((h) => {
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

      bloquesOrdenados.forEach((bloque) => {
        const hIni = this.horaToDecimal(bloque.hora_inicio);

        // Buscar primer carril libre
        let carrilIndex = -1;

        // 1. Prioridad: Mismo curso consecutivo
        for (let i = 0; i < carriles.length; i++) {
          const ultimoBloque = carriles[i][carriles[i].length - 1];
          const hFinUltimo = this.horaToDecimal(ultimoBloque.hora_fin);
          if (
            Math.abs(hFinUltimo - hIni) < 0.01 &&
            ultimoBloque.curso?.id === bloque.curso?.id
          ) {
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
        bloquesEnCarril.forEach((asig) => {
          todosLosBloquesDelDia.push({
            asig,
            carrilIdx,
            hIni: this.horaToDecimal(asig.hora_inicio),
            hFin: this.horaToDecimal(asig.hora_fin),
          });
        });
      });

      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        const fusionados: any[] = [];
        bloquesEnCarril.forEach((h) => {
          const hIni = this.horaToDecimal(h.hora_inicio);
          const hFin = this.horaToDecimal(h.hora_fin);
          const dur = hFin - hIni;
          const labelPart =
            h.tipo_clase === TipoClase.TEORIA
              ? `${this.formatDurationValue(dur)}T`
              : h.tipo_clase === TipoClase.PRACTICA
                ? `${this.formatDurationValue(dur)}P`
                : `${this.formatDurationValue(dur)}L-G${h.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ""}`;

          // Calcular el número máximo de carriles ocupados durante este bloque específico
          let maxCarrilIdxEnIntervalo = 0;
          todosLosBloquesDelDia.forEach((otro) => {
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
            const mismoAmbiente =
              ultimo.asignacion.ambiente?.id === h.ambiente?.id;
            const mismoCurso = ultimo.asignacion.curso?.id === h.curso?.id;
            const mismaReglaGrupo =
              h.tipo_clase === TipoClase.LABORATORIO
                ? ultimo.asignacion.grupo?.id === h.grupo?.id
                : true;
            const esTP =
              (ultimo.asignacion.tipo_clase === TipoClase.TEORIA &&
                h.tipo_clase === TipoClase.PRACTICA) ||
              (ultimo.asignacion.tipo_clase === TipoClase.PRACTICA &&
                h.tipo_clase === TipoClase.TEORIA);
            const mismoTipoTP =
              ultimo.asignacion.tipo_clase === h.tipo_clase &&
              (h.tipo_clase === TipoClase.TEORIA ||
                h.tipo_clase === TipoClase.PRACTICA);
            const mismoLaboratorio =
              ultimo.asignacion.tipo_clase === TipoClase.LABORATORIO &&
              h.tipo_clase === TipoClase.LABORATORIO &&
              mismaReglaGrupo;

            if (
              mismoCurso &&
              mismoAmbiente &&
              Math.abs(ultimo.horaFin - hIni) < 0.01 &&
              (esTP || mismoTipoTP || mismoLaboratorio)
            ) {
              ultimo.horaFin = hFin;
              ultimo.totalHoraFin = h.hora_fin;
              ultimo.asignaciones.push(h);
              ultimo.tiposClase.push(h.tipo_clase);
              ultimo.label = this.construirLabelBloque(ultimo.asignaciones);

              // Actualizar el ancho y posición si el nuevo bloque fusionado tiene más colisiones
              if (
                numCarrilesLocales > Math.round((cellWidth - 1) / ultimo.width)
              ) {
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
            label: (h.curso?.nombre || "") + ` (${labelPart})`,
          });
        });

        fusionados.forEach((f) => {
          const rowStart = horas.indexOf(f.horaInicio);
          const rowEnd = horas.indexOf(f.horaFin);

          if (rowStart !== -1 && rowEnd !== -1) {
            const blockX =
              10 + horaColWidth + diaIdx * cellWidth + 0.5 + f.left;
            const blockY = yPos + 8 + rowStart * cellHeight + 0.5;
            const blockW = f.width - 0.5;
            const blockH = (rowEnd - rowStart) * cellHeight - 1;

            const colorKey = `${f.asignacion.docente?.id}-${f.asignacion.curso?.id}`;
            const color = profesorCursoColorMapCiclo.get(colorKey) || [
              255, 255, 255,
            ];
            doc.setFillColor(...(color as [number, number, number]));
            doc.rect(blockX, blockY, blockW, blockH, "F");

            doc.setDrawColor(...C.primary);
            doc.setLineWidth(0.1);
            doc.rect(blockX, blockY, blockW, blockH, "S");

            doc.setTextColor(30, 41, 59);
            doc.setFont("helvetica", "bold");

            let fontSize = 5.5;
            const numCarrilesBlock = Math.round((cellWidth - 1) / f.width);
            if (numCarrilesBlock > 1) fontSize = 4;
            if (numCarrilesBlock > 2) fontSize = 3;
            doc.setFontSize(fontSize);

            const cursoNombre = f.label;
            const docenteApellidos = f.asignacion.docente?.apellidos || "";
            const ambienteNombre =
              f.asignacion.ambiente?.nombre ||
              f.asignacion.ambiente?.codigo ||
              "";

            const splitCurso = doc.splitTextToSize(cursoNombre, blockW - 1);
            doc.text(
              splitCurso.slice(0, 2),
              blockX + blockW / 2,
              blockY + fontSize / 2 + 1,
              { align: "center" },
            );

            if (blockH > 10) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(fontSize - 0.5);
              doc.text(
                docenteApellidos,
                blockX + blockW / 2,
                blockY + blockH - fontSize - 1,
                { align: "center" },
              );

              doc.setFont("helvetica", "bold");
              doc.setTextColor(...C.primary);
              const splitAmb = doc.splitTextToSize(ambienteNombre, blockW - 1);
              doc.text(
                splitAmb[0],
                blockX + blockW / 2,
                blockY + blockH - 1.5,
                { align: "center" },
              );
            }
          }
        });
      });
    });
  }

  async generarReporteCicloExcel(
    ciclo: number,
    periodo: string,
  ): Promise<Buffer> {
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

  private async dibujarCicloEnExcel(
    sheet: ExcelJS.Worksheet,
    ciclo: number,
    periodo: string,
    ambienteId?: number,
    docenteId?: number,
  ): Promise<void> {
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

    const ambiente = ambienteId
      ? await this.ambienteRepo.findOne({ where: { id: ambienteId } })
      : null;
    const docente = docenteId
      ? await this.docenteRepo.findOne({ where: { id: docenteId } })
      : null;

    const primaryColor = "4F46E5"; // Indigo-600
    const primaryDark = "3730A3"; // Indigo-800
    const white = "FFFFFF";

    // 1. Cabecera
    sheet.mergeCells("A1:H2");
    const headerCell = sheet.getCell("A1");
    if (ambienteId) {
      headerCell.value = `HORARIO DE AMBIENTE: ${ambiente?.nombre || ""} | Periodo: ${periodo}`;
    } else if (docenteId) {
      headerCell.value = `HORARIO PERSONAL: ${docente?.apellidos}, ${docente?.nombres} | Periodo: ${periodo}`;
    } else {
      headerCell.value = `HORARIO ACADÉMICO - CICLO ${ciclo} | Periodo: ${periodo}`;
    }
    headerCell.font = { bold: true, size: 14, color: { argb: white } };
    headerCell.alignment = { vertical: "middle", horizontal: "center" };
    headerCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: primaryDark },
    };

    // 2. Tabla de Profesores
    const profesoresCursosMap = new Map<string, any>();
    horarios.forEach((a) => {
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
      const hInicio = parseInt(a.hora_inicio.split(":")[0], 10);
      const hFin = parseInt(a.hora_fin.split(":")[0], 10);
      const duration = hFin - hInicio;
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
      PRINCIPAL: 1,
      ASOCIADO: 2,
      AUXILIAR: 3,
      SIN_CATEGORIA: 4,
    };
    const profesoresCursos = Array.from(profesoresCursosMap.values()).sort(
      (a, b) => {
        const docA = a.docente;
        const docB = b.docente;
        const isSistemasA =
          docA?.departamento?.nombre === "Ing. de Sistemas" ? 1 : 0;
        const isSistemasB =
          docB?.departamento?.nombre === "Ing. de Sistemas" ? 1 : 0;
        if (isSistemasA !== isSistemasB) return isSistemasB - isSistemasA;
        const rankA = hierarchy[docA?.categoria] || 99;
        const rankB = hierarchy[docB?.categoria] || 99;
        if (rankA !== rankB) return rankA - rankB;
        return (docA?.apellidos || "").localeCompare(docB?.apellidos || "");
      },
    );

    let currentRow = 4;
    sheet.getCell(`A${currentRow}`).value = "RESUMEN DE DOCENTES Y ASIGNATURAS";
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 11 };
    currentRow++;

    const tableHeaders = [
      "N°",
      "Profesor",
      "Departamento",
      "Asignatura",
      "T",
      "P",
      "L",
      "T. Horas",
    ];
    tableHeaders.forEach((h, i) => {
      const cell = sheet.getCell(currentRow, i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: white } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: primaryColor },
      };
      cell.alignment = { horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    currentRow++;

    // Colores para profesores (los mismos que en el PDF para consistencia)
    const rowColors = [
      "FFEBEE",
      "FCE4EC",
      "F3E5F5",
      "EDE7F6",
      "E8EAF6",
      "E3F2FD",
      "E0F7FA",
      "E0F2F1",
      "E8F5E9",
      "F1F8E9",
    ];
    const profesorCursoColorMap = new Map<string, string>();

    profesoresCursos.forEach((item, idx) => {
      const color = rowColors[idx % rowColors.length];
      const key = `${item.docente.id}-${item.curso.id}`;
      profesorCursoColorMap.set(key, color);

      const row = [
        idx + 1,
        `${item.docente.apellidos}, ${item.docente.nombres}`,
        item.docente.departamento?.nombre || "—",
        item.curso.nombre,
        item.hTeoria || "-",
        item.hPractica || "-",
        item.hLaboratorio || "-",
        item.horas,
      ];
      row.forEach((val, i) => {
        const cell = sheet.getCell(currentRow, i + 1);
        cell.value = val;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
        if (i === 0 || i >= 4) cell.alignment = { horizontal: "center" };
      });
      currentRow++;
    });

    currentRow += 2;

    // 3. Grid de Horarios
    sheet.getCell(`A${currentRow}`).value = "PROGRAMACIÓN SEMANAL";
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 11 };
    currentRow++;

    // --- LÓGICA DINÁMICA DE COLUMNAS ---
    // 1. Agrupar asignaciones por día y calcular peak lanes por día
    const asignacionesPorDia = new Map<number, HorarioAsignado[]>();
    horarios.forEach((h) => {
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
        const hA = parseInt(a.hora_inicio.split(":")[0], 10);
        const hB = parseInt(b.hora_inicio.split(":")[0], 10);
        return hA - hB;
      });

      const carriles: HorarioAsignado[][] = [];
      sortedAsigs.forEach((asig) => {
        const hIni = parseInt(asig.hora_inicio.split(":")[0], 10);
        let carrilIndex = -1;
        for (let i = 0; i < carriles.length; i++) {
          const ultimo = carriles[i][carriles[i].length - 1];
          const hFinUltimo = parseInt(ultimo.hora_fin.split(":")[0], 10);
          if (hFinUltimo <= hIni) {
            carrilIndex = i;
            break;
          }
        }
        if (carrilIndex === -1) carriles.push([asig]);
        else carriles[carrilIndex].push(asig);
      });

      // Calcular el peak real en cualquier momento del día
      let peak = 1;
      const horasCheck = Array.from({ length: 15 }, (_, i) => i + 7);
      horasCheck.forEach((hCheck) => {
        let count = 0;
        asigs.forEach((a) => {
          const start = parseInt(a.hora_inicio.split(":")[0], 10);
          const end = parseInt(a.hora_fin.split(":")[0], 10);
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
    const diasHeaders = [
      "HORA",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];

    diasHeaders.forEach((d, i) => {
      if (i === 0) {
        // HORA
        const cell = sheet.getCell(currentRow, 1);
        cell.value = d;
        cell.font = { bold: true, color: { argb: white } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: primaryColor },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      } else {
        // Días
        const diaNum = i;
        const peak = peakLanesPorDia.get(diaNum);
        dayToStartCol.set(diaNum, currentColumn);

        const startCol = currentColumn;
        const endCol = currentColumn + peak - 1;

        if (startCol !== endCol)
          sheet.mergeCells(currentRow, startCol, currentRow, endCol);
        const cell = sheet.getCell(currentRow, startCol);
        cell.value = d;
        cell.font = { bold: true, color: { argb: white } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: primaryColor },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };

        currentColumn += peak;
      }
    });
    currentRow++;

    const horasArr = Array.from({ length: 15 }, (_, i) => i + 7);
    const horaToRowMap = new Map<number, number>();

    // Obtener almuerzo
    let almuerzoInicio = 13;
    let almuerzoFin = 14;
    try {
      const restricciones =
        await this.configuracionService.getRestriccionesMap(periodo);
      const bAlm = restricciones["BLOQUE_ALMUERZO"] as any;
      if (bAlm?.hora_inicio && bAlm?.hora_fin) {
        almuerzoInicio = parseInt(bAlm.hora_inicio.split(":")[0], 10);
        almuerzoFin = parseInt(bAlm.hora_fin.split(":")[0], 10);
      }
    } catch (e) {}

    const startGridRow = currentRow;
    horasArr.forEach((h) => {
      horaToRowMap.set(h, currentRow);
      const cellHora = sheet.getCell(currentRow, 1);
      cellHora.value = `${String(h).padStart(2, "0")}:00`;
      cellHora.font = { bold: true };
      cellHora.alignment = { horizontal: "center", vertical: "middle" };
      cellHora.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F1F5F9" },
      };
      cellHora.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };

      for (let dayIdx = 1; dayIdx <= 6; dayIdx++) {
        const startCol = dayToStartCol.get(dayIdx);
        const peak = peakLanesPorDia.get(dayIdx);
        const endCol = startCol + peak - 1;

        for (let col = startCol; col <= endCol; col++) {
          const cell = sheet.getCell(currentRow, col);
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: col === startCol ? { style: "thin" } : undefined,
            right: col === endCol ? { style: "thin" } : undefined,
          };
          if (h >= almuerzoInicio && h < almuerzoFin) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8E1" },
            };
          }
        }
        if (h >= almuerzoInicio && h < almuerzoFin) {
          try {
            if (startCol !== endCol)
              sheet.mergeCells(currentRow, startCol, currentRow, endCol);
            const cell = sheet.getCell(currentRow, startCol);
            cell.value = "ALMUERZO";
            cell.font = { color: { argb: "B47800" }, size: 8, italic: true };
            cell.alignment = { horizontal: "center", vertical: "middle" };
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
        bloquesEnCarril.forEach((h) => {
          const hIni = this.horaToDecimal(h.hora_inicio);
          const hFin = this.horaToDecimal(h.hora_fin);
          const dur = hFin - hIni;
          const labelPart =
            h.tipo_clase === TipoClase.TEORIA
              ? `${this.formatDurationValue(dur)}T`
              : h.tipo_clase === TipoClase.PRACTICA
                ? `${this.formatDurationValue(dur)}P`
                : `${this.formatDurationValue(dur)}L-G${h.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ""}`;

          if (fusionados.length > 0) {
            const ultimo = fusionados[fusionados.length - 1];
            const mismoAmbiente =
              ultimo.asignacion.ambiente?.id === h.ambiente?.id;
            const mismoCurso = ultimo.asignacion.curso?.id === h.curso?.id;
            const mismaReglaGrupo =
              h.tipo_clase === TipoClase.LABORATORIO
                ? ultimo.asignacion.grupo?.id === h.grupo?.id
                : true;
            const esTP =
              (ultimo.asignacion.tipo_clase === TipoClase.TEORIA &&
                h.tipo_clase === TipoClase.PRACTICA) ||
              (ultimo.asignacion.tipo_clase === TipoClase.PRACTICA &&
                h.tipo_clase === TipoClase.TEORIA);
            const mismoTipoTP =
              ultimo.asignacion.tipo_clase === h.tipo_clase &&
              (h.tipo_clase === TipoClase.TEORIA ||
                h.tipo_clase === TipoClase.PRACTICA);
            const mismoLaboratorio =
              ultimo.asignacion.tipo_clase === TipoClase.LABORATORIO &&
              h.tipo_clase === TipoClase.LABORATORIO &&
              mismaReglaGrupo;
            if (
              mismoCurso &&
              mismoAmbiente &&
              Math.abs(ultimo.horaFin - hIni) < 0.01 &&
              (esTP || mismoTipoTP || mismoLaboratorio)
            ) {
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
            label: `${h.curso?.nombre} (${labelPart})`,
          });
        });

        fusionados.forEach((f) => {
          const hIni = f.horaInicio;
          const hFin = f.horaFin;
          const rowStart = horaToRowMap.get(hIni);
          const rowEnd = horaToRowMap.get(hFin - 1);

          if (rowStart && rowEnd) {
            // Calcular colSpan: si este bloque no choca con nada en otros carriles, expandir
            let puedeExpandirse = true;
            carriles.forEach((otros, idx) => {
              if (idx !== carrilIdx) {
                otros.forEach((o) => {
                  const oIni = parseInt(o.hora_inicio.split(":")[0], 10);
                  const oFin = parseInt(o.hora_fin.split(":")[0], 10);
                  if (hIni < oFin && oIni < hFin) puedeExpandirse = false;
                });
              }
            });

            const startCol = puedeExpandirse
              ? dayStartCol
              : dayStartCol + carrilIdx;
            const endCol = puedeExpandirse
              ? dayStartCol + dayPeak - 1
              : startCol;

            const cell = sheet.getCell(rowStart, startCol);
            cell.value = `${f.label}\n${f.asignacion.docente?.apellidos}\n${f.asignacion.ambiente?.nombre || f.asignacion.ambiente?.codigo || ""}`;
            cell.alignment = {
              vertical: "middle",
              horizontal: "center",
              wrapText: true,
            };
            cell.font = { size: !puedeExpandirse ? 7 : 8, bold: true };

            const colorKey = `${f.asignacion.docente?.id}-${f.asignacion.curso?.id}`;
            const color = profesorCursoColorMap.get(colorKey) || "FFFFFF";
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: color },
            };
            cell.border = {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            };

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

  async generarReporteCursosPDF(
    search?: string,
    ciclo?: number,
    lab?: boolean,
    activo?: boolean,
  ): Promise<Buffer> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl =
      config?.logo_url ||
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const logoBase64 = await this.getBase64Image(logoUrl);

    // Get active plan of studies to get tipo_curso and prerequisitos
    const activePlan = await this.planEstudiosRepo.findOne({
      where: { activo: true },
    });

    let queryBuilder = this.cursoRepo
      .createQueryBuilder("curso")
      .leftJoinAndSelect("curso.departamento", "departamento")
      .leftJoinAndSelect("curso.planes_estudio", "cursoPlan");

    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      queryBuilder = queryBuilder.andWhere(
        "(LOWER(curso.nombre) LIKE :search OR LOWER(curso.codigo) LIKE :search)",
        { search: searchLower },
      );
    }

    if (ciclo) {
      queryBuilder = queryBuilder.andWhere("curso.ciclo = :ciclo", { ciclo });
    }

    if (lab !== undefined) {
      queryBuilder = queryBuilder.andWhere("curso.tiene_laboratorio = :lab", {
        lab,
      });
    }

    if (activo !== undefined) {
      queryBuilder = queryBuilder.andWhere("curso.activo = :activo", {
        activo,
      });
    }

    const cursos = await queryBuilder
      .orderBy("curso.ciclo", "ASC")
      .addOrderBy("curso.codigo", "ASC")
      .getMany();

    // Build map of course ID to cursoPlan for active plan
    const cursoIdToCursoPlan = new Map<number, any>();
    if (activePlan) {
      const allCursoPlans = await this.cursoPlanEstudiosRepo.find({
        where: { plan_estudios_id: activePlan.id },
        relations: ["curso"],
      });
      allCursoPlans.forEach((cp) => {
        cursoIdToCursoPlan.set(cp.curso_id, cp);
      });
    }

    // Group courses by ciclo
    const cursosPorCiclo = new Map<number, typeof cursos>();
    cursos.forEach((c) => {
      if (!cursosPorCiclo.has(c.ciclo)) {
        cursosPorCiclo.set(c.ciclo, []);
      }
      cursosPorCiclo.get(c.ciclo)?.push(c);
    });

    // Define tipo_curso priority: S > OB > OP > EL
    const tipoCursoPriority: { [key: string]: number } = {
      ESPECIALIDAD: 1,
      OBLIGATORIO_GENERAL: 2,
      OBLIGATORIO_PROFESIONAL: 3,
      ELECTIVO: 4,
    };

    let tableHtml = `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Ciclo</th>
            <th>Tipo Curso</th>
            <th>Curso</th>
            <th>T</th>
            <th>P</th>
            <th>L</th>
            <th>C</th>
            <th>Departamento Responsable</th>
          </tr>
        </thead>
        <tbody>
    `;

    let contador = 1;
    for (const [cicloNum, cursoList] of cursosPorCiclo) {
      let totalCreditosCiclo = 0;

      // Sort the course list by tipo_curso priority
      cursoList.sort((a, b) => {
        const cpA = cursoIdToCursoPlan.get(a.id);
        const cpB = cursoIdToCursoPlan.get(b.id);
        const priorityA = cpA?.tipo_curso
          ? tipoCursoPriority[cpA.tipo_curso]
          : 99;
        const priorityB = cpB?.tipo_curso
          ? tipoCursoPriority[cpB.tipo_curso]
          : 99;
        return priorityA - priorityB;
      });

      cursoList.forEach((c) => {
        const departamento = c.departamento?.nombre || "—";
        totalCreditosCiclo += Number(c.creditos || 0);
        const cursoPlan = cursoIdToCursoPlan.get(c.id);
        const tipoCurso = cursoPlan?.tipo_curso;
        const tipoCursoStr =
          tipoCurso === "ESPECIALIDAD"
            ? "S"
            : tipoCurso === "OBLIGATORIO_GENERAL"
              ? "OB"
              : tipoCurso === "OBLIGATORIO_PROFESIONAL"
                ? "OP"
                : "EL";

        // Build prerequisites row if any
        let prerequisitosRow = "";
        if (cursoPlan?.prerequisitos) {
          let prereqsArray: number[] = [];
          if (typeof cursoPlan.prerequisitos === "string") {
            try {
              prereqsArray = JSON.parse(cursoPlan.prerequisitos);
            } catch (e) {
              prereqsArray = [];
            }
          } else if (Array.isArray(cursoPlan.prerequisitos)) {
            prereqsArray = cursoPlan.prerequisitos;
          }

          if (prereqsArray.length > 0) {
            // Now we need to get the course codes for these prereq IDs!
            // So let's get all the cursos first, build a map id -> code!
            const prerequisitosList = [];
            for (const prereqId of prereqsArray) {
              const prereqCP = cursoIdToCursoPlan.get(prereqId);
              if (prereqCP && prereqCP.curso) {
                prerequisitosList.push(
                  `* ${prereqCP.curso.codigo} ${prereqCP.curso.nombre.toUpperCase()} (Ciclo ${prereqCP.ciclo})`,
                );
              }
            }

            if (prerequisitosList.length > 0) {
              prerequisitosRow = `
                <tr>
                  <td colspan="9" style="padding-left: 40px; font-style: italic;">
                    ${prerequisitosList.join("<br>")}
                  </td>
                </tr>
              `;
            }
          }
        }

        tableHtml += `
          <tr>
            <td class="centered">${c.codigo || contador++}</td>
            <td class="centered">${cicloNum}</td>
            <td class="centered">${tipoCursoStr}</td>
            <td class="curso-nombre">${c.nombre?.toUpperCase() || "—"}</td>
            <td class="centered">${c.horas_teoria || 0}</td>
            <td class="centered">${c.horas_practica || 0}</td>
            <td class="centered">${c.horas_laboratorio || 0}</td>
            <td class="centered">${c.creditos || 0}</td>
            <td>${departamento?.toUpperCase() || "—"}</td>
          </tr>
          ${prerequisitosRow}
        `;
      });

      tableHtml += `
        <tr class="suma-ciclo">
          <td colspan="6" style="text-align: right; padding-right: 10px; font-weight: bold;">
            SUMA DE CRÉDITOS:
          </td>
          <td class="centered" style="font-weight: bold;">
            ${totalCreditosCiclo}
          </td>
          <td colspan="2"></td>
        </tr>
      `;
    }

    tableHtml += `
        </tbody>
      </table>
    `;

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 20mm 15mm;
          }

          body { 
            font-family: "Times New Roman", serif; 
            font-size: 10pt; 
            color: #000; 
            line-height: 1.2;
            position: relative;
            margin: 0;
            padding: 0;
          }

          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.12;
            z-index: -1;
            width: 65%;
          }

          .fecha-impresion {
            text-align: right;
            font-size: 9pt;
            margin-bottom: 15px;
            font-family: "Times New Roman", serif;
          }

          .header-universidad {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 8px;
            font-family: "Times New Roman", serif;
          }

          .plan-titulo {
            text-align: center;
            font-size: 13pt;
            font-weight: bold;
            margin-bottom: 20px;
            font-family: "Times New Roman", serif;
          }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 9pt;
            font-family: "Times New Roman", serif;
          }

          th { 
            background-color: #F0D78C; 
            color: #000; 
            padding: 5px 3px; 
            text-align: center; 
            font-weight: bold;
            border: 1px solid #000;
            font-size: 9pt;
          }

          td { 
            border-top: none;
            border-left: 1px solid #000;
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 5px; 
            font-size: 9pt;
          }

          .centered { 
            text-align: center; 
          }

          .curso-nombre {
            text-align: left;
          }

          .suma-ciclo td {
            border-top: 2px solid #000;
          }
        </style>
      </head>
      <body>
        ${logoBase64 ? `<img class="watermark" src="${logoBase64}" />` : ""}
        <div class="fecha-impresion">
          Fecha de Impresión: ${new Date().toLocaleDateString("es-PE", { year: "numeric", month: "2-digit", day: "2-digit" })} (${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })})
        </div>
        <div class="header-universidad">
          UNIVERSIDAD NACIONAL DE TRUJILLO
        </div>
        <div class="plan-titulo">
          REPORTE DE CURSOS
        </div>
        ${tableHtml}
      </body>
      </html>
    `;

    return this.generarPDF(html);
  }

  async generarReportePlanEstudiosPDF(planId: number): Promise<Buffer> {
    const config = await this.configuracionService.getConfiguracionGeneral();
    const logoUrl =
      config?.logo_url ||
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png";
    const logoBase64 = await this.getBase64Image(logoUrl);

    const plan = await this.planEstudiosRepo.findOne({
      where: { id: planId },
      relations: ["escuela"],
    });
    if (!plan) throw new Error("Plan de estudios no encontrado");

    const cursoPlans = await this.cursoPlanEstudiosRepo
      .createQueryBuilder("cursoPlan")
      .leftJoinAndSelect("cursoPlan.curso", "curso")
      .leftJoinAndSelect("curso.departamento", "departamento")
      .where("cursoPlan.plan_estudios_id = :planId", { planId })
      .orderBy("cursoPlan.ciclo", "ASC")
      .addOrderBy("curso.codigo", "ASC")
      .getMany();

    // Build map of course ID to full course object
    const cursoIdToCurso = new Map<number, any>();
    cursoPlans.forEach((cp) => {
      if (cp.curso?.id) {
        cursoIdToCurso.set(cp.curso.id, cp);
      }
    });

    // Group courses by ciclo
    const cursosPorCiclo = new Map<number, typeof cursoPlans>();
    cursoPlans.forEach((cp) => {
      if (!cursosPorCiclo.has(cp.ciclo)) {
        cursosPorCiclo.set(cp.ciclo, []);
      }
      cursosPorCiclo.get(cp.ciclo)?.push(cp);
    });

    // Define tipo_curso priority: S > OB > OP > EL
    const tipoCursoPriority: { [key: string]: number } = {
      ESPECIALIDAD: 1,
      OBLIGATORIO_GENERAL: 2,
      OBLIGATORIO_PROFESIONAL: 3,
      ELECTIVO: 4,
    };

    let tableHtml = `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Ciclo</th>
            <th>Tipo Curso</th>
            <th>Curso</th>
            <th>T</th>
            <th>P</th>
            <th>L</th>
            <th>C</th>
            <th>Departamento Responsable</th>
          </tr>
        </thead>
        <tbody>
    `;

    let contador = 1;
    for (const [ciclo, cursoList] of cursosPorCiclo) {
      let totalCreditosCiclo = 0;

      // Sort the course list by tipo_curso priority
      cursoList.sort((a, b) => {
        const priorityA = tipoCursoPriority[a.tipo_curso] || 99;
        const priorityB = tipoCursoPriority[b.tipo_curso] || 99;
        return priorityA - priorityB;
      });

      cursoList.forEach((cp) => {
        const departamento = cp.curso?.departamento?.nombre || "—";
        totalCreditosCiclo += Number(cp.creditos || 0);

        // Build prerequisites row if any
        let prerequisitosRow = "";
        if (cp.prerequisitos) {
          let prereqsArray: number[] = [];
          if (typeof cp.prerequisitos === "string") {
            // If it's a string for some reason, try to parse it as JSON
            try {
              prereqsArray = JSON.parse(cp.prerequisitos);
            } catch (e) {
              prereqsArray = [];
            }
          } else if (Array.isArray(cp.prerequisitos)) {
            prereqsArray = cp.prerequisitos;
          }

          if (prereqsArray.length > 0) {
            const prerequisitosList = prereqsArray
              .map((id) => {
                const prereqCP = cursoIdToCurso.get(id);
                if (prereqCP) {
                  return `* ${prereqCP.curso.codigo} ${prereqCP.curso.nombre.toUpperCase()} (Ciclo ${prereqCP.ciclo})`;
                }
                return null;
              })
              .filter(Boolean);

            if (prerequisitosList.length > 0) {
              prerequisitosRow = `
                <tr>
                  <td colspan="9" style="padding-left: 40px; font-style: italic;">
                    ${prerequisitosList.join("<br>")}
                  </td>
                </tr>
              `;
            }
          }
        }

        tableHtml += `
          <tr>
            <td class="centered">${cp.curso?.codigo || contador++}</td>
            <td class="centered">${ciclo}</td>
            <td class="centered">${cp.tipo_curso === "ESPECIALIDAD" ? "S" : cp.tipo_curso === "OBLIGATORIO_GENERAL" ? "OB" : cp.tipo_curso === "OBLIGATORIO_PROFESIONAL" ? "OP" : "EL"}</td>
            <td class="curso-nombre">${cp.curso?.nombre?.toUpperCase() || "—"}</td>
            <td class="centered">${cp.horas_teoria || 0}</td>
            <td class="centered">${cp.horas_practica || 0}</td>
            <td class="centered">${cp.horas_laboratorio || 0}</td>
            <td class="centered">${cp.creditos || 0}</td>
            <td>${departamento?.toUpperCase() || "—"}</td>
          </tr>
          ${prerequisitosRow}
        `;
      });

      tableHtml += `
        <tr class="suma-ciclo">
          <td colspan="6" style="text-align: right; padding-right: 10px; font-weight: bold;">
            SUMA DE CRÉDITOS:
          </td>
          <td class="centered" style="font-weight: bold;">
            ${totalCreditosCiclo}
          </td>
          <td colspan="2"></td>
        </tr>
      `;
    }

    tableHtml += `
        </tbody>
      </table>
    `;

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 20mm 15mm;
          }

          body { 
            font-family: 'Times New Roman', serif; 
            font-size: 10pt; 
            color: #000; 
            line-height: 1.2;
            position: relative;
            margin: 0;
            padding: 0;
          }

          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.12;
            z-index: -1;
            width: 65%;
          }

          .fecha-impresion {
            text-align: right;
            font-size: 9pt;
            margin-bottom: 15px;
            font-family: 'Times New Roman', serif;
          }

          .header-universidad {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 8px;
            font-family: 'Times New Roman', serif;
          }

          .plan-titulo {
            text-align: center;
            font-size: 13pt;
            font-weight: bold;
            margin-bottom: 20px;
            font-family: 'Times New Roman', serif;
          }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 9pt;
            font-family: 'Times New Roman', serif;
          }

          th { 
            background-color: #F0D78C; /* Gold/yellow, exactly like image */
            color: #000; 
            padding: 5px 3px; 
            text-align: center; 
            font-weight: bold;
            border: 1px solid #000;
            font-size: 9pt;
          }

          td { 
            border-top: none;
            border-left: 1px solid #000;
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 5px; 
            font-size: 9pt;
          }

          .centered { 
            text-align: center; 
          }

          .curso-nombre {
            text-align: left;
          }

          .suma-ciclo td {
            border-top: 2px solid #000;
          }
        </style>
      </head>
      <body>
        ${logoBase64 ? `<img class="watermark" src="${logoBase64}" />` : ""}
        <div class="fecha-impresion">
          Fecha de Impresión: ${new Date().toLocaleDateString("es-PE", { year: "numeric", month: "2-digit", day: "2-digit" })} (${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })})
        </div>
        <div class="header-universidad">
          UNIVERSIDAD NACIONAL DE TRUJILLO
        </div>
        <div class="plan-titulo">
          PLAN DE ESTUDIOS DE ${plan.nombre.toUpperCase()} ${plan.anio}
        </div>
        ${tableHtml}
      </body>
      </html>
    `;

    return this.generarPDF(html);
  }
}
