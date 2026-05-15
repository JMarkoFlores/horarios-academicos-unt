import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { NotificacionDocente } from '../entities/notificacion-docente.entity';
import { PreferenciasNotificacion } from '../entities/preferencias-notificacion.entity';
import { VentanaAtencion } from '../entities/ventana-atencion.entity';
import { Docente } from '../entities/docente.entity';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesProcessor } from './notificaciones.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificacionDocente,
      PreferenciasNotificacion,
      VentanaAtencion,
      Docente,
      HorarioAsignado,
    ]),
    BullModule.registerQueue({ name: 'notificaciones' }),
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, NotificacionesProcessor],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
