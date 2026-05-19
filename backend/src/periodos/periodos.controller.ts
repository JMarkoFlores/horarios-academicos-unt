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
} from "@nestjs/swagger";
import { PeriodosService } from "./periodos.service";
import { CreatePeriodoDto } from "./dto/create-periodo.dto";
import { UpdatePeriodoDto } from "./dto/update-periodo.dto";
import { QueryPeriodoDto } from "./dto/query-periodo.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";

@ApiTags("periodos")
@Controller("periodos")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class PeriodosController {
  constructor(private readonly periodosService: PeriodosService) {}

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Listar periodos académicos paginado" })
  @ApiResponse({ status: 200, description: "Lista paginada de periodos" })
  async findAll(@Query() query: QueryPeriodoDto) {
    const result = await this.periodosService.findAll(query);
    return { data: result, message: "Periodos obtenidos correctamente" };
  }

  @Get("todos")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Listar todos los periodos sin paginación" })
  async findAllSinPaginar() {
    const result = await this.periodosService.findAllSinPaginar();
    return { data: result, message: "Periodos obtenidos correctamente" };
  }

  @Get(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_ESCUELA)
  @ApiOperation({ summary: "Obtener un periodo por ID" })
  @ApiParam({ name: "id", type: Number })
  async findOne(@Param("id", ParseIntPipe) id: number) {
    const result = await this.periodosService.findOne(id);
    return { data: result, message: "Periodo encontrado" };
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @ApiOperation({ summary: "Crear nuevo periodo académico" })
  async create(@Body() dto: CreatePeriodoDto) {
    const result = await this.periodosService.create(dto);
    return { data: result, message: "Periodo creado exitosamente" };
  }

  @Patch(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @ApiOperation({ summary: "Actualizar periodo académico" })
  @ApiParam({ name: "id", type: Number })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdatePeriodoDto,
  ) {
    const result = await this.periodosService.update(id, dto);
    return { data: result, message: "Periodo actualizado correctamente" };
  }

  @Delete(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar periodo académico" })
  @ApiParam({ name: "id", type: Number })
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.periodosService.remove(id);
    return { data: null, message: "Periodo eliminado correctamente" };
  }
}
