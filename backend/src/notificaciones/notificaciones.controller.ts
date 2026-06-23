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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
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

@ApiTags("notificaciones")
@Controller("notificaciones")
export class NotificacionesController {
  private readonly logger = new Logger(NotificacionesController.name);

  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly telegramBotService: TelegramBotService,
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
    this.logger.log(`Recibiendo DTO para guardar preferencias: ${JSON.stringify(dto)}`);
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
      const token = process.env.TELEGRAM_BOT_TOKEN;
      this.logger?.log(`🔑 Token encontrado: ${token ? "SI" : "NO"}`);
      if (token) {
        this.logger?.log("📤 Enviando mensaje a Telegram...");
        try {
          const result = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const data = await result.json();
          this.logger?.log(`✅ Mensaje enviado: ${JSON.stringify(data)}`);
        } catch (error) {
          this.logger?.error(`❌ Error al enviar mensaje: ${error}`);
        }
      }
    }
    return { ok: true };
  }
}
