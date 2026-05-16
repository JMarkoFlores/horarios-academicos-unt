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
  getKPIs(@Query("periodo") periodo: string) {
    return this.analyticsService.getKPIMetrics(periodo);
  }

  @Get("saturation")
  getSaturation(@Query("periodo") periodo: string) {
    return this.analyticsService.getDocenteSaturation(periodo);
  }

  @Get("utilization")
  getUtilization(@Query("periodo") periodo: string) {
    return this.analyticsService.getRoomUtilization(periodo);
  }

  @Get("peak-hours")
  getPeakHours(@Query("periodo") periodo: string) {
    return this.analyticsService.getPeakHours(periodo);
  }

  @Get("suggestions")
  getSuggestions(@Query("periodo") periodo: string) {
    return this.analyticsService.getSmartSuggestions(periodo);
  }
}
