import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Docente } from "../entities/docente.entity";
import { PreferenciasNotificacion } from "../entities/preferencias-notificacion.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { VentanaAtencion } from "../entities/ventana-atencion.entity";
import { ColaDocente } from "../entities/cola-docentes.entity";
import { EstadoVentanaAtencion } from "../entities/ventana-atencion.entity";

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(PreferenciasNotificacion)
    private readonly preferenciasRepo: Repository<PreferenciasNotificacion>,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(VentanaAtencion)
    private readonly ventanaRepo: Repository<VentanaAtencion>,
    @InjectRepository(ColaDocente)
    private readonly colaRepo: Repository<ColaDocente>,
  ) {}

  async handleUpdate(
    update: any,
  ): Promise<{ chat_id: number; text: string; parse_mode?: string } | null> {
    this.logger.log("📩 Recibido update de Telegram: " + JSON.stringify(update));
    
    const message = update?.message;
    if (!message) {
      this.logger.warn("⚠️ Update sin message");
      return null;
    }

    const chatId = message.chat?.id;
    const text = (message.text || "").trim();
    const command = text.split(" ")[0];

    this.logger.log(`💬 Chat ID: ${chatId}, Texto: ${text}, Comando: ${command}`);

    switch (command) {
      case "/start":
        return this.handleStart(chatId, text);
      case "/mihorario":
        return this.handleMiHorario(chatId, text);
      case "/ventana":
        return this.handleVentana(chatId);
      default:
        return {
          chat_id: chatId,
          text: "Comandos disponibles:\n/start <codigo_docente> — registrar chat\n/mihorario <periodo> — ver horario\n/ventana — próxima ventana de atención",
        };
    }
  }

  private async handleStart(
    chatId: number,
    text: string,
  ): Promise<{ chat_id: number; text: string }> {
    this.logger.log("🔍 Procesando comando /start...");
    const parts = text.split(/\s+/);
    const codigo = parts[1]?.trim();

    this.logger.log(`📋 Código de docente recibido: ${codigo}`);

    if (!codigo) {
      return {
        chat_id: chatId,
        text: "Por favor envía tu código de docente después de /start. Ejemplo: /start DOC-1001",
      };
    }

    this.logger.log(`🔎 Buscando docente con código: ${codigo}`);
    const docente = await this.docenteRepo.findOne({ where: { codigo } });
    if (!docente) {
      this.logger.warn(`⚠️ No se encontró docente con código: ${codigo}`);
      return {
        chat_id: chatId,
        text: `No se encontró un docente con el código ${codigo}. Verifica e intenta nuevamente. Los códigos válidos son del tipo DOC-1001, DOC-1002, etc.`,
      };
    }

    this.logger.log(`✅ Docente encontrado: ${docente.nombres} ${docente.apellidos} (ID: ${docente.id})`);

    let prefs = await this.preferenciasRepo.findOne({
      where: { docente: { id: docente.id } },
    });
    if (!prefs) {
      this.logger.log("📝 Creando nuevas preferencias de notificación...");
      prefs = this.preferenciasRepo.create({
        docente,
        canal_correo: true,
        canal_telegram: true,
      });
    }
    prefs.canal_telegram = true;
    prefs.telegram_chat_id = String(chatId);
    await this.preferenciasRepo.save(prefs);

    this.logger.log("✅ Preferencias guardadas exitosamente");

    return {
      chat_id: chatId,
      text: `Hola ${docente.nombres} ${docente.apellidos}, tu chat ha sido registrado exitosamente. Ahora recibirás notificaciones por este canal.`,
    };
  }

  private async handleMiHorario(
    chatId: number,
    text: string,
  ): Promise<{ chat_id: number; text: string; parse_mode?: string }> {
    const parts = text.split(/\s+/);
    const periodo = parts[1]?.trim();

    const prefs = await this.preferenciasRepo.findOne({
      where: { telegram_chat_id: String(chatId) },
      relations: ["docente"],
    });
    if (!prefs) {
      return {
        chat_id: chatId,
        text: "No estás registrado. Usa /start <codigo_docente> para vincular tu cuenta.",
      };
    }

    const docenteId = prefs.docente?.id;
    if (!docenteId) {
      return {
        chat_id: chatId,
        text: "No se pudo determinar tu cuenta de docente.",
      };
    }

    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) {
      return { chat_id: chatId, text: "Docente no encontrado." };
    }

    const targetPeriodo = periodo || (await this.inferirPeriodoActivo());
    if (!targetPeriodo) {
      return {
        chat_id: chatId,
        text: "No se pudo determinar el periodo activo. Especifica uno: /mihorario 2026-I",
      };
    }

    const horarios = await this.horarioRepo.find({
      where: { docente_id: docenteId, periodo: targetPeriodo },
      relations: ["curso", "ambiente", "grupo"],
      order: { dia: "ASC", hora_inicio: "ASC" },
    });

    if (horarios.length === 0) {
      return {
        chat_id: chatId,
        text: `No tienes horarios asignados para el periodo ${targetPeriodo}.`,
      };
    }

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
    const lines = [
      `*Horario ${targetPeriodo} — ${docente.nombres} ${docente.apellidos}*`,
    ];
    lines.push("");
    for (const h of horarios) {
      const dia = dias[h.dia] || h.dia;
      lines.push(`• *${dia}* ${h.hora_inicio}–${h.hora_fin}`);
      lines.push(
        `  ${h.curso?.nombre || "Curso"} | ${h.ambiente?.codigo || "Ambiente"} | Grupo ${h.grupo?.nombre || "?"}`,
      );
    }
    lines.push("");
    lines.push(`Total: ${horarios.length} asignaciones`);

    return { chat_id: chatId, text: lines.join("\n"), parse_mode: "Markdown" };
  }

  private async handleVentana(
    chatId: number,
  ): Promise<{ chat_id: number; text: string }> {
    const prefs = await this.preferenciasRepo.findOne({
      where: { telegram_chat_id: String(chatId) },
      relations: ["docente"],
    });
    if (!prefs) {
      return {
        chat_id: chatId,
        text: "No estás registrado. Usa /start <codigo_docente> para vincular tu cuenta.",
      };
    }

    const docenteId = prefs.docente?.id;
    if (!docenteId) {
      return {
        chat_id: chatId,
        text: "No se pudo determinar tu cuenta de docente.",
      };
    }

    const siguiente = await this.ventanaRepo
      .createQueryBuilder("ventana")
      .leftJoinAndSelect(ColaDocente, "cola", "cola.ventana_id = ventana.id")
      .where("ventana.estado IN (:...estados)", {
        estados: [
          EstadoVentanaAtencion.PROGRAMADA,
          EstadoVentanaAtencion.EN_CURSO,
        ],
      })
      .andWhere("cola.docente_id = :docenteId", { docenteId })
      .orderBy("ventana.fecha", "ASC")
      .addOrderBy("ventana.hora_inicio", "ASC")
      .getOne();

    if (!siguiente) {
      return {
        chat_id: chatId,
        text: "No tienes ventanas de atención programadas próximamente.",
      };
    }

    const fechaStr = new Date(siguiente.fecha).toLocaleDateString("es-PE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const estadoStr =
      siguiente.estado === EstadoVentanaAtencion.EN_CURSO
        ? "🟢 EN CURSO"
        : "📅 PROGRAMADA";

    return {
      chat_id: chatId,
      text: `Tu próxima ventana de atención:\n\n📆 ${fechaStr}\n🕐 ${siguiente.hora_inicio} – ${siguiente.hora_fin}\n📂 Categoría: ${siguiente.proposito}\n📝 Estado: ${estadoStr}`,
    };
  }

  private async inferirPeriodoActivo(): Promise<string | null> {
    // Busca periodos con estado activo o simplemente el último por fecha de inicio
    const { PeriodoAcademico } =
      await import("../entities/periodo-academico.entity");
    const repo = this.preferenciasRepo.manager.getRepository(PeriodoAcademico);
    const periodo = await repo.findOne({
      where: { activo: true },
      order: { fecha_inicio: "DESC" },
    });
    return periodo?.codigo || null;
  }
}
