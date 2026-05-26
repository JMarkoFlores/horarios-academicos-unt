import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CursoAmbiente } from "../entities/curso-ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Grupo } from "../entities/grupo.entity";
import { CreateCursoAmbienteDto } from "./dto/create-curso-ambiente.dto";
import { UpdateCursoAmbienteDto } from "./dto/update-curso-ambiente.dto";
import { QueryCursoAmbienteDto } from "./dto/query-curso-ambiente.dto";

@Injectable()
export class CursosAmbienteService {
  constructor(
    @InjectRepository(CursoAmbiente)
    private readonly repo: Repository<CursoAmbiente>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
  ) {}

  async create(dto: CreateCursoAmbienteDto): Promise<CursoAmbiente> {
    const exists = await this.repo.findOne({
      where: {
        cursoId: dto.cursoId,
        ambienteId: dto.ambienteId,
      },
    });
    if (exists) {
      throw new BadRequestException("Ya existe esta relación curso-ambiente");
    }

    await this.validarCompatibilidad(dto.cursoId, dto.ambienteId);

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

    return qb.orderBy("curso.nombre", "ASC").addOrderBy("ambiente.codigo", "ASC").getMany();
  }

  async findOne(cursoId: number, ambienteId: number): Promise<CursoAmbiente> {
    const item = await this.repo.findOne({
      where: { cursoId, ambienteId },
      relations: ["curso", "ambiente"],
    });
    if (!item) throw new NotFoundException(`CursoAmbiente (${cursoId}, ${ambienteId}) no encontrado`);
    return item;
  }

  async update(cursoId: number, ambienteId: number, dto: UpdateCursoAmbienteDto): Promise<CursoAmbiente> {
    const item = await this.findOne(cursoId, ambienteId);
    if (dto.cursoId && dto.ambienteId) {
      const exists = await this.repo.findOne({
        where: {
          cursoId: dto.cursoId,
          ambienteId: dto.ambienteId,
        },
      });
      if (exists && (exists.cursoId !== cursoId || exists.ambienteId !== ambienteId)) {
        throw new BadRequestException("Ya existe esta relación curso-ambiente");
      }
    }

    await this.validarCompatibilidad(
      dto.cursoId ?? item.cursoId,
      dto.ambienteId ?? item.ambienteId,
    );

    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(cursoId: number, ambienteId: number): Promise<void> {
    const item = await this.findOne(cursoId, ambienteId);
    await this.repo.remove(item);
  }

  async validarCompatibilidad(
    cursoId: number,
    ambienteId: number,
  ): Promise<void> {
    const curso = await this.cursoRepo.findOne({ where: { id: cursoId } });
    if (!curso) {
      throw new NotFoundException(`Curso ${cursoId} no encontrado`);
    }

    const ambiente = await this.ambienteRepo.findOne({ where: { id: ambienteId } });
    if (!ambiente) {
      throw new NotFoundException(`Ambiente ${ambienteId} no encontrado`);
    }

    const grupos = await this.grupoRepo.find({
      where: { curso_id: cursoId },
      order: { cupo_maximo: "DESC" },
    });

    if (grupos.length === 0) {
      return;
    }

    const cupoRequerido = grupos[0].cupo_maximo;

    if (ambiente.capacidad < cupoRequerido) {
      throw new BadRequestException(
        `La capacidad del ambiente (${ambiente.capacidad}) es menor al cupo requerido del curso (${cupoRequerido})`,
      );
    }
  }
}
