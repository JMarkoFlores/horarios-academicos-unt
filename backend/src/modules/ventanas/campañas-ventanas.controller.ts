import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RolUsuario } from '../../common/enums/rol-usuario.enum';
import { Usuario } from '../../entities/usuario.entity';
import { CampañasVentanasService } from './campañas-ventanas.service';
import { CrearCampañaDto } from './dto/crear-campaña.dto';

@ApiTags('campanas-ventanas')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('campanas-ventanas')
export class CampañasVentanasController {
  private readonly logger = new Logger(CampañasVentanasController.name);

  constructor(private readonly campañasService: CampañasVentanasService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: 'Crear una nueva campaña de ventanas' })
  @ApiResponse({ status: 201, description: 'Campaña creada' })
  async crear(@Body() dto: CrearCampañaDto, @CurrentUser() user: Usuario) {
    this.logger.log(`[crear] Creando campaña: ${dto.nombre}`);
    const data = await this.campañasService.crearCampaña(dto, user.id);
    return { data, message: 'Campaña creada', statusCode: HttpStatus.CREATED };
  }

  @Post(':id/generar')
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: 'Generar ventanas para una campaña' })
  @ApiResponse({ status: 200, description: 'Ventanas generadas' })
  async generar(@Param('id') id: string) {
    this.logger.log(`[generar] Generando ventanas para campaña: ${id}`);
    const data = await this.campañasService.generarVentanas(id);
    return { data, message: 'Ventanas generadas', statusCode: HttpStatus.OK };
  }

  @Post(':id/publicar')
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: 'Publicar una campaña' })
  @ApiResponse({ status: 200, description: 'Campaña publicada' })
  async publicar(@Param('id') id: string) {
    this.logger.log(`[publicar] Publicando campaña: ${id}`);
    const data = await this.campañasService.publicarCampaña(id);
    return { data, message: 'Campaña publicada', statusCode: HttpStatus.OK };
  }

  @Get()
  @ApiOperation({ summary: 'Listar campañas' })
  @ApiQuery({ name: 'periodoId', required: false, type: Number })
  async listar(@Query('periodoId') periodoId?: number) {
    const data = await this.campañasService.listarCampañas(periodoId);
    return { data, message: 'Campañas obtenidas', statusCode: HttpStatus.OK };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una campaña por ID' })
  async obtener(@Param('id') id: string) {
    const data = await this.campañasService.obtenerCampaña(id);
    return { data, message: 'Campaña obtenida', statusCode: HttpStatus.OK };
  }
}
