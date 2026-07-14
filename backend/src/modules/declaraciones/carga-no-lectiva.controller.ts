import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";
import { CargaNoLectivaService } from "./carga-no-lectiva.service";
import {
  CreateActividadNoLectivaDto,
  UpdateActividadNoLectivaDto,
  CreateHorarioNoLectivoDto,
  UpdateHorarioNoLectivoDto,
} from "./dto/actividad-no-lectiva.dto";

@ApiTags("carga-no-lectiva")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("carga-no-lectiva")
export class CargaNoLectivaController {
  constructor(private readonly cargaNoLectivaService: CargaNoLectivaService) {}

  // ── Actividades No Lectivas ─────────────────────────────────────────────

  @Get("declaracion/:declaracionId")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({
    summary: "Obtener actividades no lectivas de una declaración",
  })
  @ApiResponse({
    status: 200,
    description: "Actividades obtenidas exitosamente",
  })
  async getActividadesByDeclaracion(
    @Param("declaracionId") declaracionId: string,
  ) {
    const id = parseInt(declaracionId);
    const actividades =
      await this.cargaNoLectivaService.getActividadesByDeclaracion(id);
    return {
      data: actividades,
      message: "Actividades obtenidas exitosamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("actividad/:id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Obtener una actividad no lectiva por ID" })
  @ApiResponse({ status: 200, description: "Actividad obtenida exitosamente" })
  @ApiResponse({ status: 404, description: "Actividad no encontrada" })
  async getActividadById(@Param("id") id: string) {
    const actividadId = parseInt(id);
    const actividad =
      await this.cargaNoLectivaService.getActividadById(actividadId);
    return {
      data: actividad,
      message: "Actividad obtenida exitosamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("actividad/:id/resumen")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Obtener resumen detallado de una actividad" })
  @ApiResponse({ status: 200, description: "Resumen obtenido exitosamente" })
  async getResumenActividad(@Param("id") id: string) {
    const actividadId = parseInt(id);
    const resumen =
      await this.cargaNoLectivaService.getResumenActividad(actividadId);
    return {
      data: resumen,
      message: "Resumen obtenido exitosamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("declaracion/:declaracionId/resumen")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({
    summary: "Obtener resumen completo de carga no lectiva de una declaración",
  })
  @ApiResponse({ status: 200, description: "Resumen obtenido exitosamente" })
  async getResumenDeclaracion(@Param("declaracionId") declaracionId: string) {
    const id = parseInt(declaracionId);
    const resumen = await this.cargaNoLectivaService.getResumenDeclaracion(id);
    return {
      data: resumen,
      message: "Resumen obtenido exitosamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("declaracion/:declaracionId/actividad")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Crear una nueva actividad no lectiva" })
  @ApiResponse({ status: 201, description: "Actividad creada exitosamente" })
  @ApiResponse({ status: 400, description: "Datos inválidos" })
  async createActividad(
    @Param("declaracionId") declaracionId: string,
    @Body() dto: CreateActividadNoLectivaDto,
  ) {
    const id = parseInt(declaracionId);
    const actividad = await this.cargaNoLectivaService.createActividad(id, dto);
    return {
      data: actividad,
      message: "Actividad creada exitosamente",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Put("actividad/:id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Actualizar una actividad no lectiva" })
  @ApiResponse({
    status: 200,
    description: "Actividad actualizada exitosamente",
  })
  @ApiResponse({ status: 404, description: "Actividad no encontrada" })
  async updateActividad(
    @Param("id") id: string,
    @Body() dto: UpdateActividadNoLectivaDto,
  ) {
    const actividadId = parseInt(id);
    const actividad = await this.cargaNoLectivaService.updateActividad(
      actividadId,
      dto,
    );
    return {
      data: actividad,
      message: "Actividad actualizada exitosamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Delete("actividad/:id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Eliminar una actividad no lectiva" })
  @ApiResponse({ status: 200, description: "Actividad eliminada exitosamente" })
  @ApiResponse({ status: 404, description: "Actividad no encontrada" })
  async deleteActividad(@Param("id") id: string) {
    const actividadId = parseInt(id);
    await this.cargaNoLectivaService.deleteActividad(actividadId);
    return {
      data: null,
      message: "Actividad eliminada exitosamente",
      statusCode: HttpStatus.OK,
    };
  }

  // ── Horarios No Lectivos ─────────────────────────────────────────────────

  @Post("actividad/:actividadId/horario")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Agregar un horario a una actividad no lectiva" })
  @ApiResponse({ status: 201, description: "Horario agregado exitosamente" })
  @ApiResponse({
    status: 400,
    description: "Datos inválidos o excede horas disponibles",
  })
  async addHorario(
    @Param("actividadId") actividadId: string,
    @Body() dto: CreateHorarioNoLectivoDto,
  ) {
    const id = parseInt(actividadId);
    const horario = await this.cargaNoLectivaService.addHorarioToActividad(
      id,
      dto,
    );
    return {
      data: horario,
      message: "Horario agregado exitosamente",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Put("horario/:id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Actualizar un horario no lectivo" })
  @ApiResponse({ status: 200, description: "Horario actualizado exitosamente" })
  @ApiResponse({ status: 404, description: "Horario no encontrado" })
  async updateHorario(
    @Param("id") id: string,
    @Body() dto: UpdateHorarioNoLectivoDto,
  ) {
    const horarioId = parseInt(id);
    const horario = await this.cargaNoLectivaService.updateHorario(
      horarioId,
      dto,
    );
    return {
      data: horario,
      message: "Horario actualizado exitosamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Delete("horario/:id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Eliminar un horario no lectivo" })
  @ApiResponse({ status: 200, description: "Horario eliminado exitosamente" })
  @ApiResponse({ status: 404, description: "Horario no encontrado" })
  async deleteHorario(@Param("id") id: string) {
    const horarioId = parseInt(id);
    await this.cargaNoLectivaService.deleteHorario(horarioId);
    return {
      data: null,
      message: "Horario eliminado exitosamente",
      statusCode: HttpStatus.OK,
    };
  }
}
