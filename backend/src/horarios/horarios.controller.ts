import {
<<<<<<< HEAD
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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { AsignacionService } from "./asignacion.service";
import { HorariosService } from "./horarios.service";
import { GenerarHorarioDto } from "./dto/generar-horario.dto";
import { LimpiarHorarioDto } from "./dto/limpiar-horario.dto";
import { ReasignarHorarioDto } from "./dto/reasignar-horario.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
=======
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, ParseIntPipe, HttpCode, HttpStatus, UseGuards, UseInterceptors, Req,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { CacheTTL } from '@nestjs/cache-manager';
import { AsignacionService } from './asignacion.service';
import { HorariosService } from './horarios.service';
import { GenerarHorarioDto } from './dto/generar-horario.dto';
import { LimpiarHorarioDto } from './dto/limpiar-horario.dto';
import { ReasignarHorarioDto } from './dto/reasignar-horario.dto';
import { QueryHorarioListDto } from './dto/query-horario-list.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { HttpCacheInterceptor } from '../common/interceptors/http-cache.interceptor';
import { AuditLogService } from '../common/services/audit-log.service';
import { Usuario } from '../entities/usuario.entity';
import { Request } from 'express';
>>>>>>> develop

@ApiTags("horarios")
@Controller("horarios")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class HorariosController {
  constructor(
    private readonly asignacionService: AsignacionService,
    private readonly horariosService: HorariosService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post("generar")
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
<<<<<<< HEAD
  @ApiOperation({ summary: "Ejecutar el motor de asignación para un período" })
  async generarHorario(@Body() dto: GenerarHorarioDto) {
    const result = await this.asignacionService.generarHorario(dto.periodo);
    return {
      data: result,
      message: `Horario generado: ${result.asignaciones_creadas} asignaciones, ${result.conflictos} conflictos`,
    };
=======
  @ApiOperation({ summary: 'Ejecutar el motor de asignación para un período' })
  async generarHorario(
    @Body() dto: GenerarHorarioDto,
    @CurrentUser() usuario: Usuario,
    @Req() request: Request,
  ) {
    const result = await this.asignacionService.generarHorario(dto.periodo);
    await this.auditLogService.log({
      usuario: this.getAuditActor(usuario),
      accion: 'GENERAR_HORARIO',
      entidad: 'asignacion_horarios',
      entidadId: dto.periodo,
      ip: this.getRequestIp(request),
    });
    return { data: result, message: `Horario generado: ${result.asignaciones_creadas} asignaciones, ${result.conflictos} conflictos` };
>>>>>>> develop
  }

  @Delete("limpiar")
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
<<<<<<< HEAD
  @ApiOperation({ summary: "Eliminar todas las asignaciones de un período" })
  async limpiarHorario(@Body() dto: LimpiarHorarioDto) {
=======
  @ApiOperation({ summary: 'Eliminar todas las asignaciones de un período' })
  async limpiarHorario(
    @Body() dto: LimpiarHorarioDto,
    @CurrentUser() usuario: Usuario,
    @Req() request: Request,
  ) {
>>>>>>> develop
    const result = await this.asignacionService.limpiarHorario(dto.periodo);
    await this.auditLogService.log({
      usuario: this.getAuditActor(usuario),
      accion: 'LIMPIAR_HORARIO',
      entidad: 'asignacion_horarios',
      entidadId: dto.periodo,
      ip: this.getRequestIp(request),
    });
    return { data: result, message: `Período ${dto.periodo} limpiado` };
  }

<<<<<<< HEAD
  @Get("periodo/:periodo")
  @ApiOperation({ summary: "Horario completo de un período" })
  @ApiParam({ name: "periodo", example: "2026-I" })
  async getByPeriodo(@Param("periodo") periodo: string) {
    const result = await this.horariosService.findAllByPeriodo(periodo);
    return { data: result, message: "Horario del período obtenido" };
  }

  @Get("docente/:id")
  @ApiOperation({ summary: "Horario de un docente en un período" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async getByDocente(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
  ) {
    const result = await this.horariosService.findByDocente(id, periodo ?? "");
    return { data: result, message: "Horario del docente obtenido" };
  }

  @Get("ambiente/:id")
  @ApiOperation({ summary: "Horario de un ambiente en un período" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async getByAmbiente(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
  ) {
    const result = await this.horariosService.findByAmbiente(id, periodo ?? "");
    return { data: result, message: "Horario del ambiente obtenido" };
  }

  @Get("conflictos/:periodo")
  @ApiOperation({ summary: "Lista de conflictos del período" })
  @ApiParam({ name: "periodo", example: "2026-I" })
  async getConflictos(@Param("periodo") periodo: string) {
    const result = await this.horariosService.findConflictos(periodo);
    return { data: result, message: "Conflictos obtenidos" };
=======
  @Get()
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(600)
  @ApiOperation({ summary: 'Horario paginado por período' })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  async getHorarios(@Query('periodo') periodo: string, @Query() query: QueryHorarioListDto) {
    const result = await this.horariosService.findAllByPeriodo(
      periodo ?? '',
      query.page ?? 1,
      query.limit ?? 20,
    );
    return { data: result, message: 'Horario del período obtenido' };
  }

  @Get('periodo/:periodo')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(600)
  @ApiOperation({ summary: 'Horario completo de un período' })
  @ApiParam({ name: 'periodo', example: '2026-I' })
  async getByPeriodo(
    @Param('periodo') periodo: string,
    @Query() query: QueryHorarioListDto,
  ) {
    const result = await this.horariosService.findAllByPeriodo(
      periodo,
      query.page ?? 1,
      query.limit ?? 20,
    );
    return { data: result, message: 'Horario del período obtenido' };
  }

  @Get('docente/:id')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(600)
  @ApiOperation({ summary: 'Horario de un docente en un período' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  async getByDocente(
    @Param('id', ParseIntPipe) id: number,
    @Query('periodo') periodo: string,
    @Query() query: QueryHorarioListDto,
  ) {
    const result = await this.horariosService.findByDocente(
      id,
      periodo ?? '',
      query.page ?? 1,
      query.limit ?? 20,
    );
    return { data: result, message: 'Horario del docente obtenido' };
  }

  @Get('ambiente/:id')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(600)
  @ApiOperation({ summary: 'Horario de un ambiente en un período' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  async getByAmbiente(
    @Param('id', ParseIntPipe) id: number,
    @Query('periodo') periodo: string,
    @Query() query: QueryHorarioListDto,
  ) {
    const result = await this.horariosService.findByAmbiente(
      id,
      periodo ?? '',
      query.page ?? 1,
      query.limit ?? 20,
    );
    return { data: result, message: 'Horario del ambiente obtenido' };
  }

  @Get('conflictos/:periodo')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(600)
  @ApiOperation({ summary: 'Lista de conflictos del período' })
  @ApiParam({ name: 'periodo', example: '2026-I' })
  async getConflictos(
    @Param('periodo') periodo: string,
    @Query() query: QueryHorarioListDto,
  ) {
    const result = await this.horariosService.findConflictos(
      periodo,
      query.page ?? 1,
      query.limit ?? 20,
    );
    return { data: result, message: 'Conflictos obtenidos' };
>>>>>>> develop
  }

  @Patch("conflictos/:id/resolver")
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
<<<<<<< HEAD
  @ApiOperation({ summary: "Marcar un conflicto como resuelto" })
  @ApiParam({ name: "id", type: Number })
  async resolverConflicto(@Param("id", ParseIntPipe) id: number) {
    const result = await this.horariosService.resolverConflicto(id);
    return { data: result, message: "Conflicto marcado como resuelto" };
=======
  @ApiOperation({ summary: 'Marcar un conflicto como resuelto' })
  @ApiParam({ name: 'id', type: Number })
  async resolverConflicto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
    @Req() request: Request,
  ) {
    const result = await this.horariosService.resolverConflicto(id);
    await this.auditLogService.log({
      usuario: this.getAuditActor(usuario),
      accion: 'RESOLVER_CONFLICTO',
      entidad: 'conflicto_asignacion',
      entidadId: id,
      ip: this.getRequestIp(request),
    });
    return { data: result, message: 'Conflicto marcado como resuelto' };
>>>>>>> develop
  }

  @Patch(":id")
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @ApiOperation({
    summary: "Reasignación manual de un horario (valida cruces)",
  })
  @ApiParam({ name: "id", type: Number })
  async reasignar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReasignarHorarioDto,
    @CurrentUser() usuario: Usuario,
    @Req() request: Request,
  ) {
    const result = await this.horariosService.reasignarManual(id, dto);
<<<<<<< HEAD
    return { data: result, message: "Horario reasignado correctamente" };
=======
    await this.auditLogService.log({
      usuario: this.getAuditActor(usuario),
      accion: 'REASIGNAR_HORARIO',
      entidad: 'horario',
      entidadId: id,
      ip: this.getRequestIp(request),
    });
    return { data: result, message: 'Horario reasignado correctamente' };
>>>>>>> develop
  }

  private getAuditActor(usuario: Usuario): string {
    return usuario?.email ?? `${usuario?.nombre ?? 'usuario'}#${usuario?.id ?? 'anonimo'}`;
  }

  private getRequestIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    return request.ip ?? request.socket.remoteAddress ?? 'desconocida';
  }
}
