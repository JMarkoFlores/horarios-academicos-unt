import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
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
import { AmbientesService } from "./ambientes.service";
import { CreateAmbienteDto } from "./dto/create-ambiente.dto";
import { UpdateAmbienteDto } from "./dto/update-ambiente.dto";
import { QueryAmbienteDto } from "./dto/query-ambiente.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { FindDisponiblesDto } from "./dto/find-disponibles.dto";

@ApiTags("ambientes")
@Controller("ambientes")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class AmbientesController {
  constructor(private readonly ambientesService: AmbientesService) {}

  @Get("disponibles")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_ESCUELA, RolUsuario.DOCENTE)
  @ApiOperation({ summary: "Buscar ambientes disponibles por tipo, día y rango horario" })
  async findDisponibles(@Query() query: FindDisponiblesDto) {
    const result = await this.ambientesService.findDisponibles(query);
    return { data: result, message: "Ambientes disponibles obtenidos correctamente" };
  }


  @Get()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Listar ambientes paginado con filtros" })
  @ApiQuery({ name: "tipo", required: false, description: "AULA, LABORATORIO, AUDITORIO, TALLER, SEMINARIO, SALA_COMPUTACION" })
  @ApiQuery({ name: "estado", required: false, description: "ACTIVO, MANTENIMIENTO, RESERVADO, INACTIVO" })
  @ApiQuery({ name: "busqueda", required: false, description: "Búsqueda por código, nombre, pabellón o equipamiento" })
  @ApiQuery({ name: "pabellon", required: false })
  @ApiQuery({ name: "sede", required: false })
  @ApiQuery({ name: "capacidadMin", required: false, type: Number })
  @ApiQuery({ name: "capacidadMax", required: false, type: Number })
  @ApiQuery({ name: "activo", required: false, description: "Deprecated, usar estado" })
  async findAll(@Query() query: QueryAmbienteDto) {
    const result = await this.ambientesService.findAll(query);
    return { data: result, message: "Ambientes obtenidos correctamente" };
  }

  @Get("mapa")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Listar ambientes activos con coordenadas para mapa" })
  @ApiResponse({ status: 200, description: "Lista de ambientes con id, nombre, coordX, coordY, edificio, capacidad" })
  async findMapa() {
    const result = await this.ambientesService.findMapa();
    return { data: result, message: "Ambientes para mapa obtenidos correctamente" };
  }

  @Get("distancia")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Calcular distancia entre dos ambientes" })
  @ApiQuery({ name: "origenId", required: true, type: Number })
  @ApiQuery({ name: "destinoId", required: true, type: Number })
  async getDistancia(
    @Query("origenId", ParseIntPipe) origenId: number,
    @Query("destinoId", ParseIntPipe) destinoId: number,
  ) {
    const result = await this.ambientesService.getDistanciaEntreAmbientes(
      origenId,
      destinoId,
    );
    return {
      data: result,
      message: "Distancia entre ambientes calculada correctamente",
    };
  }

  @Get("alertas-traslado")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Obtener alertas de traslado entre horarios consecutivos de un docente" })
  @ApiQuery({ name: "docenteId", required: true, type: Number })
  @ApiQuery({ name: "periodoId", required: true, type: Number })
  async getAlertasTraslado(
    @Query("docenteId", ParseIntPipe) docenteId: number,
    @Query("periodoId", ParseIntPipe) periodoId: number,
  ) {
    const result = await this.ambientesService.getAlertasTrasladoDocente(
      docenteId,
      periodoId,
    );
    return {
      data: result,
      message: "Alertas de traslado obtenidas correctamente",
    };
  }

  @Get(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Obtener un ambiente por ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 404, description: "Ambiente no encontrado" })
  async findOne(@Param("id", ParseIntPipe) id: number) {
    const result = await this.ambientesService.findOne(id);
    return { data: result, message: "Ambiente encontrado" };
  }

  @Get(":id/disponibilidad")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Grilla semanal de ocupación de un ambiente" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getDisponibilidad(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(200), ParseIntPipe) limit: number,
  ) {
    const result = await this.ambientesService.getDisponibilidad(
      id,
      periodo ?? "",
      page,
      limit,
    );
    return { data: result, message: "Disponibilidad del ambiente obtenida" };
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Crear nuevo ambiente" })
  @ApiResponse({ status: 409, description: "Código de ambiente duplicado" })
  async create(@Body() dto: CreateAmbienteDto) {
    const result = await this.ambientesService.create(dto);
    return { data: result, message: "Ambiente creado exitosamente" };
  }

  @Patch(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Actualizar datos de un ambiente" })
  @ApiParam({ name: "id", type: Number })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAmbienteDto,
  ) {
    const result = await this.ambientesService.update(id, dto);
    return { data: result, message: "Ambiente actualizado correctamente" };
  }

  @Delete(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Desactivar un ambiente (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: false, description: "Período activo para verificar dependencias" })
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo?: string,
  ) {
    await this.ambientesService.remove(id, periodo);
    return { data: null, message: "Ambiente desactivado correctamente" };
  }
}
