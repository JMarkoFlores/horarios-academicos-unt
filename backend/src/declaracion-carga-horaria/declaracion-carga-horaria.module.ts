import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { Docente } from "../entities/docente.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { Departamento } from "../entities/departamento.entity";
import { Facultad } from "../entities/facultad.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { AsignacionLectiva } from "../entities/asignacion-lectiva.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { DeclaracionObservacion } from "../entities/declaracion-observacion.entity";
import { DeclaracionCargaHorariaService } from "./declaracion-carga-horaria.service";
import { DeclaracionCargaHorariaController } from "./declaracion-carga-horaria.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeclaracionCargaHoraria,
      Docente,
      DocenteCurso,
      Departamento,
      Facultad,
      PeriodoAcademico,
      HorarioAsignado,
      AsignacionLectiva,
      ParametrosCarga,
      DeclaracionObservacion,
    ]),
  ],
  controllers: [DeclaracionCargaHorariaController],
  providers: [DeclaracionCargaHorariaService],
  exports: [DeclaracionCargaHorariaService],
})
export class DeclaracionCargaHorariaModule {}
