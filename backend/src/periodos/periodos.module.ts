import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PeriodosService } from "./periodos.service";
import { PeriodosController } from "./periodos.controller";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { Curso } from "../entities/curso.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Grupo } from "../entities/grupo.entity";
import { VentanaAtencion } from "../entities/ventana-atencion.entity";
import { ColaDocente } from "../entities/cola-docentes.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";

import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PeriodoAcademico,
      HorarioAsignado,
      Curso,
      Docente,
      Ambiente,
      Grupo,
      VentanaAtencion,
      ColaDocente,
      DocenteCurso,
      DeclaracionCargaHoraria,
    ]),
  ],
  controllers: [PeriodosController],
  providers: [PeriodosService],
  exports: [PeriodosService],
})
export class PeriodosModule {}
