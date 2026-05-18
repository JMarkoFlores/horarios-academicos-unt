import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Cache } from "cache-manager";
import { Repository } from "typeorm";
import { CategoriaDocente } from "../../common/enums/categoria-docente.enum";
import { TipoContrato } from "../../common/enums/tipo-contrato.enum";
import { ColaDocente, EstadoCola } from "../../entities/cola-docentes.entity";
import {
  EstadoVentanaAtencion,
  VentanaAtencion,
} from "../../entities/ventana-atencion.entity";
import { Docente } from "../../entities/docente.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { HorariosGateway } from "../../horarios/horarios.gateway";
import { CreateVentanaDto } from "./dto/create-ventana.dto";
import {
  ConfiguracionVentanaCategoriaDto,
  ConfigurarVentanasPeriodoDto,
} from "./dto/configurar-ventanas-periodo.dto";

@Injectable()
export class VentanasService {
  private static readonly TTL_COLA_SEGUNDOS = 12 * 60 * 60;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(VentanaAtencion)
    private readonly ventanaRepo: Repository<VentanaAtencion>,
    @InjectRepository(ColaDocente)
    private readonly colaRepo: Repository<ColaDocente>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    private readonly gateway: HorariosGateway,
  ) {}

  async crearVentana(dto: CreateVentanaDto): Promise<VentanaAtencion> {
    const ventana = this.ventanaRepo.create({
      periodo: dto.periodo,
      fecha: new Date(dto.fecha),
      categoria: dto.categoria,
      modalidad: dto.modalidad ?? null,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      intervalo_minutos: dto.intervalo_minutos ?? 30,
      estado: EstadoVentanaAtencion.PROGRAMADA,
    });

    return this.ventanaRepo.save(ventana);
  }

  async configurarVentanasPeriodo(
    idPeriodo: number,
    fechaInicio: string,
    config: ConfiguracionVentanaCategoriaDto[],
  ): Promise<VentanaAtencion[]> {
    const periodo = await this.periodoRepo.findOne({
      where: { id: idPeriodo },
    });
    if (!periodo) {
      throw new NotFoundException(`Periodo ${idPeriodo} no encontrado`);
    }

    const configuracionesOrdenadas = [...config].sort(
      (a, b) =>
        this.obtenerOrdenJerarquia(a.categoria, a.modalidad) -
        this.obtenerOrdenJerarquia(b.categoria, b.modalidad),
    );

    const ventanas: VentanaAtencion[] = [];
    let fechaActual = this.normalizarFecha(new Date(fechaInicio));

    for (const item of configuracionesOrdenadas) {
      const docentes = await this.buscarDocentesPorCategoria(
        item.categoria,
        item.modalidad,
      );
      const intervalo = item.intervalo_minutos ?? 30;
      const minutosDuracion = docentes.length * intervalo;
      const horaFin = this.sumarMinutos(item.hora_inicio, minutosDuracion);

      const ventana = this.ventanaRepo.create({
        periodo: periodo.codigo,
        fecha: new Date(fechaActual),
        categoria: item.categoria,
        modalidad: item.modalidad ?? null,
        hora_inicio: item.hora_inicio,
        hora_fin: horaFin,
        intervalo_minutos: intervalo,
        estado: EstadoVentanaAtencion.PROGRAMADA,
      });

      ventanas.push(await this.ventanaRepo.save(ventana));
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
      throw new NotFoundException(
        `Docente ${docenteId} no encontrado en la ventana ${ventanaId}`,
      );
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

    const pendientes = await this.colaRepo.find({
      where: [
        { ventana_id: ventanaId, estado: EstadoCola.AUSENTE },
        { ventana_id: ventanaId, estado: EstadoCola.ESPERANDO },
      ],
      relations: ["docente"],
      order: { orden: "ASC" },
    });

    const estado = await this.reconstruirEstadoCola(ventanaId);
    await this.guardarEstadoColaCache(ventanaId, estado);

    return pendientes;
  }

  async getEstadoCola(ventanaId: string) {
    const cacheKey = this.crearClaveCola(ventanaId);
    const cacheado =
      await this.cacheManager.get<Record<string, unknown>>(cacheKey);
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
        fecha: this.siguienteDiaHabil(
          this.normalizarFecha(new Date(ventana.fecha)),
        ),
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
          hora_llamada: null,
          hora_fin_atencion: null,
          ventana: nuevaVentana,
          docente: pendiente.docente,
        }),
      );
      await this.colaRepo.save(nuevasColas);
    }

    return nuevaVentana;
  }

  private async obtenerVentana(ventanaId: string): Promise<VentanaAtencion> {
    const ventana = await this.ventanaRepo.findOne({
      where: { id: ventanaId },
    });
    if (!ventana) {
      throw new NotFoundException(`Ventana ${ventanaId} no encontrada`);
    }

    return ventana;
  }

  private async reconstruirEstadoCola(ventanaId: string) {
    const cola = await this.colaRepo.find({
      where: { ventana_id: ventanaId },
      relations: ["docente"],
      order: { orden: "ASC" },
    });

    return {
      en_atencion:
        cola.find((item) => item.estado === EstadoCola.EN_ATENCION) ?? null,
      esperando: cola.filter((item) => item.estado === EstadoCola.ESPERANDO),
      completados: cola.filter((item) => item.estado === EstadoCola.COMPLETADO)
        .length,
      ausentes: cola.filter((item) => item.estado === EstadoCola.AUSENTE)
        .length,
    };
  }

  private async guardarEstadoColaCache(
    ventanaId: string,
    estado: Record<string, unknown>,
  ): Promise<void> {
    await this.cacheManager.set(
      this.crearClaveCola(ventanaId),
      estado,
      VentanasService.TTL_COLA_SEGUNDOS,
    );
  }

  private crearClaveCola(ventanaId: string): string {
    return `cola_ventana_${ventanaId}`;
  }

  private async buscarDocentesPorCategoria(
    categoria: string,
    modalidad?: string,
  ): Promise<Docente[]> {
    const qb = this.docenteRepo
      .createQueryBuilder("docente")
      .where("docente.activo = :activo", { activo: true })
      .andWhere("docente.categoria = :categoria", { categoria });

    if (modalidad) {
      qb.andWhere("docente.tipo_contrato = :modalidad", { modalidad });
    }

    qb.addSelect(
      `CASE
        WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'PRINCIPAL' THEN 1
        WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'ASOCIADO' THEN 2
        WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'AUXILIAR' THEN 3
        WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'JEFE_PRACTICA' THEN 4
        WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'PRINCIPAL' THEN 5
        WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'ASOCIADO' THEN 6
        WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'AUXILIAR' THEN 7
        WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'JEFE_PRACTICA' THEN 8
        ELSE 9
      END`,
      "orden_jerarquia",
    );

    return qb
      .orderBy("orden_jerarquia", "ASC")
      .addOrderBy("docente.fecha_ingreso", "ASC")
      .getMany();
  }

  private obtenerOrdenJerarquia(categoria: string, modalidad?: string): number {
    const categoriaEnum = categoria as CategoriaDocente;
    const modalidadEnum = modalidad as TipoContrato | undefined;
    const clave = `${modalidadEnum ?? "CONTRATADO"}_${categoriaEnum}`;
    const orden = new Map<string, number>([
      [`${TipoContrato.NOMBRADO}_${CategoriaDocente.PRINCIPAL}`, 1],
      [`${TipoContrato.NOMBRADO}_${CategoriaDocente.ASOCIADO}`, 2],
      [`${TipoContrato.NOMBRADO}_${CategoriaDocente.AUXILIAR}`, 3],
      [`${TipoContrato.NOMBRADO}_${CategoriaDocente.JEFE_PRACTICA}`, 4],
      [`${TipoContrato.CONTRATADO}_${CategoriaDocente.PRINCIPAL}`, 5],
      [`${TipoContrato.CONTRATADO}_${CategoriaDocente.ASOCIADO}`, 6],
      [`${TipoContrato.CONTRATADO}_${CategoriaDocente.AUXILIAR}`, 7],
      [`${TipoContrato.CONTRATADO}_${CategoriaDocente.JEFE_PRACTICA}`, 8],
    ]);
    return orden.get(clave) ?? 9;
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
}
