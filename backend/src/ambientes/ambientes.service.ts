import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Ambiente } from "../entities/ambiente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { EstadoAmbiente } from "../common/enums/estado-ambiente.enum";
import { CreateAmbienteDto } from "./dto/create-ambiente.dto";
import { UpdateAmbienteDto } from "./dto/update-ambiente.dto";
import { QueryAmbienteDto } from "./dto/query-ambiente.dto";

@Injectable()
export class AmbientesService {
  constructor(
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
  ) {}

  async findAll(query: QueryAmbienteDto) {
    const { page = 1, limit = 20, tipo, estado, activo, busqueda, pabellon, sede, capacidadMin, capacidadMax } = query;

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

  async findOne(id: number): Promise<Ambiente> {
    const ambiente = await this.ambienteRepo.findOne({
      where: { id },
    });

    if (!ambiente) {
      throw new NotFoundException(`Ambiente con ID ${id} no encontrado`);
    }

    return ambiente;
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

    const diasNombre = [
      "",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
    ];

    return {
      data: horarios.map((h) => ({
        id: h.id,
        dia_semana: h.dia_semana,
        dia_nombre: diasNombre[h.dia_semana] ?? `Día ${h.dia_semana}`,
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
}
