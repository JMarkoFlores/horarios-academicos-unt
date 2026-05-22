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
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { DocentesService } from "./docentes.service";
import { CreateDocenteDto } from "./dto/create-docente.dto";
import { UpdateDocenteDto } from "./dto/update-docente.dto";
import { QueryDocenteDto } from "./dto/query-docente.dto";
import { AsignarCursosDto } from "./dto/asignar-cursos.dto";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";

@ApiTags("docentes")
@Controller("docentes")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class DocentesController {
  constructor(private readonly docentesService: DocentesService) {}

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DIRECTOR_ESCUELA,
  )
  @ApiOperation({ summary: "Listar docentes paginado con filtros" })
  @ApiResponse({ status: 200, description: "Lista paginada de docentes" })
  async findAll(@Query() query: QueryDocenteDto) {
    const result = await this.docentesService.findAll(query);
    return { data: result, message: "Docentes obtenidos correctamente" };
  }

  @Get("jerarquia")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DIRECTOR_ESCUELA,
  )
  @ApiOperation({ summary: "Docentes ordenados por jerarquía institucional" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiResponse({
    status: 200,
    description: "Lista ordenada por antigüedad y categoría",
  })
  async findJerarquia(@Query("periodo") periodo: string) {
    const result = await this.docentesService.findOrdenadosPorJerarquia(
      periodo ?? "",
    );
    return { data: result, message: "Docentes ordenados por jerarquía" };
  }

  @Get("exportar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DIRECTOR_ESCUELA,
  )
  @ApiOperation({ summary: "Exportar todos los docentes sin paginación" })
  @ApiQuery({ name: "categoria", required: false })
  @ApiQuery({ name: "tipo_docente", required: false })
  @ApiQuery({ name: "busqueda", required: false })
  async exportar(
    @Query("categoria") categoria?: string,
    @Query("tipo_docente") tipo_docente?: string,
    @Query("busqueda") busqueda?: string,
  ) {
    const result = await this.docentesService.findAllParaExportar({
      categoria,
      tipo_docente,
      busqueda,
    });
    return { data: result, message: "Docentes para exportar" };
  }

  @Get(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Obtener un docente por ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Docente encontrado" })
  @ApiResponse({ status: 404, description: "Docente no encontrado" })
  async findOne(@Param("id", ParseIntPipe) id: number) {
    const result = await this.docentesService.findOne(id);
    return { data: result, message: "Docente encontrado" };
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Crear nuevo docente" })
  @ApiResponse({ status: 201, description: "Docente creado exitosamente" })
  @ApiResponse({ status: 409, description: "Email o código duplicado" })
  async create(@Body() dto: CreateDocenteDto) {
    const result = await this.docentesService.create(dto);
    return { data: result, message: "Docente creado exitosamente" };
  }

  @Patch(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Actualizar datos de un docente" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Docente actualizado" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDocenteDto,
  ) {
    const result = await this.docentesService.update(id, dto);
    return { data: result, message: "Docente actualizado correctamente" };
  }

  @Delete(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Desactivar un docente (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Docente desactivado" })
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.docentesService.remove(id);
    return { data: null, message: "Docente desactivado correctamente" };
  }

  @Patch(":id/reactivar")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @ApiOperation({ summary: "Reactivar un docente previamente desactivado" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Docente reactivado" })
  async reactivar(@Param("id", ParseIntPipe) id: number) {
    const result = await this.docentesService.reactivar(id);
    return { data: result, message: "Docente reactivado correctamente" };
  }

  @Post(":id/cursos")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Asignar cursos que puede dictar un docente" })
  @ApiParam({ name: "id", type: Number, description: "ID del docente" })
  @ApiResponse({ status: 201, description: "Cursos asignados correctamente" })
  @ApiResponse({ status: 404, description: "Docente o Curso no encontrado" })
  async asignarCursos(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AsignarCursosDto,
  ) {
    const result = await this.docentesService.asignarCursos(id, dto);
    return {
      data: result,
      message: "Cursos asignados correctamente",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get(":id/cursos")
  @ApiOperation({ summary: "Listar cursos habilitados para un docente" })
  @ApiParam({ name: "id", type: Number, description: "ID del docente" })
  @ApiQuery({
    name: "tipo_clase",
    enum: TipoClase,
    required: false,
    description: "Filtrar por tipo de clase",
  })
  @ApiQuery({
    name: "periodo",
    required: false,
    description: "Código del período académico",
  })
  @ApiResponse({ status: 200, description: "Cursos habilitados obtenidos" })
  async findCursosHabilitados(
    @Param("id", ParseIntPipe) id: number,
    @Query("tipo_clase") tipoClase?: TipoClase,
    @Query("periodo") periodo?: string,
  ) {
    const result = await this.docentesService.findCursosHabilitados(
      id,
      tipoClase,
      periodo,
    );
    return {
      data: result,
      message: "Cursos habilitados obtenidos correctamente",
    };
  }

  @Delete(":id/cursos/:cursoId/:tipoclase")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Quitar la asignación de un curso a un docente" })
  @ApiParam({ name: "id", type: Number, description: "ID del docente" })
  @ApiParam({ name: "cursoId", type: Number, description: "ID del curso" })
  @ApiParam({
    name: "tipoclase",
    enum: TipoClase,
    description: "Tipo de clase",
  })
  @ApiQuery({
    name: "periodo",
    required: false,
    description: "Código del período académico",
  })
  @ApiResponse({
    status: 200,
    description: "Asignación eliminada correctamente",
  })
  @ApiResponse({ status: 404, description: "Asignación no encontrada" })
  async removeAsignacion(
    @Param("id", ParseIntPipe) id: number,
    @Param("cursoId", ParseIntPipe) cursoId: number,
    @Param("tipoclase") tipoClase: TipoClase,
    @Query("periodo") periodo?: string,
  ) {
    await this.docentesService.removeAsignacion(
      id,
      cursoId,
      tipoClase,
      periodo,
    );
    return { data: null, message: "Asignación eliminada correctamente" };
  }

  @Get(":id/ambientes")
  @ApiOperation({ summary: "Listar ambientes asignados a un docente" })
  @ApiParam({ name: "id", type: Number, description: "ID del docente" })
  @ApiResponse({
    status: 200,
    description: "Ambientes asignados obtenidos correctamente",
  })
  async findAmbientesAsignados(@Param("id", ParseIntPipe) id: number) {
    const result = await this.docentesService.findAmbientesAsignados(id);
    return {
      data: result,
      message: "Ambientes asignados obtenidos correctamente",
    };
  }

  @Post(":id/ambientes")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Asignar ambientes a un docente" })
  @ApiParam({ name: "id", type: Number, description: "ID del docente" })
  @ApiResponse({
    status: 201,
    description: "Ambientes asignados correctamente",
  })
  async asignarAmbientes(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { ambienteIds: number[] },
  ) {
    const result = await this.docentesService.asignarAmbientes(
      id,
      body.ambienteIds,
    );
    return {
      data: result,
      message: "Ambientes asignados correctamente",
    };
  }
}
