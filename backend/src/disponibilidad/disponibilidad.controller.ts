import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { DisponibilidadService } from "./disponibilidad.service";
import { GuardarDisponibilidadDto } from "./dto/guardar-disponibilidad.dto";
import { CreateRestriccionDto } from "./dto/create-restriccion.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";

@ApiTags("disponibilidad")
@Controller("disponibilidad")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class DisponibilidadController {
  constructor(private readonly disponibilidadService: DisponibilidadService) {}

  @Get("docente/:id")
  @ApiOperation({ summary: "Obtener disponibilidad declarada de un docente" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async getByDocente(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
  ) {
    const result = await this.disponibilidadService.getByDocente(
      id,
      periodo ?? "",
    );
    return { data: result, message: "Disponibilidad obtenida correctamente" };
  }

  @Post("docente/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Guardar disponibilidad masiva de un docente (reemplaza)",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Disponibilidad guardada" })
  async guardarDisponibilidad(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: GuardarDisponibilidadDto,
  ) {
    const result = await this.disponibilidadService.guardarDisponibilidadMasiva(
      id,
      dto,
    );
    return { data: result, message: "Disponibilidad guardada exitosamente" };
  }

  @Get("resumen")
  @ApiOperation({ summary: "Resumen de horas disponibles por docente" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async getResumen(@Query("periodo") periodo: string) {
    const result = await this.disponibilidadService.getResumenDocentes(
      periodo ?? "",
    );
    return { data: result, message: "Resumen de disponibilidad obtenido" };
  }

  @Get("restricciones")
  @ApiOperation({ summary: "Listar restricciones institucionales activas" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async getRestricciones(@Query("periodo") periodo: string) {
    const result = await this.disponibilidadService.getRestricciones(
      periodo ?? "",
    );
    return { data: result, message: "Restricciones obtenidas" };
  }

  @Post("restricciones")
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: "Crear o actualizar una restricción institucional" })
  async upsertRestriccion(@Body() dto: CreateRestriccionDto) {
    const result = await this.disponibilidadService.upsertRestriccion(dto);
    return { data: result, message: "Restricción guardada correctamente" };
  }
}
