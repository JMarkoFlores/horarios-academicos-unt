import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { PlanEstudios } from "../../entities/plan-estudios.entity";
import { CursoPlanEstudios } from "../../entities/curso-plan-estudios.entity";
import { Curso } from "../../entities/curso.entity";
import { CreatePlanEstudiosDto } from "./dto/create-plan-estudios.dto";
import { UpdatePlanEstudiosDto } from "./dto/update-plan-estudios.dto";
import { CreateCursoPlanDto } from "./dto/create-curso-plan.dto";
import { UpdateCursoPlanDto } from "./dto/update-curso-plan.dto";
import { QueryPlanEstudiosDto } from "./dto/query-plan-estudios.dto";

@Injectable()
export class PlanEstudiosService {
  constructor(
    @InjectRepository(PlanEstudios)
    private readonly planRepo: Repository<PlanEstudios>,
    @InjectRepository(CursoPlanEstudios)
    private readonly cursoPlanRepo: Repository<CursoPlanEstudios>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
  ) {}

  // ── Planes ───────────────────────────────────────────────────────────────

  async findAll(query: QueryPlanEstudiosDto) {
    const qb = this.planRepo
      .createQueryBuilder("plan")
      .leftJoinAndSelect("plan.escuela", "escuela");

    if (query.escuela) {
      qb.andWhere("plan.escuela_id = :escuela", { escuela: query.escuela });
    }
    if (query.activo !== undefined) {
      const val = query.activo === "true";
      qb.andWhere("plan.activo = :activo", { activo: val });
    }
    if (query.search) {
      qb.andWhere(
        "(LOWER(plan.nombre) LIKE LOWER(:search) OR LOWER(plan.codigo) LIKE LOWER(:search))",
        { search: `%${query.search}%` },
      );
    }

    return qb
      .orderBy("plan.anio", "DESC")
      .addOrderBy("plan.nombre", "ASC")
      .getMany();
  }

  async findOne(id: number) {
    const plan = await this.planRepo.findOne({
      where: { id },
      relations: [
        "escuela",
        "cursos",
        "cursos.curso",
        "cursos.curso.departamento",
      ],
    });
    if (!plan)
      throw new NotFoundException(`Plan de estudios #${id} no encontrado`);
    return plan;
  }

  async findActivo() {
    const plan = await this.planRepo.findOne({
      where: { activo: true },
      relations: ["escuela"],
    });
    return plan;
  }

  async create(dto: CreatePlanEstudiosDto) {
    const existing = await this.planRepo.findOne({
      where: { codigo: dto.codigo },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un plan con código "${dto.codigo}"`,
      );
    }

    if (dto.activo) {
      await this.desactivarOtrosPlanes(dto.escuela_id);
    }

    const plan = this.planRepo.create(dto);
    return this.planRepo.save(plan);
  }

  async update(id: number, dto: UpdatePlanEstudiosDto) {
    const plan = await this.findOne(id);

    if (dto.codigo && dto.codigo !== plan.codigo) {
      const existing = await this.planRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un plan con código "${dto.codigo}"`,
        );
      }
    }

    if (dto.activo && dto.escuela_id) {
      await this.desactivarOtrosPlanes(dto.escuela_id, id);
    } else if (dto.activo && !dto.escuela_id) {
      await this.desactivarOtrosPlanes(plan.escuela_id, id);
    }

    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async remove(id: number) {
    const plan = await this.planRepo.findOne({
      where: { id },
      relations: ["cursos"],
    });
    if (!plan)
      throw new NotFoundException(`Plan de estudios #${id} no encontrado`);
    if (plan.cursos && plan.cursos.length > 0) {
      throw new BadRequestException(
        "No se puede eliminar un plan que tiene cursos asociados. Desactívelo en su lugar.",
      );
    }
    return this.planRepo.remove(plan);
  }

  async toggleActivo(id: number) {
    const plan = await this.findOne(id);
    if (plan.activo) {
      plan.activo = false;
    } else {
      await this.desactivarOtrosPlanes(plan.escuela_id, id);
      plan.activo = true;
    }
    return this.planRepo.save(plan);
  }

  private async desactivarOtrosPlanes(escuelaId: number, excluirId?: number) {
    const where: any = { escuela_id: escuelaId, activo: true };
    if (excluirId) where.id = excluirId;
    const activos = await this.planRepo.find({ where });
    for (const p of activos) {
      p.activo = false;
      await this.planRepo.save(p);
    }
  }

  // ── Cursos del Plan ──────────────────────────────────────────────────────

