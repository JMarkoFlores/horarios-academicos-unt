import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiOkResponse } from '@nestjs/swagger';
import { CacheTTL } from '@nestjs/cache-manager';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HttpCacheInterceptor } from '../common/interceptors/http-cache.interceptor';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../entities/usuario.entity';
import { DashboardKpisDto } from './dto/dashboard-kpis.dto';
import { DashboardAlertsDto } from './dto/alerts-response.dto';

@ApiTags("dashboard")
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(300)
  @ApiOperation({ summary: 'Resumen del dashboard para un período' })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  @ApiOkResponse({ type: DashboardKpisDto })
  async getDashboard(@Query('periodo') periodo: string) {
    const result = await this.dashboardService.getKPIs(periodo ?? '');
    return { data: result, message: 'Dashboard obtenido correctamente' };
  }

  @Get('kpis')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(300)
  @ApiOperation({ summary: 'KPIs del dashboard para un período' })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  @ApiOkResponse({ type: DashboardKpisDto })
  async getKPIs(@Query('periodo') periodo: string) {
    const result = await this.dashboardService.getKPIs(periodo ?? '');
    return { data: result, message: 'KPIs obtenidos correctamente' };
  }

  @Get('alerts')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(60)
  @ApiOperation({ summary: 'Alertas activas del dashboard para un período' })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  @ApiOkResponse({ type: DashboardAlertsDto })
  async getAlerts(@Query('periodo') periodo: string) {
    const result = await this.dashboardService.getAlerts(periodo ?? '');
    return { data: result, message: 'Alertas obtenidas correctamente' };
  }

  @Get('mis-kpis')
  @ApiOperation({ summary: 'KPIs personales del docente logueado' })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  async getMisKPIs(
    @Query('periodo') periodo: string,
    @CurrentUser() usuario: Usuario,
  ) {
    const result = await this.dashboardService.getMisKPIs(
      usuario.email ?? '',
      periodo ?? '',
    );
    return { data: result, message: 'KPIs personales obtenidos correctamente' };
  }
}
