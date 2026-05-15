import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, ParseIntPipe, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { AsignacionService } from './asignacion.service';
import { HorariosService } from './horarios.service';
import { GenerarHorarioDto } from './dto/generar-horario.dto';
import { LimpiarHorarioDto } from './dto/limpiar-horario.dto';
import { ReasignarHorarioDto } from './dto/reasignar-horario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@ApiTags('horarios')
@Controller('horarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class HorariosController {
  constructor(
    private readonly asignacionService: AsignacionService,
    private readonly horariosService: HorariosService,
  ) {}

  @Post('generar')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Ejecutar el motor de asignación para un período' })
  async generarHorario(@Body() dto: GenerarHorarioDto) {
    const result = await this.asignacionService.generarHorario(dto.periodo);
    return { data: result, message: `Horario generado: ${result.asignaciones_creadas} asignaciones, ${result.conflictos} conflictos` };
  }

  @Delete('limpiar')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar todas las asignaciones de un período' })
  async limpiarHorario(@Body() dto: LimpiarHorarioDto) {
    const result = await this.asignacionService.limpiarHorario(dto.periodo);
    return { data: result, message: `Período ${dto.periodo} limpiado` };
  }

  @Get('periodo/:periodo')
  @ApiOperation({ summary: 'Horario completo de un período' })
  @ApiParam({ name: 'periodo', example: '2026-I' })
  async getByPeriodo(@Param('periodo') periodo: string) {
    const result = await this.horariosService.findAllByPeriodo(periodo);
    return { data: result, message: 'Horario del período obtenido' };
  }

  @Get('docente/:id')
  @ApiOperation({ summary: 'Horario de un docente en un período' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  async getByDocente(
    @Param('id', ParseIntPipe) id: number,
    @Query('periodo') periodo: string,
  ) {
    const result = await this.horariosService.findByDocente(id, periodo ?? '');
    return { data: result, message: 'Horario del docente obtenido' };
  }

  @Get('ambiente/:id')
  @ApiOperation({ summary: 'Horario de un ambiente en un período' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  async getByAmbiente(
    @Param('id', ParseIntPipe) id: number,
    @Query('periodo') periodo: string,
  ) {
    const result = await this.horariosService.findByAmbiente(id, periodo ?? '');
    return { data: result, message: 'Horario del ambiente obtenido' };
  }

  @Get('conflictos/:periodo')
  @ApiOperation({ summary: 'Lista de conflictos del período' })
  @ApiParam({ name: 'periodo', example: '2026-I' })
  async getConflictos(@Param('periodo') periodo: string) {
    const result = await this.horariosService.findConflictos(periodo);
    return { data: result, message: 'Conflictos obtenidos' };
  }

  @Patch('conflictos/:id/resolver')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Marcar un conflicto como resuelto' })
  @ApiParam({ name: 'id', type: Number })
  async resolverConflicto(@Param('id', ParseIntPipe) id: number) {
    const result = await this.horariosService.resolverConflicto(id);
    return { data: result, message: 'Conflicto marcado como resuelto' };
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Reasignación manual de un horario (valida cruces)' })
  @ApiParam({ name: 'id', type: Number })
  async reasignar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReasignarHorarioDto,
  ) {
    const result = await this.horariosService.reasignarManual(id, dto);
    return { data: result, message: 'Horario reasignado correctamente' };
  }
}
