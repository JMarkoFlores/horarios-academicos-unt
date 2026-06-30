import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OfertaAcademica } from "../../entities/oferta-academica.entity";
import { CursoPlanEstudios } from "../../entities/curso-plan-estudios.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { OfertaAcademicaService } from "./oferta-academica.service";
import { OfertaAcademicaController } from "./oferta-academica.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([OfertaAcademica, CursoPlanEstudios, PeriodoAcademico]),
  ],
  controllers: [OfertaAcademicaController],
  providers: [OfertaAcademicaService],
  exports: [OfertaAcademicaService],
})
export class OfertaAcademicaModule {}
