import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { CladService } from './clad.service';
import { CreateCladDto } from './dto/create-clad.dto';
import { ObservarCladDto } from './dto/update-clad.dto';

@ApiTags('CLAD')
@Controller('clad')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CladController {
  constructor(private readonly cladService: CladService) {}

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_DEPARTAMENTO, RolUsuario.DIRECTOR_ESCUELA, RolUsuario.DECANO, RolUsuario.DOCENTE)
  async findAll(@Query() query: any, @Req() req: any) {
    return this.cladService.findAll(query, req.user);
  }

  @Get('mi-clad')
  @Roles(RolUsuario.DOCENTE)
  async getMiClad(@Query('periodo') periodo: string, @Req() req: any) {
    return this.cladService.getMiClad(req.user, periodo);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.DIRECTOR_DEPARTAMENTO, RolUsuario.DIRECTOR_ESCUELA, RolUsuario.DECANO, RolUsuario.DOCENTE)
  async findOne(@Param('id') id: number) {
    return this.cladService.findOne(id);
  }

  @Post()
  @Roles(RolUsuario.DOCENTE, RolUsuario.COORDINADOR_ACADEMICO)
  async create(@Body() dto: CreateCladDto, @Req() req: any) {
    return this.cladService.create(dto, req.user);
  }

  @Patch(':id')
  @Roles(RolUsuario.DOCENTE, RolUsuario.COORDINADOR_ACADEMICO)
  async update(@Param('id') id: number, @Body() dto: CreateCladDto, @Req() req: any) {
    return this.cladService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(RolUsuario.DOCENTE, RolUsuario.ADMINISTRADOR_SISTEMA)
  async remove(@Param('id') id: number, @Req() req: any) {
    return this.cladService.remove(id, req.user);
  }

  // --- State Machine Transitions ---

  @Patch(':id/enviar')
  @Roles(RolUsuario.DOCENTE, RolUsuario.COORDINADOR_ACADEMICO)
  async enviar(@Param('id') id: number, @Req() req: any) {
    return this.cladService.enviar(id, req.user);
  }

  @Patch(':id/validar-dpto')
  @Roles(RolUsuario.DIRECTOR_DEPARTAMENTO, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.ADMINISTRADOR_SISTEMA)
  async validarDpto(@Param('id') id: number, @Req() req: any) {
    return this.cladService.validarDpto(id, req.user);
  }

  @Patch(':id/observar-dpto')
  @Roles(RolUsuario.DIRECTOR_DEPARTAMENTO, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.ADMINISTRADOR_SISTEMA)
  async observarDpto(@Param('id') id: number, @Body() dto: ObservarCladDto, @Req() req: any) {
    return this.cladService.observarDpto(id, dto, req.user);
  }

  @Patch(':id/validar-dependencia')
  @Roles(RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.ADMINISTRADOR_SISTEMA) // "coordinador general" will validate dependencias
  async validarDependencia(@Param('id') id: number, @Req() req: any) {
    return this.cladService.validarDependencia(id, req.user);
  }

  @Patch(':id/observar-dependencia')
  @Roles(RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.ADMINISTRADOR_SISTEMA)
  async observarDependencia(@Param('id') id: number, @Body() dto: ObservarCladDto, @Req() req: any) {
    return this.cladService.observarDependencia(id, dto, req.user);
  }

  @Patch(':id/aprobar-final')
  @Roles(RolUsuario.DECANO, RolUsuario.ADMINISTRADOR_SISTEMA)
  async aprobarFinal(@Param('id') id: number, @Req() req: any) {
    return this.cladService.aprobarFinal(id, req.user);
  }
}
