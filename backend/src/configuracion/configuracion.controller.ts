import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiCreatedResponse,
} from "@nestjs/swagger";
import { ConfiguracionService } from "./configuracion.service";
import { UpsertRestriccionDto } from "./dto/upsert-restriccion.dto";
import { CreateDiaNoLaborableDto } from "./dto/create-dia-no-laborable.dto";
import { QueryRestriccionDto } from "./dto/query-restriccion.dto";
import { QueryDiaNoLaborableDto } from "./dto/query-dia-no-laborable.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { AuditLogService } from "../common/services/audit-log.service";
import { Usuario } from "../entities/usuario.entity";
import { Request } from "express";

@ApiTags("configuracion")
@Controller("configuracion")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class ConfiguracionController {
  constructor(
    private readonly configuracionService: ConfiguracionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── RESTRICCIONES INSTITUCIONALES ───────────────────────────────────────

  @Get("restricciones")
  @ApiOperation({
    summary: "Listar restricciones institucionales activas",
    description:
      "Devuelve todas las restricciones institucionales activas del período indicado " +
      "(franja horaria, máx horas diarias, bloque de almuerzo, etc.).",
  })
  @ApiQuery({ name: "periodo", required: false, example: "2026-I" })
  @ApiResponse({ status: 200, description: "Lista de restricciones" })
  async findRestricciones(@Query() query: QueryRestriccionDto) {
    const data = await this.configuracionService.findRestricciones(query);
    return {
      data,
      message: "Restricciones institucionales obtenidas correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("restricciones")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Crear o actualizar una restricción institucional",
    description:
      "Si ya existe una restricción del mismo tipo para el período indicado, la actualiza " +
      "(upsert). En caso contrario, la crea. Requiere rol ADMINISTRADOR_SISTEMA o COORDINADOR_ACADEMICO.",
  })
  @ApiResponse({ status: 200, description: "Restricción creada o actualizada" })
  @ApiResponse({ status: 400, description: "Datos de entrada inválidos" })
  async upsertRestriccion(
    @Body() dto: UpsertRestriccionDto,
    @CurrentUser() usuario: Usuario,
    @Req() req: Request,
  ) {
    const { restriccion, created } =
      await this.configuracionService.upsertRestriccion(dto);

    await this.auditLogService.log({
      usuario: usuario?.email ?? "sistema",
      accion: created ? "CREAR_RESTRICCION" : "ACTUALIZAR_RESTRICCION",
      entidad: "restriccion_institucional",
      entidadId: restriccion.id,
      ip: this.getIp(req),
    });

    return {
      data: restriccion,
      message: created
        ? "Restricción creada exitosamente"
        : "Restricción actualizada correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Delete("restricciones/:id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar una restricción institucional" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Restricción eliminada" })
  @ApiResponse({ status: 404, description: "Restricción no encontrada" })
  async removeRestriccion(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
    @Req() req: Request,
  ) {
    await this.configuracionService.removeRestriccion(id);

    await this.auditLogService.log({
      usuario: usuario?.email ?? "sistema",
      accion: "ELIMINAR_RESTRICCION",
      entidad: "restriccion_institucional",
      entidadId: id,
      ip: this.getIp(req),
    });

    return {
      data: null,
      message: "Restricción eliminada correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  // ─── DÍAS NO LABORABLES ───────────────────────────────────────────────────

  @Get("dias-no-laborables")
  @ApiOperation({
    summary: "Listar días no laborables del período",
    description:
      "Devuelve feriados, días de mantenimiento, suspensiones y eventos " +
      "sin clases del período académico indicado.",
  })
  @ApiQuery({ name: "periodo", required: false, example: "2026-I" })
  @ApiResponse({ status: 200, description: "Lista de días no laborables" })
  async findDiasNoLaborables(@Query() query: QueryDiaNoLaborableDto) {
    const data = await this.configuracionService.findDiasNoLaborables(query);
    return {
      data,
      message: "Días no laborables obtenidos correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("dias-no-laborables")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({
    summary: "Registrar un día no laborable",
    description:
      "Registra un feriado, día de mantenimiento, suspensión u otro evento sin clases. " +
      "No se permite registrar dos veces la misma fecha para el mismo período. " +
      "Requiere rol ADMINISTRADOR_SISTEMA o COORDINADOR_ACADEMICO.",
  })
  @ApiCreatedResponse({ description: "Día no laborable registrado" })
  @ApiResponse({ status: 409, description: "La fecha ya está registrada para ese período" })
  async createDiaNoLaborable(
    @Body() dto: CreateDiaNoLaborableDto,
    @CurrentUser() usuario: Usuario,
    @Req() req: Request,
  ) {
    const data = await this.configuracionService.createDiaNoLaborable(dto);

    await this.auditLogService.log({
      usuario: usuario?.email ?? "sistema",
      accion: "CREAR_DIA_NO_LABORABLE",
      entidad: "dia_no_laborable",
      entidadId: data.id,
      ip: this.getIp(req),
    });

    return {
      data,
      message: "Día no laborable registrado exitosamente",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Delete("dias-no-laborables/:id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar un día no laborable" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Día no laborable eliminado" })
  @ApiResponse({ status: 404, description: "Día no laborable no encontrado" })
  async removeDiaNoLaborable(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
    @Req() req: Request,
  ) {
    await this.configuracionService.removeDiaNoLaborable(id);

    await this.auditLogService.log({
      usuario: usuario?.email ?? "sistema",
      accion: "ELIMINAR_DIA_NO_LABORABLE",
      entidad: "dia_no_laborable",
      entidadId: id,
      ip: this.getIp(req),
    });

    return {
      data: null,
      message: "Día no laborable eliminado correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  // ─── AUXILIAR ─────────────────────────────────────────────────────────────

  private getIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0].trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? "desconocida";
  }
}
