import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { Grupo } from "../entities/grupo.entity";
import { ReportesService } from "./reportes.service";
import { ReportesController } from "./reportes.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HorarioAsignado,
      ConflictoAsignacion,
      Docente,
      Ambiente,
      Curso,
      Grupo,
    ]),
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
