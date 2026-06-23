import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { Grupo } from "../entities/grupo.entity";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { DeclaracionJurada } from "../entities/declaracion-jurada.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { PlanEstudios } from "../entities/plan-estudios.entity";
import { CursoPlanEstudios } from "../entities/curso-plan-estudios.entity";
import { Departamento } from "../entities/departamento.entity";
import { DeclaracionClad } from "../entities/declaracion-clad.entity";
import { ReportesService } from "./reportes.service";
import { ReportesController } from "./reportes.controller";
import { ConfiguracionModule } from "../configuracion/configuracion.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HorarioAsignado,
      ConflictoAsignacion,
      Docente,
      Ambiente,
      Curso,
      Grupo,
      DeclaracionCargaHoraria,
      DeclaracionJurada,
      PeriodoAcademico,
      PlanEstudios,
      CursoPlanEstudios,
      Departamento,
      DeclaracionClad,
    ]),
    ConfiguracionModule,
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
