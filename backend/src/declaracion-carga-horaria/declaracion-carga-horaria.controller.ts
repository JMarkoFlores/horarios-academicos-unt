import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Logger,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
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

import { DeclaracionJurada } from "../entities/declaracion-jurada.entity";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";

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
    @CurrentUser() usuario?: Usuario,
  ): Promise<any> {
    if (usuario?.rol === RolUsuario.DOCENTE) {
      const docenteId = (usuario as any).docenteId;
      if (!docenteId || docenteId !== id) {
        throw new ForbiddenException("No tiene permisos para ver datos de otro docente");
      }
    }
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
    @CurrentUser() usuario?: Usuario,
  ): Promise<any> {
    if (usuario?.rol === RolUsuario.DOCENTE) {
      const docenteId = (usuario as any).docenteId;
      if (!docenteId || docenteId !== id) {
        throw new ForbiddenException("No tiene permisos para ver la declaración de otro docente");
      }
    }
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
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    if (usuario.rol === RolUsuario.DOCENTE) {
      const docenteId = (usuario as any).docenteId;
      if (!docenteId || docenteId !== id) {
        throw new ForbiddenException("No tiene permisos para enviar la declaración de otro docente");
      }
    }
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

  @Post(":id/cerrar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
  )
  @ApiOperation({ summary: "Cerrar una declaración aprobada por facultad" })
  @ApiParam({ name: "id", type: Number })
  async cerrar(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.cerrar(id, usuario);
    return { data, message: "Declaración cerrada correctamente" };
  }

  @Post(":id/validar-departamento")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "Validar declaración en departamento (ENVIADO → VALIDADO_DPTO)" })
  @ApiParam({ name: "id", type: Number })
  async validarDepartamento(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.validarDepartamento(id, usuario);
    return { data, message: "Declaración validada por departamento" };
  }

  @Post(":id/observar-departamento")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "Observar declaración en departamento (ENVIADO → OBSERVADO_DPTO)" })
  @ApiParam({ name: "id", type: Number })
  async observarDepartamento(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { motivo: string },
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.observarDepartamento(id, usuario, body.motivo);
    return { data, message: "Declaración observada por departamento" };
  }

  @Post(":id/validar-facultad")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DECANO,
  )
  @ApiOperation({ summary: "Aprobar declaración en facultad (VALIDADO_DPTO → APROBADO_FACULTAD)" })
  @ApiParam({ name: "id", type: Number })
  async validarFacultad(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.validarFacultad(id, usuario);
    return { data, message: "Declaración aprobada por facultad" };
  }

  @Post(":id/observar-facultad")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DECANO,
  )
  @ApiOperation({ summary: "Observar declaración en facultad (VALIDADO_DPTO → OBSERVADO_FACULTAD)" })
  @ApiParam({ name: "id", type: Number })
  async observarFacultad(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { motivo: string },
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.observarFacultad(id, usuario, body.motivo);
    return { data, message: "Declaración observada por facultad" };
  }

  @Post(":id/reabrir")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
  )
  @ApiOperation({ summary: "Reabrir declaración observada → REABIERTO" })
  @ApiParam({ name: "id", type: Number })
  async reabrir(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    const data = await this.declaracionService.reabrir(id, usuario);
    return { data, message: "Declaración reabierta" };
  }

  @Post(":id/observaciones")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Agregar comentario a una declaración" })
  @ApiParam({ name: "id", type: Number })
  async agregarObservacion(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { observacion: string },
    @CurrentUser() usuario: Usuario,
  ): Promise<any> {
    await this.declaracionService.agregarObservacion(id, body.observacion, usuario);
    return { data: null, message: "Comentario guardado correctamente" };
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
    @CurrentUser() usuario?: Usuario,
  ): Promise<{ data: DeclaracionJurada | null; message: string }> {
    if (usuario?.rol === RolUsuario.DOCENTE) {
      const docenteId = (usuario as any).docenteId;
      if (!docenteId || docenteId !== id) {
        throw new ForbiddenException("No tiene permisos para ver la declaración jurada de otro docente");
      }
    }
    const data = await this.declaracionService.obtenerDeclaracionJurada(
      id,
      periodo,
    );
    return { data, message: "Declaración jurada obtenida correctamente" };
  }

  @Post("docentes/:id/declaracion-jurada")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.OPERADOR_HORARIOS,
    RolUsuario.DOCENTE,
  )
  @ApiOperation({ summary: "Generar declaración jurada de un docente" })
  @ApiParam({ name: "id", type: Number })
  async generarDeclaracionJurada(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { periodo?: string },
    @CurrentUser() usuario: Usuario,
  ): Promise<{ data: DeclaracionJurada; message: string }> {
    if (usuario.rol === RolUsuario.DOCENTE) {
      const docenteId = (usuario as any).docenteId;
      if (!docenteId || docenteId !== id) {
        throw new ForbiddenException("No tiene permisos para generar la declaración jurada de otro docente");
      }
    }
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

  @Get("firma/mi-firma")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DOCENTE,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
  )
  @ApiOperation({ summary: "Obener mi firma" })
  async obtenerMiFirma(
    @CurrentUser() usuario: Usuario,
  ): Promise<{ data: { firma_url: string | null } }> {
    const firma_url = await this.declaracionService.obtenerFirmaDocente(usuario.id);
    return { data: { firma_url } };
  }

  @Get("firma/:usuarioId")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
  )
  @ApiOperation({ summary: "Obtener la firma de un usuario (admin)" })
  @ApiParam({ name: "usuarioId", type: Number })
  async obtenerFirma(
    @Param("usuarioId", ParseIntPipe) usuarioId: number,
  ): Promise<{ data: { firma_url: string | null } }> {
    const firma_url = await this.declaracionService.obtenerFirmaDocente(usuarioId);
    return { data: { firma_url } };
  }

  @Post("firma")
  @Roles(RolUsuario.DOCENTE, RolUsuario.DIRECTOR_DEPARTAMENTO, RolUsuario.DECANO)
  @UseInterceptors(
    FileInterceptor("firma", {
      storage: diskStorage({
        destination: "./uploads/firmas",
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, `firma-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpeg|png|jpg|gif|webp)/)) {
          cb(new Error("Solo se permiten archivos de imagen"), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: "Subir firma propia (cada usuario sube la suya)" })
  async subirFirma(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() usuario: Usuario,
  ): Promise<{ data: { firma_url: string }; message: string }> {
    if (!file) {
      throw new ForbiddenException("Debe proporcionar un archivo de imagen");
    }
    const firmaUrl = `/uploads/firmas/${file.filename}`;
    await this.declaracionService.actualizarFirmaDocente(usuario.id, firmaUrl);
    return { data: { firma_url: firmaUrl }, message: "Firma subida correctamente" };
  }
}
