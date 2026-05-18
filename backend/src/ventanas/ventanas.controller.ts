import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
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
} from "@nestjs/swagger";
import { VentanasService } from "./ventanas.service";
import { CreateVentanaDto } from "./dto/create-ventana.dto";
import { ConfirmarSeleccionDto } from "./dto/confirmar-seleccion.dto";
import { SeleccionarCeldaDto } from "./dto/seleccionar-celda.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";

@ApiTags("ventanas")
@Controller("ventanas")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class VentanasController {
  constructor(private readonly ventanasService: VentanasService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @ApiOperation({ summary: "Crear ventana de atención" })
  async crear(@Body() dto: CreateVentanaDto) {
    const result = await this.ventanasService.crearVentana(dto);
    return { data: result, message: "Ventana creada correctamente" };
  }

  @Post(":id/iniciar")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Iniciar ventana y cargar cola de docentes por jerarquía",
  })
  @ApiParam({ name: "id", type: Number })
  async iniciar(@Param("id", ParseIntPipe) id: number) {
    const result = await this.ventanasService.iniciarVentana(id);
    return { data: result, message: "Ventana iniciada, cola cargada" };
  }

  @Post(":id/siguiente")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Llamar al siguiente docente en la cola" })
  @ApiParam({ name: "id", type: Number })
  async siguiente(@Param("id", ParseIntPipe) id: number) {
    const result = await this.ventanasService.llamarSiguiente(id);
    return {
      data: result,
      message: result ? "Siguiente docente llamado" : "Cola finalizada",
    };
  }

  @Post(":id/confirmar")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirmar selección de un docente" })
  @ApiParam({ name: "id", type: Number })
  async confirmar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ConfirmarSeleccionDto,
  ) {
    const result = await this.ventanasService.confirmarSeleccion(
      id,
      dto.docente_id,
    );
    return { data: result, message: `${result.length} horarios confirmados` };
  }

  @Get(":id/cola")
  @ApiOperation({ summary: "Estado actual de la cola de una ventana" })
  @ApiParam({ name: "id", type: Number })
  async getCola(@Param("id", ParseIntPipe) id: number) {
    const result = await this.ventanasService.getEstadoCola(id);
    return { data: result, message: "Estado de la cola obtenido" };
  }

  @Post(":id/celda")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Seleccionar temporalmente una celda de horario" })
  @ApiParam({ name: "id", type: Number })
  async seleccionarCelda(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SeleccionarCeldaDto,
  ) {
    const result = await this.ventanasService.seleccionarCelda(id, dto);
    return { data: result, message: "Celda seleccionada (expira en 30 min)" };
  }

  @Delete(":id/celda")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Liberar una celda seleccionada temporalmente" })
  @ApiParam({ name: "id", type: Number })
  async liberarCelda(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SeleccionarCeldaDto,
  ) {
    await this.ventanasService.liberarCelda(id, dto);
    return { data: null, message: "Celda liberada" };
  }
}
