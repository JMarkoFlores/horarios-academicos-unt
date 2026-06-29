import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, ParseIntPipe,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";
import { OfertaAcademicaService } from "./oferta-academica.service";
import { CreateOfertaAcademicaDto } from "./dto/create-oferta-academica.dto";
import { UpdateOfertaAcademicaDto } from "./dto/update-oferta-academica.dto";
import { QueryOfertaAcademicaDto } from "./dto/query-oferta-academica.dto";

@Controller("oferta-academica")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfertaAcademicaController {
  constructor(private readonly service: OfertaAcademicaService) {}

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA, RolUsuario.DIRECTOR_ESCUELA)
  findAll(@Query() query: QueryOfertaAcademicaDto) {
    return this.service.findAll(query);
  }

  @Get("disponibles/:periodoId")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA)
  findDisponibles(@Param("periodoId", ParseIntPipe) periodoId: number) {
    return this.service.findDisponibles(periodoId);
  }

  @Get(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA)
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA)
  create(@Body() dto: CreateOfertaAcademicaDto) {
    return this.service.create(dto);
  }

  @Post("generar/:periodoId/:planId")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA)
  generarDesdePlan(
    @Param("periodoId", ParseIntPipe) periodoId: number,
    @Param("planId", ParseIntPipe) planId: number,
  ) {
    return this.service.generarDesdePlan(periodoId, planId);
  }

  @Patch(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA)
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateOfertaAcademicaDto) {
    return this.service.update(id, dto);
  }

  @Patch(":id/toggle")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA)
  toggleActivo(@Param("id", ParseIntPipe) id: number) {
    return this.service.toggleActivo(id);
  }

  @Delete(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
