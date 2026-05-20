import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CursoAmbiente } from "../entities/curso-ambiente.entity";
import { CreateCursoAmbienteDto } from "./dto/create-curso-ambiente.dto";
import { UpdateCursoAmbienteDto } from "./dto/update-curso-ambiente.dto";
import { QueryCursoAmbienteDto } from "./dto/query-curso-ambiente.dto";

@Injectable()
export class CursosAmbienteService {
  constructor(
    @InjectRepository(CursoAmbiente)
    private readonly repo: Repository<CursoAmbiente>,
  ) {}

  async create(dto: CreateCursoAmbienteDto): Promise<CursoAmbiente> {
    const exists = await this.repo.findOne({
      where: {
        cursoId: dto.cursoId,
        ambienteId: dto.ambienteId,
        tipo_clase: dto.tipo_clase,
      },
    });
    if (exists) {
      throw new BadRequestException("Ya existe esta relación curso-ambiente-tipo_clase");
    }
    const item = this.repo.create(dto);
    return this.repo.save(item);
  }

  async findAll(query: QueryCursoAmbienteDto): Promise<CursoAmbiente[]> {
    const qb = this.repo.createQueryBuilder("ca")
      .leftJoinAndSelect("ca.curso", "curso")
      .leftJoinAndSelect("ca.ambiente", "ambiente");

    if (query.cursoId) {
      qb.andWhere("ca.cursoId = :cursoId", { cursoId: query.cursoId });
    }
    if (query.ambienteId) {
      qb.andWhere("ca.ambienteId = :ambienteId", { ambienteId: query.ambienteId });
    }
    if (query.tipo_clase) {
      qb.andWhere("ca.tipo_clase = :tipoClase", { tipoClase: query.tipo_clase });
    }

    return qb.orderBy("curso.nombre", "ASC").addOrderBy("ambiente.codigo", "ASC").getMany();
  }

  async findOne(id: number): Promise<CursoAmbiente> {
    const item = await this.repo.findOne({
      where: { id },
      relations: ["curso", "ambiente"],
    });
    if (!item) throw new NotFoundException(`CursoAmbiente ${id} no encontrado`);
    return item;
  }

  async update(id: number, dto: UpdateCursoAmbienteDto): Promise<CursoAmbiente> {
    const item = await this.findOne(id);
    if (dto.cursoId && dto.ambienteId && dto.tipo_clase) {
      const exists = await this.repo.findOne({
        where: {
          cursoId: dto.cursoId,
          ambienteId: dto.ambienteId,
          tipo_clase: dto.tipo_clase,
        },
      });
      if (exists && exists.id !== id) {
        throw new BadRequestException("Ya existe esta relación curso-ambiente-tipo_clase");
      }
    }
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await this.repo.remove(item);
  }
}
