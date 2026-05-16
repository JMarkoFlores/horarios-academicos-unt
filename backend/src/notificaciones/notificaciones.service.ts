import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bull";
import { Repository } from "typeorm";
import { Queue } from "bull";
import { NotificacionDocente } from "../entities/notificacion-docente.entity";
import { PreferenciasNotificacion } from "../entities/preferencias-notificacion.entity";
import { VentanaAtencion } from "../entities/ventana-atencion.entity";
import { Docente } from "../entities/docente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { UpdatePreferenciasDto } from "./dto/update-preferencias.dto";

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    @InjectRepository(NotificacionDocente)
    private readonly notificacionRepo: Repository<NotificacionDocente>,
    @InjectRepository(PreferenciasNotificacion)
    private readonly preferenciasRepo: Repository<PreferenciasNotificacion>,
    @InjectRepository(VentanaAtencion)
    private readonly ventanaRepo: Repository<VentanaAtencion>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectQueue("notificaciones")
    private readonly notificacionesQueue: Queue,
  ) {}

  async enviarRecordatorio24h(
    docenteId: number,
    ventanaId: number,
  ): Promise<void> {
    const ventana = await this.ventanaRepo.findOne({
      where: { id: ventanaId },
    });
    if (!ventana) return;

    const fecha = new Date(ventana.fecha);
    const [h, m] = ventana.hora_inicio.split(":").map(Number);
    fecha.setHours(h, m, 0, 0);

    const delay = fecha.getTime() - Date.now() - 24 * 60 * 60 * 1000;
    if (delay > 0) {
      await this.notificacionesQueue.add(
        "recordatorio-24h",
        { docenteId, ventanaId },
        { delay },
      );
      this.logger.log(
        `Recordatorio 24h programado para docente ${docenteId}, ventana ${ventanaId}`,
      );
    }
  }

  async enviarRecordatorio15min(
    docenteId: number,
    ventanaId: number,
  ): Promise<void> {
    const ventana = await this.ventanaRepo.findOne({
      where: { id: ventanaId },
    });
    if (!ventana) return;

    const fecha = new Date(ventana.fecha);
    const [h, m] = ventana.hora_inicio.split(":").map(Number);
    fecha.setHours(h, m, 0, 0);

    const delay = fecha.getTime() - Date.now() - 15 * 60 * 1000;
    if (delay > 0) {
      await this.notificacionesQueue.add(
        "recordatorio-15min",
        { docenteId, ventanaId },
        { delay },
      );
    }
  }

  async enviarHorarioConfirmado(
    docenteId: number,
    periodo: string,
  ): Promise<void> {
    await this.notificacionesQueue.add("horario-confirmado", {
      docenteId,
      periodo,
    });
  }

  async procesarRecordatorio(
    docenteId: number,
    ventanaId: number,
    tipo: string,
  ): Promise<void> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    const ventana = await this.ventanaRepo.findOne({
      where: { id: ventanaId },
    });
    if (!docente || !ventana) return;

    const fechaStr = new Date(ventana.fecha).toLocaleDateString("es-PE");
    const mensaje =
      tipo === "24h"
        ? `Estimado/a ${docente.nombres} ${docente.apellidos}, mañana ${fechaStr} a las ${ventana.hora_inicio} es su turno de selección de horario.`
        : `Estimado/a ${docente.nombres} ${docente.apellidos}, en 15 minutos (${ventana.hora_inicio}) es su turno de selección de horario.`;

    await this.registrarNotificacion(docente, `recordatorio_${tipo}`, mensaje);
    this.logger.log(
      `[EMAIL RECORDATORIO ${tipo}] → ${docente.email}: ${mensaje}`,
    );
  }

  async procesarHorarioConfirmado(
    docenteId: number,
    periodo: string,
  ): Promise<void> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) return;

    const horarios = await this.horarioRepo
      .createQueryBuilder('horario')
      .leftJoinAndSelect('horario.curso', 'curso')
      .leftJoinAndSelect('horario.ambiente', 'ambiente')
      .leftJoinAndSelect('horario.docente', 'docente')
      .where('docente.id = :docenteId', { docenteId })
      .andWhere('horario.periodo_academico = :periodo', { periodo })
      .orderBy('horario.dia_semana', 'ASC')
      .addOrderBy('horario.hora_inicio', 'ASC')
      .cache(`horarios_periodo_${periodo}_docente_${docenteId}_notificacion`, 60000)
      .getMany();

    const dias = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const filas = horarios
      .map(
        (h) =>
          `<tr><td>${dias[h.dia_semana]}</td><td>${h.hora_inicio}-${h.hora_fin}</td><td>${h.curso?.nombre}</td><td>${h.ambiente?.codigo}</td></tr>`,
      )
      .join("");

    const html = `
      <h2>Horario Confirmado — Período ${periodo}</h2>
      <p>Estimado/a ${docente.nombres} ${docente.apellidos},</p>
      <p>Su horario para el período <strong>${periodo}</strong> ha sido confirmado:</p>
      <table border="1" cellpadding="5">
        <thead><tr><th>Día</th><th>Hora</th><th>Curso</th><th>Ambiente</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    `;

    await this.registrarNotificacion(docente, "horario_confirmado", html);
    this.logger.log(`[EMAIL HORARIO CONFIRMADO] → ${docente.email}`);
  }

  async getHistorial(docenteId: number, page = 1, limit = 20): Promise<{
    data: NotificacionDocente[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.notificacionRepo
      .createQueryBuilder('notificacion')
      .leftJoinAndSelect('notificacion.docente', 'docente')
      .where('docente.id = :docenteId', { docenteId })
      .orderBy('notificacion.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`notificaciones_docente_${docenteId}_${page}_${limit}`, 60000)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async upsertPreferencias(
    docenteId: number,
    dto: UpdatePreferenciasDto,
  ): Promise<PreferenciasNotificacion> {
    let prefs = await this.preferenciasRepo.findOne({
      where: { docente: { id: docenteId } },
    });
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });

    if (!prefs) {
      prefs = this.preferenciasRepo.create({ docente });
    }

    if (dto.canal_correo !== undefined) prefs.canal_correo = dto.canal_correo;
    if (dto.canal_whatsapp !== undefined)
      prefs.canal_whatsapp = dto.canal_whatsapp;
    if (dto.telefono !== undefined) prefs.telefono = dto.telefono;

    return this.preferenciasRepo.save(prefs);
  }

  private async registrarNotificacion(
    docente: Docente,
    tipo: string,
    mensaje: string,
  ): Promise<void> {
    const n = this.notificacionRepo.create({
      tipo,
      mensaje,
      canal: "correo" as any,
      estado: "ENVIADO" as any,
      enviado_at: new Date(),
      docente,
    });
    await this.notificacionRepo.save(n);
  }
}
