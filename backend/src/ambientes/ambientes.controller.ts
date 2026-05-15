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
import { AmbientesService } from './ambientes.service';
import { CreateAmbienteDto } from './dto/create-ambiente.dto';
import { UpdateAmbienteDto } from './dto/update-ambiente.dto';
import { QueryAmbienteDto } from './dto/query-ambiente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@ApiTags('ambientes')
@Controller('ambientes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class AmbientesController {
  constructor(private readonly ambientesService: AmbientesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ambientes paginado con filtros' })
  @ApiQuery({ name: 'tipo', required: false, description: 'AULA o LABORATORIO' })
  @ApiQuery({ name: 'activo', required: false })
  async findAll(@Query() query: QueryAmbienteDto) {
    const result = await this.ambientesService.findAll(query);
    return { data: result, message: 'Ambientes obtenidos correctamente' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un ambiente por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 404, description: 'Ambiente no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.ambientesService.findOne(id);
    return { data: result, message: 'Ambiente encontrado' };
  }

  @Get(':id/disponibilidad')
  @ApiOperation({ summary: 'Grilla semanal de ocupación de un ambiente' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  async getDisponibilidad(
    @Param('id', ParseIntPipe) id: number,
    @Query('periodo') periodo: string,
  ) {
    const result = await this.ambientesService.getDisponibilidad(id, periodo ?? '');
    return { data: result, message: 'Disponibilidad del ambiente obtenida' };
  }

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Crear nuevo ambiente' })
  @ApiResponse({ status: 409, description: 'Código de ambiente duplicado' })
  async create(@Body() dto: CreateAmbienteDto) {
    const result = await this.ambientesService.create(dto);
    return { data: result, message: 'Ambiente creado exitosamente' };
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Actualizar datos de un ambiente' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAmbienteDto,
  ) {
    const result = await this.ambientesService.update(id, dto);
    return { data: result, message: 'Ambiente actualizado correctamente' };
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar un ambiente (soft delete)' })
  @ApiParam({ name: 'id', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.ambientesService.remove(id);
    return { data: null, message: 'Ambiente desactivado correctamente' };
  }
}
