import { Injectable, NotFoundException } from "@nestjs/common";
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
    const periodo = this.periodoRepo.create(dto);
    return this.periodoRepo.save(periodo);
  }

  async update(id: number, dto: UpdatePeriodoDto) {
    const periodo = await this.findOne(id);
    Object.assign(periodo, dto);
    return this.periodoRepo.save(periodo);
  }

  async remove(id: number) {
    const periodo = await this.findOne(id);
    return this.periodoRepo.remove(periodo);
  }
}
