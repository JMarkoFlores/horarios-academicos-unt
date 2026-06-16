import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { Usuario } from "../entities/usuario.entity";
import { DeclaracionCargaHorariaService } from "./declaracion-carga-horaria.service";
import { CreateDeclaracionCargaHorariaDto } from "./dto/create-declaracion-carga-horaria.dto";
import { UpdateDeclaracionCargaHorariaDto } from "./dto/update-declaracion-carga-horaria.dto";
import { AccionDeclaracionCargaHorariaDto } from "./dto/accion-declaracion-carga-horaria.dto";
import { CargaLectivaDeclaracionDto } from "./dto/carga-lectiva.dto";
import { ObservarDeclaracionDto } from "./dto/observar-declaracion.dto";
import { SubsanarDeclaracionDto } from "./dto/subsanar-declaracion.dto";

import { DeclaracionJurada } from "../entities/declaracion-jurada.entity";

@ApiTags("declaraciones")
@Controller("declaraciones")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class DeclaracionCargaHorariaController {
  private readonly logger = new Logger(DeclaracionCargaHorariaController.name);

  constructor(
    private readonly declaracionService: DeclaracionCargaHorariaService,
  ) {}

  @Get("mia")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DOCENTE,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.COORDINADOR_ACADEMICO,
  )
  @ApiOperation({ summary: "Obtener la declaración de carga horaria propia" })
  @ApiResponse({
    status: 200,
    description: "Declaración obtenida correctamente",
  })
  async obtenerMia(@CurrentUser() usuario: Usuario): Promise<any> {
    const data = await this.declaracionService.obtenerMia(usuario);
    return { data, message: "Declaración obtenida correctamente" };
  }

  @Get("docentes")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.SECRETARIA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
  )
  @ApiOperation({
    summary: "Obtener lista de docentes activos para declaraciones",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de docentes obtenida exitosamente",
  })
  async obtenerDocentes() {
    const docentes = await this.declaracionService.obtenerDocentesActivos();
    return {
      data: docentes,
      message: "Docentes obtenidos exitosamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("docentes/:id/cursos")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.SECRETARIA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({
    summary: "Obtener cursos asignados a un docente en el período",
  })
  @ApiParam({ name: "id", type: Number })
  async obtenerCursosDocente(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo?: string,
  ): Promise<any> {
    this.logger.log(
      `Solicitando cursos para docente ID: ${id}, Periodo: ${periodo}`,
    );
    const data = await this.declaracionService.obtenerCursosAsignadosDocente(
      id,
      periodo,
    );
    return { data, message: "Cursos obtenidos exitosamente" };
  }

  @Get("docentes/:id/declaracion")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.SECRETARIA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Obtener declaración de un docente en el período" })
  @ApiParam({ name: "id", type: Number })
  async obtenerDeclaracionDocente(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo?: string,
  ): Promise<any> {
    const data =
      await this.declaracionService.obtenerDeclaracionPorDocentePeriodo(
        id,
        periodo,
      );
    return { data, message: "Declaración obtenida correctamente" };
  }

  @Post("guardar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DOCENTE,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
  )
  @ApiOperation({ summary: "Guardar declaración de carga horaria" })
  async guardarDeclaracion(
    @Body() dto: any,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.guardarDeclaracion(dto, usuario);
    return { data, message: "Declaración guardada correctamente" };
  }

  @Post("docentes/:id/enviar")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.DOCENTE)
  @ApiOperation({ summary: "Enviar declaración de un docente" })
  @ApiParam({ name: "id", type: Number })
  async enviarDeclaracionDocente(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { periodo?: string },
  ): Promise<any> {
    const periodo = body?.periodo;
    const data = await this.declaracionService.enviarDeclaracionDocente(
      id,
      periodo,
    );
    return { data, message: "Declaración enviada correctamente" };
  }

  @Get("documentaciones")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
  )
  @ApiOperation({
    summary: "Obtener documentaciones enviadas por docentes para revisión",
  })
  async obtenerDocumentaciones(
    @CurrentUser() usuario: Usuario,
    @Query("periodo") periodo?: string,
  ): Promise<any> {
    const data = await this.declaracionService.obtenerDocumentaciones(
      usuario,
      periodo,
    );
    return { data, message: "Documentaciones obtenidas correctamente" };
  }

  @Get(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Obtener una declaración por ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Declaración encontrada" })
  async obtenerPorId(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.obtenerPorId(id, usuario);
    return { data, message: "Declaración obtenida correctamente" };
  }

  @Get(":id/carga-lectiva")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DOCENTE,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.COORDINADOR_ACADEMICO,
  )
  @ApiOperation({
    summary: "Obtener la carga lectiva institucional de una declaración",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: 200,
    description: "Carga lectiva obtenida correctamente",
    type: CargaLectivaDeclaracionDto,
  })
  @ApiResponse({
    status: 403,
    description: "No tiene permisos para consultar esta declaración",
  })
  @ApiResponse({
    status: 404,
    description: "Declaración o período no encontrado",
  })
  async obtenerCargaLectiva(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
  ): Promise<CargaLectivaDeclaracionDto> {
    return this.declaracionService.obtenerCargaLectivaDeclaracion(id, usuario);
  }

  @Post(":id/generar-carga-lectiva")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.DOCENTE)
  @ApiOperation({
    summary:
      "Regenerar y guardar el snapshot de carga lectiva en una declaración",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: 200,
    description: "Carga lectiva regenerada y guardada correctamente",
    type: CargaLectivaDeclaracionDto,
  })
  @ApiResponse({
    status: 400,
    description: "La declaración no puede regenerarse",
  })
  @ApiResponse({
    status: 403,
    description: "No tiene permisos para regenerar esta declaración",
  })
  @ApiResponse({
    status: 404,
    description: "Declaración o período no encontrado",
  })
  async generarCargaLectiva(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
  ): Promise<CargaLectivaDeclaracionDto> {
    return this.declaracionService.actualizarCargaLectivaDeclaracion(
      id,
      usuario,
    );
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.DOCENTE)
  @ApiOperation({ summary: "Crear una declaración de carga horaria" })
  @ApiResponse({ status: 201, description: "Declaración creada correctamente" })
  async crear(
    @Body() dto: CreateDeclaracionCargaHorariaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.crear(dto, usuario);
    return {
      data,
      message: "Declaración creada correctamente",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Patch(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.DOCENTE)
  @ApiOperation({ summary: "Actualizar una declaración en borrador" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Declaración actualizada" })
  async actualizar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDeclaracionCargaHorariaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.actualizar(id, dto, usuario);
    return { data, message: "Declaración actualizada correctamente" };
  }

  @Patch(":id/enviar")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.DOCENTE)
  @ApiOperation({ summary: "Enviar la declaración para revisión" })
  @ApiParam({ name: "id", type: Number })
  async enviar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AccionDeclaracionCargaHorariaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.enviar(id, usuario, dto);
    return { data, message: "Declaración enviada correctamente" };
  }

  @Patch(":id/observar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
  )
  @ApiOperation({ summary: "Observar una declaración" })
  @ApiParam({ name: "id", type: Number })
  async observar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AccionDeclaracionCargaHorariaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.observar(id, usuario, dto);
    return { data, message: "Declaración observada correctamente" };
  }

  @Patch(":id/validar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DIRECTOR_ESCUELA,
  )
  @ApiOperation({ summary: "Validar una declaración a nivel departamental" })
  @ApiParam({ name: "id", type: Number })
  async validar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AccionDeclaracionCargaHorariaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.validar(id, usuario, dto);
    return { data, message: "Declaración validada correctamente" };
  }

  @Patch(":id/aprobar")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.DECANO)
  @ApiOperation({ summary: "Aprobar una declaración a nivel de facultad" })
  @ApiParam({ name: "id", type: Number })
  async aprobar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AccionDeclaracionCargaHorariaDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.aprobar(id, usuario, dto);
    return { data, message: "Declaración aprobada correctamente" };
  }

  @Get(":id/observaciones")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DOCENTE,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
  )
  @ApiOperation({ summary: "Obtener historial de observaciones de una declaración" })
  @ApiParam({ name: "id", type: Number })
  async obtenerObservaciones(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<any> {
    const data = await this.declaracionService.obtenerObservaciones(id);
    return { data, message: "Observaciones obtenidas correctamente" };
  }

  @Patch(":id/subsanar")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.DOCENTE)
  @ApiOperation({ summary: "Docente subsana observaciones y reenvía" })
  @ApiParam({ name: "id", type: Number })
  async subsanar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SubsanarDeclaracionDto,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.subsanar(id, usuario, dto);
    return { data, message: "Declaración subsanada correctamente" };
  }

  @Get("docentes/:id/declaracion-jurada")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Obtener declaración jurada de un docente" })
  @ApiParam({ name: "id", type: Number })
  async obtenerDeclaracionJurada(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo?: string,
  ): Promise<{ data: DeclaracionJurada | null; message: string }> {
    const data = await this.declaracionService.obtenerDeclaracionJurada(
      id,
      periodo,
    );
    return { data, message: "Declaración jurada obtenida correctamente" };
  }

  @Post("docentes/:id/declaracion-jurada")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Generar declaración jurada de un docente" })
  @ApiParam({ name: "id", type: Number })
  async generarDeclaracionJurada(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { periodo?: string },
    @CurrentUser() usuario: Usuario,
  ): Promise<{ data: DeclaracionJurada; message: string }> {
    const data = await this.declaracionService.generarDeclaracionJurada(
      id,
      body?.periodo,
      usuario,
    );
    return { data, message: "Declaración jurada generada correctamente" };
  }

  @Get("pendientes/departamento")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.DIRECTOR_DEPARTAMENTO)
  @ApiOperation({ summary: "Obtener declaraciones pendientes del departamento (Director)" })
  async pendientesDepartamento(
    @CurrentUser() usuario: Usuario,
    @Query("periodo") periodo?: string,
  ): Promise<any> {
    const data = await this.declaracionService.pendientesDepartamento(
      usuario,
      periodo,
    );
    return { data, message: "Pendientes del departamento obtenidos correctamente" };
  }

  @Get("pendientes/facultad")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.DECANO)
  @ApiOperation({ summary: "Obtener declaraciones pendientes de facultad (Decano)" })
  async pendientesFacultad(
    @CurrentUser() usuario: Usuario,
    @Query("periodo") periodo?: string,
  ): Promise<any> {
    const data = await this.declaracionService.pendientesFacultad(
      usuario,
      periodo,
    );
    return { data, message: "Pendientes de facultad obtenidos correctamente" };
  }
}
