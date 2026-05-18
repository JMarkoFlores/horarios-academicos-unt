import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { redisStore } from "cache-manager-redis-store";
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
import { AnalyticsModule } from "./analytics/analytics.module";
import { NotificacionesModule } from "./notificaciones/notificaciones.module";
import { UsuariosModule } from "./usuarios/usuarios.module";
import { PeriodosModule } from "./periodos/periodos.module";
import { ConfiguracionModule } from "./configuracion/configuracion.module";
import { PreasignacionesModule } from "./modules/preasignaciones/preasignaciones.module";

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
        synchronize: config.get<string>("NODE_ENV") === "development",
        logging: config.get<string>("NODE_ENV") === "development",
        ssl: false,
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisHost = config.get<string>("REDIS_HOST", "localhost");
        const redisPort = config.get<number>("REDIS_PORT", 6379);
        const redisTtl = config.get<number>("REDIS_TTL", 300);

        return {
          store: (await redisStore({
            socket: {
              host: redisHost,
              port: redisPort,
            },
          })) as unknown,
          ttl: redisTtl,
        };
      },
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
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
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
    AnalyticsModule,
    NotificacionesModule,
    UsuariosModule,
    PeriodosModule,
    ConfiguracionModule,
    PreasignacionesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
