import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Ambiente } from "../entities/ambiente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
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
    const { page = 1, limit = 20, tipo, activo } = query;

    const qb = this.ambienteRepo.createQueryBuilder("ambiente");

    if (tipo !== undefined) {
      qb.andWhere("ambiente.tipo = :tipo", { tipo });
    }

    if (activo !== undefined) {
      qb.andWhere("ambiente.activo = :activo", { activo });
    } else {
      qb.andWhere("ambiente.activo = :activo", { activo: true });
    }

    const [items, total] = await qb
      .orderBy("ambiente.tipo", "ASC")
      .addOrderBy("ambiente.codigo", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`ambientes_list_${tipo ?? 'all'}_${activo ?? 'default'}_${page}_${limit}`, 60000)
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
        `El código de ambiente '${dto.codigo}' ya existe`,
      );
    }

    const ambiente = this.ambienteRepo.create({ ...dto, activo: true });
    return this.ambienteRepo.save(ambiente);
  }

  async update(id: number, dto: UpdateAmbienteDto): Promise<Ambiente> {
    const ambiente = await this.findOne(id);

    if (dto.codigo && dto.codigo !== ambiente.codigo) {
      const existe = await this.ambienteRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existe) {
        throw new ConflictException(`El código '${dto.codigo}' ya está en uso`);
      }
    }

    const actualizado = this.ambienteRepo.merge(ambiente, dto);
    return this.ambienteRepo.save(actualizado);
  }

  async remove(id: number): Promise<void> {
    const ambiente = await this.findOne(id);
    await this.ambienteRepo.save({ ...ambiente, activo: false });
  }

  async getDisponibilidad(ambienteId: number, periodo: string, page = 1, limit = 20) {
    await this.findOne(ambienteId);

    const [horarios, total] = await this.horarioRepo
      .createQueryBuilder('horario')
      .leftJoinAndSelect('horario.docente', 'docente')
      .leftJoinAndSelect('horario.curso', 'curso')
      .leftJoinAndSelect('horario.grupo', 'grupo')
      .leftJoinAndSelect('horario.ambiente', 'ambiente')
      .where('ambiente.id = :ambienteId', { ambienteId })
      .andWhere('horario.periodo_academico = :periodo', { periodo })
      .orderBy('horario.dia_semana', 'ASC')
      .addOrderBy('horario.hora_inicio', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`horarios_periodo_${periodo}_ambiente_${ambienteId}_${page}_${limit}`, 60000)
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
