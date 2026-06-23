import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
} from "@nestjs/swagger";
import { CacheTTL } from "@nestjs/cache-manager";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { HttpCacheInterceptor } from "../common/interceptors/http-cache.interceptor";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UsuarioAutenticado } from "../common/interfaces/contexto-academico.interface";
import { DashboardKpisDto } from "./dto/dashboard-kpis.dto";
import { DashboardAlertsDto } from "./dto/alerts-response.dto";

@ApiTags("dashboard")
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(300)
  @ApiOperation({ summary: "Resumen del dashboard para un período" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiOkResponse({ type: DashboardKpisDto })
  async getDashboard(
    @Query("periodo") periodo: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const result = await this.dashboardService.getKPIs(periodo ?? "", usuario);
    return { data: result, message: "Dashboard obtenido correctamente" };
  }

  @Get("kpis")
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(300)
  @ApiOperation({ summary: "KPIs del dashboard para un período" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiOkResponse({ type: DashboardKpisDto })
  async getKPIs(
    @Query("periodo") periodo: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const result = await this.dashboardService.getKPIs(periodo ?? "", usuario);
    return { data: result, message: "KPIs obtenidos correctamente" };
  }

  @Get("alerts")
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(60)
  @ApiOperation({ summary: "Alertas activas del dashboard para un período" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiOkResponse({ type: DashboardAlertsDto })
  async getAlerts(
    @Query("periodo") periodo: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const result = await this.dashboardService.getAlerts(periodo ?? "", usuario);
    return { data: result, message: "Alertas obtenidas correctamente" };
  }

  @Get("mis-kpis")
  @ApiOperation({ summary: "KPIs personales del docente logueado" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async getMisKPIs(
    @Query("periodo") periodo: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const result = await this.dashboardService.getMisKPIs(
      usuario.email ?? "",
      periodo ?? "",
    );
    return { data: result, message: "KPIs personales obtenidos correctamente" };
  }

  // ═══ CARGA ACADÉMICA ═══

  @Get("carga/resumen")
  @ApiOperation({ summary: "KPIs del proceso de carga académica" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async getCargaResumen(
    @Query("periodo") periodo: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const result = await this.dashboardService.getCargaResumen(periodo ?? "", usuario);
    return { data: result, message: "Resumen de carga obtenido" };
  }

  @Get("carga/departamentos")
  @ApiOperation({ summary: "Carga académica agrupada por departamento" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async getCargaDepartamentos(@Query("periodo") periodo: string) {
    const result = await this.dashboardService.getCargaDepartamentos(periodo ?? "");
    return { data: result, message: "Departamentos obtenidos" };
  }

  @Get("carga/estados")
  @ApiOperation({ summary: "Distribución de declaraciones por estado" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async getCargaEstados(
    @Query("periodo") periodo: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const result = await this.dashboardService.getCargaEstados(periodo ?? "", usuario);
    return { data: result, message: "Distribución por estado obtenida" };
  }

  @Get("carga/top-docentes")
  @ApiOperation({ summary: "Top docentes con más carga académica" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  @ApiQuery({ name: "limit", required: false, example: "5" })
  async getCargaTopDocentes(
    @Query("periodo") periodo: string,
    @Query("limit") limit: string | undefined,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const result = await this.dashboardService.getCargaTopDocentes(
      periodo ?? "",
      limit ? parseInt(limit, 10) : 5,
      usuario,
    );
    return { data: result, message: "Top docentes obtenido" };
  }

  @Get("carga/avance")
  @ApiOperation({ summary: "Avance temporal de declaraciones" })
  @ApiQuery({ name: "periodo", required: true, example: "2026-I" })
  async getCargaAvance(
    @Query("periodo") periodo: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const result = await this.dashboardService.getCargaAvance(periodo ?? "", usuario);
    return { data: result, message: "Avance temporal obtenido" };
  }
}
