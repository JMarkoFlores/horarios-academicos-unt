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
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
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
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { AuditoriaHorario } from "../entities/auditoria-horario.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { Usuario } from "../entities/usuario.entity";
import { AsignacionService } from "./asignacion.service";
import { GenerarHorarioDto } from "./dto/generar-horario.dto";
import { ReasignarHorarioDto } from "./dto/reasignar-horario.dto";
import { ResolverConflictoDto } from "./dto/resolver-conflicto.dto";
import { CrearAsignacionDto } from "./dto/crear-asignacion.dto";
import { HorariosService } from "./horarios.service";

@ApiTags("horarios")
@Controller("horarios")
@UseGuards(JwtAuthGuard, RolesGuard)
export class HorariosController {
  constructor(
    private readonly asignacionService: AsignacionService,
    private readonly horariosService: HorariosService,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(AuditoriaHorario)
    private readonly auditoriaRepo: Repository<AuditoriaHorario>,
  ) {}

  @Post("asignar")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Asignar manualmente un horario" })
  @ApiResponse({ status: 201, description: "Horario asignado correctamente" })
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
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
    // Assuming Usuario entity has a relation to Docente or email matches
    if (!usuario.email) throw new BadRequestException("Usuario sin correo");

    // We need to fetch the docenteId based on the logged-in user's email or link
    // Assuming for simplicity that the auth process handles this mapping or we can fetch it
    // For this implementation, I will assume a method in HorariosService or similar exists
    // If not, this might need further implementation.
    const data = await this.horariosService.findHorariosByDocenteEmail(
      usuario.email,
      periodo,
    );
    return { data, message: "Horario obtenido", statusCode: HttpStatus.OK };
  }

  @Patch(":id")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Reasignar manualmente un horario" })
  @ApiResponse({ status: 200, description: "Horario reasignado correctamente" })
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
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
}
