import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DisponibilidadService } from './disponibilidad.service';
import { QueryListDto } from './dto/query-list.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags("periodos")
@Controller("periodos")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT")
export class PeriodosController {
  constructor(private readonly disponibilidadService: DisponibilidadService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los períodos académicos' })
  async getPeriodos(@Query() query: QueryListDto) {
    const result = await this.disponibilidadService.getPeriodos(
      query.page ?? 1,
      query.limit ?? 20,
    );
    return { data: result, message: 'Períodos académicos obtenidos' };
  }
}
