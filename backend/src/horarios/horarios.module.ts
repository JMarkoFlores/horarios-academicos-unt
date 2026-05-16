import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { Preasignacion } from "../entities/preasignacion.entity";
import { AsignacionService } from "./asignacion.service";
import { HorariosService } from "./horarios.service";
import { HorariosGateway } from "./horarios.gateway";
import { HorariosController } from "./horarios.controller";
import { DocentesModule } from "../docentes/docentes.module";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HorarioAsignado,
      ConflictoAsignacion,
      Ambiente,
      Curso,
      DisponibilidadDocente,
      Preasignacion,
    ]),
    DocentesModule,
    CommonModule,
  ],
  controllers: [HorariosController],
  providers: [AsignacionService, HorariosService, HorariosGateway],
  exports: [AsignacionService, HorariosService, HorariosGateway],
})
export class HorariosModule {}
