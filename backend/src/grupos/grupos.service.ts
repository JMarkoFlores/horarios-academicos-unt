import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Grupo } from "../entities/grupo.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Curso } from "../entities/curso.entity";
import { CreateGrupoDto } from "./dto/create-grupo.dto";
import { UpdateGrupoDto } from "./dto/update-grupo.dto";
import { QueryGrupoDto } from "./dto/query-grupo.dto";

@Injectable()
export class GruposService {
  constructor(
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
  ) {}

  async findAll(query: QueryGrupoDto) {
    const qb = this.grupoRepo
      .createQueryBuilder("grupo")
      .leftJoinAndSelect("grupo.periodo_academico", "periodo")
      .leftJoinAndSelect("grupo.curso", "curso");

    if (query.periodo) {
      qb.andWhere("periodo.codigo = :periodo", { periodo: query.periodo });
    }

    if (query.curso_id) {
      qb.andWhere("curso.id = :curso_id", { curso_id: query.curso_id });
    }

    return qb
      .orderBy("grupo.ciclo", "ASC")
      .addOrderBy("grupo.codigo", "ASC")
      .getMany();
  }

  async findOne(id: number): Promise<Grupo> {
    const grupo = await this.grupoRepo.findOne({
      where: { id },
      relations: ["periodo_academico", "curso"],
    });

    if (!grupo) {
      throw new NotFoundException(`Grupo con ID ${id} no encontrado`);
    }

    return grupo;
  }

  async create(dto: CreateGrupoDto): Promise<Grupo> {
    const periodo = await this.periodoRepo.findOne({
      where: { id: dto.periodo_academico_id },
    });
    if (!periodo) {
      throw new NotFoundException(
        `Período académico con ID ${dto.periodo_academico_id} no encontrado`,
      );
    }

    const curso = await this.cursoRepo.findOne({ where: { id: dto.curso_id } });
    if (!curso) {
      throw new NotFoundException(`Curso con ID ${dto.curso_id} no encontrado`);
    }

    const existe = await this.grupoRepo
      .createQueryBuilder("grupo")
      .leftJoin("grupo.periodo_academico", "periodo")
      .leftJoin("grupo.curso", "curso")
      .where("grupo.codigo = :codigo", { codigo: dto.codigo })
      .andWhere("periodo.id = :periodoId", {
        periodoId: dto.periodo_academico_id,
      })
      .andWhere("curso.id = :cursoId", { cursoId: dto.curso_id })
      .getOne();

    if (existe) {
      throw new ConflictException(
        `Ya existe un grupo con código '${dto.codigo}' para este curso y período`,
      );
    }

    const grupo = this.grupoRepo.create({
      codigo: dto.codigo,
      nombre: dto.nombre,
      ciclo: dto.ciclo,
      cupo_maximo: dto.cupo_maximo,
      periodo_academico: periodo,
      curso: curso,
    });

    return this.grupoRepo.save(grupo);
  }

  async update(id: number, dto: UpdateGrupoDto): Promise<Grupo> {
    const grupo = await this.findOne(id);

    if (dto.periodo_academico_id) {
      const periodo = await this.periodoRepo.findOne({
        where: { id: dto.periodo_academico_id },
      });
      if (!periodo) {
        throw new NotFoundException(
          `Período académico con ID ${dto.periodo_academico_id} no encontrado`,
        );
      }
      grupo.periodo_academico = periodo;
    }

    if (dto.curso_id) {
      const curso = await this.cursoRepo.findOne({
        where: { id: dto.curso_id },
      });
      if (!curso) {
        throw new NotFoundException(
          `Curso con ID ${dto.curso_id} no encontrado`,
        );
      }
      grupo.curso = curso;
    }

    const { periodo_academico_id: _p, curso_id: _c, ...rest } = dto;
    const actualizado = this.grupoRepo.merge(grupo, rest);
    return this.grupoRepo.save(actualizado);
  }

  async remove(id: number): Promise<void> {
    const grupo = await this.findOne(id);
    await this.grupoRepo.remove(grupo);
  }
}
