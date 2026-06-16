import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { AuditoriaHorario } from "../entities/auditoria-horario.entity";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { Departamento } from "../entities/departamento.entity";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { DashboardGateway } from "./dashboard.gateway";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HorarioAsignado,
      ConflictoAsignacion,
      Docente,
      Ambiente,
      Curso,
      DisponibilidadDocente,
      PeriodoAcademico,
      AuditoriaHorario,
      DeclaracionCargaHoraria,
      Departamento,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardGateway],
  exports: [DashboardService, DashboardGateway],
})
export class DashboardModule {}
