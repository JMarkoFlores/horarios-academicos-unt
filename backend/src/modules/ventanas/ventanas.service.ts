import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import Redis from "ioredis";
import { DataSource, Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { EstadoHorario } from "../../common/enums/estado-horario.enum";
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
import { GestorSeleccionTemporalService } from "./gestor-seleccion.service";
import { ConfiguracionVentanaCategoriaDto } from "./dto/configurar-ventanas-periodo.dto";
import { CategoriaDocente } from "../../common/enums/categoria-docente.enum";
import { TipoContrato } from "../../common/enums/tipo-contrato.enum";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import { Cache } from "cache-manager";

@Injectable()
export class VentanasService implements OnModuleDestroy {
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

  async obtenerVentana(ventanaId: string): Promise<VentanaAtencion> {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    if (!ventana) throw new NotFoundException(`Ventana ${ventanaId} no encontrada`);
    return ventana;
  }

  async obtenerVentanaActiva() {
    return await this.ventanaRepo.findOne({
      where: { estado: EstadoVentanaAtencion.EN_CURSO },
      order: { fecha: 'ASC' }
    });
  }

  async crearVentana(dto: CreateVentanaDto): Promise<VentanaAtencion> {
    const [year, month, day] = dto.fecha.split("-").map(Number);
    const ventana = this.ventanaRepo.create({
      periodo: dto.periodo,
      fecha: new Date(year, month - 1, day),
      categoria: dto.categoria,
      modalidad: dto.modalidad ?? null,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      intervalo_minutos: dto.intervalo_minutos ?? 30,
      estado: EstadoVentanaAtencion.PROGRAMADA,
    });
    return this.ventanaRepo.save(ventana);
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
      for (const [index, docente] of docentes.entries()) {
        await this.colaRepo.save(this.colaRepo.create({
            ventana_id: savedVentana.id,
            docente_id: docente.id,
            orden: index + 1,
            estado: EstadoCola.ESPERANDO,
            ventana: savedVentana,
            docente
        }));
        
        // Programar notificaciones
        await this.notificacionesService.enviarRecordatorio24h(docente.id, savedVentana.id);
        await this.notificacionesService.enviarRecordatorio15min(docente.id, savedVentana.id);
      }

      fechaActual = this.siguienteDiaHabil(fechaActual);
    }
    return ventanas;
  }

  async iniciarVentana(ventanaId: string) {
    const ventana = await this.obtenerVentana(ventanaId);
    if (ventana.estado === EstadoVentanaAtencion.COMPLETADA) {
      throw new BadRequestException("La ventana ya fue completada.");
    }

    ventana.estado = EstadoVentanaAtencion.EN_CURSO;
    await this.ventanaRepo.save(ventana);

    await this.colaRepo.delete({ ventana_id: ventana.id });

    const docentes = await this.buscarDocentesPorCategoria(
      ventana.categoria,
      ventana.modalidad ?? undefined,
    );

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
    const estado = await this.reconstruirEstadoCola(ventana.id);
    await this.guardarEstadoColaCache(ventana.id, estado);
    this.gateway.emitirPeriodo(ventana.periodo, "cola_actualizada", estado);
    return estado;
  }

  async llamarSiguiente(ventanaId: string) {
    const ventana = await this.obtenerVentana(ventanaId);
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

    // Reprogramar pendientes automáticamente
    let nuevaVentana = null;
    if (pendientes.length > 0) {
      nuevaVentana = await this.reprogramarPendientes(ventanaId);
    }

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
      nueva_ventana: nuevaVentana
        ? { id: nuevaVentana.id, fecha: nuevaVentana.fecha, categoria: nuevaVentana.categoria }
        : null,
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

  private async buscarDocentesPorCategoria(categoria: string, modalidad?: string): Promise<Docente[]> {
    const qb = this.docenteRepo
      .createQueryBuilder("docente")
      .where("docente.activo = :activo", { activo: true })
      .andWhere("docente.categoria = :categoria", { categoria });

    if (modalidad) {
      qb.andWhere("docente.tipo_contrato = :modalidad", { modalidad });
    }

    return qb.orderBy("docente.fecha_ingreso", "ASC").getMany();
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
