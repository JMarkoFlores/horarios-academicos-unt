import {
  Controller,
  Get,
  Post,
  HttpStatus,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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
import { DeclaracionesService } from "./declaraciones.service";

@ApiTags("declaraciones")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("declaraciones")
export class DeclaracionesController {
  constructor(private readonly declaracionesService: DeclaracionesService) {}

  @Get('docentes')
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
  async getDocentes() {
    const docentes = await this.declaracionesService.getDocentesActivos();

    return {
      data: docentes,
      message: "Docentes obtenidos exitosamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("docentes/:id")
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
  @ApiOperation({ summary: "Obtener detalles de un docente específico" })
  @ApiResponse({ status: 200, description: "Docente obtenido exitosamente" })
  @ApiResponse({ status: 404, description: "Docente no encontrado" })
  async getDocenteById(@Param("id") id: string) {
    const docenteId = parseInt(id);
    const docente = await this.declaracionesService.getDocenteById(docenteId);

    if (!docente) {
      return {
        data: null,
        message: "Docente no encontrado",
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    return {
      data: docente,
      message: "Docente obtenido exitosamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("firma/:docente_id")
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
  @ApiOperation({ summary: "Obtener firma de un docente" })
  @ApiResponse({ status: 200, description: "Firma obtenida exitosamente" })
  async getFirma(@Param("docente_id") docenteIdRaw: string) {
    const docenteId = parseInt(docenteIdRaw, 10);
    if (isNaN(docenteId)) {
      throw new BadRequestException("docente_id inválido");
    }

    const firma = await this.declaracionesService.getFirma(docenteId);

    return {
      data: firma,
      message: "Firma obtenida exitosamente",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("firma")
  @UseInterceptors(FileInterceptor("firma"))
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
  @ApiOperation({ summary: "Subir imagen de firma de un docente" })
  @ApiResponse({ status: 200, description: "Firma subida exitosamente" })
  @ApiResponse({ status: 400, description: "Datos inválidos" })
  async subirFirma(
    @UploadedFile() file: any,
    @Body("docente_id") docenteIdRaw: string,
  ) {
    if (!file) {
      throw new BadRequestException("Debe adjuntar un archivo de firma");
    }

    const docenteId = parseInt(docenteIdRaw, 10);
    if (isNaN(docenteId)) {
      throw new BadRequestException("docente_id inválido");
    }

    const firmaUrl = await this.declaracionesService.guardarFirma(
      docenteId,
      file,
    );

    return {
      data: { firma_url: firmaUrl },
      message: "Firma subida exitosamente",
      statusCode: HttpStatus.OK,
    };
  }
}
