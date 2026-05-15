import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'KPIs del dashboard para un período' })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  async getKPIs(@Query('periodo') periodo: string) {
    const result = await this.dashboardService.getKPIs(periodo ?? '');
    return { data: result, message: 'KPIs obtenidos correctamente' };
  }
}
