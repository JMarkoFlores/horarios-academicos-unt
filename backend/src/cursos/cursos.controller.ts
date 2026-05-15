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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CursosService } from './cursos.service';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';
import { QueryCursoDto } from './dto/query-curso.dto';
import { AsignarAmbientesDto } from './dto/asignar-ambientes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { TipoClase } from '../common/enums/tipo-clase.enum';

@ApiTags('cursos')
@Controller('cursos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cursos paginado con filtros' })
  async findAll(@Query() query: QueryCursoDto) {
    const result = await this.cursosService.findAll(query);
    return { data: result, message: 'Cursos obtenidos correctamente' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un curso por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.cursosService.findOne(id);
    return { data: result, message: 'Curso encontrado' };
  }

  @Get(':id/ambientes')
  @ApiOperation({ summary: 'Ambientes compatibles asignados al curso' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'tipo_clase', enum: TipoClase, required: false })
  async getAmbientes(
    @Param('id', ParseIntPipe) id: number,
    @Query('tipo_clase') tipoClase?: TipoClase,
  ) {
    const result = tipoClase
      ? await this.cursosService.getAmbientesCompatibles(id, tipoClase)
      : (await this.cursosService.findOne(id)).ambientes;
    return { data: result, message: 'Ambientes del curso obtenidos' };
  }

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Crear nuevo curso' })
  @ApiResponse({ status: 201, description: 'Curso creado' })
  @ApiResponse({ status: 409, description: 'Código de curso duplicado' })
  async create(@Body() dto: CreateCursoDto) {
    const result = await this.cursosService.create(dto);
    return { data: result, message: 'Curso creado exitosamente' };
  }

  @Post(':id/ambientes')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Asignar ambientes compatibles a un curso' })
  @ApiParam({ name: 'id', type: Number })
  async asignarAmbientes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarAmbientesDto,
  ) {
    const result = await this.cursosService.asignarAmbientes(
      id,
      dto.ambiente_ids,
      dto.tipo_clase,
    );
    return { data: result, message: 'Ambientes asignados correctamente' };
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Actualizar datos de un curso' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCursoDto,
  ) {
    const result = await this.cursosService.update(id, dto);
    return { data: result, message: 'Curso actualizado correctamente' };
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar un curso (soft delete)' })
  @ApiParam({ name: 'id', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.cursosService.remove(id);
    return { data: null, message: 'Curso desactivado correctamente' };
  }
}
