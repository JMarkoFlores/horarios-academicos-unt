import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";
import { ConfirmarSeleccionesDto } from "./dto/confirmar-selecciones.dto";
import { ConfigurarVentanasPeriodoDto } from "./dto/configurar-ventanas-periodo.dto";
import { CreateVentanaDto } from "./dto/create-ventana.dto";
import { DeseleccionarCeldaDto } from "./dto/deseleccionar-celda.dto";
import { SeleccionarCeldaDto } from "./dto/seleccionar-celda.dto";
import { GestorSeleccionTemporalService } from "./gestor-seleccion.service";
import { VentanasService } from "./ventanas.service";
import { HorariosGateway } from "../../horarios/horarios.gateway";

@ApiTags("ventanas")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("ventanas")
export class VentanasController {
  constructor(
    private readonly ventanasService: VentanasService,
    private readonly gestorSeleccionService: GestorSeleccionTemporalService,
    private readonly gateway: HorariosGateway,
  ) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Crear ventana de atención" })
  @ApiResponse({ status: 201, description: "Ventana creada" })
  async crear(@Body() dto: CreateVentanaDto) {
    const data = await this.ventanasService.crearVentana(dto);
    return { data, message: "Ventana creada", statusCode: HttpStatus.CREATED };
  }

  @Post("configurar-periodo")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Configurar ventanas automáticas para un período" })
  async configurarPeriodo(@Body() dto: ConfigurarVentanasPeriodoDto) {
    const data = await this.ventanasService.configurarVentanasPeriodo(
      dto.idPeriodo,
      dto.fechaInicio,
      dto.config,
    );
    return {
      data,
      message: "Ventanas generadas",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Post(":id/iniciar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Iniciar ventana y cargar cola" })
  async iniciar(@Param("id") id: string) {
    const data = await this.ventanasService.iniciarVentana(id);
    this.gateway.emitirColaActualizada(id, data);
    return { data, message: "Ventana iniciada", statusCode: HttpStatus.OK };
  }

  @Post(":id/siguiente")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Llamar al siguiente docente" })
  async llamarSiguiente(@Param("id") id: string) {
    const data = await this.ventanasService.llamarSiguiente(id);
    this.gateway.emitirColaActualizada(id, data);
    return { data, message: "Cola actualizada", statusCode: HttpStatus.OK };
  }

  @Post(":id/ausente")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Marcar docente ausente" })
  async marcarAusente(
    @Param("id") id: string,
    @Body("docente_id") docenteId: string,
  ) {
    const data = await this.ventanasService.marcarAusente(id, Number(docenteId));
    this.gateway.emitirColaActualizada(id, data);
    return {
      data,
      message: "Docente marcado como ausente",
      statusCode: HttpStatus.OK,
    };
  }

  @Get(":id/cola")
  @ApiOperation({ summary: "Obtener estado de cola" })
  async getEstadoCola(@Param("id") id: string) {
    const data = await this.ventanasService.getEstadoCola(id);
    return {
      data,
      message: "Estado de cola obtenido",
      statusCode: HttpStatus.OK,
    };
  }

  @Post(":id/celda")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Seleccionar celda temporalmente" })
  async seleccionarCelda(
    @Param("id") id: string,
    @Body() dto: SeleccionarCeldaDto,
  ) {
    const dtoConVentana = { ...dto, ventanaId: id } as any;
    const data = await this.gestorSeleccionService.seleccionarCelda(dtoConVentana);
    
    if (data.exito) {
      this.gateway.emitirCeldaSeleccionada(id, dtoConVentana);
    }
    
    return { data, message: "Celda procesada", statusCode: HttpStatus.OK };
  }

  @Delete(":id/celda")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deseleccionar celda temporal" })
  async deseleccionarCelda(
    @Param("id") id: string,
    @Body() dto: DeseleccionarCeldaDto,
  ) {
    await this.gestorSeleccionService.deseleccionarCelda(
      dto.sesionId,
      dto.ambienteId,
      dto.dia,
      dto.horaInicio,
      dto.periodo,
    );
    this.gateway.emitirCeldaLiberada(id, dto);
    return { data: null, message: "Celda liberada", statusCode: HttpStatus.OK };
  }

  @Post(":id/confirmar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.OPERADOR_HORARIOS,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirmar selecciones temporales" })
  async confirmarSelecciones(
    @Param("id") id: string,
    @Body() dto: ConfirmarSeleccionesDto,
  ) {
    const data = await this.gestorSeleccionService.confirmarSelecciones(
      dto.sesionId,
      dto.periodoId,
    );
    this.gateway.emitirHorarioConfirmado(id, dto);
    return {
      data,
      message: "Selecciones confirmadas",
      statusCode: HttpStatus.OK,
    };
  }

  @Get(":id/disponibilidad-matriz")
  @ApiOperation({ summary: "Obtener grilla completa del ambiente para la semana" })
  @ApiQuery({ name: 'ambiente_id', required: true, type: Number })
  @ApiQuery({ name: 'sesionId', required: false, type: String })
  async getDisponibilidadMatriz(
    @Param("id") id: string,
    @Query("ambiente_id") ambienteId: string,
    @Query("sesionId") sesionId?: string,
  ) {
    const data = await this.gestorSeleccionService.obtenerDisponibilidadMatriz(
      id,
      Number(ambienteId),
      sesionId,
    );
    return {
      data,
      message: "Matriz de disponibilidad obtenida",
      statusCode: HttpStatus.OK,
    };
  }
}
