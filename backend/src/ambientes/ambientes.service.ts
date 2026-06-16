import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Ambiente } from "../entities/ambiente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { EstadoAmbiente } from "../common/enums/estado-ambiente.enum";
import { CreateAmbienteDto } from "./dto/create-ambiente.dto";
import { UpdateAmbienteDto } from "./dto/update-ambiente.dto";
import { QueryAmbienteDto } from "./dto/query-ambiente.dto";

const DIAS_NOMBRE: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

type DistanciaAmbientesResult = {
  distanciaUnidades: number | null;
  mismoEdificio: boolean;
  alertaTraslado: boolean;
};

type AlertaTrasladoResult = {
  dia: string;
  horaFin: string;
  ambienteOrigen: string;
  ambienteDestino: string;
  distancia: number;
  alerta: boolean;
};

import { FindDisponiblesDto } from "./dto/find-disponibles.dto";

const DIAS_SEMANA_MAP: { [key: string]: number } = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
};

@Injectable()
export class AmbientesService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
  ) {}

  async findDisponibles(query: FindDisponiblesDto): Promise<Ambiente[]> {
    const { tipo, dia, horaInicio, horaFin, periodoId } = query;

    const diaSemana = DIAS_SEMANA_MAP[dia.toLowerCase()];
    if (!diaSemana) {
      throw new BadRequestException(`Día inválido: '${dia}'`);
    }

    const qb = this.ambienteRepo.createQueryBuilder("ambiente");

    // 1. Filtrar por tipo de ambiente
    qb.where("ambiente.tipo = :tipo", { tipo });

    // 2. Subconsulta para encontrar ambientes OCUPADOS
    const subQuery = this.horarioRepo
      .createQueryBuilder("horario")
      .select("horario.ambiente_id")
      .where("horario.dia = :diaSemana", { diaSemana })
      // Un horario se cruza si termina después de que empieza el rango Y empieza antes de que termine el rango
      .andWhere("horario.hora_fin > :horaInicio", { horaInicio })
      .andWhere("horario.hora_inicio < :horaFin", { horaFin });

    // Si se especifica un periodo, la subconsulta también debe filtrarlo
    if (periodoId) {
      const periodo = await this.resolverPeriodoCodigo(periodoId);
      if (periodo) {
        subQuery.andWhere("horario.periodo = :periodo", { periodo });
      }
    }

    // 3. Excluir los ambientes ocupados de la consulta principal
    qb.andWhere(`ambiente.id NOT IN (${subQuery.getQuery()})`);

    // Pasar los parámetros de la subconsulta a la consulta principal
    qb.setParameters(subQuery.getParameters());

    // Ordenar para un resultado consistente
    qb.orderBy("ambiente.codigo", "ASC");

    return qb.getMany();
  }

  async findAll(query: QueryAmbienteDto) {
    const {
      page = 1,
      limit = 20,
      tipo,
      estado,
      activo,
      busqueda,
      pabellon,
      sede,
      capacidadMin,
      capacidadMax,
    } = query;

    const qb = this.ambienteRepo.createQueryBuilder("ambiente");

    if (tipo !== undefined) {
      qb.andWhere("ambiente.tipo = :tipo", { tipo });
    }

    if (estado !== undefined) {
      qb.andWhere("ambiente.estado = :estado", { estado });
    } else if (activo !== undefined) {
      const activoBool = activo === "true";
      qb.andWhere("ambiente.activo = :activo", { activo: activoBool });
    }

    if (busqueda) {
      qb.andWhere(
        "(ambiente.codigo LIKE :q OR ambiente.nombre LIKE :q OR ambiente.pabellon LIKE :q OR ambiente.equipamiento LIKE :q)",
        { q: `%${busqueda}%` },
      );
    }

    if (pabellon) {
      qb.andWhere("ambiente.pabellon = :pabellon", { pabellon });
    }

    if (sede) {
      qb.andWhere("ambiente.sede = :sede", { sede });
    }

    if (capacidadMin !== undefined) {
      qb.andWhere("ambiente.capacidad >= :capacidadMin", { capacidadMin });
    }

    if (capacidadMax !== undefined) {
      qb.andWhere("ambiente.capacidad <= :capacidadMax", { capacidadMax });
    }

    const [items, total] = await qb
      .orderBy("ambiente.tipo", "ASC")
      .addOrderBy("ambiente.codigo", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items,
      total,
      page,
      limit,
    };
  }

  async findMapa() {
    const ambientes = await this.ambienteRepo.find({
      where: { activo: true },
      order: { nombre: "ASC" },
    });

    return ambientes.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      coordX: a.coordX ?? null,
      coordY: a.coordY ?? null,
      edificio: a.edificio ?? null,
      capacidad: a.capacidad,
    }));
  }

  async getDistanciaEntreAmbientes(
    origenId: number,
    destinoId: number,
  ): Promise<DistanciaAmbientesResult> {
    const [origen, destino] = await Promise.all([
      this.findOne(origenId),
      this.findOne(destinoId),
    ]);

    return this.calcularResultadoDistancia(origen, destino);
  }

  async findOne(id: number): Promise<Ambiente> {
    const ambiente = await this.ambienteRepo.findOne({
      where: { id },
    });

    if (!ambiente) {
      throw new NotFoundException(`Ambiente con ID ${id} no encontrado`);
    }

    return ambiente;
  }

  async getAlertasTrasladoDocente(
    docenteId: number,
    periodoId: number,
  ): Promise<AlertaTrasladoResult[]> {
    const periodo = await this.resolverPeriodoCodigo(periodoId);

    if (!periodo) {
      throw new NotFoundException(`Periodo con ID ${periodoId} no encontrado`);
    }

    const horarios = await this.horarioRepo.find({
      where: {
        docente_id: docenteId,
        periodo,
      },
      relations: ["ambiente"],
      order: {
        dia: "ASC",
        hora_inicio: "ASC",
      },
    });

    const alertas: AlertaTrasladoResult[] = [];

    for (let index = 0; index < horarios.length - 1; index += 1) {
      const actual = horarios[index];
      const siguiente = horarios[index + 1];

      if (actual.dia !== siguiente.dia) {
        continue;
      }

      const gapMinutos =
        this.aMinutos(siguiente.hora_inicio) - this.aMinutos(actual.hora_fin);

      if (gapMinutos > 30) {
        continue;
      }

      const resultadoDistancia = this.calcularResultadoDistancia(
        actual.ambiente,
        siguiente.ambiente,
      );

      if (resultadoDistancia.distanciaUnidades === null) {
        continue;
      }

      alertas.push({
        dia: DIAS_NOMBRE[actual.dia] ?? `Día ${actual.dia}`,
        horaFin: actual.hora_fin.substring(0, 5),
        ambienteOrigen: actual.ambiente.nombre,
        ambienteDestino: siguiente.ambiente.nombre,
        distancia: resultadoDistancia.distanciaUnidades,
        alerta: resultadoDistancia.alertaTraslado,
      });
    }

    return alertas;
  }

  async create(dto: CreateAmbienteDto): Promise<Ambiente> {
    const existe = await this.ambienteRepo.findOne({
      where: { codigo: dto.codigo },
    });

    if (existe) {
      throw new ConflictException(
        { field: "codigo", value: dto.codigo },
        `El código de ambiente '${dto.codigo}' ya está registrado. Use un código diferente.`,
      );
    }

    const ambiente = this.ambienteRepo.create({
      ...dto,
      estado: dto.estado ?? EstadoAmbiente.ACTIVO,
    });
    return this.ambienteRepo.save(ambiente);
  }

  async update(id: number, dto: UpdateAmbienteDto): Promise<Ambiente> {
    const ambiente = await this.findOne(id);

    if (dto.codigo && dto.codigo !== ambiente.codigo) {
      const existe = await this.ambienteRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existe) {
        throw new ConflictException(
          { field: "codigo", value: dto.codigo },
          `El código '${dto.codigo}' ya está en uso por otro ambiente`,
        );
      }
    }

    // Warn if reducing capacity below assigned group size (optional future enhancement)
    const actualizado = this.ambienteRepo.merge(ambiente, dto);
    return this.ambienteRepo.save(actualizado);
  }

  async remove(id: number, periodoActual?: string): Promise<void> {
    const ambiente = await this.findOne(id);

    // Check for active assignments before deactivating
    if (periodoActual) {
      const horariosAsignados = await this.horarioRepo.count({
        where: {
          ambiente: { id: ambiente.id },
          periodo: periodoActual,
        },
      });

      if (horariosAsignados > 0) {
        throw new BadRequestException(
          `No se puede desactivar "${ambiente.nombre}" porque tiene ${horariosAsignados} horario(s) asignado(s) en el período ${periodoActual}. Reasigne o elimine los horarios primero.`,
        );
      }
    }

    ambiente.estado = EstadoAmbiente.INACTIVO;
    await this.ambienteRepo.save(ambiente);
  }

  async getDisponibilidad(
    ambienteId: number,
    periodo: string,
    page = 1,
    limit = 20,
  ) {
    await this.findOne(ambienteId);

    if (!periodo || periodo.trim() === "") {
      return { data: [], total: 0, page, limit };
    }

    const [horarios, total] = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .where("ambiente.id = :ambienteId", { ambienteId })
      .andWhere("horario.periodo = :periodo", { periodo })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: horarios.map((h) => ({
        id: h.id,
        dia_semana: h.dia_semana,
        dia_nombre: DIAS_NOMBRE[h.dia_semana] ?? `Día ${h.dia_semana}`,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        tipo_clase: h.tipo_clase,
        estado: h.estado,
        docente: h.docente
          ? `${h.docente.nombres} ${h.docente.apellidos}`
          : null,
        curso: h.curso?.nombre ?? null,
        grupo: h.grupo?.codigo ?? null,
      })),
      total,
      page,
      limit,
    };
  }

  private calcularResultadoDistancia(
    origen: Ambiente,
    destino: Ambiente,
  ): DistanciaAmbientesResult {
    const mismoEdificio =
      this.normalizarEdificio(origen.edificio) ===
      this.normalizarEdificio(destino.edificio);

    if (!this.tieneCoordenadas(origen) || !this.tieneCoordenadas(destino)) {
      return {
        distanciaUnidades: null,
        mismoEdificio,
        alertaTraslado: !mismoEdificio,
      };
    }

    const distanciaUnidades = Math.sqrt(
      (destino.coordX - origen.coordX) ** 2 +
        (destino.coordY - origen.coordY) ** 2,
    );

    return {
      distanciaUnidades,
      mismoEdificio,
      alertaTraslado:
        !mismoEdificio || distanciaUnidades > this.getAlertaDistanciaMax(),
    };
  }

  private tieneCoordenadas(ambiente: Ambiente): boolean {
    return (
      typeof ambiente.coordX === "number" &&
      Number.isFinite(ambiente.coordX) &&
      typeof ambiente.coordY === "number" &&
      Number.isFinite(ambiente.coordY)
    );
  }

  private normalizarEdificio(edificio?: string | null): string | null {
    const valor = edificio?.trim().toLowerCase();
    return valor ? valor : null;
  }

  private getAlertaDistanciaMax(): number {
    const rawValue = this.configService.get<string>("ALERTA_DISTANCIA_MAX");
    const parsedValue = Number(rawValue ?? 50);
    return Number.isFinite(parsedValue) ? parsedValue : 50;
  }

  private async resolverPeriodoCodigo(
    periodoId: number | string,
  ): Promise<string | null> {
    const where =
      typeof periodoId === "number" || /^\d+$/.test(String(periodoId))
        ? { id: Number(periodoId) }
        : { codigo: String(periodoId) };

    const periodo = await this.periodoRepo.findOne({ where });
    return periodo?.codigo ?? null;
  }

  private aMinutos(hora: string): number {
    const [horas, minutos] = hora.split(":").map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  }
}
