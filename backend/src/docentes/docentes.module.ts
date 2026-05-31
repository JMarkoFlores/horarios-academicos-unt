import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule } from "@nestjs/config";
import { Docente } from "../entities/docente.entity";
import { Departamento } from "../entities/departamento.entity";
import { Facultad } from "../entities/facultad.entity";
import { Usuario } from "../entities/usuario.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { CursoAmbiente } from "../entities/curso-ambiente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { Grupo } from "../entities/grupo.entity";
import { DocentesService } from "./docentes.service";
import { DocentesController } from "./docentes.controller";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Docente,
      Departamento,
      Facultad,
      Usuario,
      DocenteCurso,
      Curso,
      Ambiente,
      CursoAmbiente,
      HorarioAsignado,
      PeriodoAcademico,
      ParametrosCarga,
      Grupo,
    ]),
    CacheModule.register(),
  ],

  controllers: [DocentesController],
  providers: [DocentesService],
  exports: [DocentesService],
})
export class DocentesModule {}
