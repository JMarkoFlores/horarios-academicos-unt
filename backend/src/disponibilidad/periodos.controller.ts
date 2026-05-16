<<<<<<< HEAD
import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DisponibilidadService } from "./disponibilidad.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
=======
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DisponibilidadService } from './disponibilidad.service';
import { QueryListDto } from './dto/query-list.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
>>>>>>> develop

@ApiTags("periodos")
@Controller("periodos")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT")
export class PeriodosController {
  constructor(private readonly disponibilidadService: DisponibilidadService) {}

  @Get()
<<<<<<< HEAD
  @ApiOperation({ summary: "Listar todos los períodos académicos" })
  async getPeriodos() {
    const result = await this.disponibilidadService.getPeriodos();
    return { data: result, message: "Períodos académicos obtenidos" };
=======
  @ApiOperation({ summary: 'Listar todos los períodos académicos' })
  async getPeriodos(@Query() query: QueryListDto) {
    const result = await this.disponibilidadService.getPeriodos(
      query.page ?? 1,
      query.limit ?? 20,
    );
    return { data: result, message: 'Períodos académicos obtenidos' };
>>>>>>> develop
  }
}
