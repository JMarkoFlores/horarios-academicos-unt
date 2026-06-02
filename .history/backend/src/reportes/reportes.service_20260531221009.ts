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

    // Generar bloques para el grid (Usando algoritmo de carriles mejorado)
    interface BloquePDF {
      dia: number;
      horaInicio: number;
      horaFin: number;
      asignacion: HorarioAsignado;
      left: number;
      width: number;
      label?: string;
    }
    const bloques: BloquePDF[] = [];
    
    // Agrupar por día para asignar carriles
    const asignacionesPorDia: Map<number, HorarioAsignado[]> = new Map();
    asignaciones.forEach(a => {
      const dia = a.dia ?? a.dia_semana;
      if (!asignacionesPorDia.has(dia)) asignacionesPorDia.set(dia, []);
      asignacionesPorDia.get(dia)!.push(a);
    });

    asignacionesPorDia.forEach((asigs, dia) => {
      // Ordenar por hora de inicio
      const sortedAsigs = [...asigs].sort((a, b) => {
        const hIniA = horaToDecimal(a.hora_inicio);
        const hIniB = horaToDecimal(b.hora_inicio);
        if (hIniA !== hIniB) return hIniA - hIniB;
        return (a.id ?? 0) - (b.id ?? 0);
      });

      const carriles: HorarioAsignado[][] = [];
      sortedAsigs.forEach(asig => {
        const hIni = horaToDecimal(asig.hora_inicio);
        let carrilIndex = -1;
        
        // 1. Prioridad: Mismo curso consecutivo
        for (let i = 0; i < carriles.length; i++) {
          const ultimo = carriles[i][carriles[i].length - 1];
          if (Math.abs(horaToDecimal(ultimo.hora_fin) - hIni) < 0.01 && ultimo.curso?.id === asig.curso?.id) {
            carrilIndex = i;
            break;
          }
        }
        
        // 2. Segunda opción: Cualquier carril libre
        if (carrilIndex === -1) {
          for (let i = 0; i < carriles.length; i++) {
            const ultimo = carriles[i][carriles[i].length - 1];
            if (horaToDecimal(ultimo.hora_fin) <= hIni) {
              carrilIndex = i;
              break;
            }
          }
        }

        if (carrilIndex === -1) carriles.push([asig]);
        else carriles[carrilIndex].push(asig);
      });

      const numCarriles = carriles.length;
      const anchoPorBloque = 100 / (numCarriles || 1);

      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        const fusionados: any[] = [];
        bloquesEnCarril.forEach(asig => {
          const hIni = horaToDecimal(asig.hora_inicio);
          const hFin = horaToDecimal(asig.hora_fin);
          const dur = hFin - hIni;
          const labelPart = asig.tipo_clase === TipoClase.TEORIA ? `${dur}T` : 
                           asig.tipo_clase === TipoClase.PRACTICA ? `${dur}P` : 
                           `${dur}L-G${asig.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ''}`;

          if (fusionados.length > 0) {
            const ultimo = fusionados[fusionados.length - 1];
            const esTP = (ultimo.asignacion.tipo_clase === TipoClase.TEORIA && asig.tipo_clase === TipoClase.PRACTICA) ||
                         (ultimo.asignacion.tipo_clase === TipoClase.PRACTICA && asig.tipo_clase === TipoClase.TEORIA);
            
            const mismoAmbiente = ultimo.asignacion.ambiente?.id === asig.ambiente?.id;

            if (esTP && mismoAmbiente && ultimo.asignacion.curso?.id === asig.curso?.id && Math.abs(ultimo.horaFin - hIni) < 0.01) {
              ultimo.horaFin = hFin;
              ultimo.label = ultimo.label.split(' (')[0] + ' (' + ultimo.label.match(/\((.*)\)/)?.[1] + '+' + labelPart + ')';
              return;
            }
          }

          fusionados.push({
            dia,
            horaInicio: hIni,
            horaFin: hFin,
            asignacion: asig,
            left: carrilIdx * anchoPorBloque,
            width: anchoPorBloque,
            label: (asig.curso?.nombre || '') + ` (${labelPart})`
          });
        });
        bloques.push(...fusionados);
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
      
      const curso = bloque.label || (bloque.asignacion.curso?.nombre ?? '—');
      const amb = bloque.asignacion.ambiente?.nombre || bloque.asignacion.ambiente?.codigo || '—';
      const texto1 = curso.length > 35 ? curso.substring(0, 35) + '...' : curso;
      const texto2 = amb.length > 25 ? amb.substring(0, 25) + '...' : amb;
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
      .leftJoinAndSelect("docente.departamento", "departamento")
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
          horas: 0,
          hTeoria: 0,
          hPractica: 0,
          hLaboratorio: 0
        });
      }
      const entry = profesoresCursosMap.get(key);
      const hInicio = parseInt(a.hora_inicio.split(':')[0], 10);
      const hFin = parseInt(a.hora_fin.split(':')[0], 10);
      const duration = (hFin - hInicio);
      entry.horas += duration;
      
      if (a.tipo_clase === TipoClase.TEORIA) entry.hTeoria += duration;
      else if (a.tipo_clase === TipoClase.PRACTICA) entry.hPractica += duration;
      else if (a.tipo_clase === TipoClase.LABORATORIO) entry.hLaboratorio += duration;
    });

    const hierarchy: { [key: string]: number } = {
      'PRINCIPAL': 1,
      'ASOCIADO': 2,
      'AUXILIAR': 3,
      'SIN_CATEGORIA': 4
    };

    const profesoresCursos = Array.from(profesoresCursosMap.values()).sort((a, b) => {
      const docA = a.docente;
      const docB = b.docente;

      // 1. Priorizar Departamento de Ingeniería de Sistemas
      const isSistemasA = docA?.departamento?.nombre === 'Ing. de Sistemas' ? 1 : 0;
      const isSistemasB = docB?.departamento?.nombre === 'Ing. de Sistemas' ? 1 : 0;
      if (isSistemasA !== isSistemasB) return isSistemasB - isSistemasA;

      // 2. Jerarquía de mayor a menor (Principal > Asociado > Auxiliar)
      const rankA = hierarchy[docA?.categoria] || 99;
      const rankB = hierarchy[docB?.categoria] || 99;
      if (rankA !== rankB) return rankA - rankB;

      // 3. Alfabético por apellidos
      const nameA = docA?.apellidos || '';
      const nameB = docB?.apellidos || '';
      return nameA.localeCompare(nameB);
    });

    // Construir tabla de profesores
    const profesoresTableData = profesoresCursos.map((item, idx) => ({
      n: idx + 1,
      profesor: `${item.docente.apellidos}, ${item.docente.nombres}`,
      departamento: item.docente.departamento?.nombre || '—',
      asignatura: item.curso.nombre,
      t: item.hTeoria || '-',
      p: item.hPractica || '-',
      l: item.hLaboratorio || '-',
      th: item.horas,
      docenteId: item.docente.id
    }));

    const profesoresUnicosDoc = Array.from(new Set(horarios.map(h => h.docente?.id).filter(Boolean)));
    const profesorColorsDoc: [number, number, number][] = [
      [255, 235, 238], [252, 228, 236], [243, 229, 245], [237, 231, 246], [232, 234, 246],
      [227, 242, 253], [224, 247, 250], [224, 242, 241], [232, 245, 233], [241, 248, 233]
    ];
    const profesorColorMapDoc = new Map<number, [number, number, number]>();
    profesoresUnicosDoc.forEach((id, idx) => profesorColorMapDoc.set(id as number, profesorColorsDoc[idx % profesorColorsDoc.length]));

    autoTable(doc, {
      startY: yPos,
      head: [['N°', 'Profesor', 'Departamento', 'Asignatura', 'T', 'P', 'L', 'T. Horas']],
      body: profesoresTableData.map(d => [d.n, d.profesor, d.departamento, d.asignatura, d.t, d.p, d.l, d.th]),
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
        const item = profesoresTableData[rowIndex];
        if (item?.docenteId) {
          const rgb = profesorColorMapDoc.get(item.docenteId);
          if (rgb) data.cell.styles.fillColor = rgb;
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

    // Generar bloques para el grid (Usando algoritmo de carriles mejorado)
    interface BloquePDF {
      dia: number;
      horaInicio: number;
      horaFin: number;
      asignacion: HorarioAsignado;
      left: number;
      width: number;
      label?: string;
    }
    const bloques: BloquePDF[] = [];
    
    // Agrupar por día para asignar carriles
    const asignacionesPorDia: Map<number, HorarioAsignado[]> = new Map();
    asignaciones.forEach(a => {
      const dia = a.dia ?? a.dia_semana;
      if (!asignacionesPorDia.has(dia)) asignacionesPorDia.set(dia, []);
      asignacionesPorDia.get(dia)!.push(a);
    });

    asignacionesPorDia.forEach((asigs, dia) => {
      // Ordenar por hora de inicio
      const sortedAsigs = [...asigs].sort((a, b) => {
        const hIniA = horaToDecimal2(a.hora_inicio);
        const hIniB = horaToDecimal2(b.hora_inicio);
        if (hIniA !== hIniB) return hIniA - hIniB;
        return (a.id ?? 0) - (b.id ?? 0);
      });

      const carriles: HorarioAsignado[][] = [];
      sortedAsigs.forEach(asig => {
        const hIni = horaToDecimal2(asig.hora_inicio);
        let carrilIndex = -1;
        
        // 1. Prioridad: Mismo curso consecutivo
        for (let i = 0; i < carriles.length; i++) {
          const ultimo = carriles[i][carriles[i].length - 1];
          if (Math.abs(horaToDecimal2(ultimo.hora_fin) - hIni) < 0.01 && ultimo.curso?.id === asig.curso?.id) {
            carrilIndex = i;
            break;
          }
        }
        
        // 2. Segunda opción: Cualquier carril libre
        if (carrilIndex === -1) {
          for (let i = 0; i < carriles.length; i++) {
            const ultimo = carriles[i][carriles[i].length - 1];
            if (horaToDecimal2(ultimo.hora_fin) <= hIni) {
              carrilIndex = i;
              break;
            }
          }
        }

        if (carrilIndex === -1) carriles.push([asig]);
        else carriles[carrilIndex].push(asig);
      });

      const numCarriles = carriles.length;
      const anchoPorBloque = 100 / (numCarriles || 1);

      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        const fusionados: any[] = [];
        bloquesEnCarril.forEach(asig => {
          const hIni = horaToDecimal2(asig.hora_inicio);
          const hFin = horaToDecimal2(asig.hora_fin);
          const dur = hFin - hIni;
          const labelPart = asig.tipo_clase === TipoClase.TEORIA ? `${dur}T` : 
                           asig.tipo_clase === TipoClase.PRACTICA ? `${dur}P` : 
                           `${dur}L-G${asig.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ''}`;

          if (fusionados.length > 0) {
            const ultimo = fusionados[fusionados.length - 1];
            const esTP = (ultimo.asignacion.tipo_clase === TipoClase.TEORIA && asig.tipo_clase === TipoClase.PRACTICA) ||
                         (ultimo.asignacion.tipo_clase === TipoClase.PRACTICA && asig.tipo_clase === TipoClase.TEORIA);
            
            const mismoAmbiente = ultimo.asignacion.ambiente?.id === asig.ambiente?.id;

            if (esTP && mismoAmbiente && ultimo.asignacion.curso?.id === asig.curso?.id && Math.abs(ultimo.horaFin - hIni) < 0.01) {
              ultimo.horaFin = hFin;
              ultimo.label = ultimo.label.split(' (')[0] + ' (' + ultimo.label.match(/\((.*)\)/)?.[1] + '+' + labelPart + ')';
              return;
            }
          }

          fusionados.push({
            dia,
            horaInicio: hIni,
            horaFin: hFin,
            asignacion: asig,
            left: carrilIdx * anchoPorBloque,
            width: anchoPorBloque,
            label: (asig.curso?.nombre || '') + ` (${labelPart})`
          });
        });
        bloques.push(...fusionados);
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
      const curso = bloque.label || (bloque.asignacion.curso?.nombre ?? '—');
      const amb = bloque.asignacion.ambiente?.nombre || bloque.asignacion.ambiente?.codigo || '—';
      const texto1 = profesor.length > 10 ? profesor.substring(0, 10) + '...' : profesor;
      const texto2 = curso.length > 15 ? curso.substring(0, 15) + '...' : curso;
      const texto3 = amb.length > 15 ? amb.substring(0, 15) + '...' : amb;
      const textY = cellY + 2;
      doc.text(texto1, cellX + cellWidthBloque / 2, textY, { align: 'center' });
      doc.text(texto2, cellX + cellWidthBloque / 2, textY + 2.5, { align: 'center' });
      doc.text(texto3, cellX + cellWidthBloque / 2, textY + 5, { align: 'center' });
    });

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
          hLaboratorio: 0
        });
      }
      const entry = profesoresCursosMap.get(key);
      const hInicio = parseInt(a.hora_inicio.split(':')[0], 10);
      const hFin = parseInt(a.hora_fin.split(':')[0], 10);
      const duration = (hFin - hInicio);
      entry.horas += duration;
      
      if (a.tipo_clase === TipoClase.TEORIA) entry.hTeoria += duration;
      else if (a.tipo_clase === TipoClase.PRACTICA) entry.hPractica += duration;
      else if (a.tipo_clase === TipoClase.LABORATORIO) entry.hLaboratorio += duration;
    });
    
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

    const profesoresUnicosCiclo = Array.from(new Set(horarios.map(h => h.docente?.id).filter(Boolean)));
    const profesorColorsCiclo: [number, number, number][] = [
      [255, 235, 238], [252, 228, 236], [243, 229, 245], [237, 231, 246], [232, 234, 246],
      [227, 242, 253], [224, 247, 250], [224, 242, 241], [232, 245, 233], [241, 248, 233]
    ];
    const profesorColorMapCiclo = new Map<number, [number, number, number]>();
    profesoresUnicosCiclo.forEach((id, idx) => profesorColorMapCiclo.set(id as number, profesorColorsCiclo[idx % profesorColorsCiclo.length]));

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
        if (item?.docente?.id) {
          const rgb = profesorColorMapCiclo.get(item.docente.id);
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
        const hIniA = parseInt(a.hora_inicio.split(':')[0], 10);
        const hIniB = parseInt(b.hora_inicio.split(':')[0], 10);
        if (hIniA !== hIniB) return hIniA - hIniB;
        return a.id - b.id;
      });

      // Lane assignment algorithm (Interval Scheduling)
      const carriles: any[][] = [];
      
      bloquesOrdenados.forEach(bloque => {
        const hIni = parseInt(bloque.hora_inicio.split(':')[0], 10);
        
        // Buscar primer carril libre
        let carrilIndex = -1;

        // 1. Prioridad: Mismo curso consecutivo
        for (let i = 0; i < carriles.length; i++) {
          const ultimoBloque = carriles[i][carriles[i].length - 1];
          const hFinUltimo = parseInt(ultimoBloque.hora_fin.split(':')[0], 10);
          if (hFinUltimo === hIni && ultimoBloque.curso?.id === bloque.curso?.id) {
            carrilIndex = i;
            break;
          }
        }

        // 2. Segunda opción: Cualquier carril libre
        if (carrilIndex === -1) {
          for (let i = 0; i < carriles.length; i++) {
            const ultimoBloque = carriles[i][carriles[i].length - 1];
            const hFinUltimo = parseInt(ultimoBloque.hora_fin.split(':')[0], 10);
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
      const widthPorBloque = (cellWidth - 1) / (numCarriles || 1);

      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        const fusionados: any[] = [];
        bloquesEnCarril.forEach(h => {
          const hIni = parseInt(h.hora_inicio.split(':')[0], 10);
          const hFin = parseInt(h.hora_fin.split(':')[0], 10);
          const dur = hFin - hIni;
          const labelPart = h.tipo_clase === TipoClase.TEORIA ? `${dur}T` : 
                           h.tipo_clase === TipoClase.PRACTICA ? `${dur}P` : 
                           `${dur}L-G${h.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ''}`;

          if (fusionados.length > 0) {
            const ultimo = fusionados[fusionados.length - 1];
            const esTP = (ultimo.asignacion.tipo_clase === TipoClase.TEORIA && h.tipo_clase === TipoClase.PRACTICA) ||
                         (ultimo.asignacion.tipo_clase === TipoClase.PRACTICA && h.tipo_clase === TipoClase.TEORIA);
            
            const mismoAmbiente = ultimo.asignacion.ambiente?.id === h.ambiente?.id;

            if (esTP && mismoAmbiente && ultimo.asignacion.curso?.id === h.curso?.id && ultimo.horaFin === hIni) {
              ultimo.horaFin = hFin;
              ultimo.label = ultimo.label.split(' (')[0] + ' (' + ultimo.label.match(/\((.*)\)/)?.[1] + '+' + labelPart + ')';
              return;
            }
          }

          fusionados.push({
            dia: dia,
            horaInicio: hIni,
            horaFin: hFin,
            asignacion: h,
            label: (h.curso?.nombre || '') + ` (${labelPart})`
          });
        });

        fusionados.forEach(f => {
          const rowStart = horas.indexOf(f.horaInicio);
          const rowEnd = horas.indexOf(f.horaFin);
          
          if (rowStart !== -1 && rowEnd !== -1) {
            const offsetWidth = carrilIdx * widthPorBloque;
            const blockX = 10 + horaColWidth + diaIdx * cellWidth + 0.5 + offsetWidth;
            const blockY = yPos + 8 + rowStart * cellHeight + 0.5;
            const blockW = widthPorBloque - 0.5;
            const blockH = (rowEnd - rowStart) * cellHeight - 1;

            const color = profesorColorMapCiclo.get(f.asignacion.docente?.id) || [255, 255, 255];
            doc.setFillColor(...color as [number, number, number]);
            doc.rect(blockX, blockY, blockW, blockH, 'F');
            
            doc.setDrawColor(...C.primary);
            doc.setLineWidth(0.1);
            doc.rect(blockX, blockY, blockW, blockH, 'S');

            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            
            let fontSize = 5.5;
            if (numCarriles > 1) fontSize = 4;
            if (numCarriles > 2) fontSize = 3;
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

  async generarReporteTodosCiclosExcel(periodo: string): Promise<Buffer> {
    const ciclos = [1, 3, 5, 7, 9];
    const workbook = new ExcelJS.Workbook();

    for (const ciclo of ciclos) {
      const sheet = workbook.addWorksheet(`Ciclo ${ciclo}`);
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

      sheet.columns = [
        { header: "Día", key: "dia", width: 15 },
        { header: "Inicio", key: "inicio", width: 12 },
        { header: "Fin", key: "fin", width: 12 },
        { header: "Asignatura", key: "curso", width: 35 },
        { header: "Docente", key: "docente", width: 35 },
        { header: "Ambiente", key: "ambiente", width: 20 },
        { header: "Tipo", key: "tipo", width: 15 },
      ];

      const diasMap = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      horarios.forEach(h => {
        sheet.addRow({
          dia: diasMap[h.dia] || h.dia,
          inicio: h.hora_inicio,
          fin: h.hora_fin,
          curso: h.curso?.nombre,
          docente: `${h.docente?.apellidos}, ${h.docente?.nombres}`,
          ambiente: h.ambiente?.codigo,
          tipo: h.tipo_clase,
        });
      });

      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    }

    return (await workbook.xlsx.writeBuffer()) as any;
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
