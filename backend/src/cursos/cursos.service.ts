import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, DataSource } from "typeorm";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { PlanEstudios } from "../entities/plan-estudios.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { CreateCursoDto } from "./dto/create-curso.dto";
import { UpdateCursoDto } from "./dto/update-curso.dto";
import { QueryCursoDto } from "./dto/query-curso.dto";

@Injectable()
export class CursosService {
  constructor(
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(PlanEstudios)
    private readonly planRepo: Repository<PlanEstudios>,
    private readonly dataSource: DataSource,
  ) {}

  private async invalidateCache(): Promise<void> {
    try {
      await this.dataSource.queryResultCache?.clear();
    } catch {}
  }

  async findAll(query: QueryCursoDto) {
    const {
      page = 1,
      limit = 20,
      ciclo,
      tiene_laboratorio,
      busqueda,
      sortBy = "ciclo",
      sortDir = "ASC",
      activo,
    } = query;

    // Get active plan to use for tipo_curso
    const activePlan = await this.planRepo.findOne({
      where: { activo: true },
    });

    const allowedSort: Record<string, string> = {
      codigo: "curso.codigo",
      nombre: "curso.nombre",
      creditos: "curso.creditos",
      ciclo: "curso.ciclo",
      horas_teoria: "curso.horas_teoria",
      tipo_curso: "cpe.tipo_curso",
    };
    const orderCol = allowedSort[sortBy] ?? "curso.ciclo";
    const orderDir = sortDir === "DESC" ? "DESC" : "ASC";

    const qb = this.cursoRepo
      .createQueryBuilder("curso")
      .leftJoinAndSelect("curso.ambientes", "ambientes")
      .leftJoinAndSelect("curso.departamento", "departamento");

    // Join to CursoPlanEstudios for active plan if available
    if (activePlan) {
      qb.leftJoinAndSelect(
        "curso.planes_estudio",
        "cpe",
        "cpe.plan_estudios_id = :planId",
        { planId: activePlan.id },
      );
    }

    if (activo !== undefined) {
      qb.where("curso.activo = :activo", { activo });
    } else {
      qb.where("curso.activo = :activo", { activo: true });
    }

    if (ciclo !== undefined) {
      qb.andWhere("curso.ciclo = :ciclo", { ciclo });
    }

    if (tiene_laboratorio !== undefined) {
      qb.andWhere("curso.tiene_laboratorio = :tiene_laboratorio", {
        tiene_laboratorio,
      });
    }

    if (busqueda) {
      qb.andWhere(
        "(LOWER(curso.nombre) LIKE :q OR LOWER(curso.codigo) LIKE :q)",
        { q: `%${busqueda.toLowerCase()}%` },
      );
    }

    // First get all items without pagination so we can sort by tipo_curso priority
    const allItems = await qb.getMany();

    // Define tipo_curso priority: S (ESPECIALIDAD) > OB (OBLIGATORIO_GENERAL) > OP (OBLIGATORIO_PROFESIONAL) > EL (ELECTIVO)
    const tipoCursoPriority: Record<string, number> = {
      ESPECIALIDAD: 1,
      OBLIGATORIO_GENERAL: 2,
      OBLIGATORIO_PROFESIONAL: 3,
      ELECTIVO: 4,
    };

    // Sort the items
    const sortedItems = [...allItems];
    if (sortBy === "tipo_curso") {
      sortedItems.sort((a, b) => {
        // Get tipo_curso from the first (and only, since it's active plan) plan in a.planes_estudio
        const tipoA = a.planes_estudio?.[0]?.tipo_curso;
        const tipoB = b.planes_estudio?.[0]?.tipo_curso;
        const priorityA = tipoCursoPriority[tipoA] || 99;
        const priorityB = tipoCursoPriority[tipoB] || 99;

        if (priorityA !== priorityB) {
          return orderDir === "ASC"
            ? priorityA - priorityB
            : priorityB - priorityA;
        }

        // If same tipo_curso, sort by nombre ASC
        return a.nombre.localeCompare(b.nombre);
      });
    } else {
      // For other sort fields, use the query builder's ordering logic
      // Since we have all items, let's implement the sorting here too
      sortedItems.sort((a, b) => {
        const valA: any = (a as any)[sortBy];
        const valB: any = (b as any)[sortBy];

        // For string fields (like nombre, codigo), use localeCompare
        if (typeof valA === "string" && typeof valB === "string") {
          return orderDir === "ASC"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        // For numeric fields
        if (orderDir === "ASC") {
          return valA - valB;
        } else {
          return valB - valA;
        }
      });
    }

    // Now apply pagination
    const paginatedItems = sortedItems.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      total: allItems.length,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<Curso> {
    const curso = await this.cursoRepo
      .createQueryBuilder("curso")
      .leftJoinAndSelect("curso.ambientes", "ambientes")
      .leftJoinAndSelect("curso.departamento", "departamento")
      .where("curso.id = :id", { id })
      .cache(`curso_${id}_detalle`, 60000)
      .getOne();

    if (!curso) {
      throw new NotFoundException(`Curso con ID ${id} no encontrado`);
    }

    return curso;
  }

  async create(dto: CreateCursoDto): Promise<Curso> {
    if (
      dto.tiene_laboratorio &&
      (!dto.horas_laboratorio || dto.horas_laboratorio < 1)
    ) {
      throw new BadRequestException(
        "Si el curso requiere laboratorio, horas_laboratorio debe ser al menos 1",
      );
    }

    const existe = await this.cursoRepo.findOne({
      where: { codigo: dto.codigo.toUpperCase().trim() },
    });
    if (existe) {
      throw new ConflictException(
        `El código de curso '${dto.codigo}' ya existe`,
      );
    }

    const curso = this.cursoRepo.create({
      ...dto,
      codigo: dto.codigo.toUpperCase().trim(),
      activo: true,
    });
    const saved = await this.cursoRepo.save(curso);
    await this.invalidateCache();
    return saved;
  }

  async update(id: number, dto: UpdateCursoDto): Promise<Curso> {
    const curso = await this.findOne(id);

    const tieneLab = dto.tiene_laboratorio ?? curso.tiene_laboratorio;
    const horasLab = dto.horas_laboratorio ?? curso.horas_laboratorio ?? 0;
    if (tieneLab && horasLab < 1) {
      throw new BadRequestException(
        "Si el curso requiere laboratorio, horas_laboratorio debe ser al menos 1",
      );
    }

    if (dto.codigo) {
      dto.codigo = dto.codigo.toUpperCase().trim();
      if (dto.codigo !== curso.codigo) {
        const existe = await this.cursoRepo.findOne({
          where: { codigo: dto.codigo },
        });
        if (existe) {
          throw new ConflictException(
            `El código '${dto.codigo}' ya está en uso`,
          );
        }
      }
    }

    const actualizado = this.cursoRepo.merge(curso, dto);
    const saved = await this.cursoRepo.save(actualizado);
    await this.invalidateCache();
    return saved;
  }

  async remove(id: number): Promise<void> {
    const curso = await this.findOne(id);
    await this.cursoRepo.save({ ...curso, activo: false });
    await this.invalidateCache();
  }

  async reactivar(id: number): Promise<Curso> {
    const curso = await this.cursoRepo.findOne({ where: { id } });
    if (!curso) throw new NotFoundException(`Curso con ID ${id} no encontrado`);
    curso.activo = true;
    const saved = await this.cursoRepo.save(curso);
    await this.invalidateCache();
    return saved;
  }

  async asignarAmbientes(
    cursoId: number,
    ambienteIds: number[],
    tipoClase: TipoClase,
  ): Promise<Curso> {
    const tiposRequeridos =
      tipoClase === TipoClase.TEORIA || tipoClase === TipoClase.PRACTICA
        ? [TipoAmbiente.AULA, TipoAmbiente.TALLER]
        : [TipoAmbiente.LABORATORIO];

    const nuevosAmbientes = await this.ambienteRepo.find({
      where: { id: In(ambienteIds), activo: true },
    });

    if (nuevosAmbientes.length !== ambienteIds.length) {
      throw new BadRequestException(
        "Uno o más ambientes no existen o están inactivos",
      );
    }

    const invalidos = nuevosAmbientes.filter(
      (a) => !tiposRequeridos.includes(a.tipo),
    );
    if (invalidos.length > 0) {
      throw new BadRequestException(
        `Para ${tipoClase}, todos los ambientes deben ser de tipo ${tiposRequeridos.join(" o ")}`,
      );
    }

    const curso = await this.cursoRepo
      .createQueryBuilder("curso")
      .leftJoinAndSelect("curso.ambientes", "ambientes")
      .where("curso.id = :cursoId", { cursoId })
      .cache(`curso_${cursoId}_ambientes`, 60000)
      .getOne();

    if (!curso) {
      throw new NotFoundException(`Curso con ID ${cursoId} no encontrado`);
    }

    const ambientesOtroTipo = curso.ambientes.filter(
      (a) => !tiposRequeridos.includes(a.tipo),
    );
    curso.ambientes = [...ambientesOtroTipo, ...nuevosAmbientes];

    return this.cursoRepo.save(curso);
  }

  async getAmbientesCompatibles(cursoId: number, tipoClase: TipoClase) {
    const tiposRequeridos =
      tipoClase === TipoClase.TEORIA || tipoClase === TipoClase.PRACTICA
        ? [TipoAmbiente.AULA, TipoAmbiente.TALLER]
        : [TipoAmbiente.LABORATORIO];

    const curso = await this.cursoRepo
      .createQueryBuilder("curso")
      .leftJoinAndSelect("curso.ambientes", "ambientes")
      .where("curso.id = :cursoId", { cursoId })
      .cache(`curso_${cursoId}_ambientes_compatibles`, 60000)
      .getOne();

    if (!curso) {
      throw new NotFoundException(`Curso con ID ${cursoId} no encontrado`);
    }

    return curso.ambientes.filter((a) => tiposRequeridos.includes(a.tipo));
  }
}
