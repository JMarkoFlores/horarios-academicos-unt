import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { TurnoConfigService } from "./turno-config.service";
import { TurnoConfig } from "../entities/turno-config.entity";

@ApiTags("turno-config")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("turno-config")
export class TurnoConfigController {
  constructor(private readonly turnoConfigService: TurnoConfigService) {}

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Obtener configuración de turnos activos" })
  @ApiQuery({ name: "facultad_id", required: false, type: Number })
  async obtenerTurnos(@Query("facultad_id") facultadId?: number) {
    const data = await this.turnoConfigService.obtenerTurnosActivos(facultadId);
    return { data, message: "Turnos obtenidos", statusCode: HttpStatus.OK };
  }

  @Get(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @ApiOperation({ summary: "Obtener configuración de turno por ID" })
  async obtenerTurno(@Param("id") id: string) {
    const data = await this.turnoConfigService.obtenerTurnoPorId(Number(id));
    return { data, message: "Turno obtenido", statusCode: HttpStatus.OK };
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Crear configuración de turno" })
  @ApiResponse({ status: 201, description: "Turno creado" })
  async crearTurno(@Body() config: Partial<TurnoConfig>) {
    const data = await this.turnoConfigService.crearTurnoConfig(config);
    return { data, message: "Turno creado", statusCode: HttpStatus.CREATED };
  }

  @Put(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Actualizar configuración de turno" })
  async actualizarTurno(
    @Param("id") id: string,
    @Body() config: Partial<TurnoConfig>,
  ) {
    const data = await this.turnoConfigService.actualizarTurnoConfig(
      Number(id),
      config,
    );
    return { data, message: "Turno actualizado", statusCode: HttpStatus.OK };
  }

  @Delete(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Eliminar configuración de turno" })
  @HttpCode(HttpStatus.OK)
  async eliminarTurno(@Param("id") id: string) {
    await this.turnoConfigService.eliminarTurnoConfig(Number(id));
    return { data: null, message: "Turno eliminado", statusCode: HttpStatus.OK };
  }

  @Post("aplicar")
  @Roles(RolUsuario.DOCENTE, RolUsuario.SECRETARIA)
  @ApiOperation({ summary: "Aplicar turnos seleccionados a disponibilidad de docente" })
  @ApiResponse({ status: 200, description: "Turnos aplicados correctamente" })
  async aplicarTurnos(
    @Body()
    body: {
      turno_ids: number[];
      docente_id: number;
      periodo: string;
    },
  ) {
    await this.turnoConfigService.aplicarTurnosADocente(
      body.turno_ids,
      body.docente_id,
      body.periodo,
    );
    return {
      data: null,
      message: "Turnos aplicados correctamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("inicializar")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @ApiOperation({ summary: "Inicializar turnos por defecto para UNT" })
  @HttpCode(HttpStatus.OK)
  async inicializarTurnos() {
    await this.turnoConfigService.inicializarTurnosPorDefecto();
    return {
      data: null,
      message: "Turnos inicializados correctamente",
      statusCode: HttpStatus.OK,
    };
  }
}
