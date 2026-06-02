import { Controller, Get, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums/rol-usuario.enum';
import { DeclaracionesService } from './declaraciones.service';

@ApiTags('declaraciones')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('declaraciones')
export class DeclaracionesController {
  constructor(private readonly declaracionesService: DeclaracionesService) {}

  @Get('docentes')
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS
  )
  @ApiOperation({ summary: 'Obtener lista de docentes activos para declaraciones' })
  @ApiResponse({ status: 200, description: 'Lista de docentes obtenida exitosamente' })
  async getDocentes() {
    const docentes = await this.declaracionesService.getDocentesActivos();
    
    return {
      data: docentes,
      message: 'Docentes obtenidos exitosamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('docentes/:id')
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.DIRECTOR_ESCUELA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS
  )
  @ApiOperation({ summary: 'Obtener detalles de un docente específico' })
  @ApiResponse({ status: 200, description: 'Docente obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Docente no encontrado' })
  async getDocenteById(@Param('id') id: string) {
    const docenteId = parseInt(id);
    const docente = await this.declaracionesService.getDocenteById(docenteId);
    
    if (!docente) {
      return {
        data: null,
        message: 'Docente no encontrado',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }
    
    return {
      data: docente,
      message: 'Docente obtenido exitosamente',
      statusCode: HttpStatus.OK,
    };
  }
}
