import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatbotController } from "./chatbot.controller";
import { ChatbotService } from "./chatbot.service";
import { ConfigModule } from "@nestjs/config";
import { AmbientesModule } from "../ambientes/ambientes.module";
import { DisponibilidadModule } from "../disponibilidad/disponibilidad.module";
import { HorariosModule } from "../horarios/horarios.module";
import { AsignacionLectivaModule } from "../modules/asignacion-lectiva/asignacion-lectiva.module";
import { ThrottlerModule } from "@nestjs/throttler";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PeriodoAcademico, Docente, Ambiente]),
    AmbientesModule,
    DisponibilidadModule,
    HorariosModule,
    AsignacionLectivaModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto
        limit: 100, // 100 peticiones por minuto por usuario (aumentado para desarrollo)
      },
    ]),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
