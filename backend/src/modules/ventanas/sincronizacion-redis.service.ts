import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class SincronizacionRedisService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(SincronizacionRedisService.name);
  private readonly LOCK_TTL_SECONDS = 30;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>("REDIS_HOST", "localhost"),
      port: this.configService.get<number>("REDIS_PORT", 6379),
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async adquirirLockCelda(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    periodo: string,
    sesionId: string,
  ): Promise<{ acquired: boolean }> {
    const lockKey = `lock_celda_${ambienteId}_${dia}_${horaInicio}_${periodo}`;
    const result = await this.redis.set(
      lockKey,
      sesionId,
      "EX",
      this.LOCK_TTL_SECONDS,
      "NX",
    );
    const acquired = result === "OK";
    if (!acquired) {
      this.logger.debug(`Lock no adquirido para celda ${lockKey}`);
    }
    return { acquired };
  }

  async liberarLockCelda(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    periodo: string,
  ): Promise<void> {
    const lockKey = `lock_celda_${ambienteId}_${dia}_${horaInicio}_${periodo}`;
    await this.redis.del(lockKey);
  }

  async liberarLock(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    periodo: string,
  ): Promise<void> {
    return this.liberarLockCelda(ambienteId, dia, horaInicio, periodo);
  }

  async recuperarSeleccionesDelBD(): Promise<{ recuperadas: number }> {
    return { recuperadas: 0 };
  }

  async marcarSeleccionesComoConfirmadas(sesionId: string): Promise<void> {
    const claveSesion = `sesion_${sesionId}`;
    const claves = await this.redis.smembers(claveSesion);
    for (const clave of claves) {
      await this.redis.del(clave);
    }
    await this.redis.del(claveSesion);
    await this.redis.srem("selecciones_sesiones_activas", sesionId);
    this.logger.debug(
      `Selecciones confirmadas y limpiadas para sesión ${sesionId}`,
    );
  }
}
