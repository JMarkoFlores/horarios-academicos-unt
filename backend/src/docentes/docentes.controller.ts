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
import { DocentesService } from './docentes.service';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { QueryDocenteDto } from './dto/query-docente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@ApiTags('docentes')
@Controller('docentes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class DocentesController {
  constructor(private readonly docentesService: DocentesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar docentes paginado con filtros' })
  @ApiResponse({ status: 200, description: 'Lista paginada de docentes' })
  async findAll(@Query() query: QueryDocenteDto) {
    const result = await this.docentesService.findAll(query);
    return { data: result, message: 'Docentes obtenidos correctamente' };
  }

  @Get('jerarquia')
  @ApiOperation({ summary: 'Docentes ordenados por jerarquía institucional' })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  @ApiResponse({ status: 200, description: 'Lista ordenada por antigüedad y categoría' })
  async findJerarquia(@Query('periodo') periodo: string) {
    const result = await this.docentesService.findOrdenadosPorJerarquia(
      periodo ?? '',
    );
    return { data: result, message: 'Docentes ordenados por jerarquía' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un docente por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Docente encontrado' })
  @ApiResponse({ status: 404, description: 'Docente no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.docentesService.findOne(id);
    return { data: result, message: 'Docente encontrado' };
  }

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Crear nuevo docente' })
  @ApiResponse({ status: 201, description: 'Docente creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Email o código duplicado' })
  async create(@Body() dto: CreateDocenteDto) {
    const result = await this.docentesService.create(dto);
    return { data: result, message: 'Docente creado exitosamente' };
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Actualizar datos de un docente' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Docente actualizado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocenteDto,
  ) {
    const result = await this.docentesService.update(id, dto);
    return { data: result, message: 'Docente actualizado correctamente' };
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar un docente (soft delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Docente desactivado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.docentesService.remove(id);
    return { data: null, message: 'Docente desactivado correctamente' };
  }
}
