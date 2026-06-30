import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OfertaAcademica } from "../../entities/oferta-academica.entity";
import { CursoPlanEstudios } from "../../entities/curso-plan-estudios.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { CreateOfertaAcademicaDto } from "./dto/create-oferta-academica.dto";
import { UpdateOfertaAcademicaDto } from "./dto/update-oferta-academica.dto";
import { QueryOfertaAcademicaDto } from "./dto/query-oferta-academica.dto";
import { TipoClase } from "../../common/enums/tipo-clase.enum";

@Injectable()
export class OfertaAcademicaService {
  constructor(
    @InjectRepository(OfertaAcademica)
    private readonly ofertaRepo: Repository<OfertaAcademica>,
    @InjectRepository(CursoPlanEstudios)
    private readonly cursoPlanRepo: Repository<CursoPlanEstudios>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
  ) {}

  async findAll(query: QueryOfertaAcademicaDto) {
    const qb = this.ofertaRepo
      .createQueryBuilder("o")
      .leftJoinAndSelect("o.curso_plan", "curso_plan")
      .leftJoinAndSelect("curso_plan.curso", "curso")
      .leftJoinAndSelect("o.periodo", "periodo");

    if (query.periodo_id) {
      qb.andWhere("o.periodo_id = :periodoId", { periodoId: query.periodo_id });
    }
    if (query.plan_id) {
      qb.andWhere("curso_plan.plan_estudios_id = :planId", { planId: query.plan_id });
    }
    if (query.ciclo) {
      qb.andWhere("curso_plan.ciclo = :ciclo", { ciclo: query.ciclo });
    }
    if (query.activo !== undefined) {
      qb.andWhere("o.activo = :activo", { activo: query.activo === "true" });
    }

    qb.orderBy("curso_plan.ciclo", "ASC")
      .addOrderBy("curso.codigo", "ASC")
      .addOrderBy("o.tipo_clase", "ASC");

    return qb.getMany();
  }

  async findOne(id: number) {
    const oferta = await this.ofertaRepo.findOne({
      where: { id },
      relations: ["curso_plan", "curso_plan.curso", "periodo"],
    });
    if (!oferta) {
      throw new NotFoundException(`Oferta académica #${id} no encontrada`);
    }
    return oferta;
  }

  async create(dto: CreateOfertaAcademicaDto) {
    const cursoPlan = await this.cursoPlanRepo.findOne({
      where: { id: dto.curso_plan_id },
      relations: ["curso", "plan_estudios"],
    });
    if (!cursoPlan) {
      throw new NotFoundException(`Curso en plan #${dto.curso_plan_id} no encontrado`);
    }

    const periodo = await this.periodoRepo.findOne({
      where: { id: dto.periodo_id },
    });
    if (!periodo) {
      throw new NotFoundException(`Período #${dto.periodo_id} no encontrado`);
    }

    const planHoras = this.getHorasPorTipo(cursoPlan, dto.tipo_clase);
    if (planHoras <= 0) {
      throw new BadRequestException(
        `El tipo ${dto.tipo_clase} no tiene horas definidas en el plan para este curso`,
      );
    }

    const oferta = this.ofertaRepo.create({
      ...dto,
      secciones: dto.secciones ?? 1,
    });
    return this.ofertaRepo.save(oferta);
  }

  async update(id: number, dto: UpdateOfertaAcademicaDto) {
    const oferta = await this.findOne(id);
    if (dto.tipo_clase && dto.curso_plan_id) {
      const cursoPlan = await this.cursoPlanRepo.findOne({
        where: { id: dto.curso_plan_id },
      });
      if (cursoPlan) {
        const planHoras = this.getHorasPorTipo(cursoPlan, dto.tipo_clase);
        if (planHoras <= 0) {
          throw new BadRequestException(
            `El tipo ${dto.tipo_clase} no tiene horas definidas en el plan para este curso`,
          );
        }
      }
    }
    Object.assign(oferta, dto);
    return this.ofertaRepo.save(oferta);
  }

  async remove(id: number) {
    const oferta = await this.findOne(id);
    return this.ofertaRepo.remove(oferta);
  }

  async generarDesdePlan(periodoId: number, planId: number): Promise<OfertaAcademica[]> {
    const periodo = await this.periodoRepo.findOne({ where: { id: periodoId } });
    if (!periodo) {
      throw new NotFoundException(`Período #${periodoId} no encontrado`);
    }

    const cursosPlan = await this.cursoPlanRepo.find({
      where: { plan_estudios_id: planId, estado: "ACTIVO" },
      relations: ["curso"],
    });

    const creadas: OfertaAcademica[] = [];
    for (const cp of cursosPlan) {
      for (const tipo of [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO]) {
        const horas = this.getHorasPorTipo(cp, tipo);
        if (horas <= 0) continue;

        const existente = await this.ofertaRepo.findOne({
          where: {
            periodo_id: periodoId,
            curso_plan_id: cp.id,
            tipo_clase: tipo,
          },
        });
        if (existente) continue;

        const oferta = this.ofertaRepo.create({
          periodo_id: periodoId,
          curso_plan_id: cp.id,
          tipo_clase: tipo,
          secciones: 1,
          activo: true,
        });
        creadas.push(await this.ofertaRepo.save(oferta));
      }
    }

    return creadas;
  }

  async toggleActivo(id: number): Promise<OfertaAcademica> {
    const oferta = await this.findOne(id);
    oferta.activo = !oferta.activo;
    return this.ofertaRepo.save(oferta);
  }

  async findDisponibles(periodoId: number): Promise<OfertaAcademica[]> {
    return this.ofertaRepo.find({
      where: { periodo_id: periodoId, activo: true },
      relations: ["curso_plan", "curso_plan.curso"],
      order: { curso_plan: { ciclo: "ASC" } },
    });
  }

  private getHorasPorTipo(cursoPlan: CursoPlanEstudios, tipo: TipoClase): number {
    switch (tipo) {
      case TipoClase.TEORIA: return cursoPlan.horas_teoria;
      case TipoClase.PRACTICA: return cursoPlan.horas_practica;
      case TipoClase.LABORATORIO: return cursoPlan.horas_laboratorio;
    }
  }
}
