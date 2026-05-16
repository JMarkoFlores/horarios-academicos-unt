import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";

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
      const buffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
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
    const horarios = await this.horarioRepo
      .createQueryBuilder('horario')
      .leftJoinAndSelect('horario.docente', 'docente')
      .leftJoinAndSelect('horario.curso', 'curso')
      .leftJoinAndSelect('horario.ambiente', 'ambiente')
      .leftJoinAndSelect('horario.grupo', 'grupo')
      .where('docente.id = :docenteId', { docenteId })
      .andWhere('horario.periodo_academico = :periodo', { periodo })
      .orderBy('horario.dia_semana', 'ASC')
      .addOrderBy('horario.hora_inicio', 'ASC')
      .cache(`horarios_periodo_${periodo}_docente_${docenteId}_reporte_pdf`, 60000)
      .getMany();

    const dias = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const totalHoras = horarios.reduce((acc, h) => {
      const ini = h.hora_inicio.split(":").map(Number);
      const fin = h.hora_fin.split(":").map(Number);
      return acc + (fin[0] * 60 + fin[1] - ini[0] * 60 - ini[1]) / 60;
    }, 0);

    const filas = horarios
      .map(
        (h) => `
      <tr>
        <td>${dias[h.dia_semana] ?? h.dia_semana}</td>
        <td>${h.hora_inicio}</td>
        <td>${h.hora_fin}</td>
        <td>${h.curso?.nombre ?? "-"}</td>
        <td>${h.tipo_clase === "TEORIA" ? "T" : "L"}</td>
        <td>${h.ambiente?.codigo ?? "-"} — ${h.ambiente?.nombre ?? ""}</td>
        <td>${h.grupo?.codigo ?? "-"}</td>
      </tr>`,
      )
      .join("");

    const html = this.htmlWrapper(`
      <div class="header">
        <div class="title">Horario del Docente — Período ${periodo}</div>
        <div>${docente?.apellidos ?? ""}, ${docente?.nombres ?? ""} | ${docente?.categoria ?? ""} | ${docente?.tipo_contrato ?? ""}</div>
      </div>
      <table>
        <thead><tr><th>Día</th><th>Inicio</th><th>Fin</th><th>Curso</th><th>Tipo</th><th>Ambiente</th><th>Grupo</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <div class="footer">Total horas semanales: <strong>${totalHoras.toFixed(1)}</strong></div>
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
    const horarios = await this.horarioRepo
      .createQueryBuilder('horario')
      .leftJoinAndSelect('horario.ambiente', 'ambiente')
      .leftJoinAndSelect('horario.docente', 'docente')
      .leftJoinAndSelect('horario.curso', 'curso')
      .leftJoinAndSelect('horario.grupo', 'grupo')
      .where('ambiente.id = :ambienteId', { ambienteId })
      .andWhere('horario.periodo_academico = :periodo', { periodo })
      .orderBy('horario.dia_semana', 'ASC')
      .addOrderBy('horario.hora_inicio', 'ASC')
      .cache(`horarios_periodo_${periodo}_ambiente_${ambienteId}_reporte_pdf`, 60000)
      .getMany();

    const dias = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const filas = horarios
      .map(
        (h) => `
      <tr>
        <td>${dias[h.dia_semana] ?? h.dia_semana}</td>
        <td>${h.hora_inicio} — ${h.hora_fin}</td>
        <td>${h.curso?.nombre ?? "-"}</td>
        <td>${h.docente?.apellidos ?? "-"}, ${h.docente?.nombres ?? ""}</td>
        <td>${h.grupo?.codigo ?? "-"}</td>
        <td>${h.tipo_clase}</td>
      </tr>`,
      )
      .join("");

    const html = this.htmlWrapper(`
      <div class="header">
        <div class="title">Horario del Ambiente — Período ${periodo}</div>
        <div>${ambiente?.codigo ?? ""} — ${ambiente?.nombre ?? ""} | Cap: ${ambiente?.capacidad ?? ""} | ${ambiente?.pabellon ?? ""}</div>
      </div>
      <table>
        <thead><tr><th>Día</th><th>Hora</th><th>Curso</th><th>Docente</th><th>Grupo</th><th>Tipo</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <div class="footer">Total asignaciones: <strong>${horarios.length}</strong></div>
    `);

    return this.generarPDF(html);
  }

  async generarReporteOperacionalPDF(periodo: string): Promise<Buffer> {
    const horarios = await this.horarioRepo
      .createQueryBuilder('horario')
      .leftJoinAndSelect('horario.docente', 'docente')
      .leftJoinAndSelect('horario.curso', 'curso')
      .leftJoinAndSelect('horario.ambiente', 'ambiente')
      .leftJoinAndSelect('horario.grupo', 'grupo')
      .where('horario.periodo_academico = :periodo', { periodo })
      .orderBy('horario.dia_semana', 'ASC')
      .addOrderBy('horario.hora_inicio', 'ASC')
      .cache(`horarios_periodo_${periodo}_reporte_operacional`, 60000)
      .getMany();

    const conflictos = await this.conflictoRepo
      .createQueryBuilder('conflicto')
      .leftJoinAndSelect('conflicto.docente', 'docente')
      .leftJoinAndSelect('conflicto.ambiente', 'ambiente')
      .where('conflicto.periodo_academico = :periodo', { periodo })
      .andWhere('conflicto.resuelto = :resuelto', { resuelto: false })
      .cache(`conflictos_periodo_${periodo}_reporte_operacional`, 60000)
      .getMany();

    const docentesMap = new Map<number, { nombre: string; horas: number }>();
    for (const h of horarios) {
      const id = h.docente?.id;
      if (!id) continue;
      if (!docentesMap.has(id)) {
        docentesMap.set(id, {
          nombre: `${h.docente.apellidos}, ${h.docente.nombres}`,
          horas: 0,
        });
      }
      const dur = this.duracionHoras(h.hora_inicio, h.hora_fin);
      docentesMap.get(id)!.horas += dur;
    }

    const filasDocentes = [...docentesMap.entries()]
      .map(
        ([, v]) => `
      <tr><td>${v.nombre}</td><td>${v.horas.toFixed(1)}</td></tr>`,
      )
      .join("");

    const filasConflictos = conflictos
      .map(
        (c) => `
      <tr>
        <td>${c.tipo_conflicto}</td>
        <td>${c.descripcion}</td>
        <td>${c.docente?.apellidos ?? "-"}</td>
        <td>${c.resuelto ? "Sí" : "No"}</td>
      </tr>`,
      )
      .join("");

    const html = this.htmlWrapper(`
      <div class="header">
        <div class="title">Reporte Operacional — Período ${periodo}</div>
      </div>
      <h2 style="color:#003366">1. Resumen por Docente</h2>
      <table>
        <thead><tr><th>Docente</th><th>Horas Asignadas</th></tr></thead>
        <tbody>${filasDocentes}</tbody>
      </table>
      <h2 style="color:#003366;margin-top:20px">2. Conflictos Sin Resolver (${conflictos.length})</h2>
      <table>
        <thead><tr><th>Tipo</th><th>Descripción</th><th>Docente</th><th>Resuelto</th></tr></thead>
        <tbody>${filasConflictos}</tbody>
      </table>
    `);

    return this.generarPDF(html);
  }

  async generarReporteGestionPDF(periodo: string): Promise<Buffer> {
    const totalDocentes = await this.docenteRepo.count({
      where: { activo: true },
    });
    const horarios = await this.horarioRepo
      .createQueryBuilder('horario')
      .leftJoinAndSelect('horario.docente', 'docente')
      .leftJoinAndSelect('horario.ambiente', 'ambiente')
      .where('horario.periodo_academico = :periodo', { periodo })
      .cache(`horarios_periodo_${periodo}_reporte_gestion`, 60000)
      .getMany();

    const docentesConHorario = new Set(
      horarios.map((h) => h.docente?.id).filter(Boolean),
    ).size;
    const totalAulas = await this.ambienteRepo.count({
      where: { tipo: TipoAmbiente.AULA, activo: true },
    });
    const totalLabs = await this.ambienteRepo.count({
      where: { tipo: TipoAmbiente.LABORATORIO, activo: true },
    });
    const aulasOcupadas = new Set(
      horarios
        .filter((h) => h.ambiente?.tipo === TipoAmbiente.AULA)
        .map((h) => h.ambiente?.id),
    ).size;
    const labsOcupados = new Set(
      horarios
        .filter((h) => h.ambiente?.tipo === TipoAmbiente.LABORATORIO)
        .map((h) => h.ambiente?.id),
    ).size;

    const horasMap = new Map<number, number>();
    for (const h of horarios) {
      if (!h.docente?.id) continue;
      horasMap.set(
        h.docente.id,
        (horasMap.get(h.docente.id) ?? 0) +
          this.duracionHoras(h.hora_inicio, h.hora_fin),
      );
    }

    const horasArr = [...horasMap.values()];
    const horasProm =
      horasArr.length > 0
        ? horasArr.reduce((a, b) => a + b, 0) / horasArr.length
        : 0;
    const top5 = [...horasMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const filasTop5 = top5
      .map(([id, horas]) => {
        const h = horarios.find((x) => x.docente?.id === id);
        return `<tr><td>${h?.docente?.apellidos ?? id}, ${h?.docente?.nombres ?? ""}</td><td>${horas.toFixed(1)}</td></tr>`;
      })
      .join("");

    const html = this.htmlWrapper(`
      <div class="header">
        <div class="title">Reporte de Gestión — Período ${periodo}</div>
      </div>
      <h2 style="color:#003366">1. Indicadores Clave</h2>
      <table>
        <tbody>
          <tr><td><b>Total Docentes</b></td><td>${totalDocentes}</td></tr>
          <tr><td><b>Docentes con Horario</b></td><td>${docentesConHorario} (${totalDocentes > 0 ? ((docentesConHorario / totalDocentes) * 100).toFixed(1) : 0}%)</td></tr>
          <tr><td><b>Ocupación Aulas</b></td><td>${aulasOcupadas}/${totalAulas} (${totalAulas > 0 ? ((aulasOcupadas / totalAulas) * 100).toFixed(1) : 0}%)</td></tr>
          <tr><td><b>Ocupación Laboratorios</b></td><td>${labsOcupados}/${totalLabs} (${totalLabs > 0 ? ((labsOcupados / totalLabs) * 100).toFixed(1) : 0}%)</td></tr>
          <tr><td><b>Promedio Horas/Docente</b></td><td>${horasProm.toFixed(1)}</td></tr>
        </tbody>
      </table>
      <h2 style="color:#003366;margin-top:20px">2. Top 5 Docentes por Carga Horaria</h2>
      <table>
        <thead><tr><th>Docente</th><th>Horas Asignadas</th></tr></thead>
        <tbody>${filasTop5}</tbody>
      </table>
    `);

    return this.generarPDF(html);
  }

  private htmlWrapper(contenido: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 0; }
  .header { background-color: #003366; color: white; padding: 16px 20px; margin-bottom: 16px; }
  .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background-color: #003366; color: white; padding: 7px 8px; text-align: left; font-size: 11px; }
  td { border: 1px solid #ccc; padding: 6px 8px; }
  tr:nth-child(even) { background-color: #f5f5f5; }
  .footer { margin-top: 12px; font-size: 11px; color: #555; }
  h2 { font-size: 13px; }
</style>
</head>
<body>${contenido}</body>
</html>`;
  }

  private duracionHoras(inicio: string, fin: string): number {
    const [hi, mi] = inicio.split(":").map(Number);
    const [hf, mf] = fin.split(":").map(Number);
    return (hf * 60 + mf - hi * 60 - mi) / 60;
  }
}
