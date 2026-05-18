import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Docente } from "../entities/docente.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { CreateDocenteDto } from "./dto/create-docente.dto";
import { UpdateDocenteDto } from "./dto/update-docente.dto";
import { QueryDocenteDto } from "./dto/query-docente.dto";
import { AsignarCursosDto } from "./dto/asignar-cursos.dto";
import { TipoClase } from "../common/enums/tipo-clase.enum";

@Injectable()
export class DocentesService {
  constructor(
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(DocenteCurso)
    private readonly docenteCursoRepo: Repository<DocenteCurso>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
  ) {}


  async findAll(query: QueryDocenteDto) {
    const { page = 1, limit = 20, categoria, tipo_contrato, busqueda } = query;

    const qb = this.docenteRepo
      .createQueryBuilder("docente")
      .where("docente.activo = :activo", { activo: true });

    if (categoria) {
      qb.andWhere("docente.categoria = :categoria", { categoria });
    }

    if (tipo_contrato) {
      qb.andWhere("docente.tipo_contrato = :tipo_contrato", { tipo_contrato });
    }

    if (busqueda) {
      qb.andWhere(
        "(docente.nombres ILIKE :busqueda OR docente.apellidos ILIKE :busqueda OR docente.codigo ILIKE :busqueda)",
        { busqueda: `%${busqueda}%` },
      );
    }

    const [items, total] = await qb
      .orderBy("docente.apellidos", "ASC")
      .addOrderBy("docente.nombres", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .cache(
        `docentes_list_${categoria ?? "all"}_${tipo_contrato ?? "all"}_${busqueda ?? "none"}_${page}_${limit}`,
        60000,
      )
      .getManyAndCount();

    return {
      items: items.map((d) => ({
        ...d,
        antiguedad: this.calcularAntiguedad(d.fecha_ingreso),
      })),
      total,
      page,
      limit,
    };
  }

  async findAllParaExportar(filters: {
    categoria?: string;
    tipo_contrato?: string;
    busqueda?: string;
  }) {
    const qb = this.docenteRepo
      .createQueryBuilder("docente")
      .where("docente.activo = :activo", { activo: true });

    if (filters.categoria) {
      qb.andWhere("docente.categoria = :categoria", {
        categoria: filters.categoria,
      });
    }
    if (filters.tipo_contrato) {
      qb.andWhere("docente.tipo_contrato = :tipo_contrato", {
        tipo_contrato: filters.tipo_contrato,
      });
    }
    if (filters.busqueda) {
      qb.andWhere(
        "(docente.nombres ILIKE :busqueda OR docente.apellidos ILIKE :busqueda OR docente.codigo ILIKE :busqueda)",
        { busqueda: `%${filters.busqueda}%` },
      );
    }

    const docentes = await qb
      .orderBy("docente.apellidos", "ASC")
      .addOrderBy("docente.nombres", "ASC")
      .getMany();

    return docentes.map((d) => ({
      ...d,
      antiguedad: this.calcularAntiguedad(d.fecha_ingreso),
    }));
  }

  async findOne(id: number): Promise<Docente> {
    const docente = await this.docenteRepo
      .createQueryBuilder("docente")
      .leftJoinAndSelect("docente.disponibilidades", "disponibilidades")
      .leftJoinAndSelect("docente.horarios", "horarios")
      .leftJoinAndSelect("docente.colas", "colas")
      .where("docente.id = :id", { id })
      .cache(`docente_${id}_detalle`, 60000)
      .getOne();

    if (!docente) {
      throw new NotFoundException(`Docente con ID ${id} no encontrado`);
    }

    return docente;
  }

  async findOrdenadosPorJerarquia(periodo: string) {
    const qb = this.docenteRepo
      .createQueryBuilder("docente")
      .where("docente.activo = :activo", { activo: true })
      .addSelect(
        `CASE
          WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'PRINCIPAL'     THEN 1
          WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'ASOCIADO'      THEN 2
          WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'AUXILIAR'      THEN 3
          WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'JEFE_PRACTICA' THEN 4
          WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'PRINCIPAL'     THEN 5
          WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'ASOCIADO'      THEN 6
          WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'AUXILIAR'      THEN 7
          WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'JEFE_PRACTICA' THEN 8
          ELSE 9
        END`,
        "orden_jerarquia",
      )
      .orderBy("orden_jerarquia", "ASC")
      .addOrderBy("docente.fecha_ingreso", "ASC");

    const docentes = await qb.getMany();

    return docentes.map((d, index) => ({
      posicion: index + 1,
      ...d,
      antiguedad: this.calcularAntiguedad(d.fecha_ingreso),
      periodo,
    }));
  }

  async create(dto: CreateDocenteDto): Promise<Docente> {
    const emailExistente = await this.docenteRepo.findOne({
      where: { email: dto.email },
    });
    if (emailExistente) {
      throw new ConflictException(`El email '${dto.email}' ya está registrado`);
    }

    const codigoExistente = await this.docenteRepo.findOne({
      where: { codigo: dto.codigo },
    });
    if (codigoExistente) {
      throw new ConflictException(
        `El código '${dto.codigo}' ya está registrado`,
      );
    }

    const docente = this.docenteRepo.create({
      ...dto,
      fecha_ingreso: new Date(dto.fecha_ingreso),
      activo: true,
    });

    return this.docenteRepo.save(docente);
  }

  async update(id: number, dto: UpdateDocenteDto): Promise<Docente> {
    const docente = await this.findOne(id);

    if (dto.email && dto.email !== docente.email) {
      const emailExistente = await this.docenteRepo.findOne({
        where: { email: dto.email },
      });
      if (emailExistente) {
        throw new ConflictException(`El email '${dto.email}' ya está en uso`);
      }
    }

    if (dto.codigo && dto.codigo !== docente.codigo) {
      const codigoExistente = await this.docenteRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (codigoExistente) {
        throw new ConflictException(`El código '${dto.codigo}' ya está en uso`);
      }
    }

    const actualizado = this.docenteRepo.merge(docente, {
      ...dto,
      ...(dto.fecha_ingreso && { fecha_ingreso: new Date(dto.fecha_ingreso) }),
    });

    return this.docenteRepo.save(actualizado);
  }

  async remove(id: number): Promise<void> {
    const docente = await this.findOne(id);
    await this.docenteRepo.save({ ...docente, activo: false });
  }

  calcularAntiguedad(fechaIngreso: Date): { anios: number; meses: number } {
    const ahora = new Date();
    const ingreso = new Date(fechaIngreso);
    const diffMs = ahora.getTime() - ingreso.getTime();
    const anios = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    const meses = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44),
    );
    return { anios, meses };
  }

  async asignarCursos(docenteId: number, dto: AsignarCursosDto) {
    await this.findOne(docenteId);

    // Get current assignments in database for this docente
    const currentAssignments = await this.docenteCursoRepo.find({
      where: { docenteId },
    });

    const inputKeys = new Set(
      dto.cursos.map((item) => `${item.cursoId}_${item.tipo_clase}`)
    );

    // 1. Remove assignments in DB that are not in the new payload
    const assignmentsToRemove = currentAssignments.filter(
      (item) => !inputKeys.has(`${item.cursoId}_${item.tipo_clase}`)
    );
    if (assignmentsToRemove.length > 0) {
      await this.docenteCursoRepo.remove(assignmentsToRemove);
    }

    // 2. Add or find assignments from the payload
    const asignaciones: DocenteCurso[] = [];

    for (const item of dto.cursos) {
      const curso = await this.cursoRepo.findOne({ where: { id: item.cursoId, activo: true } });
      if (!curso) {
        throw new NotFoundException(`Curso con ID ${item.cursoId} no encontrado o inactivo`);
      }

      let asignacion = currentAssignments.find(
        (curr) => curr.cursoId === item.cursoId && curr.tipo_clase === item.tipo_clase
      );

      if (!asignacion) {
        asignacion = this.docenteCursoRepo.create({
          docenteId,
          cursoId: item.cursoId,
          tipo_clase: item.tipo_clase,
        });
        await this.docenteCursoRepo.save(asignacion);
      }
      asignaciones.push(asignacion);
    }

    return asignaciones;
  }

  async findCursosHabilitados(docenteId: number, tipoClase?: TipoClase) {
    await this.findOne(docenteId);

    const qb = this.docenteCursoRepo
      .createQueryBuilder("dc")
      .leftJoinAndSelect("dc.curso", "curso")
      .leftJoinAndSelect("curso.ambientes", "ambientes")
      .where("dc.docenteId = :docenteId", { docenteId })
      .andWhere("curso.activo = :activo", { activo: true });

    if (tipoClase) {
      qb.andWhere("dc.tipo_clase = :tipoClase", { tipoClase });
    }

    const items = await qb.orderBy("curso.nombre", "ASC").getMany();

    return items.map((item) => ({
      id: item.id,
      cursoId: item.cursoId,
      tipo_clase: item.tipo_clase,
      curso: item.curso,
    }));
  }

  async removeAsignacion(docenteId: number, cursoId: number, tipoClase: TipoClase): Promise<void> {
    await this.findOne(docenteId);

    const asignacion = await this.docenteCursoRepo.findOne({
      where: {
        docenteId,
        cursoId,
        tipo_clase: tipoClase,
      },
    });

    if (!asignacion) {
      throw new NotFoundException(
        `Asignación no encontrada para el docente ${docenteId}, curso ${cursoId} y tipo de clase ${tipoClase}`,
      );
    }

    await this.docenteCursoRepo.remove(asignacion);
  }

  async findAmbientesAsignados(docenteId: number): Promise<Ambiente[]> {
    await this.findOne(docenteId);

    const docente = await this.docenteRepo
      .createQueryBuilder("docente")
      .leftJoinAndSelect("docente.ambientes", "ambientes")
      .where("docente.id = :docenteId", { docenteId })
      .getOne();

    return docente?.ambientes ?? [];
  }

  async asignarAmbientes(docenteId: number, ambienteIds: number[]): Promise<Ambiente[]> {
    const docente = await this.docenteRepo
      .createQueryBuilder("docente")
      .leftJoinAndSelect("docente.ambientes", "ambientes")
      .where("docente.id = :docenteId", { docenteId })
      .getOne();

    if (!docente) {
      throw new NotFoundException(`Docente con ID ${docenteId} no encontrado`);
    }

    if (!ambienteIds || ambienteIds.length === 0) {
      docente.ambientes = [];
    } else {
      const ambientes = await this.ambienteRepo
        .createQueryBuilder("a")
        .where("a.id IN (:...ids)", { ids: ambienteIds })
        .andWhere("a.activo = :activo", { activo: true })
        .getMany();
      docente.ambientes = ambientes;
    }

    await this.docenteRepo.save(docente);
    return docente.ambientes;
  }
}
