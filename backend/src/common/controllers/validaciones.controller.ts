import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { ValidacionesService } from "../services/validaciones.service";
import {
  VerificarCruceDocenteDto,
  VerificarCruceAmbienteDto,
  VerificarCruceGrupoDto,
  VerificarDisponibilidadDocenteDto,
  VerificarFranjaInstitucionalDto,
  VerificarDiaNoLaborableDto,
  VerificarMaxHorasDocenteDto,
} from "../dto/validaciones.dto";

@ApiTags("validaciones")
@Controller("validaciones")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class ValidacionesController {
  constructor(private readonly validacionesService: ValidacionesService) {}

  @Post("cruce-docente")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verificar si un docente tiene cruce de horario" })
  @ApiResponse({ status: 200, description: "Verificación realizada" })
  async verificarCruceDocente(@Body() dto: VerificarCruceDocenteDto) {
    const tieneCruce = await this.validacionesService.verificarCruceDocente(
      dto.docenteId,
      dto.diaSemana,
      dto.horaInicio,
      dto.horaFin,
      dto.periodo,
      dto.excluirId,
    );
    return {
      data: { tieneCruce },
      message: tieneCruce
        ? "El docente tiene un cruce de horario en el bloque seleccionado"
        : "Docente disponible sin cruces de horario",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("cruce-ambiente")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verificar si un ambiente tiene cruce de horario" })
  @ApiResponse({ status: 200, description: "Verificación realizada" })
  async verificarCruceAmbiente(@Body() dto: VerificarCruceAmbienteDto) {
    const tieneCruce = await this.validacionesService.verificarCruceAmbiente(
      dto.ambienteId,
      dto.diaSemana,
      dto.horaInicio,
      dto.horaFin,
      dto.periodo,
      dto.excluirId,
    );
    return {
      data: { tieneCruce },
      message: tieneCruce
        ? "El ambiente tiene un cruce de horario en el bloque seleccionado"
        : "Ambiente disponible sin cruces de horario",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("cruce-grupo")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verificar si un grupo tiene cruce de horario" })
  @ApiResponse({ status: 200, description: "Verificación realizada" })
  async verificarCruceGrupo(@Body() dto: VerificarCruceGrupoDto) {
    const tieneCruce = await this.validacionesService.verificarCruceGrupo(
      dto.grupoId,
      dto.diaSemana,
      dto.horaInicio,
      dto.horaFin,
      dto.periodo,
      dto.excluirId,
    );
    return {
      data: { tieneCruce },
      message: tieneCruce
        ? "El grupo tiene un cruce de horario en el bloque seleccionado"
        : "Grupo disponible sin cruces de horario",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("disponibilidad-docente")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Verificar si un bloque de horas está dentro de la disponibilidad del docente",
  })
  @ApiResponse({ status: 200, description: "Verificación realizada" })
  async verificarDisponibilidadDocente(
    @Body() dto: VerificarDisponibilidadDocenteDto,
  ) {
    const disponible =
      await this.validacionesService.verificarDisponibilidadDocente(
        dto.docenteId,
        dto.diaSemana,
        dto.horaInicio,
        dto.horaFin,
        dto.periodo,
      );
    return {
      data: { disponible },
      message: disponible
        ? "El bloque está dentro de la disponibilidad del docente"
        : "El docente no tiene disponibilidad registrada para este bloque de horas",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("franja-institucional")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Verificar si las horas propuestas están dentro de la franja institucional (07:00 - 22:00)",
  })
  @ApiResponse({ status: 200, description: "Verificación realizada" })
  async verificarFranjaInstitucional(
    @Body() dto: VerificarFranjaInstitucionalDto,
  ) {
    const valida = this.validacionesService.verificarFranjaInstitucional(
      dto.horaInicio,
      dto.horaFin,
    );
    return {
      data: { valida },
      message: valida
        ? "La franja horaria es válida y está dentro del horario institucional"
        : "La franja horaria propuesta está fuera del horario institucional permitido (07:00 a 22:00) o la hora de inicio es posterior a la hora de fin",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("dia-no-laborable")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Verificar si la fecha propuesta es un día no laborable",
  })
  @ApiResponse({ status: 200, description: "Verificación realizada" })
  async verificarDiaNoLaborable(@Body() dto: VerificarDiaNoLaborableDto) {
    const esNoLaborable =
      await this.validacionesService.verificarDiaNoLaborable(
        dto.fecha,
        dto.periodo,
      );
    return {
      data: { esNoLaborable },
      message: esNoLaborable
        ? "La fecha seleccionada corresponde a un día no laborable"
        : "La fecha es un día laborable regular",
      statusCode: HttpStatus.OK,
    };
  }

  @Post("max-horas-docente")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Verificar si una asignación supera el máximo de horas diarias de un docente",
  })
  @ApiResponse({ status: 200, description: "Verificación realizada" })
  async verificarMaxHorasDocente(@Body() dto: VerificarMaxHorasDocenteDto) {
    const permitido = await this.validacionesService.verificarMaxHorasDocente(
      dto.docenteId,
      dto.dia,
      dto.duracion,
      dto.periodo,
    );
    return {
      data: { permitido },
      message: permitido
        ? "La asignación propuesta está dentro del límite diario de horas del docente"
        : "La asignación propuesta excede el límite máximo de horas diarias permitido para el docente",
      statusCode: HttpStatus.OK,
    };
  }
}
