import {
  Controller,
  Get,
  Post,
  Put,
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
import { CreateTurnoDto } from "./dto/create-turno.dto";
import { UpsertDiaActivoDto } from "./dto/upsert-dia-activo.dto";
import { UpsertParametrosCargaDto } from "./dto/upsert-parametros-carga.dto";
import { UpdateConfiguracionGeneralDto } from "./dto/update-configuracion-general.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Public } from "../auth/decorators/public.decorator";
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
  @ApiResponse({
    status: 409,
    description: "La fecha ya está registrada para ese período",
  })
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

  // ─── TURNOS HORARIOS ─────────────────────────────────────────────────────

  @Get("turnos")
  @ApiOperation({ summary: "Listar todos los turnos horarios" })
  @ApiResponse({ status: 200, description: "Lista de turnos" })
  async findTurnos() {
    const data = await this.configuracionService.findTurnos();
    return {
      data,
      message: "Turnos obtenidos correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("turnos")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Crear un turno horario" })
  @ApiResponse({ status: 201, description: "Turno creado" })
  @ApiResponse({
    status: 409,
    description: "El turno se superpone con uno existente",
  })
  async createTurno(
    @Body() dto: CreateTurnoDto,
    @CurrentUser() usuario: Usuario,
    @Req() req: Request,
  ) {
    const data = await this.configuracionService.createTurno(dto);
    await this.auditLogService.log({
      usuario: usuario?.email ?? "sistema",
      accion: "CREAR_TURNO",
      entidad: "turno_horario",
      entidadId: data.id,
      ip: this.getIp(req),
    });
    return {
      data,
      message: "Turno creado exitosamente",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Delete("turnos/:id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar un turno horario" })
  @ApiParam({ name: "id", type: Number })
  async removeTurno(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
    @Req() req: Request,
  ) {
    await this.configuracionService.removeTurno(id);
    await this.auditLogService.log({
      usuario: usuario?.email ?? "sistema",
      accion: "ELIMINAR_TURNO",
      entidad: "turno_horario",
      entidadId: id,
      ip: this.getIp(req),
    });
    return {
      data: null,
      message: "Turno eliminado correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  // ─── DÍAS ACTIVOS ─────────────────────────────────────────────────────────

  @Get("dias-activos")
  @ApiOperation({
    summary: "Listar configuración de días activos (1=Lunes…7=Domingo)",
  })
  async findDiasActivos() {
    const data = await this.configuracionService.findDiasActivos();
    return {
      data,
      message: "Días activos obtenidos correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("dias-activos")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Activar o desactivar un día de la semana" })
  async upsertDiaActivo(
    @Body() dto: UpsertDiaActivoDto,
    @CurrentUser() usuario: Usuario,
    @Req() req: Request,
  ) {
    const data = await this.configuracionService.upsertDiaActivo(dto);
    await this.auditLogService.log({
      usuario: usuario?.email ?? "sistema",
      accion: "ACTUALIZAR_DIA_ACTIVO",
      entidad: "dia_activo",
      entidadId: data.id,
      ip: this.getIp(req),
    });
    return {
      data,
      message: "Día actualizado correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  // ─── PARÁMETROS DE CARGA ──────────────────────────────────────────────────

  @Get("parametros-carga")
  @ApiOperation({ summary: "Obtener parámetros de carga docente del período" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async findParametrosCarga(@Query("periodo") periodo: string) {
    const data = await this.configuracionService.findParametrosCarga(periodo);
    return {
      data,
      message: "Parámetros de carga obtenidos",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("parametros-carga")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Crear o actualizar parámetros de carga docente" })
  async upsertParametrosCarga(
    @Body() dto: UpsertParametrosCargaDto,
    @CurrentUser() usuario: Usuario,
    @Req() req: Request,
  ) {
    const data = await this.configuracionService.upsertParametrosCarga(dto);
    await this.auditLogService.log({
      usuario: usuario?.email ?? "sistema",
      accion: "UPSERT_PARAMETROS_CARGA",
      entidad: "parametros_carga",
      entidadId: data.id,
      ip: this.getIp(req),
    });
    return {
      data,
      message: "Parámetros de carga guardados correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Delete("parametros-carga/:id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar parámetro de carga por ID" })
  @ApiParam({ name: "id", type: Number })
  async deleteParametrosCarga(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
    @Req() req: Request,
  ) {
    await this.configuracionService.deleteParametrosCarga(id);
    await this.auditLogService.log({
      usuario: usuario?.email ?? "sistema",
      accion: "ELIMINAR_PARAMETROS_CARGA",
      entidad: "parametros_carga",
      entidadId: id,
      ip: this.getIp(req),
    });
    return {
      data: null,
      message: "Parámetro de carga eliminado correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  // ─── CONFIGURACIÓN GENERAL ────────────────────────────────────────────────

  @Get("general")
  @Public()
  @ApiOperation({ summary: "Obtener configuración general institucional" })
  async getConfiguracionGeneral() {
    const data = await this.configuracionService.getConfiguracionGeneral();
    return {
      data,
      message: "Configuración general obtenida",
      statusCode: HttpStatus.OK,
    };
  }

  @Put("general")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Actualizar nombre institucional, logo y colores" })
  async updateConfiguracionGeneral(
    @Body() dto: UpdateConfiguracionGeneralDto,
    @CurrentUser() usuario: Usuario,
    @Req() req: Request,
  ) {
    const data =
      await this.configuracionService.updateConfiguracionGeneral(dto);
    await this.auditLogService.log({
      usuario: usuario?.email ?? "sistema",
      accion: "ACTUALIZAR_CONFIGURACION_GENERAL",
      entidad: "configuracion_general",
      entidadId: data.id,
      ip: this.getIp(req),
    });
    return {
      data,
      message: "Configuración general actualizada",
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
