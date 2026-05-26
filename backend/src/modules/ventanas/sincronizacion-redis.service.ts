import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import { SeleccionTemporal, EstadoSeleccion } from '../../entities/seleccion-temporal.entity';
import { Grupo } from '../../entities/grupo.entity';

export interface SeleccionTemporalRedis {
  ventanaId: string;
  sesionId: string;
  docenteId: number;
  cursoId: number;
  tipoClase: string;
  ambienteId: number;
  dia: number;
  horaInicio: string;
  horaFin: string;
  periodo: string;
}

@Injectable()
export class SincronizacionRedisService {
  private readonly logger = new Logger(SincronizacionRedisService.name);
  private readonly redis: Redis;
  private readonly TTL_SELECCION_SEGUNDOS = 10; // 10 seconds (same as lock TTL)
  private readonly TTL_LOCK_SEGUNDOS = 10; // 10 seconds for cell lock (reduced from 30)

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SeleccionTemporal)
    private readonly seleccionTemporalRepo: Repository<SeleccionTemporal>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
  }

  /**
   * Guardar selección en Redis + persistir en BD
   * Retorna el ID de SeleccionTemporal creada
   */
  async guardarSeleccionConPersistencia(
    seleccion: SeleccionTemporalRedis,
    lock_token?: string,
  ): Promise<{ exito: boolean; id?: number; lock_token?: string }> {
    try {
      // Obtener el grupo del curso
      const grupo = await this.grupoRepo.findOne({
        where: { curso_id: seleccion.cursoId },
      });

      if (!grupo) {
        this.logger.error(`No se encontró grupo para el curso ${seleccion.cursoId}`);
        return { exito: false };
      }

      // 0. Limpiar registros antiguos de la sesión para evitar duplicate key
      await this.seleccionTemporalRepo.delete({
        sesion_id: seleccion.sesionId,
        ambiente_id: seleccion.ambienteId,
        dia: seleccion.dia,
        hora_inicio: seleccion.horaInicio,
        periodo: seleccion.periodo,
      });

      // 1. Persistir en BD
      const entity = this.seleccionTemporalRepo.create({
        sesion_id: seleccion.sesionId,
        ventana_atencion_id: seleccion.ventanaId,
        docente_id: seleccion.docenteId,
        curso_id: seleccion.cursoId,
        grupo_id: grupo.id,
        ambiente_id: seleccion.ambienteId,
        dia: seleccion.dia,
        hora_inicio: seleccion.horaInicio,
        hora_fin: seleccion.horaFin,
        tipo_clase: seleccion.tipoClase as any,
        periodo: seleccion.periodo,
        estado: EstadoSeleccion.PENDIENTE,
        contexto_validacion: seleccion as unknown as Record<string, unknown>,
      } as any);

      const saved = await this.seleccionTemporalRepo.save(entity);

      // 2. Guardar en Redis con TTL
      const clave = this.crearClaveSeleccion(
        seleccion.ambienteId,
        seleccion.dia,
        seleccion.horaInicio,
        seleccion.periodo,
      );

      await this.redis.setex(
        clave,
        this.TTL_SELECCION_SEGUNDOS,
        JSON.stringify(seleccion),
      );

      // 3. Registrar en sesión (set de claves)
      const claveSesion = this.crearClaveSesion(seleccion.sesionId);
      await this.redis.sadd(claveSesion, clave);
      await this.redis.expire(claveSesion, this.TTL_SELECCION_SEGUNDOS);

      this.logger.debug(
        `Selección guardada: sesion=${seleccion.sesionId}, ambiente=${seleccion.ambienteId}`,
      );

      return { exito: true, id: (saved as any).id, lock_token };
    } catch (error) {
      this.logger.error(`Error guardando selección: ${error.message}`, error);
      
      // Si es error de constraint, liberar el lock
      if (error.message.includes('idx_selecciones_unique_celda')) {
        await this.redis.del(`lock_celda_${seleccion.ambienteId}_${seleccion.dia}_${seleccion.horaInicio}_${seleccion.periodo}`);
        this.logger.debug(`Lock liberado por constraint violation`);
      }
      
      return { exito: false };
    }
  }

  /**
   * Adquirir lock distribuido para una celda
   * Previene que dos operadores seleccionen la misma celda simultáneamente
   */
  async adquirirLockCelda(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    periodo: string,
    sesionId: string,
  ): Promise<{ acquired: boolean; lock_token: string | null }> {
    try {
      const clave_lock = `lock_celda_${ambienteId}_${dia}_${horaInicio}_${periodo}`;
      const lock_token = `${sesionId}_${Date.now()}`;

      // SETNX: Set only if not exists, with expiration
      const resultado = await this.redis.set(
        clave_lock,
        lock_token,
        'EX',
        this.TTL_LOCK_SEGUNDOS,
        'NX',
      );

      const acquired = resultado === 'OK';

      if (acquired) {
        this.logger.debug(`Lock adquirido: ${clave_lock}`);
      } else {
        this.logger.warn(`Lock rechazado (ya existe): ${clave_lock}`);
      }

      return { acquired, lock_token: acquired ? lock_token : null };
    } catch (error) {
      this.logger.error(`Error adquiriendo lock: ${error.message}`, error);
      return { acquired: false, lock_token: null };
    }
  }

  /**
   * Liberar lock de una celda
   */
  async liberarLock(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    periodo: string,
    lock_token?: string,
  ): Promise<boolean> {
    try {
      const clave_lock = `lock_celda_${ambienteId}_${dia}_${horaInicio}_${periodo}`;

      // Si tenemos token, verificar que es nuestro lock antes de borrar
      if (lock_token) {
        const token_actual = await this.redis.get(clave_lock);
        if (token_actual !== lock_token) {
          this.logger.warn(`Lock token no coincide: esperado=${lock_token}, actual=${token_actual}`);
          return false;
        }
      }

      await this.redis.del(clave_lock);
      this.logger.debug(`Lock liberado: ${clave_lock}`);
      return true;
    } catch (error) {
      this.logger.error(`Error liberando lock: ${error.message}`, error);
      return false;
    }
  }

  /**
   * Marcar selecciones como confirmadas
   */
  async marcarSeleccionesComoConfirmadas(sesionId: string): Promise<void> {
    try {
      const selecciones = await this.seleccionTemporalRepo.find({
        where: { sesion_id: sesionId, estado: EstadoSeleccion.PENDIENTE },
      });

      for (const sel of selecciones) {
        sel.estado = EstadoSeleccion.CONFIRMADA;
        await this.seleccionTemporalRepo.save(sel);
      }

      this.logger.debug(`${selecciones.length} selecciones marcadas como CONFIRMADA`);
    } catch (error) {
      this.logger.error(`Error marcando selecciones confirmadas: ${error.message}`, error);
    }
  }

  /**
   * Recuperar selecciones PENDIENTE de BD cuando Redis está vacío
   * Esto permite recuperación ante fallos de Redis
   */
  async recuperarSeleccionesDelBD(): Promise<{ recuperadas: number }> {
    try {
      // Buscar selecciones pendientes no muy antiguas (últimos 30 minutos)
      const hace30min = new Date(Date.now() - 30 * 60 * 1000);
      const selecciones = await this.seleccionTemporalRepo.find({
        where: [
          { estado: EstadoSeleccion.PENDIENTE },
        ],
      });

      let recuperadas = 0;
      for (const sel of selecciones) {
        // Verificar que no haya expirado
        if (sel.expira_en > new Date()) {
          // Restaurar a Redis
          const seleccionRedis: SeleccionTemporalRedis = {
            ventanaId: sel.ventana_atencion_id?.toString() || '0',
            sesionId: sel.sesion_id,
            docenteId: sel.docente_id,
            cursoId: sel.curso_id,
            tipoClase: sel.tipo_clase,
            ambienteId: sel.ambiente_id,
            dia: sel.dia,
            horaInicio: sel.hora_inicio,
            horaFin: sel.hora_fin,
            periodo: sel.periodo,
          };

          const clave = this.crearClaveSeleccion(
            sel.ambiente_id,
            sel.dia,
            sel.hora_inicio,
            sel.periodo,
          );

          const ttl_restante = Math.ceil(
            (sel.expira_en.getTime() - Date.now()) / 1000,
          );
          if (ttl_restante > 0) {
            await this.redis.setex(clave, ttl_restante, JSON.stringify(seleccionRedis));

            const claveSesion = this.crearClaveSesion(sel.sesion_id);
            await this.redis.sadd(claveSesion, clave);
            await this.redis.expire(claveSesion, ttl_restante);

            sel.sincronizada_desde_redis = true;
            await this.seleccionTemporalRepo.save(sel);

            recuperadas++;
          }
        }
      }

      this.logger.log(`Recuperadas ${recuperadas} selecciones desde BD`);
      return { recuperadas };
    } catch (error) {
      this.logger.error(`Error recuperando selecciones: ${error.message}`, error);
      return { recuperadas: 0 };
    }
  }

  /**
   * Cron: Limpiar selecciones expiradas cada 10 minutos
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async limpiarSeleccionesExpiradas(): Promise<void> {
    try {
      const ahora = new Date();

      // Buscar pendientes que han expirado
      const expiradas = await this.seleccionTemporalRepo.find({
        where: [
          { estado: EstadoSeleccion.PENDIENTE },
        ],
      });

      let limpiadas = 0;
      for (const sel of expiradas) {
        if (sel.expira_en <= ahora) {
          sel.estado = EstadoSeleccion.EXPIRADA;
          await this.seleccionTemporalRepo.save(sel);

          // Limpiar de Redis
          const clave = this.crearClaveSeleccion(
            sel.ambiente_id,
            sel.dia,
            sel.hora_inicio,
            sel.periodo,
          );
          await this.redis.del(clave);

          const claveSesion = this.crearClaveSesion(sel.sesion_id);
          await this.redis.srem(claveSesion, clave);

          limpiadas++;
        }
      }

      if (limpiadas > 0) {
        this.logger.debug(`Limpiadas ${limpiadas} selecciones expiradas`);
      }
    } catch (error) {
      this.logger.error(`Error en limpieza de expiradas: ${error.message}`, error);
    }
  }

  /**
   * Utilidades privadas
   */
  private crearClaveSeleccion(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    periodo: string,
  ): string {
    return `seleccion_${ambienteId}_${dia}_${horaInicio}_${periodo}`;
  }

  private crearClaveSesion(sesionId: string): string {
    return `selecciones_sesion_${sesionId}`;
  }

  /**
   * Limpieza al destruir módulo
   */
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
