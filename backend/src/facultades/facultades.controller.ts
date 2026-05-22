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
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { FacultadesService } from "./facultades.service";
import { CreateFacultadDto } from "./dto/create-facultad.dto";
import { UpdateFacultadDto } from "./dto/update-facultad.dto";
import { CreateEscuelaDto } from "./dto/create-escuela.dto";
import { UpdateEscuelaDto } from "./dto/update-escuela.dto";
import { CreateDepartamentoDto } from "./dto/create-departamento.dto";
import { UpdateDepartamentoDto } from "./dto/update-departamento.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";

const ADMIN_COORD = [RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO];

@ApiTags("facultades")
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class FacultadesController {
  constructor(private readonly service: FacultadesService) {}

  // ── FACULTADES ────────────────────────────────────────────────────────────

  @Get("facultades")
  @Roles(...ADMIN_COORD, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Listar todas las facultades" })
  async findAllFacultades() {
    return { data: await this.service.findAllFacultades() };
  }

  @Get("facultades/:id")
  @Roles(...ADMIN_COORD, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Obtener facultad por ID con sus escuelas" })
  async findOneFacultad(@Param("id", ParseIntPipe) id: number) {
    return { data: await this.service.findOneFacultad(id) };
  }

  @Post("facultades")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @ApiOperation({ summary: "Crear facultad" })
  @ApiResponse({ status: 201 })
  async createFacultad(@Body() dto: CreateFacultadDto) {
    return { data: await this.service.createFacultad(dto), message: "Facultad creada correctamente" };
  }

  @Patch("facultades/:id")
  @Roles(...ADMIN_COORD)
  @ApiOperation({ summary: "Actualizar facultad" })
  async updateFacultad(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateFacultadDto,
  ) {
    return { data: await this.service.updateFacultad(id, dto), message: "Facultad actualizada" };
  }

  @Delete("facultades/:id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar facultad (sin escuelas)" })
  async removeFacultad(@Param("id", ParseIntPipe) id: number) {
    await this.service.removeFacultad(id);
    return { message: "Facultad eliminada correctamente" };
  }

  // ── ESCUELAS ──────────────────────────────────────────────────────────────

  @Get("escuelas")
  @Roles(...ADMIN_COORD, RolUsuario.DIRECTOR_ESCUELA)
  @ApiQuery({ name: "facultad_id", required: false, type: Number })
  @ApiOperation({ summary: "Listar escuelas, opcionalmente por facultad" })
  async findAllEscuelas(@Query("facultad_id") facultadId?: string) {
    return { data: await this.service.findAllEscuelas(facultadId ? +facultadId : undefined) };
  }

  @Get("escuelas/:id")
  @Roles(...ADMIN_COORD, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Obtener escuela por ID" })
  async findOneEscuela(@Param("id", ParseIntPipe) id: number) {
    return { data: await this.service.findOneEscuela(id) };
  }

  @Post("escuelas")
  @Roles(...ADMIN_COORD)
  @ApiOperation({ summary: "Crear escuela" })
  async createEscuela(@Body() dto: CreateEscuelaDto) {
    return { data: await this.service.createEscuela(dto), message: "Escuela creada correctamente" };
  }

  @Patch("escuelas/:id")
  @Roles(...ADMIN_COORD)
  @ApiOperation({ summary: "Actualizar escuela" })
  async updateEscuela(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateEscuelaDto,
  ) {
    return { data: await this.service.updateEscuela(id, dto), message: "Escuela actualizada" };
  }

  @Delete("escuelas/:id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar escuela (sin departamentos)" })
  async removeEscuela(@Param("id", ParseIntPipe) id: number) {
    await this.service.removeEscuela(id);
    return { message: "Escuela eliminada correctamente" };
  }

  // ── DEPARTAMENTOS ─────────────────────────────────────────────────────────

  @Get("departamentos")
  @Roles(...ADMIN_COORD, RolUsuario.DIRECTOR_ESCUELA)
  @ApiQuery({ name: "escuela_id", required: false, type: Number })
  @ApiOperation({ summary: "Listar departamentos, opcionalmente por escuela" })
  async findAllDepartamentos(@Query("escuela_id") escuelaId?: string) {
    return { data: await this.service.findAllDepartamentos(escuelaId ? +escuelaId : undefined) };
  }

  @Get("departamentos/:id")
  @Roles(...ADMIN_COORD, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Obtener departamento por ID" })
  async findOneDepartamento(@Param("id", ParseIntPipe) id: number) {
    return { data: await this.service.findOneDepartamento(id) };
  }

  @Post("departamentos")
  @Roles(...ADMIN_COORD)
  @ApiOperation({ summary: "Crear departamento" })
  async createDepartamento(@Body() dto: CreateDepartamentoDto) {
    return { data: await this.service.createDepartamento(dto), message: "Departamento creado correctamente" };
  }

  @Patch("departamentos/:id")
  @Roles(...ADMIN_COORD)
  @ApiOperation({ summary: "Actualizar departamento" })
  async updateDepartamento(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDepartamentoDto,
  ) {
    return { data: await this.service.updateDepartamento(id, dto), message: "Departamento actualizado" };
  }

  @Delete("departamentos/:id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar departamento" })
  async removeDepartamento(@Param("id", ParseIntPipe) id: number) {
    await this.service.removeDepartamento(id);
    return { message: "Departamento eliminado correctamente" };
  }
}
