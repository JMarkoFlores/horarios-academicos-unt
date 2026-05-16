import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DisponibilidadService } from "./disponibilidad.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("periodos")
@Controller("periodos")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT")
export class PeriodosController {
  constructor(private readonly disponibilidadService: DisponibilidadService) {}

  @Get()
  @ApiOperation({ summary: "Listar todos los períodos académicos" })
  async getPeriodos() {
    const result = await this.disponibilidadService.getPeriodos();
    return { data: result, message: "Períodos académicos obtenidos" };
  }
}
