import {
  BadRequestException,
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
  Req,
  Res,
  Headers,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Request } from "express";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { EstadoAmbiente } from "../common/enums/estado-ambiente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { AuditoriaHorario } from "../entities/auditoria-horario.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { Usuario } from "../entities/usuario.entity";
import { AsignacionService } from "./asignacion.service";
import { GeneracionAutomaticaService } from "./generacion-automatica.service";
import { ICalendarService } from "./icalendar.service";
import { GenerarHorarioDto } from "./dto/generar-horario.dto";
import { GenerarAutomaticoDto } from "./dto/generar-automatico.dto";
import { ReasignarHorarioDto } from "./dto/reasignar-horario.dto";
import { ResolverConflictoDto } from "./dto/resolver-conflicto.dto";
import { CrearAsignacionDto } from "./dto/crear-asignacion.dto";
import { UpdateAsignacionDto } from "./dto/update-asignacion.dto";
import { HorariosService } from "./horarios.service";

@ApiTags("horarios")
@Controller("horarios")
@UseGuards(JwtAuthGuard, RolesGuard)
export class HorariosController {
  private readonly logger = new Logger(HorariosController.name);
  
  constructor(
    private readonly asignacionService: AsignacionService,
    private readonly horariosService: HorariosService,
    private readonly generacionService: GeneracionAutomaticaService,
    private readonly icalendarService: ICalendarService,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(AuditoriaHorario)
    private readonly auditoriaRepo: Repository<AuditoriaHorario>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
  ) {}

