import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AsignadorLectivoController } from "./asignador-lectivo.controller";
import { AsignadorLectivoService } from "./asignador-lectivo.service";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { AsignacionLectiva } from "../../entities/asignacion-lectiva.entity";
import { Docente } from "../../entities/docente.entity";
import { Curso } from "../../entities/curso.entity";
import { CursoPlanEstudios } from "../../entities/curso-plan-estudios.entity";
import { Grupo } from "../../entities/grupo.entity";
import { Ambiente } from "../../entities/ambiente.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { OfertaAcademica } from "../../entities/oferta-academica.entity";
import { DisponibilidadDocente } from "../../entities/disponibilidad-docente.entity";
import { AuditoriaModule } from "../auditoria/auditoria.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HorarioAsignado,
      AsignacionLectiva,
      Docente,
      Curso,
      CursoPlanEstudios,
      Grupo,
      Ambiente,
      PeriodoAcademico,
      OfertaAcademica,
      DisponibilidadDocente,
    ]),
    AuditoriaModule,
  ],
  controllers: [AsignadorLectivoController],
  providers: [AsignadorLectivoService],
  exports: [AsignadorLectivoService],
})
export class AsignadorLectivoModule {}
