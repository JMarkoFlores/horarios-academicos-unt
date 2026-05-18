import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HorariosModule } from "../../horarios/horarios.module";
import { Ambiente } from "../../entities/ambiente.entity";
import { Curso } from "../../entities/curso.entity";
import { Docente } from "../../entities/docente.entity";
import { Grupo } from "../../entities/grupo.entity";
import { Preasignacion } from "../../entities/preasignacion.entity";
import { PreasignacionesController } from "./preasignaciones.controller";
import { PreasignacionesService } from "./preasignaciones.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Preasignacion, Docente, Curso, Grupo, Ambiente]),
    HorariosModule,
  ],
  controllers: [PreasignacionesController],
  providers: [PreasignacionesService],
  exports: [PreasignacionesService],
})
export class PreasignacionesModule {}
