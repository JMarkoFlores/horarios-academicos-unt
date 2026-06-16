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
  HttpStatus,
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
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { CargaAdicionalService } from "./carga-adicional.service";
import { CreateCargaAdicionalDto } from "./dto/create-carga-adicional.dto";
import { UpdateCargaAdicionalDto } from "./dto/update-carga-adicional.dto";

@ApiTags("carga-adicional")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("carga-adicional")
export class CargaAdicionalController {
  constructor(private readonly service: CargaAdicionalService) {}

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DOCENTE,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
  )
  @ApiOperation({ summary: "Obtener carga adicional" })
  @ApiResponse({ status: 200, description: "Carga adicional obtenida" })
  async findAll(
    @Query("declaracion_id") declaracionId?: string,
    @Query("docente_id") docenteId?: string,
  ) {
    const data = await this.service.findAll(
      declaracionId ? Number(declaracionId) : undefined,
      docenteId ? Number(docenteId) : undefined,
    );
    return { data, message: "Carga adicional obtenida", statusCode: HttpStatus.OK };
  }

  @Get(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DOCENTE,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DECANO,
    RolUsuario.COORDINADOR_ACADEMICO,
  )
  @ApiOperation({ summary: "Obtener una carga adicional por ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Carga adicional encontrada" })
  async findOne(@Param("id") id: string) {
    const data = await this.service.findOne(Number(id));
    return { data, message: "Carga adicional encontrada", statusCode: HttpStatus.OK };
  }

  @Post()
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DOCENTE,
    RolUsuario.COORDINADOR_ACADEMICO,
  )
  @ApiOperation({ summary: "Crear carga adicional" })
  @ApiResponse({ status: 201, description: "Carga adicional creada" })
  async create(@Body() dto: CreateCargaAdicionalDto) {
    const data = await this.service.create(dto);
    return {
      data,
      message: "Carga adicional creada",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Put(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DOCENTE,
    RolUsuario.COORDINADOR_ACADEMICO,
  )
  @ApiOperation({ summary: "Actualizar carga adicional" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Carga adicional actualizada" })
  async update(@Param("id") id: string, @Body() dto: UpdateCargaAdicionalDto) {
    const data = await this.service.update(Number(id), dto);
    return {
      data,
      message: "Carga adicional actualizada",
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DOCENTE,
    RolUsuario.COORDINADOR_ACADEMICO,
  )
  @ApiOperation({ summary: "Eliminar carga adicional" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Carga adicional eliminada" })
  async remove(@Param("id") id: string) {
    await this.service.remove(Number(id));
    return {
      message: "Carga adicional eliminada",
      statusCode: HttpStatus.OK,
    };
  }
}
