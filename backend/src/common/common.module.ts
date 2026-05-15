import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { ColaDocentes } from "../entities/cola-docentes.entity";
import { VentanaAtencion } from "../entities/ventana-atencion.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Preasignacion } from "../entities/preasignacion.entity";
import { SeleccionTemporal } from "../entities/seleccion-temporal.entity";
import { NotificacionDocente } from "../entities/notificacion-docente.entity";
import { PreferenciasNotificacion } from "../entities/preferencias-notificacion.entity";
import { DiaNoLaborable } from "../entities/dia-no-laborable.entity";
import { ValidacionesService } from "./services/validaciones.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HorarioAsignado,
      DisponibilidadDocente,
      ColaDocentes,
      VentanaAtencion,
      ConflictoAsignacion,
      Preasignacion,
      SeleccionTemporal,
      NotificacionDocente,
      PreferenciasNotificacion,
      DiaNoLaborable,
    ]),
  ],
  providers: [ValidacionesService],
  exports: [ValidacionesService],
})
export class CommonModule {}
