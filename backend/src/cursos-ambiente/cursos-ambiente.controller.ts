import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { CursosAmbienteService } from "./cursos-ambiente.service";
import { CreateCursoAmbienteDto } from "./dto/create-curso-ambiente.dto";
import { UpdateCursoAmbienteDto } from "./dto/update-curso-ambiente.dto";
import { QueryCursoAmbienteDto } from "./dto/query-curso-ambiente.dto";

@ApiTags("cursos-ambiente")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("cursos-ambiente")
export class CursosAmbienteController {
  constructor(private readonly service: CursosAmbienteService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Crear relación curso-ambiente" })
  @ApiResponse({ status: 201, description: "Relación creada" })
  async create(@Body() dto: CreateCursoAmbienteDto) {
    const data = await this.service.create(dto);
    return { data, message: "Relación curso-ambiente creada", statusCode: HttpStatus.CREATED };
  }

  @Get()
  @ApiOperation({ summary: "Listar relaciones curso-ambiente con filtros" })
  async findAll(@Query() query: QueryCursoAmbienteDto) {
    const data = await this.service.findAll(query);
    return { data, message: "Relaciones obtenidas", statusCode: HttpStatus.OK };
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener relación por ID" })
  async findOne(@Param("id", ParseIntPipe) id: number) {
    const data = await this.service.findOne(id);
    return { data, message: "Relación obtenida", statusCode: HttpStatus.OK };
  }

  @Patch(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Actualizar relación curso-ambiente" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCursoAmbienteDto,
  ) {
    const data = await this.service.update(id, dto);
    return { data, message: "Relación actualizada", statusCode: HttpStatus.OK };
  }

  @Delete(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar relación curso-ambiente" })
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { data: null, message: "Relación eliminada", statusCode: HttpStatus.OK };
  }
}
