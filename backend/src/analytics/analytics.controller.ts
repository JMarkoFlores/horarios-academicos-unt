import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";

@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("kpis")
  async getKPIs(@Query("periodo") periodo: string) {
    const result = await this.analyticsService.getKPIMetrics(periodo);
    return { data: result, message: "Métricas obtenidas correctamente" };
  }

  @Get("saturation")
  async getSaturation(@Query("periodo") periodo: string) {
    const result = await this.analyticsService.getDocenteSaturation(periodo);
    return { data: result, message: "Saturación obtenida correctamente" };
  }

  @Get("utilization")
  async getUtilization(@Query("periodo") periodo: string) {
    const result = await this.analyticsService.getRoomUtilization(periodo);
    return { data: result, message: "Utilización obtenida correctamente" };
  }

  @Get("peak-hours")
  async getPeakHours(@Query("periodo") periodo: string) {
    const result = await this.analyticsService.getPeakHours(periodo);
    return { data: result, message: "Horas pico obtenidas correctamente" };
  }

  @Get("suggestions")
  async getSuggestions(@Query("periodo") periodo: string) {
    const result = await this.analyticsService.getSmartSuggestions(periodo);
    return { data: result, message: "Sugerencias obtenidas correctamente" };
  }
}