  @Post("asignar")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Asignar manualmente un horario" })
  @ApiResponse({ status: 201, description: "Horario asignado correctamente" })
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  async asignarHorario(@Body() dto: CrearAsignacionDto) {
    const data = await this.horariosService.crearAsignacion(dto);
    return {
      data,
      message: "Horario asignado",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Post("generar")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Generar horario para un período" })
  @ApiResponse({ status: 201, description: "Horario generado correctamente" })
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  async generarHorario(@Body() dto: GenerarHorarioDto) {
    const resultado = await this.asignacionService.generarHorario(dto.periodo);
    return {
      data: resultado,
      message: "Horario generado",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Delete("limpiar")
  @ApiBearerAuth("JWT")
  @ApiOperation({
    summary: "Limpiar horario en BORRADOR/CONFLICTO por período",
  })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiResponse({ status: 200, description: "Horario limpiado correctamente" })
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @HttpCode(HttpStatus.OK)
  async limpiarHorario(@Query("periodo") periodo: string) {
    const resultado = await this.asignacionService.limpiarHorario(periodo);
    return {
      data: resultado,
      message: "Horario limpiado",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("periodo/:periodo")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Listar horario por período" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Horarios del período" })
  async getPorPeriodo(
    @Param("periodo") periodo: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const data = await this.horariosService.findAllByPeriodo(
      periodo,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return {
      data,
      message: "Horario del período obtenido",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("docente/:id")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Listar horario de un docente por período" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Horario del docente" })
  async getPorDocente(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const data = await this.horariosService.findByDocente(
      id,
      periodo,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return {
      data,
      message: "Horario del docente obtenido",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("ocupacion-heatmap")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Listar heatmap de ocupación por período" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiResponse({ status: 200, description: "Heatmap obtenido" })
  async getOcupacionHeatmap(@Query("periodo") periodo: string) {
    const data = await this.horariosService.getOcupacionHeatmap(periodo);
    return { data, message: "Heatmap obtenido", statusCode: HttpStatus.OK };
  }

  @Get("ambiente/:id")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Listar ocupación de un ambiente por período" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Ocupación del ambiente" })
  async getPorAmbiente(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const data = await this.horariosService.findByAmbiente(
      id,
      periodo,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return {
      data,
      message: "Horario del ambiente obtenido",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("dia/:dia")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Listar asignaciones por día y período" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Asignaciones del día" })
  async getPorDia(
    @Param("dia", ParseIntPipe) dia: number,
    @Query("periodo") periodo: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const data = await this.horariosService.findByDia(
      dia,
      periodo,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
    return {
      data,
      message: "Horario del día obtenido",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("mis-horarios")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Listar horario propio del docente autenticado" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiResponse({ status: 200, description: "Horario del docente" })
  @Roles(RolUsuario.DOCENTE)
  async getMisHorarios(
    @CurrentUser() usuario: Usuario,
    @Query("periodo") periodo: string,
  ) {
    if (typeof (usuario as Usuario & { docenteId?: number | null }).docenteId === "number") {
      const data = await this.horariosService.findHorariosByDocenteId(
        (usuario as Usuario & { docenteId: number }).docenteId,
        periodo,
      );
      return { data, message: "Horario obtenido", statusCode: HttpStatus.OK };
    }

    if (!usuario.email) throw new BadRequestException("Usuario sin correo");

    const data = await this.horariosService.findHorariosByDocenteEmail(
      usuario.email,
      periodo,
    );
    return { data, message: "Horario obtenido", statusCode: HttpStatus.OK };
  }

  @Get("mis-horarios/ical")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Exportar horario propio del docente autenticado a formato iCalendar (.ics)" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiResponse({ status: 200, description: "Archivo iCalendar generado" })
  @Roles(RolUsuario.DOCENTE)
  async exportarMiICalendar(
    @CurrentUser() usuario: Usuario,
    @Query("periodo") periodo: string,
    @Res() res: any,
  ) {
    try {
      if (!usuario.email) throw new BadRequestException("Usuario sin correo");

      // Obtener el docenteId basado en el email del usuario
      const result = await this.horariosService.findHorariosByDocenteEmail(
        usuario.email,
        periodo,
      );

      if (!result.horarios || result.horarios.length === 0) {
        throw new NotFoundException("No se encontraron horarios para el docente");
      }

      // Obtener el docenteId del resultado
      const docenteId = result.docente.id;
      if (!docenteId) {
        throw new NotFoundException("No se pudo identificar el docente");
      }

      const icsContent = await this.icalendarService.generarICalendarDocente(
        docenteId,
        periodo,
      );

      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=horario_${periodo}.ics`,
      );
      res.setHeader("Content-Length", Buffer.byteLength(icsContent));

      // Cache control para evitar descargas repetidas
      res.setHeader("Cache-Control", "public, max-age=3600");

      return res.send(icsContent);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Error al generar archivo iCalendar");
    }
  }

  @Post("reasignar-manual")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Reasignar manualmente un horario" })
  @ApiResponse({ status: 200, description: "Horario reasignado correctamente" })
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  async reasignarManual(
    @Body() dto: ReasignarHorarioDto & { id: number },
    @CurrentUser() usuario: Usuario,
    @Req() request: Request,
  ) {
    const data = await this.asignacionService.reasignarManual(dto.id, {
      ...dto,
      usuario_id: usuario?.id,
      ip: request.ip,
    });
    return { data, message: "Horario reasignado", statusCode: HttpStatus.OK };
  }

  @Patch(":id")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Reasignar manualmente un horario (legacy)" })
  @ApiResponse({ status: 200, description: "Horario reasignado correctamente" })
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  async reasignarHorario(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReasignarHorarioDto,
    @CurrentUser() usuario: Usuario,
    @Req() request: Request,
  ) {
    const data = await this.asignacionService.reasignarManual(id, {
      ...dto,
      usuario_id: usuario?.id,
      ip: request.ip,
    });
    return { data, message: "Horario reasignado", statusCode: HttpStatus.OK };
  }

  @Patch(':id/actualizar')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Actualizar una asignación de horario existente' })
  @ApiResponse({ status: 200, description: 'Asignación actualizada correctamente' })
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA)
  async updateAsignacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAsignacionDto,
    @CurrentUser() usuario: Usuario,
  ) {
    const data = await this.asignacionService.updateAsignacion(id, dto, usuario);
    return { data, message: 'Asignación actualizada', statusCode: HttpStatus.OK };
  }

  @Delete(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Eliminar una asignación de horario existente' })
  @ApiResponse({ status: 200, description: 'Asignación eliminada correctamente' })
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA)
  async deleteAsignacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
    @Req() request: Request,
  ) {
    try {
      this.logger.log(`[deleteAsignacion] Intentando eliminar horario ID: ${id}`);
      
      const horario = await this.horarioRepo.findOne({ where: { id } });
      if (!horario) {
        this.logger.warn(`[deleteAsignacion] Horario ${id} no encontrado`);
        throw new NotFoundException(`Horario ${id} no encontrado`);
      }

      const datosAnteriores = {
        estado: horario.estado,
        dia: horario.dia,
        hora_inicio: horario.hora_inicio,
        hora_fin: horario.hora_fin,
        ambiente_id: horario.ambiente_id,
        docente_id: horario.docente_id,
        curso_id: horario.curso_id,
        tipo_clase: horario.tipo_clase,
        grupo_id: horario.grupo_id,
      };

      this.logger.log(`[deleteAsignacion] Datos anteriores: ${JSON.stringify(datosAnteriores)}`);
      
      // Save audit record before deletion to avoid foreign key constraint violation
      await this.auditoriaRepo.save(
        this.auditoriaRepo.create({
          horario_id: id,
          usuario_id: usuario?.id ?? 1,
          accion: "eliminar_asignacion",
          datos_anteriores: datosAnteriores,
          datos_nuevos: null,
          ip: request.ip ?? "desconocida",
          motivo: "Eliminación desde modo edición",
        }),
      );
      this.logger.log(`[deleteAsignacion] Auditoría guardada exitosamente`);

      await this.horarioRepo.delete(id);
      this.logger.log(`[deleteAsignacion] Horario ${id} eliminado de la base de datos`);

      return { data: null, message: 'Asignación eliminada', statusCode: HttpStatus.OK };
    } catch (error) {
      this.logger.error(`[deleteAsignacion] Error al eliminar horario ${id}: ${error.message}`);
      this.logger.error(`[deleteAsignacion] Stack trace: ${error.stack}`);
      throw error;
    }
  }


  @Get("conflictos/:periodo")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Listar conflictos del período" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Conflictos del período" })
  async getConflictos(
    @Param("periodo") periodo: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const data = await this.horariosService.findConflictos(
      periodo,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return { data, message: "Conflictos obtenidos", statusCode: HttpStatus.OK };
  }

  @Patch("conflictos/:id/resolver")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Resolver conflicto y pasar estado a BORRADOR" })
  @ApiResponse({ status: 200, description: "Conflicto resuelto correctamente" })
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  async resolverConflicto(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ResolverConflictoDto,
    @CurrentUser() usuario: Usuario,
    @Req() request: Request,
  ) {
    const horario = await this.horarioRepo.findOne({ where: { id } });
    if (!horario) {
      throw new BadRequestException(`Horario ${id} no encontrado`);
    }

    const datosAnteriores = {
      estado: horario.estado,
      dia: horario.dia,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      ambiente_id: horario.ambiente_id,
    };

    horario.estado = EstadoHorario.BORRADOR;
    const actualizado = await this.horarioRepo.save(horario);

    await this.auditoriaRepo.save(
      this.auditoriaRepo.create({
        horario_id: actualizado.id,
        usuario_id: usuario?.id ?? 1,
        accion: "resolver_conflicto",
        datos_anteriores: datosAnteriores,
        datos_nuevos: {
          estado: actualizado.estado,
          dia: actualizado.dia,
          hora_inicio: actualizado.hora_inicio,
          hora_fin: actualizado.hora_fin,
          ambiente_id: actualizado.ambiente_id,
        },
        ip: request.ip ?? "desconocida",
        motivo: dto.motivo,
      }),
    );

    return {
      data: actualizado,
      message: "Conflicto resuelto",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("generar-automatico")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Generar horarios automáticamente para un período" })
  @ApiResponse({ status: 201, description: "Horarios generados correctamente" })
  async generarAutomatico(@Body() dto: GenerarAutomaticoDto) {
    const resultado = await this.generacionService.generarHorarios(dto.periodo);
    return {
      data: resultado,
      message: "Generación automática completada",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Post("publicar-auto-generados")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Publicar horarios auto-generados de un período" })
  @ApiResponse({ status: 200, description: "Horarios publicados" })
  async publicarAutoGenerados(@Body() dto: GenerarAutomaticoDto) {
    const resultado = await this.generacionService.publicarHorariosAutoGenerados(dto.periodo);
    return {
      data: resultado,
      message: "Horarios auto-generados publicados",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("debug/:periodo")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Depurar horarios de un período (verificar consistencia)" })
  @ApiParam({ name: "periodo", type: String })
  async debugHorarios(@Param("periodo") periodo: string) {
    const periodoEntity = await this.periodoRepo.findOne({ where: { codigo: periodo } });
    const periodoId = periodoEntity?.id;

    const horarios = await this.horarioRepo.find({
      where: { periodo },
      relations: ["docente", "curso", "ambiente", "grupo"],
    });

    const inconsistentes = [];
    const consistentes = [];

    for (const h of horarios) {
      const habilitacion = await this.horarioRepo
        .createQueryBuilder("h")
        .select("h.id")
        .from("docente_curso", "dc")
        .where("dc.docenteId = :docenteId", { docenteId: h.docente_id })
        .andWhere("dc.cursoId = :cursoId", { cursoId: h.curso_id })
        .andWhere("dc.tipo_clase = :tipoClase", { tipoClase: h.tipo_clase })
        .andWhere("dc.periodoId = :periodoId", { periodoId })
        .getRawOne();

      if (!habilitacion) {
        inconsistentes.push({
          id: h.id,
          docente: h.docente?.apellidos,
          curso: h.curso?.nombre,
          tipo: h.tipo_clase,
          periodoIdBuscado: periodoId,
          error: "No tiene habilitación docente-curso",
        });
      } else {
        consistentes.push({
          id: h.id,
          docente: h.docente?.apellidos,
          curso: h.curso?.nombre,
          tipo: h.tipo_clase,
        });
      }
    }

    // También verificar cuántas habilitaciones existen para este periodo
    const totalHabilitaciones = await this.horarioRepo
      .createQueryBuilder("h")
      .select("COUNT(*)")
      .from("docente_curso", "dc")
      .where("dc.periodoId = :periodoId", { periodoId })
      .getRawOne();

    return {
      data: {
        total: horarios.length,
        consistentes: consistentes.length,
        inconsistentes: inconsistentes.length,
        periodoId,
        totalHabilitaciones: totalHabilitaciones?.count || 0,
        inconsistentesList: inconsistentes,
      },
      message: "Depuración completada",
    };
  }

  @Get("docente/:id/ics")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Exportar horario de docente a formato iCalendar (.ics)" })
  @ApiParam({ name: "id", description: "ID del docente" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiResponse({ status: 200, description: "Archivo iCalendar generado" })
  async exportarICalendar(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Res() res: any,
    @Headers() headers: any,
  ) {
    try {
      const icsContent = await this.icalendarService.generarICalendarDocente(
        id,
        periodo,
      );

      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=horario_docente_${id}_${periodo}.ics`,
      );
      res.setHeader("Content-Length", Buffer.byteLength(icsContent));

      // Cache control para evitar descargas repetidas
      res.setHeader("Cache-Control", "public, max-age=3600");

      return res.send(icsContent);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Error al generar archivo iCalendar");
    }
  }

  @Get("matriz-disponibilidad")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Obtener matriz de disponibilidad para selección de horarios" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiQuery({ name: "ambientes", required: false, description: "IDs de ambientes separados por comas" })
  @ApiResponse({ status: 200, description: "Matriz de disponibilidad" })
  @Roles(RolUsuario.DOCENTE, RolUsuario.SECRETARIA, RolUsuario.COORDINADOR_ACADEMICO)
  async getMatrizDisponibilidad(
    @Query("periodo") periodo: string,
    @Query("ambientes") ambientes?: string,
  ) {
    const ambienteIds = ambientes ? ambientes.split(',').map(id => parseInt(id, 10)) : undefined;
    const data = await this.horariosService.getMatrizDisponibilidad(periodo, ambienteIds);
    return {
      data,
      message: "Matriz de disponibilidad obtenida",
      statusCode: HttpStatus.OK,
    };
  }
}
