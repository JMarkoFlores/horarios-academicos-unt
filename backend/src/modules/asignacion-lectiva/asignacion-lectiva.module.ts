import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AsignacionLectivaController } from "./asignacion-lectiva.controller";
import { AsignacionLectivaService } from "./asignacion-lectiva.service";
import { AsignacionLectiva } from "../../entities/asignacion-lectiva.entity";
import { Docente } from "../../entities/docente.entity";
import { CursoPlanEstudios } from "../../entities/curso-plan-estudios.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { Grupo } from "../../entities/grupo.entity";
import { Curso } from "../../entities/curso.entity";
import { OfertaAcademica } from "../../entities/oferta-academica.entity";
import { SuspensionDocente } from "../../entities/suspension-docente.entity";
import { CatedraCompartida } from "../../entities/catedra-compartida.entity";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { Ambiente } from "../../entities/ambiente.entity";
import { AuditoriaModule } from "../auditoria/auditoria.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AsignacionLectiva,
      Docente,
      CursoPlanEstudios,
      PeriodoAcademico,
      Grupo,
      Curso,
      OfertaAcademica,
      SuspensionDocente,
      CatedraCompartida,
      HorarioAsignado,
      Ambiente,
    ]),
    AuditoriaModule,
  ],
  controllers: [AsignacionLectivaController],
  providers: [AsignacionLectivaService],
  exports: [AsignacionLectivaService],
})
export class AsignacionLectivaModule {}
