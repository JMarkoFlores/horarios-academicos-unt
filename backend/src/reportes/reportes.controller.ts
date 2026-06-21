import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Res,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ReportesService } from "./reportes.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { Usuario } from "../entities/usuario.entity";

@ApiTags("reportes")
@Controller("reportes")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get("docente/:id/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF del horario de un docente" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async docentePDF(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteDocentePDF(
      id,
      periodo,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=horario-docente-${id}-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("declaracion/:docenteId/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF del Formato F03-CAD de DeclaraciÃ³n Jurada" })
  @ApiParam({ name: "docenteId", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async declaracionF03CadPDF(
    @Param("docenteId", ParseIntPipe) docenteId: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer =
      await this.reportesService.generarReporteDeclaracionF03CADPDF(
        docenteId,
        periodo,
      );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=declaracion_carga_horaria_docente_${docenteId}_${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("f01-cad/:docenteId/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF del Formato F01-CAD (DeclaraciÃ³n de Carga AcadÃ©mica Docente)" })
  @ApiParam({ name: "docenteId", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async f01CadPDF(
    @Param("docenteId", ParseIntPipe) docenteId: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteF01CADPDF(
      docenteId,
      periodo,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=f01-cad_docente_${docenteId}_${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("consolidado-carga/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF consolidado de carga acadÃ©mica por departamento" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiQuery({ name: "departamento_id", required: false, type: Number })
  async consolidadoCargaPDF(
    @Query("periodo") periodo: string,
    @Query("departamento_id") departamentoId?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.reportesService.generarReporteConsolidadoCargaPDF(
      periodo,
      departamentoId ? parseInt(departamentoId, 10) : undefined,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=consolidado-carga-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("carga-por-modalidad/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF de distribuciÃ³n de carga por modalidad" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async cargaPorModalidadPDF(
    @Query("periodo") periodo: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.reportesService.generarReporteCargaPorModalidadPDF(
      periodo,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=carga-por-modalidad-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("consolidado-carga/excel")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "Excel consolidado de carga acadÃ©mica" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiQuery({ name: "departamento_id", required: false, type: Number })
  async consolidadoCargaExcel(
    @Query("periodo") periodo: string,
    @Query("departamento_id") departamentoId?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.reportesService.generarReporteConsolidadoCargaExcel(
      periodo,
      departamentoId ? parseInt(departamentoId, 10) : undefined,
    );
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=consolidado-carga-${periodo}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("docente/:id/f03-cad")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF del Formato F03-CAD mejorado (Horario Semanal Docente)" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async docenteF03CadPDF(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteDeclaracionF03CADPDF(
      id,
      periodo,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=f03-cad_docente_${id}_${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("declaracion-jurada/:docenteId/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF del Formato F02-CAD de DeclaraciÃ³n Jurada de Incompatibilidad" })
  @ApiParam({ name: "docenteId", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async declaracionF02CadPDF(
    @Param("docenteId", ParseIntPipe) docenteId: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer =
      await this.reportesService.generarReporteDeclaracionF02CADPDF(
        docenteId,
        periodo,
      );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=declaracion_jurada_incompatibilidad_${docenteId}_${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("aula/:id/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF del horario de un aula" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async aulaPDF(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteAulaPDF(
      id,
      periodo,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=horario-aula-${id}-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("laboratorio/:id/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF del horario de un laboratorio" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async laboratorioPDF(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteLaboratorioPDF(
      id,
      periodo,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=horario-laboratorio-${id}-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("ambiente/:id/pdf")
  @ApiOperation({
    summary: "PDF del horario de un ambiente (aula o laboratorio)",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async ambientePDF(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const result = await this.reportesService.generarReporteAmbientePDF(
      id,
      periodo,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=horario-${result.tipo}-${id}-${periodo}.pdf`,
      "Content-Length": result.buffer.length,
    });
    res.end(result.buffer);
  }

  @Get("ambiente/:id/excel")
  @ApiOperation({
    summary: "Excel del horario de un ambiente (aula/laboratorio)",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async ambienteExcel(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteAmbienteExcel(
      id,
      periodo,
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=horario-ambiente-${id}-${periodo}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("operacional/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({
    summary: "PDF consolidado de todas las asignaciones del perÃ­odo",
  })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async operacionalPDF(
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer =
      await this.reportesService.generarReporteOperacionalPDF(periodo);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=reporte-operacional-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("gestion/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "Reporte de gestiÃ³n con KPIs en PDF" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async gestionPDF(@Query("periodo") periodo: string, @Res() res: Response) {
    const buffer = await this.reportesService.generarReporteGestionPDF(periodo);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=reporte-gestion-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("gestion/carga/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "Reporte de gestiÃ³n de carga acadÃ©mica (Fase 8)" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async gestionCargaPDF(@Query("periodo") periodo: string, @Res() res: Response) {
    const buffer = await this.reportesService.generarReporteGestionCargaPDF(periodo);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=gestion-carga-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("gestion/cumplimiento/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "Reporte de cumplimiento por departamento (Fase 8)" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async cumplimientoPDF(@Query("periodo") periodo: string, @Res() res: Response) {
    const buffer = await this.reportesService.generarReporteCumplimientoPDF(periodo);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=cumplimiento-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("gestion/ejecutivo/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "Reporte ejecutivo para decano con semÃ¡foro (Fase 8)" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async ejecutivoPDF(@Query("periodo") periodo: string, @Res() res: Response) {
    const buffer = await this.reportesService.generarReporteEjecutivoPDF(periodo);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=ejecutivo-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("docente/:id/excel")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "Excel del horario de un docente" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async docenteExcel(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteDocenteExcel(
      id,
      periodo,
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=horario-docente-${id}-${periodo}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("completo/excel")
  @ApiOperation({ summary: "Excel completo de horarios" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async completoExcel(@Query("periodo") periodo: string, @Res() res: Response) {
    const buffer =
      await this.reportesService.generarReporteCompletoExcel(periodo);
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=horario-completo-${periodo}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("ciclo/:ciclo/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF del horario de un ciclo" })
  @ApiParam({ name: "ciclo", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async cicloPDF(
    @Param("ciclo", ParseIntPipe) ciclo: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteCicloPDF(
      ciclo,
      periodo,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=horario-ciclo-${ciclo}-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("ciclo/:ciclo/excel")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "Excel del horario de un ciclo" })
  @ApiParam({ name: "ciclo", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async cicloExcel(
    @Param("ciclo", ParseIntPipe) ciclo: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteCicloExcel(
      ciclo,
      periodo,
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=horario-ciclo-${ciclo}-${periodo}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("dia/:dia/pdf")
  @ApiOperation({ summary: "PDF del horario de un dÃ­a especÃ­fico" })
  @ApiParam({ name: "dia", type: Number, description: "NÃºmero de dÃ­a (1-6)" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiQuery({ name: "ciclo", required: false, type: Number })
  @ApiQuery({ name: "tipo", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  async diaPDF(
    @Param("dia", ParseIntPipe) dia: number,
    @Query("periodo") periodo: string,
    @Query("ciclo") ciclo: string,
    @Query("tipo") tipo: string,
    @Query("search") search: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteDiaPDF(
      dia,
      periodo,
      ciclo ? parseInt(ciclo, 10) : undefined,
      tipo,
      search,
    );
    const nombresDias = [
      "Lunes",
      "Martes",
      "Miercoles",
      "Jueves",
      "Viernes",
      "Sabado",
    ];
    const nombreDia = nombresDias[dia - 1] || "dia";
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=horario-${nombreDia}-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("todos-ciclos/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF formal de todos los ciclos del periodo" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async todosCiclosPDF(
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer =
      await this.reportesService.generarReporteTodosCiclosPDF(periodo);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=horarios-todos-ciclos-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("todos-ciclos/excel")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "Excel con hojas por ciclo" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async todosCiclosExcel(
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer =
      await this.reportesService.generarReporteTodosCiclosExcel(periodo);
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=horarios-todos-ciclos-${periodo}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("mi-horario/pdf")
  @ApiOperation({ summary: "PDF del horario propio del docente autenticado" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @Roles(RolUsuario.DOCENTE)
  async miHorarioPDF(
    @CurrentUser() usuario: Usuario,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    if (!usuario.email) {
      throw new BadRequestException("Usuario sin correo electrÃ³nico");
    }

    const docenteId = await this.reportesService.obtenerDocenteIdPorEmail(
      usuario.email,
    );
    if (!docenteId) {
      throw new NotFoundException("Docente no encontrado");
    }

    const buffer = await this.reportesService.generarReporteDocentePDF(
      docenteId,
      periodo,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=horario-docente-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("mi-horario/excel")
  @ApiOperation({ summary: "Excel del horario propio del docente autenticado" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @Roles(RolUsuario.DOCENTE)
  async miHorarioExcel(
    @CurrentUser() usuario: Usuario,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    if (!usuario.email) {
      throw new BadRequestException("Usuario sin correo electrÃ³nico");
    }

    const docenteId = await this.reportesService.obtenerDocenteIdPorEmail(
      usuario.email,
    );
    if (!docenteId) {
      throw new NotFoundException("Docente no encontrado");
    }

    const buffer = await this.reportesService.generarReporteDocenteExcel(
      docenteId,
      periodo,
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=horario-docente-${periodo}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("cursos/pdf")
  @ApiOperation({ summary: "PDF de la lista de cursos" })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "ciclo", required: false, type: Number })
  @ApiQuery({ name: "lab", required: false, type: Boolean })
  @ApiQuery({ name: "activo", required: false, type: Boolean })
  async cursosPDF(
    @Query("search") search?: string,
    @Query("ciclo") ciclo?: string,
    @Query("lab") lab?: string,
    @Query("activo") activo?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.reportesService.generarReporteCursosPDF(
      search,
      ciclo ? parseInt(ciclo, 10) : undefined,
      lab === "true" ? true : lab === "false" ? false : undefined,
      activo === "true" ? true : activo === "false" ? false : undefined,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=cursos-${new Date().toISOString().slice(0, 10)}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("plan-estudios/:planId/pdf")
  @Roles(
    RolUsuario.ADMINISTRADOR_SISTEMA,
    RolUsuario.COORDINADOR_ACADEMICO,
    RolUsuario.SECRETARIA,
    RolUsuario.DIRECTOR_DEPARTAMENTO,
  )
  @ApiOperation({ summary: "PDF del plan de estudios" })
  @ApiParam({ name: "planId", type: Number })
  async planEstudiosPDF(
    @Param("planId", ParseIntPipe) planId: number,
    @Res() res: Response,
  ) {
    const buffer =
      await this.reportesService.generarReportePlanEstudiosPDF(planId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=plan-estudios-${planId}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}
