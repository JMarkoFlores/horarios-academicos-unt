import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";
import { NotificacionesService } from "./notificaciones.service";
import { TelegramBotService } from "./telegram-bot.service";
import { UpdatePreferenciasDto } from "./dto/update-preferencias.dto";
import { QueryNotificacionesDto } from "./dto/query-notificaciones.dto";
import { QueryEstadisticasDto } from "./dto/query-estadisticas.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { ConfigService } from "@nestjs/config";

@ApiTags("notificaciones")
@Controller("notificaciones")
export class NotificacionesController {
  private readonly logger = new Logger(NotificacionesController.name);

  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly telegramBotService: TelegramBotService,
    private readonly configService: ConfigService,
  ) {}

  @Get("docente/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Historial de notificaciones de un docente" })
  @ApiParam({ name: "id", type: Number })
  async getHistorial(
    @Param("id", ParseIntPipe) id: number,
    @Query() query: QueryNotificacionesDto,
  ) {
    const result = await this.notificacionesService.getHistorial(
      id,
      query.page ?? 1,
      query.limit ?? 20,
    );
    return { data: result, message: "Historial obtenido" };
  }

  @Get("preferencias/:docenteId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Obtener preferencias de notificación del docente" })
  @ApiParam({ name: "docenteId", type: Number })
  async getPreferencias(@Param("docenteId", ParseIntPipe) docenteId: number) {
    const result = await this.notificacionesService.getPreferencias(docenteId);
    return { data: result, message: "Preferencias obtenidas" };
  }

  @Put("preferencias/:docenteId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Guardar preferencias de notificación del docente" })
  @ApiParam({ name: "docenteId", type: Number })
  async upsertPreferencias(
    @Param("docenteId", ParseIntPipe) docenteId: number,
    @Body() dto: UpdatePreferenciasDto,
  ) {
    this.logger.log(
      `Recibiendo DTO para guardar preferencias: ${JSON.stringify(dto)}`,
    );
    const result = await this.notificacionesService.upsertPreferencias(
      docenteId,
      dto,
    );
    return { data: result, message: "Preferencias actualizadas" };
  }

  @Post("probar/:docenteId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.DOCENTE)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Enviar notificación de prueba" })
  @ApiParam({ name: "docenteId", type: Number })
  async enviarPrueba(@Param("docenteId", ParseIntPipe) docenteId: number) {
    await this.notificacionesService.enviarNotificacionPrueba(docenteId);
    return { message: "Notificación de prueba enviada" };
  }

  @Post("test-cola/:docenteId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Probar cola Bull con job inmediato" })
  @ApiParam({ name: "docenteId", type: Number })
  async testCola(@Param("docenteId", ParseIntPipe) docenteId: number) {
    await this.notificacionesService.testJobCola(docenteId);
    return {
      message: "Job de prueba agregado a la cola (ejecución inmediata)",
    };
  }

  @Get("estadisticas")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Resumen de envíos por periodo" })
  @ApiQuery({ name: "periodo", required: false, type: String })
  async getEstadisticas(@Query() query: QueryEstadisticasDto) {
    const result = await this.notificacionesService.getEstadisticas(
      query.periodo,
    );
    return { data: result, message: "Estadísticas obtenidas" };
  }

  @Post("telegram/webhook")
  @ApiOperation({ summary: "Webhook receptor del bot de Telegram" })
  async telegramWebhook(@Body() update: unknown) {
    this.logger?.log("📨 Webhook de Telegram recibido!");
    const response = await this.telegramBotService.handleUpdate(update);
    if (response) {
      const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
      this.logger?.log(`🔑 Token encontrado: ${token ? "SI" : "NO"}`);
      if (token) {
        this.logger?.log("📤 Enviando mensaje a Telegram...");
        try {
          const result = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            },
          );
          const data = await result.json();
          this.logger?.log(`✅ Mensaje enviado: ${JSON.stringify(data)}`);
        } catch (error) {
          this.logger?.error(`❌ Error al enviar mensaje: ${error}`);
        }
      }
    }
    return { ok: true };
  }

  @Get("telegram/me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Obtener información del bot de Telegram" })
  async getTelegramBotInfo() {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new BadRequestException("TELEGRAM_BOT_TOKEN no configurado");
    }
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/getMe`,
      );
      const data = await response.json();
      if (!data.ok) {
        throw new BadRequestException(`Error de Telegram: ${data.description}`);
      }
      return { data: data.result, message: "Información del bot obtenida" };
    } catch (error) {
      throw new BadRequestException(`Error al obtener info del bot: ${error}`);
    }
  }

  @Post("telegram/webhook/set")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Configurar el webhook del bot de Telegram" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL del webhook (ej: https://tu-backend.com/notificaciones/telegram/webhook)" },
      },
      required: ["url"],
    },
  })
  async setTelegramWebhook(@Body() body: { url: string }) {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new BadRequestException("TELEGRAM_BOT_TOKEN no configurado");
    }
    if (!body.url) {
      throw new BadRequestException("URL del webhook es requerida");
    }
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: body.url }),
        },
      );
      const data = await response.json();
      if (!data.ok) {
        throw new BadRequestException(`Error de Telegram: ${data.description}`);
      }
      return { data: data.result, message: "Webhook configurado exitosamente" };
    } catch (error) {
      throw new BadRequestException(`Error al configurar webhook: ${error}`);
    }
  }

  @Get("telegram/webhook/info")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Obtener información del webhook configurado" })
  async getTelegramWebhookInfo() {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new BadRequestException("TELEGRAM_BOT_TOKEN no configurado");
    }
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/getWebhookInfo`,
      );
      const data = await response.json();
      if (!data.ok) {
        throw new BadRequestException(`Error de Telegram: ${data.description}`);
      }
      return { data: data.result, message: "Información del webhook obtenida" };
    } catch (error) {
      throw new BadRequestException(`Error al obtener info del webhook: ${error}`);
    }
  }
}
