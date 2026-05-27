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
    private readonly configuracionService: ConfiguracionService,
  ) {}

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
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
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
    
    // Normalizar horas para quitar segundos (convertir "07:00:00" a "07:00")
    horarios.forEach(h => {
      if (h.hora_inicio && h.hora_inicio.length > 5) {
        h.hora_inicio = h.hora_inicio.substring(0, 5);
      }
      if (h.hora_fin && h.hora_fin.length > 5) {
        h.hora_fin = h.hora_fin.substring(0, 5);
      }
    });

    this.logger.log(`[generarReporteDocentePDF] Horarios recibidos (${horarios.length}): ${JSON.stringify(horarios.map(h => ({
      id: h.id,
      curso: h.curso?.nombre,
      dia: h.dia ?? h.dia_semana,
      horaInicio: h.hora_inicio,
      horaFin: h.hora_fin,
      grupo: h.grupo?.id
    })))}`);

    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const diasNum = [1, 2, 3, 4, 5];
    const horas = Array.from({ length: 15 }, (_, i) => i + 7);

    // Obtener configuración del bloque de almuerzo desde la base de datos
    let almuerzoInicio = 12;
    let almuerzoFin = 14;
    try {
      const restricciones = await this.configuracionService.getRestriccionesMap(periodo);
      const bloqueAlmuerzo = restricciones['BLOQUE_ALMUERZO'] as any;
      if (bloqueAlmuerzo && bloqueAlmuerzo.hora_inicio && bloqueAlmuerzo.hora_fin) {
        almuerzoInicio = parseInt(bloqueAlmuerzo.hora_inicio.split(':')[0], 10);
        almuerzoFin = parseInt(bloqueAlmuerzo.hora_fin.split(':')[0], 10);
      }
    } catch (error) {
      this.logger.warn(`No se pudo obtener configuración de almuerzo, usando valores por defecto: ${error}`);
    }

    // Colores pasteles
    const profesorColorMap = new Map<number, [number, number, number]>();
    const profesorColors: [number, number, number][] = [
      [255, 205, 210],
      [248, 187, 217],
      [240, 178, 122],
      [249, 231, 159],
      [213, 245, 227],
      [174, 214, 241],
      [215, 189, 226],
      [250, 219, 216],
      [169, 223, 191],
      [249, 235, 234],
      [212, 239, 223],
      [169, 204, 227],
      [232, 218, 239],
      [245, 238, 248],
      [235, 245, 251],
    ];
    const getColorForProfesor = (docenteIdParam: number | undefined): [number, number, number] => {
      if (!docenteIdParam) return profesorColors[0];
      if (!profesorColorMap.has(docenteIdParam)) {
        const index = profesorColorMap.size % profesorColors.length;
        profesorColorMap.set(docenteIdParam, profesorColors[index]);
      }
      return profesorColorMap.get(docenteIdParam)!;
    };

    // Función para convertir horas a decimal
    const horaToDecimal = (hora: string): number => {
      const [h, m] = hora.split(':').map(Number);
      return h + (m || 0) / 60;
    };

    // Fusionar horarios consecutivos (EXACTAMENTE igual que el frontend)
    const sortedHorarios = [...horarios].sort((a, b) => {
      const diaDiff = (a.dia ?? a.dia_semana) - (b.dia ?? b.dia_semana);
      if (diaDiff !== 0) return diaDiff;
      return horaToDecimal(a.hora_inicio) - horaToDecimal(b.hora_inicio);
    });
    const keyToAsignacionMap = new Map<string, HorarioAsignado>();
    sortedHorarios.forEach(asignacion => {
      const dia = asignacion.dia ?? asignacion.dia_semana;
      const key = `${asignacion.curso?.id}-${asignacion.docente?.id}-${asignacion.ambiente?.id}-${asignacion.grupo?.id}-${dia}-${asignacion.tipo_clase}`;
      const existing = keyToAsignacionMap.get(key);
      if (existing) {
        const existingHoraFin = horaToDecimal(existing.hora_fin);
        const currentHoraInicio = horaToDecimal(asignacion.hora_inicio);
        if (Math.abs(existingHoraFin - currentHoraInicio) < 0.1) {
          existing.hora_fin = asignacion.hora_fin;
        } else {
          keyToAsignacionMap.set(`${key}-${Date.now()}-${Math.random()}`, asignacion);
        }
      } else {
        keyToAsignacionMap.set(key, asignacion);
      }
    });
    const asignaciones = Array.from(keyToAsignacionMap.values());
    this.logger.log(`[generarReporteDocentePDF] After merge, finalAsignaciones (${asignaciones.length}): ${JSON.stringify(asignaciones.map(a => ({
      curso: a.curso?.nombre,
      dia: a.dia ?? a.dia_semana,
      horaInicio: a.hora_inicio,
      horaFin: a.hora_fin,
      grupo: a.grupo?.id
    })))}`);

    // Generar bloques para el grid (EXACTAMENTE igual que el frontend)
    interface BloquePDF {
      dia: number;
      horaInicio: number;
      horaFin: number;
      asignacion: HorarioAsignado;
      left: number;
      width: number;
    }
    const bloques: BloquePDF[] = [];
    const bloquesPorDiaYHora: Map<string, BloquePDF[]> = new Map();
    asignaciones.forEach(asignacion => {
      const dia = asignacion.dia ?? asignacion.dia_semana;
      const horaInicio = horaToDecimal(asignacion.hora_inicio);
      const horaFin = horaToDecimal(asignacion.hora_fin);
      this.logger.log(`[generarReporteDocentePDF] Procesando horario (merged): curso=${asignacion.curso?.nombre}, dia=${dia}, horaInicio=${asignacion.hora_inicio} (${horaInicio}), horaFin=${asignacion.hora_fin} (${horaFin})`);
      const bloque = {
        dia,
        horaInicio,
        horaFin,
        asignacion,
        left: 0,
        width: 0,
      };
      for (let h = Math.floor(horaInicio); h < horaFin; h++) {
        const key = `${dia}-${h}`;
        this.logger.log(`[generarReporteDocentePDF]   h=${h}, key=${key}, is start=${h === Math.floor(horaInicio)}`);
        if (!bloquesPorDiaYHora.has(key)) {
          bloquesPorDiaYHora.set(key, []);
        }
        if (h === Math.floor(horaInicio)) {
          this.logger.log(`[generarReporteDocentePDF]   Adding bloque to key ${key}`);
          bloquesPorDiaYHora.get(key)!.push(bloque);
        }
      }
    });
    bloquesPorDiaYHora.forEach((bloquesEnCelda, key) => {
      const anchoPorBloque = 100 / bloquesEnCelda.length;
      this.logger.log(`[generarReporteDocentePDF] Key ${key}: ${bloquesEnCelda.length} bloques, ancho por bloque=${anchoPorBloque}%`);
      bloquesEnCelda.forEach((bloque, index) => {
        bloque.left = index * anchoPorBloque;
        bloque.width = anchoPorBloque;
        bloques.push(bloque);
      });
    });
    this.logger.log(`[generarReporteDocentePDF] Total bloques generados: ${bloques.length}`);

    // Calcular total horas
    const totalHoras = asignaciones.reduce((acc, a) => {
      const ini = parseInt(a.hora_inicio.split(':')[0], 10);
      const fin = parseInt(a.hora_fin.split(':')[0], 10);
      return acc + (fin - ini);
    }, 0);

    // Iniciar jsPDF
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const docNombre = `${docente.apellidos}, ${docente.nombres}`;
    const codigo = docente.codigo ?? '';
    const categoria = docente.categoria ?? '';
    const PAGE_W = 297;

    // Cabecera
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, PAGE_W, 22, 'F');
    doc.setTextColor(255, 255, 255);
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
    partes.push(`${totalHoras} hrs/sem`);
    doc.text(partes.join('  |  '), infoX, 13, { align: 'right' });

    const startY = 27;
    const cellHeight = 12;
    const cellWidth = (PAGE_W - 16 - 20) / 6;
    const horaColWidth = 20;
    const gridHeight = horas.length * cellHeight;
    const gridWidth = PAGE_W - 16;

    // 1. Dibujar encabezado
    doc.setFillColor(79, 70, 229);
    doc.rect(8, startY, gridWidth, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('HORA', 10, startY + 7);
    dias.forEach((dia, idx) => {
      doc.text(dia, 8 + horaColWidth + idx * cellWidth + cellWidth / 2, startY + 7, { align: 'center' });
    });

    // 2. Dibujar fondo del grid y celdas de hora
    let currentY = startY + 10;
    horas.forEach((hora) => {
      // Columna hora izquierda
      doc.setFillColor(241, 245, 249);
      doc.rect(8, currentY, horaColWidth, cellHeight, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`${String(hora).padStart(2, '0')}:00`, 10, currentY + cellHeight / 2 + 2);
      
      // Fondo solo para el almuerzo (no para las otras celdas, para que los bloques se vean completos)
      diasNum.forEach((dia, idx) => {
        const esAlm = hora >= almuerzoInicio && hora < almuerzoFin;
        const cellX = 8 + horaColWidth + idx * cellWidth;
        if (esAlm) {
          doc.setFillColor(255, 243, 205);
          doc.rect(cellX, currentY, cellWidth, cellHeight, 'F');
          doc.setTextColor(146, 64, 14);
          doc.setFontSize(8);
          doc.text('Almuerzo', cellX + cellWidth / 2, currentY + cellHeight / 2 + 2, { align: 'center' });
        }
      });
      currentY += cellHeight;
    });

    // 3. Dibujar bordes del grid (ANTES de los bloques)
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    for (let i = 0; i <= horas.length; i++) {
      const y = startY + 10 + i * cellHeight;
      doc.line(8, y, 8 + gridWidth, y);
    }
    doc.line(8, startY + 10, 8, startY + 10 + gridHeight);
    doc.line(8 + horaColWidth, startY + 10, 8 + horaColWidth, startY + 10 + gridHeight);
    diasNum.forEach((_, idx) => {
      const x = 8 + horaColWidth + (idx + 1) * cellWidth;
      doc.line(x, startY + 10, x, startY + 10 + gridHeight);
    });
    doc.line(8 + gridWidth, startY + 10, 8 + gridWidth, startY + 10 + gridHeight);

    // 4. Dibujar bloques de horario (DESPUÉS de los bordes, para taparlos)
    bloques.forEach(bloque => {
      const diaIdx = bloque.dia - 1;
      const cellX = 8 + horaColWidth + diaIdx * cellWidth + (bloque.left / 100) * cellWidth;
      const cellWidthBloque = (bloque.width / 100) * cellWidth;
      const startRowIdx = horas.indexOf(Math.floor(bloque.horaInicio));
      const endRowIdx = horas.indexOf(Math.floor(bloque.horaFin));
      if (startRowIdx === -1 || endRowIdx === -1) return;
      const cellY = startY + 10 + startRowIdx * cellHeight;
      const cellHeightBloque = (endRowIdx - startRowIdx) * cellHeight;

      // Fondo del bloque (TAPA LOS BORDES)
      const color = getColorForProfesor(bloque.asignacion.docente?.id);
      doc.setFillColor(...color);
      doc.rect(cellX, cellY, cellWidthBloque, cellHeightBloque, 'F');
      
      // Dibujar un borde fino alrededor del bloque para que se vea bien
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      doc.rect(cellX, cellY, cellWidthBloque, cellHeightBloque, 'S');

      // Texto del bloque
      doc.setTextColor(51, 51, 51);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      const curso = bloque.asignacion.curso?.nombre ?? '—';
      const amb = bloque.asignacion.ambiente?.codigo ?? '—';
      const texto1 = curso.length > 20 ? curso.substring(0, 20) + '...' : curso;
      const texto2 = amb;
      const texto3 = `${bloque.asignacion.hora_inicio}–${bloque.asignacion.hora_fin}`;
      const textY = cellY + 4;
      doc.text(texto1, cellX + cellWidthBloque / 2, textY, { align: 'center' });
      doc.text(texto2, cellX + cellWidthBloque / 2, textY + 4, { align: 'center' });
      doc.text(texto3, cellX + cellWidthBloque / 2, textY + 8, { align: 'center' });
    });

    return Buffer.from(doc.output('arraybuffer'));
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

  async generarReporteAmbientePDF(
    ambienteId: number,
    periodo: string,
  ): Promise<{ buffer: Buffer; tipo: string }> {
    const ambiente = await this.ambienteRepo.findOne({
      where: { id: ambienteId },
    });
    if (!ambiente) throw new Error("Ambiente no encontrado");

    if (ambiente.tipo === TipoAmbiente.LABORATORIO) {
      const buffer = await this.generarReporteLaboratorioPDF(
        ambienteId,
        periodo,
      );
      return { buffer, tipo: "laboratorio" };
    }

    const buffer = await this.generarReporteAulaPDF(ambienteId, periodo);
    return { buffer, tipo: "aula" };
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
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    const horarios = await this.horarioRepo.find({
      where: { docente_id: docenteId, periodo },
      relations: ["curso", "ambiente"],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Horario");

    sheet.columns = [
      { header: "Día", key: "dia", width: 15 },
      { header: "Hora Inicio", key: "inicio", width: 12 },
      { header: "Hora Fin", key: "fin", width: 12 },
      { header: "Curso", key: "curso", width: 30 },
      { header: "Tipo", key: "tipo", width: 10 },
      { header: "Ambiente", key: "ambiente", width: 15 },
    ];

    const dias = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    horarios.forEach((h) => {
      sheet.addRow({
        dia: dias[h.dia] || h.dia,
        inicio: h.hora_inicio,
        fin: h.hora_fin,
        curso: h.curso?.nombre,
        tipo: h.tipo_clase,
        ambiente: h.ambiente?.codigo,
      });
    });

    return (await workbook.xlsx.writeBuffer()) as any;
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
    const horarios = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("curso.ciclo = :ciclo", { ciclo })
      .andWhere("horario.periodo = :periodo", { periodo })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .getMany();
    
    // Normalizar horas para quitar segundos (convertir "07:00:00" a "07:00")
    horarios.forEach(h => {
      if (h.hora_inicio && h.hora_inicio.length > 5) {
        h.hora_inicio = h.hora_inicio.substring(0, 5);
      }
      if (h.hora_fin && h.hora_fin.length > 5) {
        h.hora_fin = h.hora_fin.substring(0, 5);
      }
    });

    // Obtener configuración del bloque de almuerzo desde la base de datos
    let almuerzoInicio = 12;
    let almuerzoFin = 14;
    try {
      const restricciones = await this.configuracionService.getRestriccionesMap(periodo);
      const bloqueAlmuerzo = restricciones['BLOQUE_ALMUERZO'] as any;
      if (bloqueAlmuerzo && bloqueAlmuerzo.hora_inicio && bloqueAlmuerzo.hora_fin) {
        almuerzoInicio = parseInt(bloqueAlmuerzo.hora_inicio.split(':')[0], 10);
        almuerzoFin = parseInt(bloqueAlmuerzo.hora_fin.split(':')[0], 10);
      }
    } catch (error) {
      this.logger.warn(`No se pudo obtener configuración de almuerzo, usando valores por defecto: ${error}`);
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    // Colores
    const colors = {
      primary: '#1a237e',
      primaryLight: '#3f51b5',
      secondary: '#0d47a1',
      accent: '#ffc107',
      success: '#2e7d32',
      danger: '#c62828',
      info: '#0277bd',
      light: '#f5f5f5',
      dark: '#263238',
      blanco: '#ffffff',
      grisClaro: '#e0e0e0',
      grisMedio: '#bdbdbd',
      grisOscuro: '#757575',
      theory: '#e3f2fd',
      theoryBorder: '#90caf9',
      lab: '#e8f5e9',
      labBorder: '#81c784',
      almuerzo: '#fff3e0',
      almuerzoBorder: '#ffb74d',
    };

    // Paleta de colores pasteles para profesores
    const profesorColors: [number, number, number][] = [
      [255, 205, 210],
      [248, 187, 217],
      [240, 178, 122],
      [249, 231, 159],
      [213, 245, 227],
      [174, 214, 241],
      [215, 189, 226],
      [250, 219, 216],
      [169, 223, 191],
      [249, 235, 234],
      [212, 239, 223],
      [169, 204, 227],
      [232, 218, 239],
      [245, 238, 248],
      [235, 245, 251],
    ];
    const profesorColorMap = new Map<number, [number, number, number]>();
    const profesoresUnicos = Array.from(new Set(horarios.map(h => h.docente?.id).filter(Boolean)));
    profesoresUnicos.forEach((id, idx) => {
      profesorColorMap.set(id, profesorColors[idx % profesorColors.length]);
    });
    const getColorForProfesor = (docenteIdParam: number | undefined): [number, number, number] => {
      if (!docenteIdParam) return profesorColors[0];
      return profesorColorMap.get(docenteIdParam) ?? profesorColors[0];
    };

    // Función para convertir horas a decimal
    const horaToDecimal = (hora: string): number => {
      const [h, m] = hora.split(':').map(Number);
      return h + (m || 0) / 60;
    };

    // Fusionar horarios consecutivos (EXACTAMENTE igual que el frontend)
    const sortedHorarios = [...horarios].sort((a, b) => {
      const diaDiff = (a.dia ?? a.dia_semana) - (b.dia ?? b.dia_semana);
      if (diaDiff !== 0) return diaDiff;
      return horaToDecimal(a.hora_inicio) - horaToDecimal(b.hora_inicio);
    });
    const keyToAsignacionMap = new Map<string, HorarioAsignado>();
    sortedHorarios.forEach(asignacion => {
      const dia = asignacion.dia ?? asignacion.dia_semana;
      const key = `${asignacion.curso?.id}-${asignacion.docente?.id}-${asignacion.ambiente?.id}-${asignacion.grupo?.id}-${dia}-${asignacion.tipo_clase}`;
      const existing = keyToAsignacionMap.get(key);
      if (existing) {
        const existingHoraFin = horaToDecimal(existing.hora_fin);
        const currentHoraInicio = horaToDecimal(asignacion.hora_inicio);
        if (Math.abs(existingHoraFin - currentHoraInicio) < 0.1) {
          existing.hora_fin = asignacion.hora_fin;
        } else {
          keyToAsignacionMap.set(`${key}-${Date.now()}-${Math.random()}`, asignacion);
        }
      } else {
        keyToAsignacionMap.set(key, asignacion);
      }
    });
    const asignaciones = Array.from(keyToAsignacionMap.values());

    // Paleta de colores
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

    const C_ALM_BG = [255, 243, 205] as [number, number, number];
    const C_ALM_FG = [146, 64, 14] as [number, number, number];
    const C_ALM_BD = [251, 191, 36] as [number, number, number];

    const PAGE_W = 297;

    // Cabecera principal
    doc.setFillColor(...C.primaryDark);
    doc.rect(0, 0, PAGE_W, 22, 'F');

    doc.setFillColor(...C.primary);
    doc.rect(0, 18, PAGE_W, 4, 'F');

    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('HORARIO ACADEMICO - CICLO ' + ciclo, 12, 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Universidad Nacional de Trujillo', 12, 15);

    // Info ciclo (derecha)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const infoX = PAGE_W - 12;
    doc.text(`Periodo: ${periodo}`, infoX, 7, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Almuerzo: ${almuerzoInicio}:00 - ${almuerzoFin}:00`, infoX, 13, { align: 'right' });

    let yPos = 27;

    // Obtener profesores y cursos únicos
    const profesoresCursosMap = new Map<string, any>();
    horarios.forEach(a => {
      if (!a.docente || !a.curso) return;
      const key = `${a.docente.id}-${a.curso.id}`;
      if (!profesoresCursosMap.has(key)) {
        profesoresCursosMap.set(key, {
          docente: a.docente,
          curso: a.curso,
          horas: 0
        });
      }
      const entry = profesoresCursosMap.get(key);
      const hInicio = parseInt(a.hora_inicio.split(':')[0], 10);
      const hFin = parseInt(a.hora_fin.split(':')[0], 10);
      entry.horas += (hFin - hInicio);
    });
    const profesoresCursos = Array.from(profesoresCursosMap.values()).sort((a, b) => 
      a.docente.apellidos.localeCompare(b.docente.apellidos)
    );

    // Construir tabla de profesores
    const profesoresTableData = profesoresCursos.map((item, idx) => ({
      n: idx + 1,
      profesor: `${item.docente.apellidos}, ${item.docente.nombres}`,
      asignatura: item.curso.nombre,
      t: item.curso.horas_teoria || '-',
      p: '-',
      l: item.curso.horas_laboratorio || '-',
      th: item.horas,
      docenteId: item.docente.id
    }));

    autoTable(doc, {
      startY: yPos,
      head: [['N°', 'Profesor', 'Asignatura', 'T', 'P', 'L', 'T. Horas']],
      body: profesoresTableData.map(d => [d.n, d.profesor, d.asignatura, d.t, d.p, d.l, d.th]),
      theme: 'grid',
      styles: {
        fontSize: 6,
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
        fontSize: 7,
        halign: 'center',
        cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        3: { halign: 'center', cellWidth: 12 },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', cellWidth: 12 },
        6: { halign: 'center', cellWidth: 16, fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const rowIndex = data.row.index;
        const item = profesoresTableData[rowIndex];
        if (item?.docenteId) {
          data.cell.styles.fillColor = getColorForProfesor(item.docenteId);
        }
      },
      margin: { left: 8, right: 8 }
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const diasNum = [1, 2, 3, 4, 5, 6];
    const horas = Array.from({ length: 18 }, (_, i) => i + 7); // De 7 a 24

    // Función para convertir horas a decimal (renombrada para evitar conflictos)
    const horaToDecimal2 = (hora: string): number => {
      const [h, m] = hora.split(':').map(Number);
      return h + (m || 0) / 60;
    };

    // Generar bloques para el grid
    interface BloquePDF {
      dia: number;
      horaInicio: number;
      horaFin: number;
      asignacion: HorarioAsignado;
      left: number;
      width: number;
    }
    const bloques: BloquePDF[] = [];
    const bloquesPorDiaYHora: Map<string, BloquePDF[]> = new Map();
    asignaciones.forEach(asignacion => {
      const dia = asignacion.dia ?? asignacion.dia_semana;
      const horaInicio = horaToDecimal2(asignacion.hora_inicio);
      const horaFin = horaToDecimal2(asignacion.hora_fin);
      const bloque = {
        dia,
        horaInicio,
        horaFin,
        asignacion,
        left: 0,
        width: 0,
      };
      for (let h = Math.floor(horaInicio); h < horaFin; h++) {
        const key = `${dia}-${h}`;
        if (!bloquesPorDiaYHora.has(key)) {
          bloquesPorDiaYHora.set(key, []);
        }
        if (h === Math.floor(horaInicio)) {
          bloquesPorDiaYHora.get(key)!.push(bloque);
        }
      }
    });
    bloquesPorDiaYHora.forEach((bloquesEnCelda, key) => {
      const anchoPorBloque = 100 / bloquesEnCelda.length;
      bloquesEnCelda.forEach((bloque, index) => {
        bloque.left = index * anchoPorBloque;
        bloque.width = anchoPorBloque;
        bloques.push(bloque);
      });
    });

    const startY = yPos;
    const cellHeight = 7.5;
    const cellWidth = (PAGE_W - 16 - 20) / 7;
    const horaColWidth = 20;
    const gridHeight = horas.length * cellHeight;
    const gridWidth = PAGE_W - 16;

    // 1. Dibujar encabezado
    doc.setFillColor(79, 70, 229);
    doc.rect(8, startY, gridWidth, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('HORA', 10, startY + 7);
    dias.forEach((dia, idx) => {
      doc.text(dia, 8 + horaColWidth + idx * cellWidth + cellWidth / 2, startY + 7, { align: 'center' });
    });
    doc.text('HORA', 8 + gridWidth - 10, startY + 7, { align: 'right' });

    // 2. Dibujar fondo del grid y celdas de hora
    let currentY = startY + 10;
    horas.forEach((hora) => {
      // Columna hora izquierda
      doc.setFillColor(241, 245, 249);
      doc.rect(8, currentY, horaColWidth, cellHeight, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`${String(hora).padStart(2, '0')}:00`, 10, currentY + cellHeight / 2 + 2);
      
      // Columna hora derecha
      doc.setFillColor(241, 245, 249);
      doc.rect(8 + gridWidth - horaColWidth, currentY, horaColWidth, cellHeight, 'F');
      doc.setTextColor(51, 65, 85);
      doc.text(`${String(hora).padStart(2, '0')}:00`, 8 + gridWidth - 10, currentY + cellHeight / 2 + 2, { align: 'right' });
      
      // Fondo solo para el almuerzo (no para las otras celdas, para que los bloques se vean completos)
      diasNum.forEach((dia, idx) => {
        const esAlm = hora >= almuerzoInicio && hora < almuerzoFin;
        const cellX = 8 + horaColWidth + idx * cellWidth;
        if (esAlm) {
          doc.setFillColor(255, 243, 205);
          doc.rect(cellX, currentY, cellWidth, cellHeight, 'F');
          doc.setTextColor(146, 64, 14);
          doc.setFontSize(8);
          doc.text('Almuerzo', cellX + cellWidth / 2, currentY + cellHeight / 2 + 2, { align: 'center' });
        }
      });
      currentY += cellHeight;
    });

    // 3. Dibujar bordes del grid (ANTES de los bloques)
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    for (let i = 0; i <= horas.length; i++) {
      const y = startY + 10 + i * cellHeight;
      doc.line(8, y, 8 + gridWidth, y);
    }
    doc.line(8, startY + 10, 8, startY + 10 + gridHeight);
    doc.line(8 + horaColWidth, startY + 10, 8 + horaColWidth, startY + 10 + gridHeight);
    diasNum.forEach((_, idx) => {
      const x = 8 + horaColWidth + (idx + 1) * cellWidth;
      doc.line(x, startY + 10, x, startY + 10 + gridHeight);
    });
    doc.line(8 + gridWidth - horaColWidth, startY + 10, 8 + gridWidth - horaColWidth, startY + 10 + gridHeight);
    doc.line(8 + gridWidth, startY + 10, 8 + gridWidth, startY + 10 + gridHeight);

    // 4. Dibujar bloques de horario (DESPUÉS de los bordes, para taparlos)
    bloques.forEach(bloque => {
      const diaIdx = bloque.dia - 1;
      const cellX = 8 + horaColWidth + diaIdx * cellWidth + (bloque.left / 100) * cellWidth;
      const cellWidthBloque = (bloque.width / 100) * cellWidth;
      const startRowIdx = horas.indexOf(Math.floor(bloque.horaInicio));
      const endRowIdx = horas.indexOf(Math.floor(bloque.horaFin));
      if (startRowIdx === -1 || endRowIdx === -1) return;
      const cellY = startY + 10 + startRowIdx * cellHeight;
      const cellHeightBloque = (endRowIdx - startRowIdx) * cellHeight;

      // Fondo del bloque (TAPA LOS BORDES)
      const color = getColorForProfesor(bloque.asignacion.docente?.id);
      doc.setFillColor(...color);
      doc.rect(cellX, cellY, cellWidthBloque, cellHeightBloque, 'F');
      
      // Dibujar un borde fino alrededor del bloque para que se vea bien
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      doc.rect(cellX, cellY, cellWidthBloque, cellHeightBloque, 'S');

      // Texto del bloque
      doc.setTextColor(51, 51, 51);
      doc.setFontSize(4);
      doc.setFont('helvetica', 'bold');
      const profesor = bloque.asignacion.docente?.apellidos ?? '—';
      const curso = bloque.asignacion.curso?.nombre ?? '—';
      const amb = bloque.asignacion.ambiente?.codigo ?? '—';
      const texto1 = profesor.length > 10 ? profesor.substring(0, 10) + '...' : profesor;
      const texto2 = curso.length > 12 ? curso.substring(0, 12) + '...' : curso;
      const texto3 = amb;
      const textY = cellY + 2;
      doc.text(texto1, cellX + cellWidthBloque / 2, textY, { align: 'center' });
      doc.text(texto2, cellX + cellWidthBloque / 2, textY + 2, { align: 'center' });
      doc.text(texto3, cellX + cellWidthBloque / 2, textY + 4, { align: 'center' });
    });

    return Buffer.from(doc.output('arraybuffer'));
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
