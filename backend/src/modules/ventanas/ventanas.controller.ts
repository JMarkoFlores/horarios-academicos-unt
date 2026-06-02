import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";
import { Usuario } from "../../entities/usuario.entity";
import { ConfirmarSeleccionesDto } from "./dto/confirmar-selecciones.dto";
import { ConfigurarVentanasPeriodoDto } from "./dto/configurar-ventanas-periodo.dto";
import { CreateVentanaDto } from "./dto/create-ventana.dto";
import { DeseleccionarCeldaDto } from "./dto/deseleccionar-celda.dto";
import { SeleccionarCeldaDto } from "./dto/seleccionar-celda.dto";
import { GestorSeleccionTemporalService } from "./gestor-seleccion.service";
import { VentanasService } from "./ventanas.service";
import { HorariosGateway } from "../../horarios/horarios.gateway";
import { VentanaAtencion, EstadoVentanaAtencion } from "../../entities/ventana-atencion.entity";
import { UpdateVentanaDto } from "./dto/update-ventana.dto";

@ApiTags("ventanas")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ventanas')
export class VentanasController {
  private readonly logger = new Logger(VentanasController.name);
  constructor(
    private readonly ventanasService: VentanasService,
    private readonly gestorSeleccionService: GestorSeleccionTemporalService,
    private readonly gateway: HorariosGateway,
    @InjectRepository(VentanaAtencion)
    private readonly ventanaRepo: Repository<VentanaAtencion>,
  ) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA)
  @ApiOperation({ summary: "Crear ventana de atención" })
  @ApiResponse({ status: 201, description: "Ventana creada" })
  async crear(@Body() dto: CreateVentanaDto) {
    this.logger.log(`[crear] Body recibido: ${JSON.stringify(dto)}`);
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
    RolUsuario.SECRETARIA,
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
    RolUsuario.SECRETARIA,
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
    RolUsuario.SECRETARIA,
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

  @Post(":id/finalizar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Finalizar ventana de atención" })
  async completar(@Param("id") id: string) {
    const data = await this.ventanasService.completarVentana(id);
    return { data, message: "Ventana finalizada correctamente", statusCode: HttpStatus.OK };
  }

  @Delete("all")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO, RolUsuario.SECRETARIA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar TODAS las ventanas (limpieza)" })
  async eliminarTodas() {
    await this.ventanaRepo.query('DELETE FROM cola_docentes');
    await this.ventanaRepo.query('DELETE FROM ventana_atencion');
    this.logger.warn('[eliminarTodas] Todas las ventanas y colas eliminadas');
    return { data: null, message: "Todas las ventanas eliminadas", statusCode: HttpStatus.OK };
  }

  @Get()
  @ApiOperation({ summary: "Listar ventanas con filtros" })
  @ApiQuery({ name: 'periodo', required: false, type: String })
  @ApiQuery({ name: 'estado', required: false, type: String })
  @ApiQuery({ name: 'categoria', required: false, type: String })
  @ApiQuery({ name: 'fechaDesde', required: false, type: String })
  @ApiQuery({ name: 'fechaHasta', required: false, type: String })
  async listarVentanas(
    @Query('periodo') periodo?: string,
    @Query('estado') estado?: string,
    @Query('categoria') categoria?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const data = await this.ventanasService.listarVentanasConFiltros(
      periodo, estado, categoria, fechaDesde, fechaHasta,
    );
    return { data, message: "Ventanas obtenidas", statusCode: HttpStatus.OK };
  }

  @Get("activa")
  @ApiOperation({ summary: "Obtener la ventana de atención activa actual" })
  async getVentanaActiva() {
    const data = await this.ventanasService.obtenerVentanaActiva();
    return {
      data,
      message: "Ventana activa obtenida",
      statusCode: HttpStatus.OK,
    };
  }

  @Get("candidatos-docentes")
  @ApiOperation({ summary: "Obtener docentes candidatos para una categoría de ventana" })
  @ApiQuery({ name: 'categoria', required: true, type: String })
  @ApiQuery({ name: 'periodo', required: true, type: String })
  @ApiQuery({ name: 'modalidad', required: false, type: String })
  async getCandidatosDocentes(
    @Query('categoria') categoria: string,
    @Query('periodo') periodo: string,
    @Query('modalidad') modalidad?: string,
  ) {
    const data = await this.ventanasService.obtenerDocentesParaCategoria(
      categoria,
      periodo,
      modalidad,
    );
    return {
      data,
      message: 'Docentes candidatos obtenidos',
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
    RolUsuario.SECRETARIA,
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

  @Post(":id/celda/deseleccionar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
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

  @Post(":id/limpiar-sesion")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Limpiar todas las selecciones temporales de una sesión" })
  async limpiarSesion(
    @Param("id") id: string,
    @Body() dto: { sesionId: string },
  ) {
    await this.gestorSeleccionService.limpiarSesion(dto.sesionId);
    return { data: null, message: "Sesión limpiada", statusCode: HttpStatus.OK };
  }

  @Post(":id/confirmar")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirmar selecciones temporales" })
  async confirmarSelecciones(
    @Param("id") id: string,
    @Body() dto: ConfirmarSeleccionesDto,
    @CurrentUser() user: Usuario,
  ) {
    const data = await this.gestorSeleccionService.confirmarSelecciones(
      dto.sesionId,
      dto.periodoId,
      user?.id,
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
  @ApiQuery({ name: 'docenteId', required: false, type: Number })
  async getDisponibilidadMatriz(
    @Param("id") id: string,
    @Query("ambiente_id") ambienteId: string,
    @Query("sesionId") sesionId?: string,
    @Query("docenteId") docenteId?: string,
  ) {
    const data = await this.gestorSeleccionService.obtenerDisponibilidadMatriz(
      id,
      Number(ambienteId),
      sesionId,
      docenteId ? Number(docenteId) : undefined,
    );
    return {
      data,
      message: "Matriz de disponibilidad obtenida",
      statusCode: HttpStatus.OK,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener ventana por ID" })
  async obtenerVentana(@Param("id") id: string) {
    const data = await this.ventanasService.obtenerVentana(id);
    return { data, message: "Ventana obtenida", statusCode: HttpStatus.OK };
  }

  @Put(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Actualizar ventana de atención" })
  async actualizar(@Param("id") id: string, @Body() dto: UpdateVentanaDto) {
    const data = await this.ventanasService.actualizarVentana(id, dto);
    return { data, message: "Ventana actualizada", statusCode: HttpStatus.OK };
  }

  @Delete(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar ventana de atención" })
  async eliminar(@Param("id") id: string) {
    await this.ventanasService.eliminarVentana(id);
    return { data: null, message: "Ventana eliminada", statusCode: HttpStatus.OK };
  }

  @Post("sugerir-distribucion")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @ApiOperation({ summary: "Sugerir distribución de múltiples ventanas cuando capacidad insuficiente" })
  async sugerirDistribucion(@Body() dto: CreateVentanaDto) {
    const data = await this.ventanasService.sugerirDistribucion(dto);
    return { data, message: "Distribución sugerida", statusCode: HttpStatus.OK };
  }

  @Post("distribuir-docentes")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @ApiOperation({ summary: "Distribuir docentes entre múltiples ventanas creadas automáticamente" })
  async distribuirDocentes(@Body() dto: { ventanas_ids: string[], periodo: string, categoria: string, modalidad?: string }) {
    await this.ventanasService.distribuirDocentesEntreVentanas(
      dto.ventanas_ids,
      dto.periodo,
      dto.categoria,
      dto.modalidad
    );
    return { data: null, message: "Docentes distribuidos exitosamente", statusCode: HttpStatus.OK };
  }

  @Post(":id/pre-asignar-docentes")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Pre-asignar docentes seleccionados a la cola de una ventana" })
  async preAsignarDocentes(
    @Param("id") ventanaId: string,
    @Body("docentes_ids") docentesIds: number[]
  ) {
    const data = await this.ventanasService.preAsignarDocentes(ventanaId, docentesIds);
    return { data, message: "Docentes pre-asignados exitosamente", statusCode: HttpStatus.OK };
  }
}
