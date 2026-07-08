import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Docente } from "../../entities/docente.entity";
import { DeclaracionCargaHoraria } from "../../entities/declaracion-carga-horaria.entity";
import { ActividadNoLectiva } from "../../entities/actividad-no-lectiva.entity";
import { HorarioNoLectivo } from "../../entities/horario-no-lectivo.entity";
import { CargaNoLectivaController } from "./carga-no-lectiva.controller";
import { CargaNoLectivaService } from "./carga-no-lectiva.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Docente,
      DeclaracionCargaHoraria,
      ActividadNoLectiva,
      HorarioNoLectivo,
    ]),
  ],
  controllers: [CargaNoLectivaController],
  providers: [CargaNoLectivaService],
  exports: [CargaNoLectivaService],
})
export class DeclaracionesModule {}
