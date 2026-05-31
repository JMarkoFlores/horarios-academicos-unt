import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { Docente } from "../entities/docente.entity";
import { Departamento } from "../entities/departamento.entity";
import { Facultad } from "../entities/facultad.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { DeclaracionCargaHorariaService } from "./declaracion-carga-horaria.service";
import { DeclaracionCargaHorariaController } from "./declaracion-carga-horaria.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeclaracionCargaHoraria,
      Docente,
      Departamento,
      Facultad,
      PeriodoAcademico,
      HorarioAsignado,
    ]),
  ],
  controllers: [DeclaracionCargaHorariaController],
  providers: [DeclaracionCargaHorariaService],
  exports: [DeclaracionCargaHorariaService],
})
export class DeclaracionCargaHorariaModule {}
