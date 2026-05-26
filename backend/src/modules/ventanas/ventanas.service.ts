import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import Redis from "ioredis";
import { DataSource, Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { EstadoHorario } from "../../common/enums/estado-horario.enum";
import { ModoAsignacion } from "../../common/enums/modo-asignacion.enum";
import { OrigenHorario } from "../../common/enums/origen-horario.enum";
import { Grupo } from "../../entities/grupo.entity";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { ValidadorHorarioService } from "../../horarios/validador-horario.service";
import { SeleccionarCeldaDto } from "./dto/seleccionar-celda.dto";
import { VentanaAtencion, EstadoVentanaAtencion } from "../../entities/ventana-atencion.entity";
import { ValidacionesService } from "../../common/services/validaciones.service";
import { ColaDocente, EstadoCola } from "../../entities/cola-docentes.entity";
import { Docente } from "../../entities/docente.entity";
import { HorariosGateway } from "../../horarios/horarios.gateway";
import { CreateVentanaDto } from "./dto/create-ventana.dto";
import { UpdateVentanaDto } from "./dto/update-ventana.dto";
import { GestorSeleccionTemporalService } from "./gestor-seleccion.service";
import { SincronizacionRedisService } from "./sincronizacion-redis.service";
import { ConfiguracionVentanaCategoriaDto } from "./dto/configurar-ventanas-periodo.dto";
import { CategoriaDocente } from "../../common/enums/categoria-docente.enum";
import { TipoContrato } from "../../common/enums/tipo-contrato.enum";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import { Cache } from "cache-manager";

@Injectable()
export class VentanasService implements OnModuleDestroy, OnApplicationBootstrap {
  private readonly logger = new Logger(VentanasService.name);
  private readonly redis: Redis;
  private static readonly TTL_COLA_SEGUNDOS = 12 * 60 * 60;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(VentanaAtencion)
    private readonly ventanaRepo: Repository<VentanaAtencion>,
    @InjectRepository(ColaDocente)
    private readonly colaRepo: Repository<ColaDocente>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    private readonly gateway: HorariosGateway,
    private readonly gestorSeleccionService: GestorSeleccionTemporalService,
    private readonly sincronizacionRedisService: SincronizacionRedisService,
    private readonly notificacionesService: NotificacionesService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>("REDIS_HOST", "localhost"),
      port: this.configService.get<number>("REDIS_PORT", 6379),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Iniciando bootstrap de módulo de ventanas...');

    try {
      // Crear tabla selecciones_temporales si no existe
      const tableExists = await this.dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'selecciones_temporales'
        );
      `);

      if (!tableExists[0].exists) {
        this.logger.log('Creando tabla selecciones_temporales...');
        await this.dataSource.query(`
          CREATE TABLE IF NOT EXISTS "selecciones_temporales" (
            "id" SERIAL PRIMARY KEY,
            "sesion_id" uuid NOT NULL,
            "ventana_atencion_id" integer,
            "docente_id" integer NOT NULL,
            "curso_id" integer NOT NULL,
            "grupo_id" integer NOT NULL,
            "ambiente_id" integer NOT NULL,
            "dia" integer NOT NULL,
            "hora_inicio" TIME NOT NULL,
            "hora_fin" TIME NOT NULL,
            "tipo_clase" varchar NOT NULL,
            "periodo" varchar(20) NOT NULL,
            "estado" varchar NOT NULL DEFAULT 'PENDIENTE',
            "contexto_validacion" jsonb,
            "creada_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "actualizada_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "expira_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 minutes',
            "razon_rechazo" text,
            "sincronizada_desde_redis" boolean NOT NULL DEFAULT false,
            CONSTRAINT "idx_selecciones_unique_celda" UNIQUE (sesion_id, ambiente_id, dia, hora_inicio, periodo)
          );
          CREATE INDEX IF NOT EXISTS "idx_selecciones_sesion_estado" ON "selecciones_temporales" (sesion_id, estado);
          CREATE INDEX IF NOT EXISTS "idx_selecciones_expira_en" ON "selecciones_temporales" (expira_en);
        `);
        this.logger.log('✓ Tabla selecciones_temporales creada');
      }

      // Recuperar selecciones desde BD
      this.logger.log('Recuperando selecciones temporales desde BD...');
    } catch (error) {
      this.logger.error(`Error en bootstrap: ${(error as any).message}`, error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async revisarTemporizadores() {
    this.logger.log('[revisarTemporizadores] Revisando temporizadores expirados...');
    
    // Obtener todas las claves de temporizadores
    const keys = await this.redis.keys('temporizador:ventana:*');
    
    for (const key of keys) {
      const dataStr = await this.redis.get(key);
      if (!dataStr) continue;
      
      try {
        const data = JSON.parse(dataStr);
        const ahora = Date.now();
        
        // Verificar si el temporizador ha expirado
        if (ahora >= data.timestamp) {
          this.logger.log(`[revisarTemporizadores] Temporizador expirado para ventana ${data.ventanaId}. Llamando siguiente docente...`);
          
          // Llamar al siguiente docente automáticamente
          await this.llamarSiguiente(data.ventanaId);
        }
      } catch (error) {
        this.logger.error(`[revisarTemporizadores] Error procesando temporizador ${key}: ${error.message}`);
        // Eliminar temporizador corrupto
        await this.redis.del(key);
      }
    }
  }

  async obtenerVentana(ventanaId: string): Promise<VentanaAtencion> {
    const ventana = await this.ventanaRepo.findOne({
      where: { id: ventanaId },
      relations: ['colas', 'colas.docente']
    });
    if (!ventana) throw new NotFoundException(`Ventana ${ventanaId} no encontrada`);
    return ventana;
  }

  async actualizarVentana(ventanaId: string, dto: UpdateVentanaDto): Promise<VentanaAtencion> {
    this.logger.log(`[actualizarVentana] ID=${ventanaId}, DTO=${JSON.stringify(dto)}`);

    const ventana = await this.obtenerVentana(ventanaId);

    // Solo se puede editar ventanas PROGRAMADA o CANCELADA
    if (ventana.estado === EstadoVentanaAtencion.EN_CURSO) {
      throw new BadRequestException('❌ No se puede editar una ventana que está en curso');
    }
    if (ventana.estado === EstadoVentanaAtencion.COMPLETADA) {
      throw new BadRequestException('❌ No se puede editar una ventana que ya fue completada');
    }

    // Validar solapamiento si cambia fecha/hora
    if (dto.fecha || dto.hora_inicio || dto.hora_fin) {
      const nuevaFecha = dto.fecha ? new Date(dto.fecha) : ventana.fecha;
      const nuevaHoraInicio = dto.hora_inicio ?? ventana.hora_inicio;
      const nuevaHoraFin = dto.hora_fin ?? ventana.hora_fin;

      const solapamiento = await this.ventanaRepo.createQueryBuilder('v')
        .where('v.id != :id', { id: ventanaId })
        .andWhere('v.periodo = :periodo', { periodo: ventana.periodo })
        .andWhere('v.fecha = :fecha', { fecha: nuevaFecha })
        .andWhere('v.estado != :estado', { estado: EstadoVentanaAtencion.CANCELADA })
        .andWhere('(:horaInicio < v.hora_fin AND :horaFin > v.hora_inicio)', {
          horaInicio: nuevaHoraInicio,
          horaFin: nuevaHoraFin,
        })
        .getOne();

      if (solapamiento) {
        throw new BadRequestException(
          `❌ Solapamiento con ventana existente: ${solapamiento.hora_inicio}-${solapamiento.hora_fin}`
        );
      }
    }

    Object.assign(ventana, dto);
    const guardada = await this.ventanaRepo.save(ventana);
    this.logger.log(`✅ Ventana ${ventanaId} actualizada`);
    return guardada;
  }

  async eliminarVentana(ventanaId: string): Promise<void> {
    this.logger.log(`[eliminarVentana] ID=${ventanaId}`);

    const ventana = await this.obtenerVentana(ventanaId);

    // Restricciones de eliminación
    if (ventana.estado === EstadoVentanaAtencion.EN_CURSO) {
      throw new BadRequestException('❌ No se puede eliminar una ventana que está en curso. Finalícela primero.');
    }
    if (ventana.estado === EstadoVentanaAtencion.COMPLETADA) {
      throw new BadRequestException('❌ No se puede eliminar una ventana que ya fue completada.');
    }

    await this.ventanaRepo.delete(ventanaId);
    this.logger.log(`✅ Ventana ${ventanaId} eliminada`);
  }

  async obtenerVentanaActiva() {
    return await this.ventanaRepo.findOne({
      where: { estado: EstadoVentanaAtencion.EN_CURSO },
      order: { fecha: 'ASC' }
    });
  }

  async listarVentanasConFiltros(
    periodo?: string,
    estado?: string,
    categoria?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ): Promise<VentanaAtencion[]> {
    const qb = this.ventanaRepo.createQueryBuilder('v');

    if (periodo) {
      qb.andWhere('v.periodo = :periodo', { periodo });
    }

    if (estado) {
      qb.andWhere('v.estado = :estado', { estado });
    }

    if (categoria) {
      qb.andWhere('v.categoria = :categoria', { categoria });
    }

    if (fechaDesde) {
      const [year, month, day] = fechaDesde.split('-').map(Number);
      const desde = new Date(year, month - 1, day);
      qb.andWhere('v.fecha >= :fechaDesde', { fechaDesde: desde });
    }

    if (fechaHasta) {
      const [year, month, day] = fechaHasta.split('-').map(Number);
      const hasta = new Date(year, month - 1, day);
      qb.andWhere('v.fecha <= :fechaHasta', { fechaHasta: hasta });
    }

    qb.orderBy('v.fecha', 'DESC').addOrderBy('v.hora_inicio', 'ASC');

    return qb.getMany();
  }

  async crearVentana(dto: CreateVentanaDto): Promise<VentanaAtencion> {
    this.logger.log(`[crearVentana] DTO recibido: ${JSON.stringify(dto)}`);

    // Validaciones básicas
    if (!dto.fecha || !dto.hora_inicio || !dto.hora_fin) {
      this.logger.error(`[crearVentana] ❌ Campos obligatorios faltantes: fecha=${dto.fecha}, hora_inicio=${dto.hora_inicio}, hora_fin=${dto.hora_fin}`);
      throw new BadRequestException('Fecha, hora de inicio y hora fin son obligatorios');
    }
    
    // Validar formato de hora
    const horaRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!horaRegex.test(dto.hora_inicio) || !horaRegex.test(dto.hora_fin)) {
      throw new BadRequestException('Formato de hora inválido. Use HH:MM (24h)');
    }
    
    // Validar que hora inicio sea menor que hora fin
    const [hInicio, mInicio] = dto.hora_inicio.split(':').map(Number);
    const [hFin, mFin] = dto.hora_fin.split(':').map(Number);
    const minutosInicio = hInicio * 60 + mInicio;
    const minutosFin = hFin * 60 + mFin;
    
    if (minutosInicio >= minutosFin) {
      throw new BadRequestException('La hora de inicio debe ser menor que la hora de fin');
    }
    
    // Validar duración mínima (al menos 15 minutos)
    if (minutosFin - minutosInicio < 15) {
      throw new BadRequestException('La ventana debe tener una duración mínima de 15 minutos');
    }
    
    const [year, month, day] = dto.fecha.split("-").map(Number);
    const fechaVentana = new Date(year, month - 1, day);
    const hoy = this.normalizarFecha(new Date());
    
    // Validar que la fecha no sea en el pasado
    if (fechaVentana < hoy) {
      throw new BadRequestException('No se pueden crear ventanas en fechas pasadas');
    }
    
    // Verificar solapamiento con otras ventanas del mismo período Y categoría
    const solapamiento = await this.ventanaRepo.createQueryBuilder('v')
      .where('v.periodo = :periodo', { periodo: dto.periodo })
      .andWhere('v.categoria = :categoria', { categoria: dto.categoria })
      .andWhere('v.fecha = :fecha', { fecha: fechaVentana })
      .andWhere('v.estado != :estado', { estado: EstadoVentanaAtencion.CANCELADA })
      .andWhere('(CAST(:horaInicio AS time) < v.hora_fin AND CAST(:horaFin AS time) > v.hora_inicio)', {
        horaInicio: dto.hora_inicio + ':00',
        horaFin: dto.hora_fin + ':00'
      })
      .getOne();
    
    if (solapamiento) {
      throw new BadRequestException(
        `Ya existe una ventana programada en ese horario: ${solapamiento.hora_inicio}-${solapamiento.hora_fin}`
      );
    }
    
    this.logger.log(`Creando ventana: ${dto.fecha} ${dto.hora_inicio}-${dto.hora_fin} (${dto.categoria})`);
    
    const ventana = this.ventanaRepo.create({
      periodo: dto.periodo,
      fecha: fechaVentana,
      categoria: dto.categoria,
      modalidad: dto.modalidad ?? null,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      intervalo_minutos: dto.intervalo_minutos ?? 30,
      estado: EstadoVentanaAtencion.PROGRAMADA,
    });
    
    const savedVentana = await this.ventanaRepo.save(ventana);
    this.logger.log(`✅ Ventana ${savedVentana.id} creada exitosamente`);
    
    // Notificaciones: Si la ventana es futura (más allá de mañana), programar recordatorio 24h
    // La alerta de 15min solo se programa cuando se inicia la ventana (se asignan docentes)
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    
    if (fechaVentana > manana) {
      this.logger.log(`Ventana programada para fecha futura (${dto.fecha}). Notificaciones se programarán al iniciar la ventana.`);
    } else {
      this.logger.warn(`Ventana programada para fecha cercana (${dto.fecha}). Recordatorio 24h no se enviará.`);
    }
    
    return savedVentana;
  }

  async configurarVentanasPeriodo(idPeriodo: number, fechaInicio: string, config: ConfiguracionVentanaCategoriaDto[]): Promise<VentanaAtencion[]> {
    const periodo = await this.periodoRepo.findOne({ where: { id: idPeriodo } });
    if (!periodo) throw new NotFoundException(`Periodo ${idPeriodo} no encontrado`);

    const ventanas: VentanaAtencion[] = [];
    const [y, m, d] = fechaInicio.split("-").map(Number);
    let fechaActual = new Date(y, m - 1, d);

    for (const item of config) {
      const docentes = await this.buscarDocentesPorCategoria(item.categoria, item.modalidad);
      
      const ventana = this.ventanaRepo.create({
        periodo: periodo.codigo,
        fecha: new Date(fechaActual),
        categoria: item.categoria,
        modalidad: item.modalidad ?? null,
        hora_inicio: item.hora_inicio,
        hora_fin: this.sumarMinutos(item.hora_inicio, docentes.length * (item.intervalo_minutos ?? 30)),
        intervalo_minutos: item.intervalo_minutos ?? 30,
        estado: EstadoVentanaAtencion.PROGRAMADA,
      });
      const savedVentana = await this.ventanaRepo.save(ventana);
      ventanas.push(savedVentana);

      // Pre-asignar docentes y programar notificaciones
      for (const docente of docentes) {
        await this.colaRepo.save(this.colaRepo.create({
            ventana_id: savedVentana.id,
            docente_id: docente.id,
            orden: docentes.indexOf(docente) + 1,
            estado: EstadoCola.ESPERANDO,
            ventana: savedVentana,
            docente
        }));
        
        // Programar notificaciones
        this.logger.log(`Programando notificaciones para docente ${docente.id} en ventana ${savedVentana.id}`);
        await this.notificacionesService.enviarRecordatorio24h(docente.id, savedVentana.id);
        await this.notificacionesService.enviarAlerta15min(docente.id, savedVentana.id);
      }

      fechaActual = this.siguienteDiaHabil(fechaActual);
    }
    return ventanas;
  }

  async iniciarVentana(ventanaId: string) {
    this.logger.log(`🚀 Iniciando ventana ${ventanaId}...`);
    
    const ventana = await this.obtenerVentana(ventanaId);
    
    // Validaciones de estado
    if (ventana.estado === EstadoVentanaAtencion.COMPLETADA) {
      throw new BadRequestException("❌ La ventana ya fue completada.");
    }
    
    if (ventana.estado === EstadoVentanaAtencion.EN_CURSO) {
      throw new BadRequestException("❌ La ventana ya está en curso.");
    }
    
    if (ventana.estado === EstadoVentanaAtencion.CANCELADA) {
      throw new BadRequestException("❌ La ventana fue cancelada.");
    }
    
    // Validar que no haya otra ventana en curso para el mismo período
    const ventanaActiva = await this.ventanaRepo.findOne({
      where: { 
        periodo: ventana.periodo,
        estado: EstadoVentanaAtencion.EN_CURSO 
      }
    });
    
    if (ventanaActiva && ventanaActiva.id !== ventanaId) {
      throw new BadRequestException(
        `❌ Ya existe una ventana en curso (${ventanaActiva.fecha} ${ventanaActiva.hora_inicio}). Finalice esa ventana primero.`
      );
    }
    
    // Validar fecha: no se puede iniciar una ventana de fecha futura
    const hoy = this.normalizarFecha(new Date());
    const fechaVentana = this.normalizarFecha(ventana.fecha);
    
    if (fechaVentana > hoy) {
      throw new BadRequestException(
        `❌ No se puede iniciar una ventana programada para fecha futura (${ventana.fecha.toISOString().split('T')[0]})`
      );
    }
    
    this.logger.log(`✅ Validaciones pasadas. Cambiando estado a EN_CURSO...`);
    
    // Cambiar estado
    ventana.estado = EstadoVentanaAtencion.EN_CURSO;
    await this.ventanaRepo.save(ventana);
    this.logger.log(`✅ Estado actualizado a EN_CURSO`);
    
    // Verificar si ya hay docentes asignados a la ventana
    this.logger.log(`👥 Verificando docentes asignados a la ventana...`);
    const colaExistente = await this.colaRepo.find({
      where: { ventana_id: ventana.id },
      relations: ["docente"],
      order: { orden: "ASC" },
    });
    
    if (colaExistente.length > 0) {
      this.logger.log(`✅ ${colaExistente.length} docente(s) ya asignados a la ventana. Usando cola existente.`);
      
      // Resetear estados de la cola existente
      for (const cola of colaExistente) {
        cola.estado = EstadoCola.ESPERANDO;
        cola.hora_llamada = null;
        cola.hora_fin_atencion = null;
      }
      await this.colaRepo.save(colaExistente);
      
      const colas = colaExistente;
      
      // Programar notificaciones para docentes
      this.logger.log(`📨 Programando notificaciones...`);
      let notificacionesExitosas = 0;
      let notificacionesFallidas = 0;
      
      for (const cola of colas) {
        if (cola.docente) {
          try {
            this.logger.log(`  → Programando para docente ${cola.docente.id} (${cola.docente.nombres} ${cola.docente.apellidos})...`);
            
            // Recordatorio 24h (solo si la ventana es mañana o posterior)
            await this.notificacionesService.enviarRecordatorio24h(cola.docente.id, ventana.id);
            
            // Alerta 15min (siempre programar)
            await this.notificacionesService.enviarAlerta15min(cola.docente.id, ventana.id);
            
            notificacionesExitosas++;
            this.logger.log(`    ✅ Notificaciones programadas`);
          } catch (err: any) {
            notificacionesFallidas++;
            this.logger.error(`    ❌ Error programando notificaciones: ${err.message}`);
          }
        }
      }
      
      this.logger.log(`� Resumen notificaciones: ${notificacionesExitosas} exitosas, ${notificacionesFallidas} fallidas`);
    } else {
      // Si no hay docentes asignados, buscar por categoría (comportamiento original)
      this.logger.log(`⚠️ No hay docentes asignados. Buscando por categoría ${ventana.categoria}...`);
      const docentes = await this.buscarDocentesPorCategoria(
        ventana.categoria,
        ventana.modalidad ?? undefined,
        ventana.periodo,
      );
      
      if (docentes.length === 0) {
        this.logger.warn(`⚠️ No se encontraron docentes para la categoría ${ventana.categoria}`);
      } else {
        this.logger.log(`✅ ${docentes.length} docente(s) encontrados`);
      }
      
      // Crear cola de docentes
      const colas = docentes.map((docente, index) =>
        this.colaRepo.create({
          ventana_id: ventana.id,
          docente_id: docente.id,
          orden: index + 1,
          estado: EstadoCola.ESPERANDO,
          hora_llamada: null,
          hora_fin_atencion: null,
          ventana,
          docente,
        }),
      );

      await this.colaRepo.save(colas);
      this.logger.log(`✅ Cola creada con ${colas.length} docente(s)`);
      
      // Programar notificaciones para docentes recién asignados
      this.logger.log(`📨 Programando notificaciones...`);
      let notificacionesExitosas = 0;
      let notificacionesFallidas = 0;
      
      for (const cola of colas) {
        if (cola.docente) {
          try {
            this.logger.log(`  → Programando para docente ${cola.docente.id} (${cola.docente.nombres} ${cola.docente.apellidos})...`);
            
            // Recordatorio 24h (solo si la ventana es mañana o posterior)
            await this.notificacionesService.enviarRecordatorio24h(cola.docente.id, ventana.id);
            
            // Alerta 15min (siempre programar)
            await this.notificacionesService.enviarAlerta15min(cola.docente.id, ventana.id);
            
            notificacionesExitosas++;
            this.logger.log(`    ✅ Notificaciones programadas`);
          } catch (err: any) {
            notificacionesFallidas++;
            this.logger.error(`    ❌ Error programando notificaciones: ${err.message}`);
          }
        }
      }
      
      this.logger.log(`📊 Resumen notificaciones: ${notificacionesExitosas} exitosas, ${notificacionesFallidas} fallidas`);
    }
    
    // Emitir estado actualizado
    const estado = await this.reconstruirEstadoCola(ventana.id);
    await this.guardarEstadoColaCache(ventana.id, estado);
    this.gateway.emitirPeriodo(ventana.periodo, "cola_actualizada", estado);
    this.gateway.emitirPeriodo(ventana.periodo, "ventana_iniciada", { ventanaId, estado });
    
    this.logger.log(`🎉 Ventana ${ventanaId} iniciada exitosamente`);
    return estado;
  }

  async programarNotificacionesVentana(ventanaId: string): Promise<void> {
    this.logger.log(`Programando notificaciones para ventana ${ventanaId}`);
    
    const ventana = await this.obtenerVentana(ventanaId);
    if (!ventana) {
      throw new Error(`Ventana ${ventanaId} no encontrada`);
    }
    
    // Obtener docentes asignados a esta ventana
    const colaDocentes = await this.colaRepo.find({ 
      where: { ventana_id: ventanaId },
      relations: ['docente']
    });
    
    if (colaDocentes.length === 0) {
      this.logger.warn(`No hay docentes asignados a ventana ${ventanaId}`);
      return;
    }
    
    this.logger.log(`Programando notificaciones para ${colaDocentes.length} docente(s)`);
    
    for (const item of colaDocentes) {
      if (item.docente) {
        this.logger.log(`Programando para docente ${item.docente.id} (${item.docente.nombres})`);
        await this.notificacionesService.enviarRecordatorio24h(item.docente.id, ventanaId);
        await this.notificacionesService.enviarAlerta15min(item.docente.id, ventanaId);
      }
    }
    
    this.logger.log(`Notificaciones programadas exitosamente para ventana ${ventanaId}`);
  }

  async llamarSiguiente(ventanaId: string) {
    const ventana = await this.obtenerVentana(ventanaId);
    
    // Cancelar cualquier temporizador existente para esta ventana
    const tempKey = `temporizador:ventana:${ventanaId}`;
    await this.redis.del(tempKey);
    
    const actual = await this.colaRepo.findOne({
      where: { ventana_id: ventanaId, estado: EstadoCola.EN_ATENCION },
      relations: ["docente"],
      order: { orden: "ASC" },
    });

    if (actual) {
      actual.estado = EstadoCola.COMPLETADO;
      actual.hora_fin_atencion = new Date();
      await this.colaRepo.save(actual);
    }

    const siguiente = await this.colaRepo.findOne({
      where: { ventana_id: ventanaId, estado: EstadoCola.ESPERANDO },
      relations: ["docente"],
      order: { orden: "ASC" },
    });

    if (siguiente) {
      siguiente.estado = EstadoCola.EN_ATENCION;
      siguiente.hora_llamada = new Date();
      await this.colaRepo.save(siguiente);
      
      // Programar temporizador para pasar automáticamente al siguiente docente
      const intervaloMinutos = ventana.intervalo_minutos ?? 15;
      this.logger.log(`[llamarSiguiente] Programando temporizador de ${intervaloMinutos} minutos para ventana ${ventanaId}`);
      
      // Guardar información del temporizador en Redis
      const tempData = JSON.stringify({
        ventanaId,
        timestamp: Date.now() + intervaloMinutos * 60 * 1000,
      });
      await this.redis.setex(tempKey, intervaloMinutos * 60 + 60, tempData); // TTL un poco mayor que el intervalo
    }

    const estado = await this.reconstruirEstadoCola(ventanaId);
    await this.guardarEstadoColaCache(ventanaId, estado);
    this.gateway.emitirPeriodo(ventana.periodo, "cola_actualizada", estado);
    return estado;
  }

  async marcarAusente(ventanaId: string, docenteId: number) {
    const ventana = await this.obtenerVentana(ventanaId);
    const cola = await this.colaRepo.findOne({
      where: { ventana_id: ventanaId, docente_id: docenteId },
      relations: ["docente"],
    });

    if (!cola) {
      throw new NotFoundException(`Docente ${docenteId} no encontrado en la ventana ${ventanaId}`);
    }

    const estabaEnAtencion = cola.estado === EstadoCola.EN_ATENCION;
    cola.estado = EstadoCola.AUSENTE;
    cola.hora_fin_atencion = new Date();
    await this.colaRepo.save(cola);

    if (estabaEnAtencion) {
      return this.llamarSiguiente(ventanaId);
    }

    const estado = await this.reconstruirEstadoCola(ventanaId);
    await this.guardarEstadoColaCache(ventanaId, estado);
    this.gateway.emitirPeriodo(ventana.periodo, "cola_actualizada", estado);
    return estado;
  }

  async completarVentana(ventanaId: string) {
    const ventana = await this.obtenerVentana(ventanaId);
    ventana.estado = EstadoVentanaAtencion.COMPLETADA;
    await this.ventanaRepo.save(ventana);

    const cola = await this.colaRepo.find({
      where: { ventana_id: ventanaId },
      relations: ["docente"],
      order: { orden: "ASC" },
    });

    const atendidos = cola.filter((c) => c.estado === EstadoCola.COMPLETADO);
    const ausentes = cola.filter((c) => c.estado === EstadoCola.AUSENTE);
    const noShow = cola.filter((c) => c.estado === EstadoCola.ESPERANDO);
    const pendientes = [...ausentes, ...noShow];

    const estado = await this.reconstruirEstadoCola(ventanaId);
    await this.guardarEstadoColaCache(ventanaId, estado);
    this.gateway.emitirPeriodo(ventana.periodo, "cola_actualizada", estado);

    // No se crea nueva ventana automáticamente
    // El usuario deberá crearla manualmente si es necesario

    return {
      ventana_id: ventanaId,
      total_docentes: cola.length,
      atendidos: atendidos.map((c) => ({
        id: c.docente_id,
        nombre: `${c.docente.apellidos}, ${c.docente.nombres}`,
      })),
      ausentes: ausentes.map((c) => ({
        id: c.docente_id,
        nombre: `${c.docente.apellidos}, ${c.docente.nombres}`,
      })),
      no_show: noShow.map((c) => ({
        id: c.docente_id,
        nombre: `${c.docente.apellidos}, ${c.docente.nombres}`,
      })),
      horarios_confirmados: atendidos.length,
      nueva_ventana: null,
    };
  }

  async getEstadoCola(ventanaId: string) {
    const cacheKey = this.crearClaveCola(ventanaId);
    const cacheado = await this.cacheManager.get<Record<string, unknown>>(cacheKey);
    if (cacheado) {
      return cacheado;
    }

    const estado = await this.reconstruirEstadoCola(ventanaId);
    await this.guardarEstadoColaCache(ventanaId, estado);
    return estado;
  }

  async reprogramarPendientes(ventanaId: string): Promise<VentanaAtencion> {
    const ventana = await this.obtenerVentana(ventanaId);
    const pendientes = await this.colaRepo.find({
      where: [
        { ventana_id: ventanaId, estado: EstadoCola.AUSENTE },
        { ventana_id: ventanaId, estado: EstadoCola.ESPERANDO },
      ],
      relations: ["docente"],
      order: { orden: "ASC" },
    });

    const nuevaVentana = await this.ventanaRepo.save(
      this.ventanaRepo.create({
        periodo: ventana.periodo,
        fecha: this.siguienteDiaHabil(this.normalizarFecha(new Date(ventana.fecha))),
        categoria: ventana.categoria,
        modalidad: ventana.modalidad,
        hora_inicio: ventana.hora_inicio,
        hora_fin: ventana.hora_fin,
        intervalo_minutos: ventana.intervalo_minutos,
        estado: EstadoVentanaAtencion.PROGRAMADA,
      }),
    );

    if (pendientes.length > 0) {
      const nuevasColas = pendientes.map((pendiente, index) =>
        this.colaRepo.create({
          ventana_id: nuevaVentana.id,
          docente_id: pendiente.docente_id,
          orden: index + 1,
          estado: EstadoCola.ESPERANDO,
          ventana: nuevaVentana,
          docente: pendiente.docente,
        }),
      );
      await this.colaRepo.save(nuevasColas);
    }

    return nuevaVentana;
  }

  private async reconstruirEstadoCola(ventanaId: string) {
    const cola = await this.colaRepo.find({
      where: { ventana_id: ventanaId },
      relations: ["docente"],
      order: { orden: "ASC" },
    });

    return {
      en_atencion: cola.find((item) => item.estado === EstadoCola.EN_ATENCION) ?? null,
      esperando: cola.filter((item) => item.estado === EstadoCola.ESPERANDO),
      completados: cola.filter((item) => item.estado === EstadoCola.COMPLETADO).length,
      ausentes: cola.filter((item) => item.estado === EstadoCola.AUSENTE).length,
    };
  }

  private async guardarEstadoColaCache(ventanaId: string, estado: Record<string, unknown>): Promise<void> {
    await this.cacheManager.set(this.crearClaveCola(ventanaId), estado, VentanasService.TTL_COLA_SEGUNDOS);
  }

  private crearClaveCola(ventanaId: string): string {
    return `cola_ventana_${ventanaId}`;
  }

  private async buscarDocentesPorCategoria(
    categoria: string,
    modalidad?: string,
    periodo?: string,
  ): Promise<Docente[]> {
    const qb = this.docenteRepo
      .createQueryBuilder("docente")
      .where("docente.activo = :activo", { activo: true })
      .andWhere("docente.categoria = :categoria", { categoria });

    if (modalidad) {
      qb.andWhere("docente.tipo_contrato = :modalidad", { modalidad });
    }

    // Ordenar por prioridad: categoría DESC (mayor prioridad primero), tipo_contrato DESC, fecha_ingreso ASC
    return qb
      .addOrderBy("docente.categoria", "DESC")
      .addOrderBy("docente.tipo_contrato", "DESC")
      .addOrderBy("docente.fecha_ingreso", "ASC")
      .getMany();
  }

  private normalizarFecha(fecha: Date): Date {
    const value = new Date(fecha);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private siguienteDiaHabil(fecha: Date): Date {
    const siguiente = new Date(fecha);
    do {
      siguiente.setDate(siguiente.getDate() + 1);
    } while ([0, 6].includes(siguiente.getDay()));
    return siguiente;
  }

  private sumarMinutos(horaInicio: string, minutos: number): string {
    const [hora, minuto] = horaInicio.split(":").map(Number);
    const total = (hora || 0) * 60 + (minuto || 0) + minutos;
    const horas = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const minutosResultado = (total % 60).toString().padStart(2, "0");
    return `${horas}:${minutosResultado}`;
  }
}
