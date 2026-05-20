import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheModule } from "@nestjs/cache-manager";
import { Docente } from "../entities/docente.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { DocentesService } from "./docentes.service";
import { DocentesController } from "./docentes.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Docente, DocenteCurso, Curso, Ambiente, PeriodoAcademico]), CacheModule.register()],

  controllers: [DocentesController],
  providers: [DocentesService],
  exports: [DocentesService],
})
export class DocentesModule {}
