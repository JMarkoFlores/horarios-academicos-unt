import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Ambiente } from "../../entities/ambiente.entity";
import { CampañaVentanas } from "../../entities/campaña-ventanas.entity";
import { ColaDocente } from "../../entities/cola-docentes.entity";
import { Curso } from "../../entities/curso.entity";
import { DiaNoLaborable } from "../../entities/dia-no-laborable.entity";
import { Docente } from "../../entities/docente.entity";
import { Grupo } from "../../entities/grupo.entity";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { ParametrosCarga } from "../../entities/parametros-carga.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { ReglasPrioridadGlobales } from "../../entities/reglas-prioridad.entity";
import { VentanaAtencion } from "../../entities/ventana-atencion.entity";
import { SeleccionTemporal } from "../../entities/seleccion-temporal.entity";
import { HorariosModule } from "../../horarios/horarios.module";
import { VentanasController } from "./ventanas.controller";
import { GestorSeleccionTemporalService } from "./gestor-seleccion.service";
import { VentanasService } from "./ventanas.service";
import { CampañasVentanasController } from "./campañas-ventanas.controller";
import { CampañasVentanasService } from "./campañas-ventanas.service";
import { CommonModule } from "../../common/common.module";
import { NotificacionesModule } from "../../notificaciones/notificaciones.module";
import { AuditoriaModule } from "../../modules/auditoria/auditoria.module";
import { ReglasPrioridadController } from "./reglas-prioridad.controller";
import { ReglasPrioridadGlobalesService } from "./reglas-prioridad.service";
import { SincronizacionRedisService } from "./sincronizacion-redis.service";

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
      Curso,
      ParametrosCarga,
      CampañaVentanas,
      DiaNoLaborable,
      ReglasPrioridadGlobales,
      SeleccionTemporal,
    ]),
    HorariosModule,
    CommonModule,
    NotificacionesModule,
    AuditoriaModule,
  ],
  controllers: [
    VentanasController,
    CampañasVentanasController,
    ReglasPrioridadController,
  ],
  providers: [
    VentanasService,
    GestorSeleccionTemporalService,
    CampañasVentanasService,
    ReglasPrioridadGlobalesService,
    SincronizacionRedisService,
  ],
  exports: [
    VentanasService,
    GestorSeleccionTemporalService,
    CampañasVentanasService,
    ReglasPrioridadGlobalesService,
    SincronizacionRedisService,
  ],
})
export class VentanasModule {}
