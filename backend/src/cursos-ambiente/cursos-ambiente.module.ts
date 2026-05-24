import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CursoAmbiente } from "../entities/curso-ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Grupo } from "../entities/grupo.entity";
import { CursosAmbienteService } from "./cursos-ambiente.service";
import { CursosAmbienteController } from "./cursos-ambiente.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CursoAmbiente, Curso, Ambiente, Grupo])],
  controllers: [CursosAmbienteController],
  providers: [CursosAmbienteService],
  exports: [CursosAmbienteService],
})
export class CursosAmbienteModule {}
