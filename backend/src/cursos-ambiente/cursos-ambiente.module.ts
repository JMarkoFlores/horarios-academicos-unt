import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CursoAmbiente } from "../entities/curso-ambiente.entity";
import { CursosAmbienteService } from "./cursos-ambiente.service";
import { CursosAmbienteController } from "./cursos-ambiente.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CursoAmbiente])],
  controllers: [CursosAmbienteController],
  providers: [CursosAmbienteService],
  exports: [CursosAmbienteService],
})
export class CursosAmbienteModule {}
