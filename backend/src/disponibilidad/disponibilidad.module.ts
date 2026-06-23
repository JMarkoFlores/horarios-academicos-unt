import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Docente } from "../entities/docente.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { TurnoConfig } from "../entities/turno-config.entity";
import { DisponibilidadService } from "./disponibilidad.service";
import { DisponibilidadController } from "./disponibilidad.controller";
import { PeriodosController } from "./periodos.controller";
import { TurnoConfigService } from "./turno-config.service";
import { TurnoConfigController } from "./turno-config.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DisponibilidadDocente,
      RestriccionInstitucional,
      PeriodoAcademico,
      Docente,
      TurnoHorario,
      TurnoConfig,
    ]),
  ],
  controllers: [DisponibilidadController, PeriodosController, TurnoConfigController],
  providers: [DisponibilidadService, TurnoConfigService],
  exports: [DisponibilidadService, TurnoConfigService],
})
export class DisponibilidadModule {}
