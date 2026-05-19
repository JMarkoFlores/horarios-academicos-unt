import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bull";
import { Repository } from "typeorm";
import { Queue } from "bull";
import { NotificacionDocente, CanalNotificacion, EstadoNotificacion } from "../entities/notificacion-docente.entity";
import { PreferenciasNotificacion } from "../entities/preferencias-notificacion.entity";
import { VentanaAtencion } from "../entities/ventana-atencion.entity";
import { Docente } from "../entities/docente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { UpdatePreferenciasDto } from "./dto/update-preferencias.dto";
import { MailService } from "../mail/mail.service";
import { ConfigService } from "@nestjs/config";

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
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async enviarRecordatorio24h(docenteId: number, ventanaId: string): Promise<void> {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    if (!ventana) return;

    const fecha = new Date(ventana.fecha);
    const [h, m] = ventana.hora_inicio.split(":").map(Number);
    fecha.setHours(h, m, 0, 0);

    const delay = fecha.getTime() - Date.now() - 24 * 60 * 60 * 1000;
    if (delay > 0) {
      await this.notificacionesQueue.add("recordatorio-24h", { docenteId, ventanaId }, { delay });
      this.logger.log(`Recordatorio 24h programado para docente ${docenteId}, ventana ${ventanaId}`);
    }
  }

  async enviarRecordatorio15min(docenteId: number, ventanaId: string): Promise<void> {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    if (!ventana) return;

    const fecha = new Date(ventana.fecha);
    const [h, m] = ventana.hora_inicio.split(":").map(Number);
    fecha.setHours(h, m, 0, 0);

    const delay = fecha.getTime() - Date.now() - 15 * 60 * 1000;
    if (delay > 0) {
      await this.notificacionesQueue.add("recordatorio-15min", { docenteId, ventanaId }, { delay });
    }
  }

  async enviarHorarioConfirmado(docenteId: number, periodo: string): Promise<void> {
    await this.notificacionesQueue.add("horario-confirmado", { docenteId, periodo });
  }

  async procesarRecordatorio(docenteId: number, ventanaId: string, tipo: string): Promise<void> {
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    const prefs = await this.preferenciasRepo.findOne({ where: { docente: { id: docenteId } } });

    if (!docente || !ventana) return;

    const fechaStr = new Date(ventana.fecha).toLocaleDateString("es-PE");
    const mensaje = tipo === "24h"
      ? `Estimado/a ${docente.nombres} ${docente.apellidos}, mañana ${fechaStr} a las ${ventana.hora_inicio} es su turno de selección de horario.`
      : `Estimado/a ${docente.nombres} ${docente.apellidos}, en 15 minutos (${ventana.hora_inicio}) es su turno de selección de horario.`;

    // Enviar por correo
    if (!prefs || prefs.canal_correo) {
      await this.enviarNotificacion(docente, CanalNotificacion.CORREO, `Recordatorio de Selección - ${tipo}`, mensaje);
    }

    // Enviar por Telegram
    if (prefs && prefs.canal_telegram && prefs.telegram_chat_id) {
      await this.enviarNotificacion(docente, CanalNotificacion.TELEGRAM, `Recordatorio`, mensaje, prefs.telegram_chat_id);
    }
  }

  async procesarHorarioConfirmado(docenteId: number, periodo: string): Promise<void> {
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    const prefs = await this.preferenciasRepo.findOne({ where: { docente: { id: docenteId } } });
    if (!docente) return;

    const horarios = await this.horarioRepo.find({ where: { docente_id: docenteId, periodo }, relations: ["curso", "ambiente"] });
    const dias = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const filas = horarios.map(h => `<tr><td>${dias[h.dia]}</td><td>${h.hora_inicio}-${h.hora_fin}</td><td>${h.curso?.nombre}</td><td>${h.ambiente?.codigo}</td></tr>`).join("");

    const html = `
      <h2>Horario Confirmado — Período ${periodo}</h2>
      <p>Estimado/a ${docente.nombres} ${docente.apellidos},</p>
      <p>Su horario para el período <strong>${periodo}</strong> ha sido confirmado:</p>
      <table border="1" cellpadding="5"><thead><tr><th>Día</th><th>Hora</th><th>Curso</th><th>Ambiente</th></tr></thead><tbody>${filas}</tbody></table>
    `;

    // Enviar por correo
    if (!prefs || prefs.canal_correo) {
      await this.enviarNotificacion(docente, CanalNotificacion.CORREO, `Horario Confirmado - ${periodo}`, html);
    }

    // Enviar por Telegram
    if (prefs && prefs.canal_telegram && prefs.telegram_chat_id) {
      const text = `Su horario para el período ${periodo} ha sido confirmado. Revise su correo para más detalles.`;
      await this.enviarNotificacion(docente, CanalNotificacion.TELEGRAM, `Horario Confirmado`, text, prefs.telegram_chat_id);
    }
  }

  private async enviarNotificacion(docente: Docente, canal: CanalNotificacion, subject: string, content: string, target?: string): Promise<void> {
    const n = this.notificacionRepo.create({
      tipo: subject,
      mensaje: content,
      canal,
      estado: EstadoNotificacion.PENDIENTE,
      docente,
    });
    await this.notificacionRepo.save(n);

    try {
      if (canal === CanalNotificacion.CORREO) {
        await this.mailService.sendMail(docente.email, subject, content);
      } else if (canal === CanalNotificacion.TELEGRAM && target) {
        await this.enviarTelegram(target, content);
      }
      n.estado = EstadoNotificacion.ENVIADO;
      n.enviado_at = new Date();
    } catch (error) {
      n.estado = EstadoNotificacion.FALLIDO;
      this.logger.error(`Fallo al enviar notificación por ${canal}:`, error);
    }
    await this.notificacionRepo.save(n);
  }

  async enviarTelegram(chatId: string, text: string): Promise<void> {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN no configurado');
    }
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!response.ok) {
      throw new Error(`Telegram error: ${response.statusText}`);
    }
  }

  async getHistorial(docenteId: number, page = 1, limit = 20) {
    const [items, total] = await this.notificacionRepo.findAndCount({
      where: { docente: { id: docenteId } },
      order: { created_at: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async upsertPreferencias(docenteId: number, dto: UpdatePreferenciasDto) {
    let prefs = await this.preferenciasRepo.findOne({ where: { docente: { id: docenteId } } });
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });

    if (!prefs) {
      prefs = this.preferenciasRepo.create({ docente });
    }

    if (dto.canal_correo !== undefined) prefs.canal_correo = dto.canal_correo;
    if (dto.canal_whatsapp !== undefined) prefs.canal_whatsapp = dto.canal_whatsapp;
    if (dto.canal_telegram !== undefined) prefs.canal_telegram = dto.canal_telegram;
    if (dto.telefono !== undefined) prefs.telefono = dto.telefono;
    if (dto.telegram_chat_id !== undefined) prefs.telegram_chat_id = dto.telegram_chat_id;
    
    return this.preferenciasRepo.save(prefs);
  }
}
