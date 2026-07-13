import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { PlanEstudios } from "../entities/plan-estudios.entity";
import { CursoPlanEstudios } from "../entities/curso-plan-estudios.entity";
import { CatedraCompartida } from "../entities/catedra-compartida.entity";
import { AsignacionLectiva } from "../entities/asignacion-lectiva.entity";
import { CursosService } from "./cursos.service";
import { CursosController } from "./cursos.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Curso,
      Ambiente,
      PlanEstudios,
      CursoPlanEstudios,
      CatedraCompartida,
      AsignacionLectiva,
    ]),
  ],
  controllers: [CursosController],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule {}
