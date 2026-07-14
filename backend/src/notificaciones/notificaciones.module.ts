import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { NotificacionDocente } from "../entities/notificacion-docente.entity";
import { PreferenciasNotificacion } from "../entities/preferencias-notificacion.entity";
import { VentanaAtencion } from "../entities/ventana-atencion.entity";
import { Docente } from "../entities/docente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ColaDocente } from "../entities/cola-docentes.entity";
import { MailService } from "../mail/mail.service";

import { NotificacionesService } from "./notificaciones.service";
import { NotificacionesController } from "./notificaciones.controller";
import { NotificacionesProcessor } from "./notificaciones.processor";
import { NotificacionesGateway } from "./notificaciones.gateway";
import { TelegramBotService } from "./telegram-bot.service";
import { FirebasePushService } from "./firebase-push.service";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificacionDocente,
      PreferenciasNotificacion,
      VentanaAtencion,
      Docente,
      HorarioAsignado,
      ColaDocente,
      DeclaracionCargaHoraria,
      PeriodoAcademico,
    ]),
    BullModule.registerQueue({
      name: "notificaciones",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000, // 5 segundos, luego 10, luego 20
        },
        removeOnComplete: 100, // Mantener últimos 100 jobs completados
        removeOnFail: 50, // Mantener últimos 50 jobs fallidos
      },
    }),
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    NotificacionesProcessor,
    NotificacionesGateway,
    TelegramBotService,
    MailService,
    FirebasePushService,
  ],
  exports: [NotificacionesService, NotificacionesGateway, FirebasePushService],
})
export class NotificacionesModule {}
