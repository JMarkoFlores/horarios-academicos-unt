import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { redisStore } from "cache-manager-redis-store";
import { AuthModule } from "./auth/auth.module";
import { CommonModule } from "./common/common.module";
import { LanguageInterceptor } from "./common/interceptors/language.interceptor";
import { DocentesModule } from "./docentes/docentes.module";
import { CursosModule } from "./cursos/cursos.module";
import { AmbientesModule } from "./ambientes/ambientes.module";
import { DisponibilidadModule } from "./disponibilidad/disponibilidad.module";
import { GruposModule } from "./grupos/grupos.module";
import { HorariosModule } from "./horarios/horarios.module";
import { ReportesModule } from "./reportes/reportes.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { NotificacionesModule } from "./notificaciones/notificaciones.module";
import { UsuariosModule } from "./usuarios/usuarios.module";
import { PeriodosModule } from "./periodos/periodos.module";
import { ConfiguracionModule } from "./configuracion/configuracion.module";
import { PreasignacionesModule } from "./modules/preasignaciones/preasignaciones.module";
import { VentanasModule } from "./modules/ventanas/ventanas.module";
import { AuditoriaModule } from "./modules/auditoria/auditoria.module";
import { CursosAmbienteModule } from "./cursos-ambiente/cursos-ambiente.module";
import { FacultadesModule } from "./facultades/facultades.module";
import { DataImportModule } from "./modules/data-import/data-import.module";

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
        synchronize: config.get<string>("NODE_ENV") !== "production" || config.get<string>("DB_SYNC") === "true",
        logging: config.get<string>("DATABASE_LOGGING") === "true",
        ssl: config.get<string>("DATABASE_SSL") === "true" 
          ? { rejectUnauthorized: false } 
          : false,
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
    AuditoriaModule,
    CursosAmbienteModule,
    FacultadesModule,
    DataImportModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LanguageInterceptor,
    },
  ],
})
export class AppModule {}
