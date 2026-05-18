import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
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

@ApiTags("ventanas")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
@Controller("ventanas")
export class VentanasController {
  constructor(
    private readonly ventanasService: VentanasService,
    private readonly gestorSeleccionService: GestorSeleccionTemporalService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Crear ventana de atención" })
  @ApiResponse({ status: 201, description: "Ventana creada" })
  async crear(@Body() dto: CreateVentanaDto) {
    const data = await this.ventanasService.crearVentana(dto);
    return { data, message: "Ventana creada", statusCode: HttpStatus.CREATED };
  }

  @Post("configurar-periodo")
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Iniciar ventana y cargar cola" })
  async iniciar(@Param("id") id: string) {
    const data = await this.ventanasService.iniciarVentana(id);
    return { data, message: "Ventana iniciada", statusCode: HttpStatus.OK };
  }

  @Post(":id/siguiente")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Llamar al siguiente docente" })
  async llamarSiguiente(@Param("id") id: string) {
    const data = await this.ventanasService.llamarSiguiente(id);
    return { data, message: "Cola actualizada", statusCode: HttpStatus.OK };
  }

  @Patch(":id/ausente/:docenteId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Marcar docente ausente" })
  async marcarAusente(
    @Param("id") id: string,
    @Param("docenteId") docenteId: string,
  ) {
    const data = await this.ventanasService.marcarAusente(
      id,
      Number(docenteId),
    );
    return {
      data,
      message: "Docente marcado como ausente",
      statusCode: HttpStatus.OK,
    };
  }

  @Patch(":id/completar")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Completar ventana" })
  async completar(@Param("id") id: string) {
    const data = await this.ventanasService.completarVentana(id);
    return { data, message: "Ventana completada", statusCode: HttpStatus.OK };
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

  @Post(":id/reprogramar")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reprogramar pendientes de una ventana" })
  async reprogramar(@Param("id") id: string) {
    const data = await this.ventanasService.reprogramarPendientes(id);
    return {
      data,
      message: "Pendientes reprogramados",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("selecciones")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Seleccionar celda temporalmente" })
  async seleccionarCelda(@Body() dto: SeleccionarCeldaDto) {
    const data = await this.gestorSeleccionService.seleccionarCelda(dto);
    return { data, message: "Celda procesada", statusCode: HttpStatus.OK };
  }

  @Patch("selecciones/deseleccionar")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deseleccionar celda temporal" })
  async deseleccionarCelda(@Body() dto: DeseleccionarCeldaDto) {
    await this.gestorSeleccionService.deseleccionarCelda(
      dto.sesionId,
      dto.ambienteId,
      dto.dia,
      dto.horaInicio,
      dto.periodo,
    );
    return { data: null, message: "Celda liberada", statusCode: HttpStatus.OK };
  }

  @Post("selecciones/confirmar")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirmar selecciones temporales" })
  async confirmarSelecciones(@Body() dto: ConfirmarSeleccionesDto) {
    const data = await this.gestorSeleccionService.confirmarSelecciones(
      dto.sesionId,
      dto.periodoId,
    );
    return {
      data,
      message: "Selecciones confirmadas",
      statusCode: HttpStatus.OK,
    };
  }
}
