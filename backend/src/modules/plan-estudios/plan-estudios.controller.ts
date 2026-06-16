import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";
import { PlanEstudiosService } from "./plan-estudios.service";
import { CreatePlanEstudiosDto } from "./dto/create-plan-estudios.dto";
import { UpdatePlanEstudiosDto } from "./dto/update-plan-estudios.dto";
import { CreateCursoPlanDto } from "./dto/create-curso-plan.dto";
import { UpdateCursoPlanDto } from "./dto/update-curso-plan.dto";
import { QueryPlanEstudiosDto } from "./dto/query-plan-estudios.dto";

@ApiTags("plan-estudios")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  RolUsuario.ADMINISTRADOR_SISTEMA,
  RolUsuario.DIRECTOR_ESCUELA,
  RolUsuario.COORDINADOR_ACADEMICO,
)
@Controller("plan-estudios")
export class PlanEstudiosController {
  constructor(private readonly planEstudiosService: PlanEstudiosService) {}

  @Get()
  @ApiOperation({ summary: "Listar planes de estudio" })
  async findAll(@Query() query: QueryPlanEstudiosDto) {
    const data = await this.planEstudiosService.findAll(query);
    return { data, message: "Planes obtenidos", statusCode: HttpStatus.OK };
  }

  @Get("activo")
  @ApiOperation({ summary: "Obtener plan de estudios activo" })
  async findActivo() {
    const data = await this.planEstudiosService.findActivo();
    return { data, message: "Plan activo obtenido", statusCode: HttpStatus.OK };
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener plan con sus cursos" })
  async findOne(@Param("id") id: string) {
    const data = await this.planEstudiosService.findOne(+id);
    return { data, message: "Plan obtenido", statusCode: HttpStatus.OK };
  }

  @Post()
  @ApiOperation({ summary: "Crear plan de estudios" })
  async create(@Body() dto: CreatePlanEstudiosDto) {
    const data = await this.planEstudiosService.create(dto);
    return { data, message: "Plan creado", statusCode: HttpStatus.CREATED };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualizar plan de estudios" })
  async update(@Param("id") id: string, @Body() dto: UpdatePlanEstudiosDto) {
    const data = await this.planEstudiosService.update(+id, dto);
    return { data, message: "Plan actualizado", statusCode: HttpStatus.OK };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar plan (solo sin cursos)" })
  async remove(@Param("id") id: string) {
    await this.planEstudiosService.remove(+id);
    return {
      data: { id: +id },
      message: "Plan eliminado",
      statusCode: HttpStatus.OK,
    };
  }

  @Patch(":id/toggle-activo")
  @ApiOperation({ summary: "Activar/desactivar plan" })
  async toggleActivo(@Param("id") id: string) {
    const data = await this.planEstudiosService.toggleActivo(+id);
    return { data, message: "Estado cambiado", statusCode: HttpStatus.OK };
  }

  // ── Cursos del plan ──────────────────────────────────────────────────────

  @Get(":planId/cursos")
  @ApiOperation({ summary: "Listar cursos de un plan" })
  async findCursos(
    @Param("planId") planId: string,
    @Query("ciclo") ciclo?: string,
    @Query("tipo") tipo?: string,
  ) {
    const data = await this.planEstudiosService.findCursos(
      +planId,
      ciclo ? +ciclo : undefined,
      tipo,
    );
    return {
      data,
      message: "Cursos del plan obtenidos",
      statusCode: HttpStatus.OK,
    };
  }

  @Post(":planId/cursos")
  @ApiOperation({ summary: "Agregar curso al plan" })
  async addCurso(
    @Param("planId") planId: string,
    @Body() dto: CreateCursoPlanDto,
  ) {
    const data = await this.planEstudiosService.addCurso(+planId, dto);
    return {
      data,
      message: "Curso agregado al plan",
      statusCode: HttpStatus.CREATED,
    };
  }

  @Patch(":planId/cursos/:cursoPlanId")
  @ApiOperation({ summary: "Actualizar curso en el plan" })
  async updateCurso(
    @Param("planId") planId: string,
    @Param("cursoPlanId") cursoPlanId: string,
    @Body() dto: UpdateCursoPlanDto,
  ) {
    const data = await this.planEstudiosService.updateCurso(
      +planId,
      +cursoPlanId,
      dto,
    );
    return {
      data,
      message: "Curso actualizado en el plan",
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(":planId/cursos/:cursoPlanId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Quitar curso del plan" })
  async removeCurso(
    @Param("planId") planId: string,
    @Param("cursoPlanId") cursoPlanId: string,
  ) {
    const data = await this.planEstudiosService.removeCurso(
      +planId,
      +cursoPlanId,
    );
    return {
      data,
      message: "Curso eliminado del plan",
      statusCode: HttpStatus.OK,
    };
  }

  @Patch(":planId/cursos/:cursoPlanId/toggle-estado")
  @ApiOperation({ summary: "Activar/desactivar curso en el plan" })
  async toggleCursoEstado(
    @Param("planId") planId: string,
    @Param("cursoPlanId") cursoPlanId: string,
  ) {
    const data = await this.planEstudiosService.toggleCursoEstado(
      +planId,
      +cursoPlanId,
    );
    return {
      data,
      message: "Estado del curso cambiado",
      statusCode: HttpStatus.OK,
    };
  }

  @Get(":planId/cursos/:cursoPlanId/prerequisitos")
  @ApiOperation({ summary: "Obtener prerrequisitos de un curso en el plan" })
  async getPrerequisitos(
    @Param("planId") planId: string,
    @Param("cursoPlanId") cursoPlanId: string,
  ) {
    const data = await this.planEstudiosService.getPrerequisitos(
      +planId,
      +cursoPlanId,
    );
    return {
      data,
      message: "Prerrequisitos obtenidos",
      statusCode: HttpStatus.OK,
    };
  }
}
