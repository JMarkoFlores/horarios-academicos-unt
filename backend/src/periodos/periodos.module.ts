import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PeriodosService } from "./periodos.service";
import { PeriodosController } from "./periodos.controller";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PeriodoAcademico])],
  controllers: [PeriodosController],
  providers: [PeriodosService],
  exports: [PeriodosService],
})
export class PeriodosModule {}
