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
} from '@nestjs/swagger';
import { GruposService } from './grupos.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { QueryGrupoDto } from './dto/query-grupo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@ApiTags('grupos')
@Controller('grupos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @Get()
  @ApiOperation({ summary: 'Listar grupos/secciones con filtros opcionales' })
  async findAll(@Query() query: QueryGrupoDto) {
    const result = await this.gruposService.findAll(query);
    return { data: result, message: 'Grupos obtenidos correctamente' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un grupo por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.gruposService.findOne(id);
    return { data: result, message: 'Grupo encontrado' };
  }

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Crear nuevo grupo/sección' })
  @ApiResponse({ status: 409, description: 'Código duplicado para el mismo curso y período' })
  async create(@Body() dto: CreateGrupoDto) {
    const result = await this.gruposService.create(dto);
    return { data: result, message: 'Grupo creado exitosamente' };
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Actualizar datos de un grupo' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGrupoDto,
  ) {
    const result = await this.gruposService.update(id, dto);
    return { data: result, message: 'Grupo actualizado correctamente' };
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un grupo' })
  @ApiParam({ name: 'id', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.gruposService.remove(id);
    return { data: null, message: 'Grupo eliminado correctamente' };
  }
}
