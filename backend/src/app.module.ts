import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module";
import { CommonModule } from "./common/common.module";
import { DocentesModule } from "./docentes/docentes.module";
import { CursosModule } from "./cursos/cursos.module";
import { AmbientesModule } from "./ambientes/ambientes.module";
import { DisponibilidadModule } from "./disponibilidad/disponibilidad.module";
import { GruposModule } from "./grupos/grupos.module";
import { HorariosModule } from "./horarios/horarios.module";
import { VentanasModule } from "./ventanas/ventanas.module";
import { ReportesModule } from "./reportes/reportes.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { NotificacionesModule } from "./notificaciones/notificaciones.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("DATABASE_HOST", "localhost"),
        port: config.get<number>("DATABASE_PORT", 5432),
        database: config.get<string>("DATABASE_NAME", "horarios_unt"),
        username: config.get<string>("DATABASE_USER", "unt_user"),
        password: config.get<string>("DATABASE_PASSWORD", "unt_pass123"),
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get<string>("NODE_ENV") === "development",
        ssl: false,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>("REDIS_HOST", "localhost"),
          port: config.get<number>("REDIS_PORT", 6379),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    CommonModule,
    DocentesModule,
    CursosModule,
    AmbientesModule,
    DisponibilidadModule,
    GruposModule,
    HorariosModule,
    VentanasModule,
    ReportesModule,
    DashboardModule,
    NotificacionesModule,
  ],
})
export class AppModule {}
