import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, DataSource, DeepPartial, Not } from "typeorm";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { PlanEstudios } from "../entities/plan-estudios.entity";
import { CursoPlanEstudios } from "../entities/curso-plan-estudios.entity";
import { CatedraCompartida } from "../entities/catedra-compartida.entity";
import { AsignacionLectiva } from "../entities/asignacion-lectiva.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { TipoCursoPlan } from "../common/enums/tipo-curso-plan.enum";
import { EstadoCursoPlan } from "../common/enums/estado-curso-plan.enum";
import { EstadoAsignacionLectiva } from "../common/enums/estado-asignacion-lectiva.enum";
import { asignarAmbientesPorDefecto } from "../database/asignar-ambientes-por-defecto.helper";
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
    @InjectRepository(CursoPlanEstudios)
    private readonly cursoPlanRepo: Repository<CursoPlanEstudios>,
    @InjectRepository(CatedraCompartida)
    private readonly catedraCompartidaRepo: Repository<CatedraCompartida>,
    @InjectRepository(AsignacionLectiva)
    private readonly asignacionLectivaRepo: Repository<AsignacionLectiva>,
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
      ).leftJoinAndSelect("cpe.plan_estudios", "plan_estudios");
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

    // Add ordering
    qb.orderBy(orderCol, orderDir);

    // Apply pagination at database level
    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Define tipo_curso priority: S (ESPECIALIDAD) > OB (OBLIGATORIO_GENERAL) > OP (OBLIGATORIO_PROFESIONAL) > EL (ELECTIVO)
    const tipoCursoPriority: Record<string, number> = {
      ESPECIALIDAD: 1,
      OBLIGATORIO_GENERAL: 2,
      OBLIGATORIO_PROFESIONAL: 3,
      ELECTIVO: 4,
    };

    // If sorting by tipo_curso, we need to re-sort in memory because it's from a joined table
    let sortedItems = items;
    if (sortBy === "tipo_curso" && activePlan) {
      sortedItems = [...items].sort((a, b) => {
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
    }

    return {
      items: sortedItems,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<Curso> {
    const curso = await this.cursoRepo
      .createQueryBuilder("curso")
      .leftJoinAndSelect("curso.ambientes", "ambientes")
      .leftJoinAndSelect("curso.departamento", "departamento")
      .leftJoinAndSelect("curso.planes_estudio", "planes_estudio")
      .leftJoinAndSelect("planes_estudio.plan_estudios", "plan_estudios")
      .where("curso.id = :id", { id })
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

    // Get active plan
    const activePlan = await this.planRepo.findOne({ where: { activo: true } });

    const { tipo_curso, departamento_id, ...cursoData } = dto;
    const curso = this.cursoRepo.create({
      ...cursoData,
      codigo: dto.codigo.toUpperCase().trim(),
      activo: true,
      departamento_id: departamento_id ?? null,
    });
    const saved = await this.cursoRepo.save(curso);

    // Create CursoPlanEstudios entry if active plan exists
    if (activePlan) {
      // Convert prerequisite codes to IDs
      const prereqIds: number[] = [];
      if (dto.prerequisitos) {
        const codes = dto.prerequisitos
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c);
        for (const code of codes) {
          const prereqCurso = await this.cursoRepo.findOne({
            where: { codigo: code.toUpperCase() },
          });
          if (prereqCurso) {
            prereqIds.push(prereqCurso.id);
          }
        }
      }

      const cpe = this.cursoPlanRepo.create({
        plan_estudios_id: activePlan.id,
        curso_id: saved.id,
        ciclo: dto.ciclo,
        tipo_curso: tipo_curso ?? TipoCursoPlan.OBLIGATORIO_GENERAL,
        horas_teoria: dto.horas_teoria,
        horas_practica: dto.horas_practica ?? 0,
        horas_laboratorio: dto.horas_laboratorio ?? 0,
        creditos: dto.creditos,
        estado: EstadoCursoPlan.ACTIVO,
        prerequisitos: prereqIds,
      } as DeepPartial<CursoPlanEstudios>);
      await this.cursoPlanRepo.save(cpe);
    }

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

    // Get active plan
    const activePlan = await this.planRepo.findOne({ where: { activo: true } });

    const { tipo_curso, departamento_id, ...cursoData } = dto;
    const actualizado = this.cursoRepo.merge(curso, {
      ...cursoData,
      departamento_id: departamento_id ?? curso.departamento_id,
    });
    const saved = await this.cursoRepo.save(actualizado);

    // Update or create CursoPlanEstudios entry
    if (activePlan) {
      let cpe = await this.cursoPlanRepo.findOne({
        where: { plan_estudios_id: activePlan.id, curso_id: saved.id },
      });

      // Convert prerequisite codes to IDs if provided
      let prereqIds: number[] | undefined;
      if (dto.prerequisitos !== undefined) {
        prereqIds = [];
        if (dto.prerequisitos) {
          const codes = dto.prerequisitos
            .split(",")
            .map((c) => c.trim())
            .filter((c) => c);
          for (const code of codes) {
            const prereqCurso = await this.cursoRepo.findOne({
              where: { codigo: code.toUpperCase() },
            });
            if (prereqCurso) {
              prereqIds.push(prereqCurso.id);
            }
          }
        }
      }

      if (cpe) {
        if (tipo_curso) cpe.tipo_curso = tipo_curso;
        if (dto.ciclo) cpe.ciclo = dto.ciclo;
        if (dto.horas_teoria) cpe.horas_teoria = dto.horas_teoria;
        if (dto.horas_practica !== undefined)
          cpe.horas_practica = dto.horas_practica;
        if (dto.horas_laboratorio !== undefined)
          cpe.horas_laboratorio = dto.horas_laboratorio;
        if (dto.creditos) cpe.creditos = dto.creditos;
        if (prereqIds !== undefined) cpe.prerequisitos = prereqIds;
        await this.cursoPlanRepo.save(cpe);
      } else {
        cpe = this.cursoPlanRepo.create({
          plan_estudios_id: activePlan.id,
          curso_id: saved.id,
          ciclo: dto.ciclo ?? curso.ciclo,
          tipo_curso: tipo_curso ?? TipoCursoPlan.OBLIGATORIO_GENERAL,
          horas_teoria: dto.horas_teoria ?? curso.horas_teoria,
          horas_practica: dto.horas_practica ?? curso.horas_practica,
          horas_laboratorio: dto.horas_laboratorio ?? curso.horas_laboratorio,
          creditos: dto.creditos ?? curso.creditos,
          estado: EstadoCursoPlan.ACTIVO,
          prerequisitos: prereqIds ?? [],
        } as DeepPartial<CursoPlanEstudios>);
        await this.cursoPlanRepo.save(cpe);
      }
    }

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
      .getOne();

    if (!curso) {
      throw new NotFoundException(`Curso con ID ${cursoId} no encontrado`);
    }

    return curso.ambientes.filter((a) => tiposRequeridos.includes(a.tipo));
  }

  async diagnosticarAmbientes(cursoId: number, tipoClase?: TipoClase) {
    const curso = await this.cursoRepo.findOne({
      where: { id: cursoId },
      relations: ["ambientes"],
    });

    if (!curso) {
      throw new NotFoundException(`Curso con ID ${cursoId} no encontrado`);
    }

    const ambientesDirectos = curso.ambientes ?? [];

    // Fallback por código: buscar cursos con el mismo código en otros planes
    const cursosSimilares = await this.cursoRepo.find({
      where: { codigo: curso.codigo, activo: true },
      relations: ["ambientes"],
    });

    const idsVistos = new Set<number>();
    const ambientesPorCodigo: Ambiente[] = [];
    for (const c of cursosSimilares) {
      for (const a of c.ambientes ?? []) {
        if (!idsVistos.has(a.id)) {
          idsVistos.add(a.id);
          ambientesPorCodigo.push(a);
        }
      }
    }

    const todosLosAmbientes = [...ambientesDirectos];
    for (const a of ambientesPorCodigo) {
      if (!idsVistos.has(a.id)) {
        idsVistos.add(a.id);
        todosLosAmbientes.push(a);
      }
    }

    let compatibles: Ambiente[] = todosLosAmbientes;
    if (tipoClase) {
      const tiposRequeridos =
        tipoClase === TipoClase.LABORATORIO
          ? [TipoAmbiente.LABORATORIO]
          : [TipoAmbiente.AULA, TipoAmbiente.TALLER];
      compatibles = todosLosAmbientes.filter((a) =>
        tiposRequeridos.includes(a.tipo),
      );
    }

    return {
      curso: {
        id: curso.id,
        codigo: curso.codigo,
        nombre: curso.nombre,
        activo: curso.activo,
      },
      tipoClaseSolicitado: tipoClase ?? null,
      totalAmbientesDirectos: ambientesDirectos.length,
      totalAmbientesPorCodigo: ambientesPorCodigo.length,
      totalAmbientesUnicos: todosLosAmbientes.length,
      totalAmbientesCompatibles: compatibles.length,
      ambientesDirectos: ambientesDirectos.map((a) => ({
        id: a.id,
        codigo: a.codigo,
        nombre: a.nombre,
        tipo: a.tipo,
      })),
      cursosMismoCodigo: cursosSimilares.map((c) => ({
        id: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        ambientes: (c.ambientes ?? []).map((a) => ({
          id: a.id,
          codigo: a.codigo,
          nombre: a.nombre,
          tipo: a.tipo,
        })),
      })),
      ambientesCompatibles: compatibles.map((a) => ({
        id: a.id,
        codigo: a.codigo,
        nombre: a.nombre,
        tipo: a.tipo,
      })),
    };
  }

  async ejecutarAsignacionAmbientesPorDefecto(): Promise<{
    cursosProcesados: number;
    relacionesCreadas: number;
  }> {
    return this.dataSource.transaction(async (manager) => {
      const resultado = await asignarAmbientesPorDefecto(manager);
      await this.invalidateCache();
      return resultado;
    });
  }

  async getCursosPendientesDepartamento(
    departamentoId: number,
    periodoId: number,
  ) {
    // Obtener cursos del departamento
    const cursos = await this.cursoRepo.find({
      where: {
        departamento_id: departamentoId,
        activo: true,
      },
      relations: ["departamento"],
    });

    // Obtener cursos plan activos para este departamento
    const cursosPlan = await this.cursoPlanRepo.find({
      where: {
        estado: EstadoCursoPlan.ACTIVO,
      },
      relations: ["curso", "plan_estudios"],
    });

    const cursosPlanDepto = cursosPlan.filter(
      (cp) => cp.curso.departamento_id === departamentoId,
    );

    // Obtener asignaciones existentes para el periodo
    const asignaciones = await this.asignacionLectivaRepo.find({
      where: {
        periodo_id: periodoId,
        estado: Not(EstadoAsignacionLectiva.RECHAZADO),
      },
    });

    const cursosConAsignacion = new Set(
      asignaciones.map((a) => a.curso_plan_id),
    );

    // Cursos pendientes = cursos plan sin asignación
    const pendientes = cursosPlanDepto
      .filter((cp) => !cursosConAsignacion.has(cp.id))
      .map((cp) => ({
        id: cp.id,
        curso_id: cp.curso.id,
        codigo: cp.curso.codigo,
        nombre: cp.curso.nombre,
        ciclo: cp.ciclo,
        tipo_curso: cp.tipo_curso,
        horas_teoria: cp.horas_teoria,
        horas_practica: cp.horas_practica,
        horas_laboratorio: cp.horas_laboratorio,
        creditos: cp.creditos,
        tiene_laboratorio: cp.curso.tiene_laboratorio,
        departamento: cp.curso.departamento,
      }));

    return pendientes;
  }

  async getCatedraCompartida(cursoId: number) {
    // Buscar curso plan por curso_id
    const cursosPlan = await this.cursoPlanRepo.find({
      where: { curso_id: cursoId },
    });

    const cursoPlanIds = cursosPlan.map((cp) => cp.id);

    // Buscar excepciones de cátedra compartida
    const excepciones = await this.catedraCompartidaRepo.find({
      where: {
        curso_plan_id: In(cursoPlanIds),
        activa: true,
      },
    });

    return {
      tiene_excepcion: excepciones.length > 0,
      excepciones: excepciones.map((ex) => ({
        id: ex.id,
        curso_plan_id: ex.curso_plan_id,
        tipo_clase: ex.tipo_clase,
        motivo_excepcion: ex.motivo_excepcion,
        autorizado_por: ex.autorizado_por,
        fecha_autorizacion: ex.fecha_autorizacion,
        observaciones: ex.observaciones,
        referencia_rcu: ex.referencia_rcu,
      })),
    };
  }
}
