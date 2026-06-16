import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bull";
import { Repository } from "typeorm";
import { Queue, JobOptions } from "bull";
import {
  NotificacionDocente,
  CanalNotificacion,
  EstadoNotificacion,
} from "../entities/notificacion-docente.entity";
import { PreferenciasNotificacion } from "../entities/preferencias-notificacion.entity";
import { VentanaAtencion } from "../entities/ventana-atencion.entity";
import { Docente } from "../entities/docente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ColaDocente } from "../entities/cola-docentes.entity";
import { UpdatePreferenciasDto } from "./dto/update-preferencias.dto";
import { MailService } from "../mail/mail.service";
import { ConfigService } from "@nestjs/config";

export interface ResultadoEnvio {
  exito: boolean;
  canal: "email" | "telegram";
  error?: string;
  codigoError?: string;
  timestamp: Date;
}

export interface RegistroResultadoParams {
  docenteId: number;
  tipo: string;
  canal: "email" | "telegram" | "ambos";
  exito: boolean;
  error?: string;
  codigoError?: string;
  jobId?: string;
  intento?: number;
  final?: boolean;
}

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
    @InjectRepository(ColaDocente)
    private readonly colaRepo: Repository<ColaDocente>,
    @InjectQueue("notificaciones")
    private readonly notificacionesQueue: Queue,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  private calcularDelayHasta(
    ventana: VentanaAtencion,
    minutosAntes: number,
  ): number {
    const fechaStr =
      ventana.fecha instanceof Date
        ? ventana.fecha.toISOString()
        : ventana.fecha;

    // Crear fecha en zona horaria local (Perú UTC-5)
    const [year, month, day] = fechaStr.substring(0, 10).split("-").map(Number);
    const [h, m] = ventana.hora_inicio.split(":").map(Number);

    // Crear fecha con hora específica en zona horaria local
    const fechaInicio = new Date(year, month - 1, day, h, m, 0);
    const ahora = Date.now();
    const delay = fechaInicio.getTime() - ahora - minutosAntes * 60 * 1000;

    this.logger.log(`[DelayCalc] Ventana: ${year}-${month}-${day} ${h}:${m}`);
    this.logger.log(
      `[DelayCalc] Fecha inicio (local): ${fechaInicio.toString()}`,
    );
    this.logger.log(`[DelayCalc] Ahora: ${new Date(ahora).toString()}`);
    this.logger.log(
      `[DelayCalc] Delay: ${delay}ms (${Math.round(delay / 1000 / 60)} min)`,
    );

    return delay;
  }

  async enviarRecordatorio24h(
    docenteId: number,
    ventanaId: string,
  ): Promise<void> {
    const ventana = await this.ventanaRepo.findOne({
      where: { id: ventanaId },
    });
    if (!ventana) {
      this.logger.warn(
        `Ventana ${ventanaId} no encontrada para recordatorio 24h`,
      );
      return;
    }

    const delay = this.calcularDelayHasta(ventana, 24 * 60);
    this.logger.log(
      `Calculando delay 24h: ventana ${ventanaId}, docente ${docenteId}, delay=${delay}ms (${delay / 1000 / 60}min)`,
    );
    if (delay > 0) {
      // Job ID único para evitar duplicados
      const jobId = `recordatorio-24h-${ventanaId}-${docenteId}`;
      const existingJob = await this.notificacionesQueue.getJob(jobId);
      if (existingJob) {
        this.logger.log(`Job ${jobId} ya existe, omitiendo duplicado`);
        return;
      }
      await this.notificacionesQueue.add(
        "recordatorio-24h",
        { docenteId, ventanaId },
        { delay, jobId },
      );
      this.logger.log(
        `Recordatorio 24h programado para docente ${docenteId}, ventana ${ventanaId}, ejecuta en ${delay / 1000 / 60} minutos`,
      );
    } else {
      this.logger.warn(
        `No se programó recordatorio 24h: delay negativo (${delay}ms). La ventana es muy cercana o ya pasó.`,
      );
    }
  }

  async enviarAlerta15min(docenteId: number, ventanaId: string): Promise<void> {
    const ventana = await this.ventanaRepo.findOne({
      where: { id: ventanaId },
    });
    if (!ventana) {
      this.logger.warn(`Ventana ${ventanaId} no encontrada para alerta 15min`);
      return;
    }

    const delay = this.calcularDelayHasta(ventana, 15);
    this.logger.log(
      `Calculando delay 15min: ventana ${ventanaId}, docente ${docenteId}, delay=${delay}ms (${delay / 1000 / 60}min)`,
    );
    if (delay > 0) {
      // Job ID único para evitar duplicados
      const jobId = `alerta-15min-${ventanaId}-${docenteId}`;
      const existingJob = await this.notificacionesQueue.getJob(jobId);
      if (existingJob) {
        this.logger.log(`Job ${jobId} ya existe, omitiendo duplicado`);
        return;
      }
      await this.notificacionesQueue.add(
        "alerta-15min",
        { docenteId, ventanaId },
        { delay, jobId },
      );
      this.logger.log(
        `Alerta 15min programada para docente ${docenteId}, ventana ${ventanaId}, ejecuta en ${delay / 1000 / 60} minutos`,
      );
    } else {
      this.logger.warn(
        `No se programó alerta 15min: delay negativo (${delay}ms). La ventana es muy cercana o ya pasó.`,
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

  async testJobCola(docenteId: number): Promise<void> {
    this.logger.log(
      `[TestCola] Agregando job inmediato para docente ${docenteId}`,
    );
    await this.notificacionesQueue.add("recordatorio-24h", {
      docenteId,
      ventanaId: "test-ventana",
      tipo: "test",
      canal: "ambos",
    });
    this.logger.log(`[TestCola] Job agregado a la cola`);
  }

  async programarNotificacionesVentana(ventanaId: string): Promise<void> {
    const colas = await this.colaRepo.find({
      where: { ventana_id: ventanaId },
      relations: ["docente"],
    });
    if (!colas || colas.length === 0) {
      this.logger.warn(
        `No hay docentes en la ventana ${ventanaId} para programar notificaciones`,
      );
      return;
    }

    for (const cola of colas) {
      if (cola.docente) {
        await this.enviarRecordatorio24h(cola.docente.id, ventanaId);
        await this.enviarAlerta15min(cola.docente.id, ventanaId);
      }
    }
    this.logger.log(
      `Notificaciones programadas para ${colas.length} docentes de la ventana ${ventanaId}`,
    );
  }

  async procesarRecordatorio(
    docenteId: number,
    ventanaId: string,
    tipo: string,
  ): Promise<void> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    const ventana = await this.ventanaRepo.findOne({
      where: { id: ventanaId },
    });
    const prefs = await this.preferenciasRepo.findOne({
      where: { docente: { id: docenteId } },
    });

    if (!docente || !ventana) return;

    const fechaStr = new Date(ventana.fecha).toLocaleDateString("es-PE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const destinatarioEmail = prefs?.correo_alternativo || docente.email;

    if (tipo === "24h") {
      const html = this.buildHtmlRecordatorio24h(docente, ventana, fechaStr);
      if (!prefs || prefs.canal_correo) {
        await this.enviarNotificacion(
          docente,
          CanalNotificacion.CORREO,
          `Recordatorio: Turno de selección mañana`,
          html,
          undefined,
          destinatarioEmail,
        );
      }
      if (prefs && prefs.canal_telegram && prefs.telegram_chat_id) {
        const text = `Recordatorio: mañana ${fechaStr} a las ${ventana.hora_inicio} es tu turno de selección de horario (${ventana.proposito}).`;
        await this.enviarNotificacion(
          docente,
          CanalNotificacion.TELEGRAM,
          `Recordatorio 24h`,
          text,
          prefs.telegram_chat_id,
        );
      }
    } else {
      // 15min - Email + Telegram según preferencias
      const html15min = this.buildHtmlAlerta15min(docente, ventana, fechaStr);
      if (!prefs || prefs.canal_correo) {
        await this.enviarNotificacion(
          docente,
          CanalNotificacion.CORREO,
          `⏰ Alerta: Tu turno comienza en 15 minutos`,
          html15min,
          undefined,
          destinatarioEmail,
        );
      }
      if (prefs && prefs.canal_telegram && prefs.telegram_chat_id) {
        const text = `⏰ ¡Atención! En 15 minutos (${ventana.hora_inicio}) es tu turno de selección de horario. ¡No te lo pierdas!`;
        await this.enviarNotificacion(
          docente,
          CanalNotificacion.TELEGRAM,
          `Alerta 15 min`,
          text,
          prefs.telegram_chat_id,
        );
      }
    }
  }

  private buildHtmlRecordatorio24h(
    docente: Docente,
    ventana: VentanaAtencion,
    fechaStr: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #003366; color: #fff; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Recordatorio de Ventana de Atención</h2>
        </div>
        <div style="padding: 24px;">
          <p>Estimado/a <strong>${docente.nombres} ${docente.apellidos}</strong>,</p>
          <p>Le recordamos que mañana tiene asignado su turno de selección de horario académico:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Fecha</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Hora inicio</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Hora fin</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Categoría</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #ddd; padding: 10px;">${fechaStr}</td>
                <td style="border: 1px solid #ddd; padding: 10px;">${ventana.hora_inicio}</td>
                <td style="border: 1px solid #ddd; padding: 10px;">${ventana.hora_fin}</td>
                <td style="border: 1px solid #ddd; padding: 10px;">${ventana.proposito}</td>
              </tr>
            </tbody>
          </table>
          <p style="margin-top: 20px; color: #555;">Por favor, esté atento a la hora indicada para realizar su selección.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 12px; text-align: center; font-size: 12px; color: #888;">
          Sistema de Horarios Académicos — UNT
        </div>
      </div>
    `;
  }

  private buildHtmlAlerta15min(
    docente: Docente,
    ventana: VentanaAtencion,
    fechaStr: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ff6b35; color: #fff; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">⏰ ¡Tu turno comienza en 15 minutos!</h2>
        </div>
        <div style="padding: 24px;">
          <p>Estimado/a <strong>${docente.nombres} ${docente.apellidos}</strong>,</p>
          <p style="font-size: 18px; color: #ff6b35; font-weight: bold;">¡Es momento de prepararse!</p>
          <p>Tu turno de selección de horario académico comenzará en <strong>15 minutos</strong>:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px; background-color: #fff8f5;">
            <thead>
              <tr style="background-color: #ff6b35; color: white;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Fecha</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Hora inicio</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Hora fin</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Categoría</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #ddd; padding: 10px;">${fechaStr}</td>
                <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; color: #ff6b35;">${ventana.hora_inicio}</td>
                <td style="border: 1px solid #ddd; padding: 10px;">${ventana.hora_fin}</td>
                <td style="border: 1px solid #ddd; padding: 10px;">${ventana.proposito}</td>
              </tr>
            </tbody>
          </table>
          <div style="background-color: #fff3cd; border-left: 4px solid #ff6b35; padding: 12px; margin-top: 20px;">
            <p style="margin: 0; font-weight: bold;">⚠️ Acción requerida:</p>
            <p style="margin: 5px 0 0 0;">Ingresa al sistema de horarios inmediatamente para estar listo cuando sea tu turno.</p>
          </div>
        </div>
        <div style="background-color: #f5f5f5; padding: 12px; text-align: center; font-size: 12px; color: #888;">
          Sistema de Horarios Académicos — UNT
        </div>
      </div>
    `;
  }

  async procesarHorarioConfirmado(
    docenteId: number,
    periodo: string,
  ): Promise<void> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    const prefs = await this.preferenciasRepo.findOne({
      where: { docente: { id: docenteId } },
    });
    if (!docente) return;

    const horarios = await this.horarioRepo.find({
      where: { docente_id: docenteId, periodo },
      relations: ["curso", "ambiente", "grupo"],
      order: { dia: "ASC", hora_inicio: "ASC" },
    });
    const dias = [
      "",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ];
    const filas = horarios
      .map(
        (h) =>
          `<tr><td style="border:1px solid #ddd;padding:8px;">${dias[h.dia]}</td><td style="border:1px solid #ddd;padding:8px;">${h.hora_inicio}–${h.hora_fin}</td><td style="border:1px solid #ddd;padding:8px;">${h.curso?.nombre || ""}</td><td style="border:1px solid #ddd;padding:8px;">${h.ambiente?.codigo || ""}</td><td style="border:1px solid #ddd;padding:8px;">${h.grupo?.nombre || ""}</td></tr>`,
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #003366; color: #fff; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Horario Confirmado</h2>
        </div>
        <div style="padding: 24px;">
          <p>Estimado/a <strong>${docente.nombres} ${docente.apellidos}</strong>,</p>
          <p>Su horario para el período <strong>${periodo}</strong> ha sido confirmado:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Día</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Hora</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Curso</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Ambiente</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Grupo</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
        <div style="background-color: #f5f5f5; padding: 12px; text-align: center; font-size: 12px; color: #888;">
          Sistema de Horarios Académicos — UNT
        </div>
      </div>
    `;

    if (!prefs || prefs.canal_correo) {
      const destinatario = prefs?.correo_alternativo || docente.email;
      await this.enviarNotificacion(
        docente,
        CanalNotificacion.CORREO,
        `Horario Confirmado - ${periodo}`,
        html,
        undefined,
        destinatario,
      );
    }

    if (prefs && prefs.canal_telegram && prefs.telegram_chat_id) {
      const lines = [`*Horario Confirmado — ${periodo}*`];
      for (const h of horarios) {
        lines.push(
          `• ${dias[h.dia]} ${h.hora_inicio}–${h.hora_fin}: ${h.curso?.nombre} (${h.ambiente?.codigo})`,
        );
      }
      const text = lines.join("\n");
      await this.enviarNotificacion(
        docente,
        CanalNotificacion.TELEGRAM,
        `Horario Confirmado`,
        text,
        prefs.telegram_chat_id,
      );
    }
  }

  private async enviarNotificacion(
    docente: Docente,
    canal: CanalNotificacion,
    subject: string,
    content: string,
    target?: string,
    overrideEmail?: string,
  ): Promise<void> {
    this.logger.log(
      `[EnviarNotificacion] Docente ${docente.id} - Canal: ${canal} - Asunto: ${subject}`,
    );

    const n = this.notificacionRepo.create({
      tipo: subject,
      mensaje: content,
      canal,
      estado: EstadoNotificacion.PENDIENTE,
      docente,
    });
    await this.notificacionRepo.save(n);
    this.logger.log(`[EnviarNotificacion] Registro creado ID: ${n.id}`);

    try {
      if (canal === CanalNotificacion.CORREO) {
        const to = overrideEmail || docente.email;
        this.logger.log(`[EnviarNotificacion] Enviando EMAIL a: ${to}`);
        await this.mailService.sendMail(to, subject, content);
        this.logger.log(
          `[EnviarNotificacion] EMAIL enviado exitosamente a: ${to}`,
        );
      } else if (canal === CanalNotificacion.TELEGRAM && target) {
        this.logger.log(
          `[EnviarNotificacion] Enviando TELEGRAM a chat_id: ${target}`,
        );
        await this.enviarTelegramDirecto(target, content);
        this.logger.log(`[EnviarNotificacion] TELEGRAM enviado exitosamente`);
      }
      n.estado = EstadoNotificacion.ENVIADO;
      n.enviado_at = new Date();
    } catch (error: any) {
      n.estado = EstadoNotificacion.FALLIDO;
      n.codigo_error = error.code || error.message?.substring(0, 100);
      this.logger.error(
        `[EnviarNotificacion] ❌ Fallo al enviar ${canal}: ${error.message}`,
      );
    }
    await this.notificacionRepo.save(n);
  }

  async enviarTelegramDirecto(chatId: string, text: string): Promise<void> {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN no configurado");
    }
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );
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

  async getPreferencias(docenteId: number) {
    this.logger.log(`Buscando preferencias para docenteId: ${docenteId}`);
    const prefs = await this.preferenciasRepo.findOne({
      where: { docente: { id: docenteId } },
    });
    if (!prefs) {
      this.logger.log(`No se encontraron preferencias, retornando defaults`);
      // Retornar valores por defecto si no existen preferencias
      return {
        canal_correo: true,
        canal_telegram: false,
        telegram_chat_id: null,
        correo_alternativo: null,
      };
    }
    this.logger.log(`Preferencias encontradas: ${JSON.stringify(prefs)}`);
    return prefs;
  }

  async enviarNotificacionPrueba(docenteId: number): Promise<{
    emailEnviado: boolean;
    telegramEnviado: boolean;
    errores: string[];
  }> {
    this.logger.log(`========== INICIANDO NOTIFICACIÓN DE PRUEBA ==========`);
    this.logger.log(`Docente ID: ${docenteId}`);

    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) {
      this.logger.error(`Docente ${docenteId} no encontrado`);
      throw new NotFoundException("Docente no encontrado");
    }
    this.logger.log(
      `Docente encontrado: ${docente.nombres} (${docente.email})`,
    );

    const prefs = await this.getPreferencias(docenteId);
    this.logger.log(`Preferencias cargadas: ${JSON.stringify(prefs)}`);

    const resultados = {
      emailEnviado: false,
      telegramEnviado: false,
      errores: [] as string[],
    };

    // Notificación por correo
    if (prefs.canal_correo) {
      this.logger.log(`[EMAIL] Canal habilitado, intentando enviar...`);
      try {
        await this.enviarNotificacion(
          docente,
          CanalNotificacion.CORREO,
          "Notificación de Prueba - Horarios UNT",
          `<p>Hola <strong>${docente.nombres}</strong>,</p><p>Esta es una notificación de prueba del sistema de horarios.</p>`,
          prefs.correo_alternativo || undefined,
        );
        resultados.emailEnviado = true;
        this.logger.log(
          `[EMAIL] ✅ Enviado exitosamente a ${prefs.correo_alternativo || docente.email}`,
        );
      } catch (error: any) {
        resultados.errores.push(`Email: ${error.message}`);
        this.logger.error(`[EMAIL] ❌ Error: ${error.message}`);
      }
    } else {
      this.logger.warn(`[EMAIL] Canal deshabilitado en preferencias`);
      resultados.errores.push("Email: Canal deshabilitado en preferencias");
    }

    // Notificación por Telegram
    if (prefs.canal_telegram) {
      this.logger.log(`[TELEGRAM] Canal habilitado`);
      if (prefs.telegram_chat_id) {
        this.logger.log(
          `[TELEGRAM] Chat ID configurado: ${prefs.telegram_chat_id}`,
        );
        try {
          await this.enviarNotificacion(
            docente,
            CanalNotificacion.TELEGRAM,
            "",
            `Hola ${docente.nombres}, esta es una notificación de prueba del sistema de horarios UNT.`,
            prefs.telegram_chat_id,
          );
          resultados.telegramEnviado = true;
          this.logger.log(
            `[TELEGRAM] ✅ Enviado exitosamente a ${prefs.telegram_chat_id}`,
          );
        } catch (error: any) {
          resultados.errores.push(`Telegram: ${error.message}`);
          this.logger.error(`[TELEGRAM] ❌ Error: ${error.message}`);
        }
      } else {
        this.logger.warn(`[TELEGRAM] Chat ID NO configurado`);
        resultados.errores.push("Telegram: Chat ID no configurado");
      }
    } else {
      this.logger.warn(`[TELEGRAM] Canal deshabilitado en preferencias`);
      resultados.errores.push("Telegram: Canal deshabilitado en preferencias");
    }

    this.logger.log(`========== RESUMEN ==========`);
    this.logger.log(
      `Email: ${resultados.emailEnviado ? "ENVIADO" : "NO ENVIADO"}`,
    );
    this.logger.log(
      `Telegram: ${resultados.telegramEnviado ? "ENVIADO" : "NO ENVIADO"}`,
    );
    this.logger.log(
      `Errores: ${resultados.errores.length > 0 ? resultados.errores.join(", ") : "Ninguno"}`,
    );
    this.logger.log(`========== FIN NOTIFICACIÓN DE PRUEBA ==========`);

    return resultados;
  }

  async upsertPreferencias(docenteId: number, dto: UpdatePreferenciasDto) {
    this.logger.log(
      `Guardando preferencias para docenteId: ${docenteId}, dto: ${JSON.stringify(dto)}`,
    );
    let prefs = await this.preferenciasRepo.findOne({
      where: { docente: { id: docenteId } },
    });
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) throw new NotFoundException("Docente no encontrado");

    if (!prefs) {
      this.logger.log(`Creando nuevas preferencias para docente ${docenteId}`);
      prefs = this.preferenciasRepo.create({ docente });
    } else {
      this.logger.log(
        `Actualizando preferencias existentes: ${JSON.stringify(prefs)}`,
      );
    }

    if (dto.canal_correo !== undefined) prefs.canal_correo = dto.canal_correo;
    if (dto.canal_telegram !== undefined)
      prefs.canal_telegram = dto.canal_telegram;
    if (dto.telegram_chat_id !== undefined)
      prefs.telegram_chat_id = dto.telegram_chat_id;
    if (dto.correo_alternativo !== undefined)
      prefs.correo_alternativo = dto.correo_alternativo;

    await this.preferenciasRepo.save(prefs);
    this.logger.log(`Preferencias guardadas para docente ${docenteId}`);
  }

  async getEstadisticas(periodo?: string) {
    const qb = this.notificacionRepo.createQueryBuilder("n");

    if (periodo) {
      qb.where("n.tipo LIKE :periodo", { periodo: `%${periodo}%` });
    }

    const total = await qb.getCount();

    const enviados = await qb
      .clone()
      .andWhere("n.estado = :enviado", { enviado: EstadoNotificacion.ENVIADO })
      .getCount();

    const fallidos = await qb
      .clone()
      .andWhere("n.estado = :fallido", { fallido: EstadoNotificacion.FALLIDO })
      .getCount();

    const porCanal = await qb
      .select("n.canal", "canal")
      .addSelect("COUNT(*)", "cantidad")
      .groupBy("n.canal")
      .getRawMany();

    return {
      total,
      enviados,
      fallidos,
      pendientes: total - enviados - fallidos,
      por_canal: porCanal,
      periodo: periodo || "todos",
    };
  }

  /**
   * Enviar notificación por email
   */
  async enviarEmail(
    docenteId: number,
    tipo: string,
    ventanaId?: string,
    periodo?: string,
  ): Promise<ResultadoEnvio> {
    const timestamp = new Date();
    try {
      const docente = await this.docenteRepo.findOne({
        where: { id: docenteId },
      });
      if (!docente) {
        return {
          exito: false,
          canal: "email",
          error: "Docente no encontrado",
          timestamp,
        };
      }

      const prefs = await this.preferenciasRepo.findOne({
        where: { docente: { id: docenteId } },
      });
      if (!prefs?.canal_correo) {
        return {
          exito: false,
          canal: "email",
          error: "Canal email deshabilitado",
          timestamp,
        };
      }

      // Aquí iría la lógica de envío de email real
      this.logger.log(`Enviando email a ${docente.email} para tipo ${tipo}`);

      // Simulación de envío exitoso por ahora
      return { exito: true, canal: "email", timestamp };
    } catch (error: any) {
      this.logger.error(`Error enviando email: ${error.message}`);
      return { exito: false, canal: "email", error: error.message, timestamp };
    }
  }

  /**
   * Enviar notificación por Telegram
   */
  async enviarTelegram(
    docenteId: number,
    tipo: string,
    ventanaId?: string,
    periodo?: string,
  ): Promise<ResultadoEnvio> {
    const timestamp = new Date();
    try {
      const docente = await this.docenteRepo.findOne({
        where: { id: docenteId },
      });
      if (!docente) {
        return {
          exito: false,
          canal: "telegram",
          error: "Docente no encontrado",
          timestamp,
        };
      }

      const prefs = await this.preferenciasRepo.findOne({
        where: { docente: { id: docenteId } },
      });
      if (!prefs?.canal_telegram) {
        return {
          exito: false,
          canal: "telegram",
          error: "Canal Telegram deshabilitado",
          timestamp,
        };
      }

      if (!prefs.telegram_chat_id) {
        return {
          exito: false,
          canal: "telegram",
          error: "Chat ID no configurado",
          timestamp,
        };
      }

      // Aquí iría la lógica de envío de Telegram real
      this.logger.log(
        `Enviando Telegram a ${prefs.telegram_chat_id} para tipo ${tipo}`,
      );

      // Simulación de envío exitoso por ahora
      return { exito: true, canal: "telegram", timestamp };
    } catch (error: any) {
      this.logger.error(`Error enviando Telegram: ${error.message}`);
      return {
        exito: false,
        canal: "telegram",
        error: error.message,
        timestamp,
      };
    }
  }

  /**
   * Registrar resultado de notificación en historial
   */
  async registrarResultado(params: RegistroResultadoParams): Promise<void> {
    try {
      const notificacion = this.notificacionRepo.create({
        docente: { id: params.docenteId } as any,
        tipo: params.tipo,
        canal:
          params.canal === "email"
            ? CanalNotificacion.CORREO
            : params.canal === "telegram"
              ? CanalNotificacion.TELEGRAM
              : CanalNotificacion.CORREO,
        estado: params.exito
          ? EstadoNotificacion.ENTREGADO
          : EstadoNotificacion.FALLIDO,
        mensaje: params.error || undefined,
        codigo_error: params.codigoError || undefined,
        job_id: params.jobId || undefined,
        intentos: params.intento || 1,
        enviado_at: params.exito ? new Date() : undefined,
      });

      await this.notificacionRepo.save(notificacion);

      this.logger.log(
        `Resultado registrado: ${params.tipo} - ${params.canal} - ${params.exito ? "EXITO" : "FALLO"}`,
      );
    } catch (error: any) {
      this.logger.error(`Error registrando resultado: ${error.message}`);
    }
  }
}
