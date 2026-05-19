import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Res,
  UseGuards,
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

@ApiTags("reportes")
@Controller("reportes")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT")
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

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
    const buffer = await this.reportesService.generarReporteCompletoExcel(
      periodo,
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=horario-completo-${periodo}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}
