import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReglasPrioridadGlobalesService } from './reglas-prioridad.service';
import { ReglasPrioridadGlobales } from '../../entities/reglas-prioridad.entity';

@ApiTags('configuracion')
@Controller('reglas-prioridad')
@UseGuards(JwtAuthGuard)
export class ReglasPrioridadController {
  constructor(private readonly reglasService: ReglasPrioridadGlobalesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener reglas de prioridad globales activas' })
  @ApiResponse({ status: 200, description: 'Reglas obtenidas exitosamente' })
  async obtenerReglasActivas(): Promise<ReglasPrioridadGlobales> {
    return this.reglasService.obtenerReglasActivas();
  }

  @Put()
  @ApiOperation({ summary: 'Actualizar reglas de prioridad globales' })
  @ApiResponse({ status: 200, description: 'Reglas actualizadas exitosamente' })
  async actualizarReglas(@Body() body: { reglas: any[]; descripcion?: string }): Promise<ReglasPrioridadGlobales> {
    return this.reglasService.actualizarReglas(body.reglas, body.descripcion);
  }
}
