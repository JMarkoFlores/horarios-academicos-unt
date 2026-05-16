import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { NotificacionesService } from "./notificaciones.service";
import { UpdatePreferenciasDto } from "./dto/update-preferencias.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("notificaciones")
@Controller("notificaciones")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT")
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get("docente/:id")
  @ApiOperation({ summary: "Historial de notificaciones de un docente" })
  @ApiParam({ name: "id", type: Number })
  async getHistorial(@Param("id", ParseIntPipe) id: number) {
    const result = await this.notificacionesService.getHistorial(id);
    return { data: result, message: "Historial obtenido" };
  }

  @Put("preferencias/:docenteId")
  @ApiOperation({ summary: "Guardar preferencias de notificación del docente" })
  @ApiParam({ name: "docenteId", type: Number })
  async upsertPreferencias(
    @Param("docenteId", ParseIntPipe) docenteId: number,
    @Body() dto: UpdatePreferenciasDto,
  ) {
    const result = await this.notificacionesService.upsertPreferencias(
      docenteId,
      dto,
    );
    return { data: result, message: "Preferencias actualizadas" };
  }
}
