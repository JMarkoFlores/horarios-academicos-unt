import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AsignadorLectivoService } from "./asignador-lectivo.service";
import { CrearHorarioLectivoDto } from "./dto/crear-horario-lectivo.dto";
import { ValidarAsignacionDto } from "./dto/validar-asignacion.dto";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";

@Controller("asignador")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsignadorLectivoController {
  constructor(private readonly servicio: AsignadorLectivoService) {}

  @Get("cursos-pendientes/:periodoId")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  async getCursosPendientes(
    @Param("periodoId", ParseIntPipe) periodoId: number,
    @Request() req: { user: any },
  ) {
    return this.servicio.getCursosPendientes(
      periodoId,
      req.user.contextoAcademico,
    );
  }

  @Get("docentes/:periodoId")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  async getDocentes(
    @Param("periodoId", ParseIntPipe) periodoId: number,
    @Request() req: { user: any },
  ) {
    return this.servicio.getDocentes(periodoId, req.user.contextoAcademico);
  }

  @Get("horario-docente/:docenteId")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
    RolUsuario.DOCENTE,
  )
  async getHorarioDocente(
    @Param("docenteId", ParseIntPipe) docenteId: number,
    @Query("periodo") periodo: string,
    @Request() req: { user: any },
  ) {
    if (
      req.user.rol === RolUsuario.DOCENTE &&
      (req.user as any).docenteId !== docenteId
    ) {
      throw new Error("No autorizado");
    }
    return this.servicio.getHorarioDocente(docenteId, periodo);
  }

  @Get("ambientes/:periodoCodigo")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  async getAmbientes(
    @Param("periodoCodigo") periodoCodigo: string,
    @Request() req: { user: any },
  ) {
    return this.servicio.getAmbientes(
      periodoCodigo,
      req.user.contextoAcademico,
    );
  }

  @Get("ocupacion-ambiente/:ambienteId")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  async getOcupacionAmbiente(
    @Param("ambienteId", ParseIntPipe) ambienteId: number,
    @Query("periodo") periodo: string,
  ) {
    return this.servicio.getOcupacionAmbiente(ambienteId, periodo);
  }

  @Get("progreso/:periodoId")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  async getProgreso(
    @Param("periodoId", ParseIntPipe) periodoId: number,
    @Request() req: { user: any },
  ) {
    return this.servicio.getProgreso(periodoId, req.user.contextoAcademico);
  }

  @Post("validar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  async validar(
    @Body() dto: ValidarAsignacionDto,
    @Request() req: { user: any },
  ) {
    return this.servicio.validar(dto, req.user.contextoAcademico);
  }

  @Post("asignar")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA)
  @HttpCode(HttpStatus.CREATED)
  async asignar(
    @Body() dto: CrearHorarioLectivoDto,
    @Request() req: { user: any },
  ) {
    return this.servicio.asignar(dto, req.user);
  }

  @Put("mover/:id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA)
  async mover(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CrearHorarioLectivoDto,
    @Request() req: { user: any },
  ) {
    return this.servicio.mover(id, dto, req.user);
  }

  @Delete("eliminar/:id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA)
  async eliminar(
    @Param("id", ParseIntPipe) id: number,
    @Request() req: { user: any },
  ) {
    return this.servicio.eliminar(id, req.user);
  }
}