  async findCursos(planId: number, ciclo?: number, tipo?: string) {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Plan #${planId} no encontrado`);

    const qb = this.cursoPlanRepo
      .createQueryBuilder("cp")
      .leftJoinAndSelect("cp.curso", "curso")
      .leftJoinAndSelect("curso.departamento", "departamento")
      .where("cp.plan_estudios_id = :planId", { planId });

    if (ciclo) qb.andWhere("cp.ciclo = :ciclo", { ciclo });
    if (tipo) qb.andWhere("cp.tipo_curso = :tipo", { tipo });

    return qb
      .orderBy("cp.ciclo", "ASC")
      .addOrderBy("curso.codigo", "ASC")
      .getMany();
  }

  async addCurso(planId: number, dto: CreateCursoPlanDto) {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Plan #${planId} no encontrado`);

    const curso = await this.cursoRepo.findOne({ where: { id: dto.curso_id } });
    if (!curso)
      throw new NotFoundException(`Curso #${dto.curso_id} no encontrado`);

    const existing = await this.cursoPlanRepo.findOne({
      where: { curso_id: dto.curso_id, plan_estudios_id: planId },
    });
    if (existing) {
      throw new ConflictException("El curso ya está registrado en este plan");
    }

    if (dto.prerequisitos && dto.prerequisitos.length > 0) {
      const cursosValidos = await this.cursoRepo.find({
        where: { id: In(dto.prerequisitos) },
      });
      if (cursosValidos.length !== dto.prerequisitos.length) {
        throw new BadRequestException(
          "Uno o más prerrequisitos no existen en el catálogo de cursos",
        );
      }
      if (dto.prerequisitos.includes(dto.curso_id)) {
        throw new BadRequestException(
          "Un curso no puede ser prerrequisito de sí mismo",
        );
      }
    }

    const totalHoras =
      (dto.horas_teoria || 0) +
      (dto.horas_practica || 0) +
      (dto.horas_laboratorio || 0);
    if (totalHoras <= 0) {
      throw new BadRequestException(
        "La suma de horas (teoría + práctica + laboratorio) debe ser mayor a 0",
      );
    }

    const cp = this.cursoPlanRepo.create({
      ...dto,
      plan_estudios_id: planId,
    });
    return this.cursoPlanRepo.save(cp);
  }

  async updateCurso(
    planId: number,
    cursoPlanId: number,
    dto: UpdateCursoPlanDto,
  ) {
    const cp = await this.cursoPlanRepo.findOne({
      where: { id: cursoPlanId, plan_estudios_id: planId },
      relations: ["curso"],
    });
    if (!cp)
      throw new NotFoundException(
        `Curso en plan #${cursoPlanId} no encontrado`,
      );

    if (dto.prerequisitos && dto.prerequisitos.length > 0) {
      if (dto.prerequisitos.includes(cp.curso_id)) {
        throw new BadRequestException(
          "Un curso no puede ser prerrequisito de sí mismo",
        );
      }
    }

    if (
      dto.horas_teoria !== undefined ||
      dto.horas_practica !== undefined ||
      dto.horas_laboratorio !== undefined
    ) {
      const ht = dto.horas_teoria ?? cp.horas_teoria;
      const hp = dto.horas_practica ?? cp.horas_practica;
      const hl = dto.horas_laboratorio ?? cp.horas_laboratorio;
      if (ht + hp + hl <= 0) {
        throw new BadRequestException("La suma de horas debe ser mayor a 0");
      }
    }

    Object.assign(cp, dto);
    return this.cursoPlanRepo.save(cp);
  }

  async removeCurso(planId: number, cursoPlanId: number) {
    const cp = await this.cursoPlanRepo.findOne({
      where: { id: cursoPlanId, plan_estudios_id: planId },
    });
    if (!cp)
      throw new NotFoundException(
        `Curso en plan #${cursoPlanId} no encontrado`,
      );
    cp.estado = "ELIMINADO";
    return this.cursoPlanRepo.save(cp);
  }

  async toggleCursoEstado(planId: number, cursoPlanId: number) {
    const cp = await this.cursoPlanRepo.findOne({
      where: { id: cursoPlanId, plan_estudios_id: planId },
    });
    if (!cp)
      throw new NotFoundException(
        `Curso en plan #${cursoPlanId} no encontrado`,
      );
    cp.estado = cp.estado === "ACTIVO" ? "DESACTUALIZADO" : "ACTIVO";
    return this.cursoPlanRepo.save(cp);
  }

  async getPrerequisitos(planId: number, cursoPlanId: number) {
    const cp = await this.cursoPlanRepo.findOne({
      where: { id: cursoPlanId, plan_estudios_id: planId },
    });
    if (!cp)
      throw new NotFoundException(
        `Curso en plan #${cursoPlanId} no encontrado`,
      );
    if (!cp.prerequisitos || cp.prerequisitos.length === 0) return [];

    return this.cursoRepo.find({
      where: { id: In(cp.prerequisitos) },
    });
  }
}
