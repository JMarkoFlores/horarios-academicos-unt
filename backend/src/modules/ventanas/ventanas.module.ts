import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Ambiente } from "../../entities/ambiente.entity";
import { ColaDocente } from "../../entities/cola-docentes.entity";
import { Docente } from "../../entities/docente.entity";
import { Grupo } from "../../entities/grupo.entity";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { VentanaAtencion } from "../../entities/ventana-atencion.entity";
import { HorariosModule } from "../../horarios/horarios.module";
import { VentanasController } from "./ventanas.controller";
import { GestorSeleccionTemporalService } from "./gestor-seleccion.service";
import { VentanasService } from "./ventanas.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      VentanaAtencion,
      ColaDocente,
      Docente,
      PeriodoAcademico,
      Grupo,
      HorarioAsignado,
      Ambiente,
    ]),
    HorariosModule,
  ],
  controllers: [VentanasController],
  providers: [VentanasService, GestorSeleccionTemporalService],
  exports: [VentanasService, GestorSeleccionTemporalService],
})
export class VentanasModule {}
