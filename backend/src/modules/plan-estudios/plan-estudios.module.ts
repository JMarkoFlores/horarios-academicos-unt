import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PlanEstudios } from "../../entities/plan-estudios.entity";
import { CursoPlanEstudios } from "../../entities/curso-plan-estudios.entity";
import { Curso } from "../../entities/curso.entity";
import { PlanEstudiosController } from "./plan-estudios.controller";
import { PlanEstudiosService } from "./plan-estudios.service";

@Module({
  imports: [TypeOrmModule.forFeature([PlanEstudios, CursoPlanEstudios, Curso])],
  controllers: [PlanEstudiosController],
  providers: [PlanEstudiosService],
  exports: [PlanEstudiosService],
})
export class PlanEstudiosModule {}
