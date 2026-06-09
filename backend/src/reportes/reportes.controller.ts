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
  constructor(
    private readonly reportesService: ReportesService,
  ) {}

  @Get("docente/:id/pdf")
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
  @ApiOperation({ summary: "PDF del Formato F03-CAD de Declaración Jurada" })
  @ApiParam({ name: "docenteId", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async declaracionF03CadPDF(
    @Param("docenteId", ParseIntPipe) docenteId: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteDeclaracionF03CADPDF(
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

  @Get("aula/:id/pdf")
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
  @ApiOperation({ summary: "Excel del horario de un ambiente (aula/laboratorio)" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async ambienteExcel(
    @Param("id", ParseIntPipe) id: number,
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteAmbienteExcel(id, periodo);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=horario-ambiente-${id}-${periodo}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("operacional/pdf")
  @ApiOperation({
    summary: "PDF consolidado de todas las asignaciones del período",
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
  @ApiOperation({ summary: "Reporte de gestión con KPIs en PDF" })
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

  @Get("docente/:id/excel")
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
  @ApiOperation({ summary: "PDF del horario de un día específico" })
  @ApiParam({ name: "dia", type: Number, description: "Número de día (1-6)" })
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
  @ApiOperation({ summary: "PDF formal de todos los ciclos del periodo" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async todosCiclosPDF(
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteTodosCiclosPDF(periodo);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=horarios-todos-ciclos-${periodo}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("todos-ciclos/excel")
  @ApiOperation({ summary: "Excel con hojas por ciclo" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async todosCiclosExcel(
    @Query("periodo") periodo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteTodosCiclosExcel(periodo);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
      throw new BadRequestException("Usuario sin correo electrónico");
    }

    const docenteId = await this.reportesService.obtenerDocenteIdPorEmail(usuario.email);
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
      throw new BadRequestException("Usuario sin correo electrónico");
    }

    const docenteId = await this.reportesService.obtenerDocenteIdPorEmail(usuario.email);
    if (!docenteId) {
      throw new NotFoundException("Docente no encontrado");
    }

    const buffer = await this.reportesService.generarReporteDocenteExcel(
      docenteId,
      periodo,
    );
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=horario-docente-${periodo}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}
