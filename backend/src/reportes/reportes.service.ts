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

    const dias = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    let totalHoras = 0;

    const filas = horarios
      .map((h) => {
        const duracion = this.calcularDuracionHoras(h.hora_inicio, h.hora_fin);
        totalHoras += duracion;
        return `
        <tr>
          <td>${dias[h.dia] || h.dia}</td>
          <td>${h.hora_inicio.substring(0, 5)}</td>
          <td>${h.hora_fin.substring(0, 5)}</td>
          <td>${h.curso?.nombre || "-"}</td>
          <td>${h.tipo_clase === TipoClase.TEORIA ? "T" : "L"}</td>
          <td>${h.ambiente?.codigo || "-"}</td>
        </tr>
      `;
      })
      .join("");

    const antiguedad = this.calcularAntiguedad(docente.fecha_ingreso);

    const html = this.htmlWrapper(`
      <div class="content-header">
        <h1>REPORTE DE HORARIO POR DOCENTE</h1>
        <div class="meta-info">
          <p><strong>Docente:</strong> ${docente.apellidos}, ${docente.nombres}</p>
          <p><strong>Categoría:</strong> ${docente.categoria}</p>
          <p><strong>Modalidad:</strong> ${docente.tipo_contrato}</p>
          <p><strong>Antigüedad:</strong> ${antiguedad} años</p>
          <p><strong>Período:</strong> ${periodo}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Día</th>
            <th>Hora Inicio</th>
            <th>Hora Fin</th>
            <th>Curso</th>
            <th>Tipo</th>
            <th>Ambiente</th>
          </tr>
        </thead>
        <tbody>
          ${filas}
        </tbody>
      </table>
      <div class="summary">
        <p><strong>Total de horas semanales asignadas:</strong> ${totalHoras.toFixed(1)} hrs</p>
      </div>
      <div class="signature-section">
        <div class="signature-box">
          <div class="line"></div>
          <p>Firma del Director de Escuela</p>
        </div>
      </div>
    `);

    return this.generarPDF(html);
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
