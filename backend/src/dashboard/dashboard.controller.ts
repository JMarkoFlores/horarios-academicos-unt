<<<<<<< HEAD
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
=======
import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CacheTTL } from '@nestjs/cache-manager';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HttpCacheInterceptor } from '../common/interceptors/http-cache.interceptor';
>>>>>>> develop

@ApiTags("dashboard")
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

<<<<<<< HEAD
  @Get("kpis")
  @ApiOperation({ summary: "KPIs del dashboard para un período" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async getKPIs(@Query("periodo") periodo: string) {
    const result = await this.dashboardService.getKPIs(periodo ?? "");
    return { data: result, message: "KPIs obtenidos correctamente" };
=======
  @Get()
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(300)
  @ApiOperation({ summary: 'Resumen del dashboard para un período' })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  async getDashboard(@Query('periodo') periodo: string) {
    const result = await this.dashboardService.getKPIs(periodo ?? '');
    return { data: result, message: 'Dashboard obtenido correctamente' };
  }

  @Get('kpis')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(300)
  @ApiOperation({ summary: 'KPIs del dashboard para un período' })
  @ApiQuery({ name: 'periodo', required: true, example: '2026-I' })
  async getKPIs(@Query('periodo') periodo: string) {
    const result = await this.dashboardService.getKPIs(periodo ?? '');
    return { data: result, message: 'KPIs obtenidos correctamente' };
>>>>>>> develop
  }
}
