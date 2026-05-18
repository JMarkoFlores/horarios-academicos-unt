import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { CreatePeriodoDto } from "./dto/create-periodo.dto";
import { UpdatePeriodoDto } from "./dto/update-periodo.dto";
import { QueryPeriodoDto } from "./dto/query-periodo.dto";

@Injectable()
export class PeriodosService {
  constructor(
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
  ) {}

  async findAll(query: QueryPeriodoDto) {
    const { page = 1, limit = 20, activo } = query;

    const qb = this.periodoRepo.createQueryBuilder("periodo");

    if (activo !== undefined) {
      qb.andWhere("periodo.activo = :activo", { activo });
    }

    const [items, total] = await qb
      .orderBy("periodo.fecha_inicio", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findAllSinPaginar() {
    return this.periodoRepo.find({
      order: { fecha_inicio: "DESC" },
    });
  }

  async findOne(id: number) {
    const item = await this.periodoRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException("Periodo académico no encontrado");
    return item;
  }

  async create(dto: CreatePeriodoDto) {
    if (new Date(dto.fecha_inicio) >= new Date(dto.fecha_fin)) {
      throw new BadRequestException("La fecha de inicio debe ser anterior a la fecha de fin");
    }

    const existe = await this.periodoRepo.findOne({ where: { codigo: dto.codigo } });
    if (existe) {
      throw new ConflictException(`El periodo académico con código ${dto.codigo} ya existe`);
    }

    if (dto.activo) {
      await this.periodoRepo.update({ activo: true }, { activo: false });
    }

    const periodo = this.periodoRepo.create(dto);
    return this.periodoRepo.save(periodo);
  }

  async update(id: number, dto: UpdatePeriodoDto) {
    const periodo = await this.findOne(id);

    const inicio = dto.fecha_inicio ?? periodo.fecha_inicio;
    const fin = dto.fecha_fin ?? periodo.fecha_fin;
    if (new Date(inicio) >= new Date(fin)) {
      throw new BadRequestException("La fecha de inicio debe ser anterior a la fecha de fin");
    }

    if (dto.codigo && dto.codigo !== periodo.codigo) {
      const existe = await this.periodoRepo.findOne({ where: { codigo: dto.codigo } });
      if (existe) {
        throw new ConflictException(`El periodo académico con código ${dto.codigo} ya existe`);
      }
    }

    if (dto.activo && !periodo.activo) {
      await this.periodoRepo.update({ activo: true }, { activo: false });
    }

    Object.assign(periodo, dto);
    return this.periodoRepo.save(periodo);
  }

  async remove(id: number) {
    const periodo = await this.findOne(id);
    return this.periodoRepo.remove(periodo);
  }
}
