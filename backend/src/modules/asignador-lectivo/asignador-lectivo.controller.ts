import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { RequiereAlcance } from "../../auth/decorators/requiere-alcance.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";
import { UsuarioAutenticado } from "../../common/interfaces/contexto-academico.interface";
import { AsignadorLectivoService } from "./asignador-lectivo.service";
import { CrearHorarioLectivoDto } from "./dto/crear-horario-lectivo.dto";
import { ValidarAsignacionDto } from "./dto/validar-asignacion.dto";

@Controller("asignador")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsignadorLectivoController {
  constructor(private readonly service: AsignadorLectivoService) {}

  @Get("cursos-pendientes")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA, RolUsuario.COORDINADOR_ACADEMICO)
  @RequiereAlcance()
  getCursosPendientes(
    @Query("periodo_id") periodoId: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.getCursosPendientes(Number(periodoId), usuario.contextoAcademico);
  }

  @Get("docentes")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA, RolUsuario.COORDINADOR_ACADEMICO)
  @RequiereAlcance()
  getDocentes(
    @Query("periodo_id") periodoId: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.getDocentes(Number(periodoId), usuario.contextoAcademico);
  }

  @Get("docente/:id/horario")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA, RolUsuario.COORDINADOR_ACADEMICO)
  getHorarioDocente(
    @Param("id") id: string,
    @Query("periodo") periodo: string,
  ) {
    return this.service.getHorarioDocente(Number(id), periodo);
  }

  @Get("ambientes")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA, RolUsuario.COORDINADOR_ACADEMICO)
  @RequiereAlcance()
  getAmbientes(
    @Query("periodo") periodo: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.getAmbientes(periodo, usuario.contextoAcademico);
  }

  @Get("ambiente/:id/ocupacion")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA, RolUsuario.COORDINADOR_ACADEMICO)
  getOcupacionAmbiente(
    @Param("id") id: string,
    @Query("periodo") periodo: string,
  ) {
    return this.service.getOcupacionAmbiente(Number(id), periodo);
  }

  @Post("validar")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA, RolUsuario.COORDINADOR_ACADEMICO)
  validar(
    @Body() dto: ValidarAsignacionDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.validar(dto, usuario.contextoAcademico);
  }

  @Post("asignar")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA, RolUsuario.COORDINADOR_ACADEMICO)
  @RequiereAlcance()
  asignar(
    @Body() dto: CrearHorarioLectivoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.asignar(dto, usuario);
  }

  @Patch("mover/:id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA, RolUsuario.COORDINADOR_ACADEMICO)
  @RequiereAlcance()
  mover(
    @Param("id") id: string,
    @Body() dto: CrearHorarioLectivoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.mover(Number(id), dto, usuario);
  }

  @Delete("eliminar/:id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA, RolUsuario.COORDINADOR_ACADEMICO)
  @RequiereAlcance()
  eliminar(
    @Param("id") id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.eliminar(Number(id), usuario);
  }

  @Get("progreso/:periodoId")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.SECRETARIA, RolUsuario.COORDINADOR_ACADEMICO)
  @RequiereAlcance()
  getProgreso(
    @Param("periodoId") periodoId: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.getProgreso(Number(periodoId), usuario.contextoAcademico);
  }
}
