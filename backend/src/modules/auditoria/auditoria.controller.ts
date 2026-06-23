import { Controller, Get, HttpStatus, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";
import { AuditoriaService } from "./auditoria.service";
import { EntidadAuditoriaCarga, AccionAuditoriaCarga } from "../../entities/auditoria-carga.entity";

@ApiTags("auditoria")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("auditoria")
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_DEPARTAMENTO, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Obtener historial de auditoría" })
  @ApiQuery({ name: "periodo", required: false, type: String })
  @ApiQuery({ name: "usuario_id", required: false, type: Number })
  @ApiQuery({ name: "accion", required: false, type: String })
  @ApiQuery({ name: "desde", required: false, type: String })
  @ApiQuery({ name: "hasta", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Historial obtenido exitosamente" })
  async getHistorial(
    @Query("periodo") periodo?: string,
    @Query("usuario_id") usuarioId?: string,
    @Query("accion") accion?: string,
    @Query("desde") desde?: string,
    @Query("hasta") hasta?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const filtros = {
      periodo,
      usuario_id: usuarioId ? Number(usuarioId) : undefined,
      accion,
      desde,
      hasta,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    const data = await this.auditoriaService.getHistorial(filtros);

    return {
      data,
      message: "Historial obtenido",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("carga")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_DEPARTAMENTO, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Obtener historial de auditoría de carga académica" })
  @ApiQuery({ name: "periodo", required: false, type: String })
  @ApiQuery({ name: "usuario_id", required: false, type: Number })
  @ApiQuery({ name: "entidad", required: false, enum: EntidadAuditoriaCarga })
  @ApiQuery({ name: "accion", required: false, enum: AccionAuditoriaCarga })
  @ApiQuery({ name: "desde", required: false, type: String })
  @ApiQuery({ name: "hasta", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Historial de carga académica obtenido exitosamente" })
  async getHistorialCarga(
    @Query("periodo") periodo?: string,
    @Query("usuario_id") usuarioId?: string,
    @Query("entidad") entidad?: EntidadAuditoriaCarga,
    @Query("accion") accion?: AccionAuditoriaCarga,
    @Query("desde") desde?: string,
    @Query("hasta") hasta?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const filtros = {
      periodo,
      usuario_id: usuarioId ? Number(usuarioId) : undefined,
      entidad,
      accion,
      desde,
      hasta,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    const data = await this.auditoriaService.getHistorialCarga(filtros);

    return {
      data,
      message: "Historial de carga académica obtenido",
      statusCode: HttpStatus.OK,
    };
  }
}
