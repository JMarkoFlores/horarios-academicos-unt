import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { PlanEstudios } from "../entities/plan-estudios.entity";
import { CursoPlanEstudios } from "../entities/curso-plan-estudios.entity";
import { CursosService } from "./cursos.service";
import { CursosController } from "./cursos.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Curso,
      Ambiente,
      PlanEstudios,
      CursoPlanEstudios,
    ]),
  ],
  controllers: [CursosController],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule {}
