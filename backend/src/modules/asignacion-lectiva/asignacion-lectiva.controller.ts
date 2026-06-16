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
import { AsignacionLectivaService } from "./asignacion-lectiva.service";
import { CreateAsignacionLectivaDto } from "./dto/create-asignacion-lectiva.dto";
import { UpdateAsignacionLectivaDto } from "./dto/update-asignacion-lectiva.dto";
import { QueryAsignacionLectivaDto } from "./dto/query-asignacion-lectiva.dto";

@Controller("asignacion-lectiva")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsignacionLectivaController {
  constructor(private readonly service: AsignacionLectivaService) {}

  @Get("resumen")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @RequiereAlcance()
  getResumen(
    @Query("periodo_id") periodoId?: string,
    @Query("plan_id") planId?: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.service.getResumen(
      periodoId ? Number(periodoId) : undefined,
      planId ? Number(planId) : undefined,
      usuario?.contextoAcademico,
    );
  }

  @Get("docente/:docenteId")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DOCENTE,
  )
  findByDocente(
    @Param("docenteId") docenteId: string,
    @Query("periodo_id") periodoId?: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.service.findByDocente(
      Number(docenteId),
      periodoId ? Number(periodoId) : undefined,
      usuario?.contextoAcademico,
    );
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @RequiereAlcance()
  findAll(
    @Query() query: QueryAsignacionLectivaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.findAll(query, usuario.contextoAcademico);
  }

  @Get(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @RequiereAlcance()
  findOne(
    @Param("id") id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.findOne(Number(id), usuario.contextoAcademico);
  }

  @Post()
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @RequiereAlcance()
  create(
    @Body() dto: CreateAsignacionLectivaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.create(dto, usuario);
  }

  @Patch(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @RequiereAlcance()
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAsignacionLectivaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.update(Number(id), dto, usuario);
  }

  @Patch(":id/confirmar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @RequiereAlcance()
  confirmar(
    @Param("id") id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.confirmar(Number(id), usuario);
  }

  @Patch(":id/rechazar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @RequiereAlcance()
  rechazar(
    @Param("id") id: string,
    @Body("observaciones") observaciones: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.rechazar(Number(id), usuario, observaciones);
  }

  @Delete(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @RequiereAlcance()
  remove(
    @Param("id") id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.remove(Number(id), usuario);
  }
}
