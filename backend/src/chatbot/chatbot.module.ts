import { Module } from "@nestjs/common";
import { ChatbotController } from "./chatbot.controller";
import { ChatbotService } from "./chatbot.service";
import { ConfigModule } from "@nestjs/config";
import { AmbientesModule } from "../ambientes/ambientes.module";
import { ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [
    ConfigModule,
    AmbientesModule,
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
