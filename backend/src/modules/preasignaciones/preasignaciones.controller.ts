import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";
import { CreatePreasignacionDto } from "./dto/create-preasignacion.dto";
import { QueryPreasignacionDto } from "./dto/query-preasignacion.dto";
import { UpdatePreasignacionDto } from "./dto/update-preasignacion.dto";
import { PreasignacionesService } from "./preasignaciones.service";

@ApiTags("preasignaciones")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
@Controller("preasignaciones")
export class PreasignacionesController {
  constructor(
    private readonly preasignacionesService: PreasignacionesService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar preasignaciones por filtros" })
  @ApiQuery({ name: "periodo", required: false })
  @ApiQuery({ name: "docente_id", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Listado de preasignaciones" })
  async findAll(@Query() query: QueryPreasignacionDto) {
    const data = await this.preasignacionesService.findAll(query);
    return {
      data,
      message: "Preasignaciones obtenidas",
      statusCode: HttpStatus.OK,
    };
  }

  @Post()
  @ApiOperation({ summary: "Crear preasignación" })
  @ApiResponse({ status: 201, description: "Preasignación creada" })
  async create(@Body() dto: CreatePreasignacionDto) {
    const data = await this.preasignacionesService.create(dto);
    return {
      data,
      message: "Preasignación creada",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualizar preasignación" })
  @ApiResponse({ status: 200, description: "Preasignación actualizada" })
  async update(@Param("id") id: string, @Body() dto: UpdatePreasignacionDto) {
    const data = await this.preasignacionesService.update(id, dto);
    return {
      data,
      message: "Preasignación actualizada",
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar preasignación" })
  @ApiResponse({ status: 200, description: "Preasignación eliminada" })
  async remove(@Param("id") id: string) {
    await this.preasignacionesService.remove(id);
    return {
      data: { id },
      message: "Preasignación eliminada",
      statusCode: HttpStatus.OK,
    };
  }
}
