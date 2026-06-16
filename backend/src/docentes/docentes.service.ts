import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Docente } from "../entities/docente.entity";
import { Departamento } from "../entities/departamento.entity";
import { Facultad } from "../entities/facultad.entity";
import { Usuario } from "../entities/usuario.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { CursoAmbiente } from "../entities/curso-ambiente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { Grupo } from "../entities/grupo.entity";
import { CreateDocenteDto } from "./dto/create-docente.dto";
import { UpdateDocenteDto } from "./dto/update-docente.dto";
import { QueryDocenteDto } from "./dto/query-docente.dto";
import { AsignarCursosDto } from "./dto/asignar-cursos.dto";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { TipoDocente } from "../common/enums/tipo-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { ContextoAcademicoService } from "../common/services/contexto-academico.service";
import { ContextoAcademico } from "../common/interfaces/contexto-academico.interface";

type CargaPorDia = {
  lunes: number;
  martes: number;
  miercoles: number;
  jueves: number;
  viernes: number;
  sabado: number;
  totalHoras: number;
  promedioHorasPorDia: number;
};

type DocenteCargaDesequilibrada = {
  docenteId: number;
  nombre: string;
  modalidad: string;
  distribucion: CargaPorDia;
  desequilibrio: number;
};

const DIA_KEYS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
] as const;

@Injectable()
export class DocentesService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Departamento)
    private readonly departamentoRepo: Repository<Departamento>,
    @InjectRepository(Facultad)
    private readonly facultadRepo: Repository<Facultad>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(DocenteCurso)
    private readonly docenteCursoRepo: Repository<DocenteCurso>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(CursoAmbiente)
    private readonly cursoAmbienteRepo: Repository<CursoAmbiente>,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(ParametrosCarga)
    private readonly parametrosCargaRepo: Repository<ParametrosCarga>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly contextoAcademicoService: ContextoAcademicoService,
  ) {}

  async findAll(query: QueryDocenteDto, contexto?: ContextoAcademico) {
    const {
      page = 1,
      limit = 20,
      categoria,
      tipo_docente,
      modalidad,
      busqueda,
      sortBy,
      sortDir,
      activo,
      sin_vinculacion,
    } = query;
    const qb = this.docenteRepo
      .createQueryBuilder("docente")
      .leftJoinAndSelect("docente.departamento", "departamento")
      .leftJoinAndSelect("departamento.escuela", "escuela")
      .leftJoinAndSelect("escuela.facultad", "facultadDesdeDepartamento")
      .leftJoinAndSelect("docente.facultad", "facultad");

    qb.where("1 = 1");

    if (activo === "true") {
      qb.andWhere("docente.activo = true");
    } else if (activo === "false") {
      qb.andWhere("docente.activo = false");
    }

    if (sin_vinculacion === "true") {
      qb.andWhere(
        "(docente.facultad_id IS NULL OR docente.departamento_id IS NULL)",
      );
    } else if (sin_vinculacion === "false") {
      qb.andWhere(
        "(docente.facultad_id IS NOT NULL AND docente.departamento_id IS NOT NULL)",
      );
    }

    if (categoria) {
      qb.andWhere("docente.categoria = :categoria", { categoria });
    }

    if (tipo_docente) {
      qb.andWhere("docente.tipo_docente = :tipo_docente", { tipo_docente });
    }

    if (modalidad) {
      qb.andWhere("docente.modalidad = :modalidad", { modalidad });
    }

    if (busqueda) {
      qb.andWhere(
        "(docente.nombres ILIKE :busqueda OR docente.apellidos ILIKE :busqueda OR docente.codigo ILIKE :busqueda OR docente.email ILIKE :busqueda)",
        { busqueda: `%${busqueda}%` },
      );
    }

    if (contexto) {
      this.contextoAcademicoService.aplicarFiltroDocente(qb, contexto);
    }

    const allowedSortFields: Record<string, string> = {
      apellidos: "docente.apellidos",
      nombres: "docente.nombres",
      categoria: "docente.categoria",
      tipo_docente: "docente.tipo_docente",
      tipo_contrato: "docente.tipo_contrato",
      fecha_ingreso: "docente.fecha_ingreso",
    };
    const sortField = allowedSortFields[sortBy ?? ""] ?? "docente.apellidos";
    const sortDirection = sortDir === "DESC" ? "DESC" : "ASC";

    const [items, total] = await qb
      .orderBy(sortField, sortDirection)
      .addOrderBy("docente.nombres", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
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

  async findAllParaExportar(
    filters: {
      categoria?: string;
      tipo_docente?: string;
      modalidad?: string;
      busqueda?: string;
    },
    contexto?: ContextoAcademico,
  ) {
    const qb = this.docenteRepo
      .createQueryBuilder("docente")
      .leftJoinAndSelect("docente.departamento", "departamento")
      .leftJoinAndSelect("departamento.escuela", "escuela")
      .leftJoinAndSelect("escuela.facultad", "facultadDesdeDepartamento")
      .leftJoinAndSelect("docente.facultad", "facultad")
      .where("docente.activo = :activo", { activo: true });

    if (filters.categoria) {
      qb.andWhere("docente.categoria = :categoria", {
        categoria: filters.categoria,
      });
    }
    if (filters.tipo_docente) {
      qb.andWhere("docente.tipo_docente = :tipo_docente", {
        tipo_docente: filters.tipo_docente,
      });
    }
    if (filters.modalidad) {
      qb.andWhere("docente.modalidad = :modalidad", {
        modalidad: filters.modalidad,
      });
    }
    if (filters.busqueda) {
      qb.andWhere(
        "(docente.nombres ILIKE :busqueda OR docente.apellidos ILIKE :busqueda OR docente.codigo ILIKE :busqueda)",
        { busqueda: `%${filters.busqueda}%` },
      );
    }

    if (contexto) {
      this.contextoAcademicoService.aplicarFiltroDocente(qb, contexto);
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

  async findOne(id: number, contexto?: ContextoAcademico): Promise<Docente> {
    const docente = await this.docenteRepo
      .createQueryBuilder("docente")
      .leftJoinAndSelect("docente.usuario", "usuario")
      .leftJoinAndSelect("docente.departamento", "departamento")
      .leftJoinAndSelect("departamento.escuela", "escuela")
      .leftJoinAndSelect("escuela.facultad", "facultadDesdeDepartamento")
      .leftJoinAndSelect("docente.facultad", "facultad")
      .leftJoinAndSelect("docente.disponibilidades", "disponibilidades")
      .leftJoinAndSelect("docente.horarios", "horarios")
      .leftJoinAndSelect("docente.colas", "colas")
      .where("docente.id = :id", { id })
      .cache(`docente_${id}_detalle`, 60000)
      .getOne();

    if (!docente) {
      throw new NotFoundException(`Docente con ID ${id} no encontrado`);
    }

    if (contexto) {
      this.contextoAcademicoService.assertAccesoDocente(contexto, docente);
    }

    return docente;
  }

  async findOrdenadosPorJerarquia(
    periodo: string,
    contexto?: ContextoAcademico,
  ) {
    const qb = this.docenteRepo
      .createQueryBuilder("docente")
      .where("docente.activo = :activo", { activo: true });

    if (contexto) {
      this.contextoAcademicoService.aplicarFiltroDocente(qb, contexto);
    }

    qb.addSelect(
        `CASE
          WHEN docente.tipo_docente = 'ORDINARIO' AND docente.categoria = 'PRINCIPAL'  THEN 1
          WHEN docente.tipo_docente = 'ORDINARIO' AND docente.categoria = 'ASOCIADO'   THEN 2
          WHEN docente.tipo_docente = 'ORDINARIO' AND docente.categoria = 'AUXILIAR'   THEN 3
          WHEN docente.tipo_docente = 'CONTRATADO'                                     THEN 4
          WHEN docente.tipo_docente = 'JEFE_PRACTICA_CONTRATADO'                       THEN 5
          ELSE 6
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

  async getCargaPorDia(
    docenteId: number,
    periodo: string,
    contexto?: ContextoAcademico,
  ): Promise<CargaPorDia> {
    const docente = await this.findOne(docenteId, contexto);
    void docente;

    const periodoCodigo = await this.resolverPeriodoCodigo(periodo);
    if (!periodoCodigo) {
      throw new NotFoundException(`Periodo ${periodo} no encontrado`);
    }

    const horarios = await this.horarioRepo.find({
      where: {
        docente_id: docenteId,
        periodo: periodoCodigo,
      },
      order: {
        dia: "ASC",
        hora_inicio: "ASC",
      },
    });

    return this.construirCargaPorDia(horarios);
  }

  async getCargaDesequilibrada(
    periodo: string,
    contexto?: ContextoAcademico,
  ): Promise<DocenteCargaDesequilibrada[]> {
    const periodoCodigo = await this.resolverPeriodoCodigo(periodo);
    if (!periodoCodigo) {
      throw new NotFoundException(`Periodo ${periodo} no encontrado`);
    }

    const docentesQb = this.docenteRepo
      .createQueryBuilder("docente")
      .where("docente.activo = :activo", { activo: true })
      .orderBy("docente.apellidos", "ASC")
      .addOrderBy("docente.nombres", "ASC");

    if (contexto) {
      this.contextoAcademicoService.aplicarFiltroDocente(docentesQb, contexto);
    }

    const [docentes, horarios] = await Promise.all([
      docentesQb.getMany(),
      this.horarioRepo.find({
        where: { periodo: periodoCodigo },
        order: {
          docente_id: "ASC",
          dia: "ASC",
          hora_inicio: "ASC",
        },
      }),
    ]);

    const horariosPorDocente = new Map<number, HorarioAsignado[]>();
    for (const horario of horarios) {
      const bucket = horariosPorDocente.get(horario.docente_id) ?? [];
      bucket.push(horario);
      horariosPorDocente.set(horario.docente_id, bucket);
    }

    return docentes
      .map((docente) => {
        const distribucion = this.construirCargaPorDia(
          horariosPorDocente.get(docente.id) ?? [],
        );
        const desequilibrio = this.calcularDesequilibrio(distribucion);

        return {
          docenteId: docente.id,
          nombre: `${docente.nombres} ${docente.apellidos}`,
          modalidad: docente.modalidad,
          distribucion,
          desequilibrio,
        };
      })
      .sort((a, b) => {
        if (b.desequilibrio !== a.desequilibrio) {
          return b.desequilibrio - a.desequilibrio;
        }
        return a.nombre.localeCompare(b.nombre, "es");
      });
  }

  private derivarTipoContrato(tipoDocente: TipoDocente): TipoContrato {
    return tipoDocente === TipoDocente.ORDINARIO
      ? TipoContrato.NOMBRADO
      : TipoContrato.CONTRATADO;
  }

  private normalizarCategoria(
    tipoDocente: TipoDocente,
    categoria: CategoriaDocente,
  ): CategoriaDocente {
    return tipoDocente !== TipoDocente.ORDINARIO
      ? CategoriaDocente.SIN_CATEGORIA
      : categoria;
  }

  private async validarUsuarioAsociado(
    usuarioId: number,
    docenteIdExcluir?: number,
  ): Promise<void> {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado`);
    }

    const docenteExistente = await this.docenteRepo.findOne({
      where: { usuario_id: usuarioId },
    });

    if (docenteExistente && docenteExistente.id !== docenteIdExcluir) {
      throw new ConflictException(
        `El usuario ${usuarioId} ya está asociado a otro docente`,
      );
    }
  }

  private async resolverVinculosInstitucionales(
    facultadId?: number,
    departamentoId?: number,
    facultadActualId: number | null = null,
    departamentoActualId: number | null = null,
  ): Promise<{ facultad_id: number | null; departamento_id: number | null }> {
    let facultad_id = facultadId ?? facultadActualId ?? null;
    const departamento_id = departamentoId ?? departamentoActualId ?? null;

    let facultad: Facultad | null = null;
    let departamento: Departamento | null = null;

    if (departamento_id) {
      departamento = await this.departamentoRepo.findOne({
        where: { id: departamento_id },
        relations: ["escuela", "escuela.facultad"],
      });

      if (!departamento) {
        throw new NotFoundException(
          `Departamento con ID ${departamento_id} no encontrado`,
        );
      }

      if (!facultad_id) {
        facultad_id = departamento.escuela?.facultad?.id ?? null;
      }
    }

    if (facultad_id) {
      facultad = await this.facultadRepo.findOne({
        where: { id: facultad_id },
      });
      if (!facultad) {
        throw new NotFoundException(
          `Facultad con ID ${facultad_id} no encontrada`,
        );
      }
    }

    if (departamento && facultad) {
      const facultadDelDepartamento =
        departamento.escuela?.facultad?.id ?? null;
      if (
        facultadDelDepartamento !== null &&
        facultadDelDepartamento !== facultad.id
      ) {
        throw new BadRequestException(
          "El departamento no pertenece a la facultad indicada",
        );
      }
    }

    return {
      facultad_id: facultad?.id ?? facultad_id ?? null,
      departamento_id: departamento?.id ?? departamento_id ?? null,
    };
  }

  async validarCargaModalidad(
    docenteId: number,
    horasSolicitadas: number,
    modalidad: string,
  ): Promise<void> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) {
      throw new NotFoundException(`Docente con ID ${docenteId} no encontrado`);
    }

    const parametros = await this.parametrosCargaRepo
      .createQueryBuilder("p")
      .where("p.modalidad = :modalidad", { modalidad })
      .andWhere("(p.tipo_docente = :tipo OR p.tipo_docente = '')", {
        tipo: docente.tipo_docente ?? "",
      })
      .andWhere("(p.categoria = :cat OR p.categoria = '')", {
        cat: docente.categoria ?? "",
      })
      .orderBy("p.tipo_docente", "DESC")
      .addOrderBy("p.categoria", "DESC")
      .getOne();

    if (!parametros) {
      return;
    }

    if (
      horasSolicitadas < parametros.horas_min_semanal ||
      horasSolicitadas > parametros.horas_max_semanal
    ) {
      throw new BadRequestException(
        `Las horas solicitadas (${horasSolicitadas}) están fuera del rango permitido ` +
          `para la modalidad '${modalidad}': [${parametros.horas_min_semanal} - ${parametros.horas_max_semanal}]`,
      );
    }
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

    if (dto.usuario_id) {
      await this.validarUsuarioAsociado(dto.usuario_id);
    }

    const vinculosInstitucionales = await this.resolverVinculosInstitucionales(
      dto.facultad_id,
      dto.departamento_id,
    );

    if (dto.modalidad && dto.horas_asignadas !== undefined) {
      const parametros = await this.parametrosCargaRepo
        .createQueryBuilder("p")
        .where("p.modalidad = :modalidad", { modalidad: dto.modalidad })
        .andWhere("(p.tipo_docente = :tipo OR p.tipo_docente = '')", {
          tipo: dto.tipo_docente ?? "",
        })
        .andWhere("(p.categoria = :cat OR p.categoria = '')", {
          cat: this.normalizarCategoria(dto.tipo_docente, dto.categoria) ?? "",
        })
        .orderBy("p.tipo_docente", "DESC")
        .addOrderBy("p.categoria", "DESC")
        .getOne();

      if (
        parametros &&
        (dto.horas_asignadas < parametros.horas_min_semanal ||
          dto.horas_asignadas > parametros.horas_max_semanal)
      ) {
        throw new BadRequestException(
          `Las horas solicitadas (${dto.horas_asignadas}) están fuera del rango permitido ` +
            `para la modalidad '${dto.modalidad}': [${parametros.horas_min_semanal} - ${parametros.horas_max_semanal}]`,
        );
      }
    }

    const docente = this.docenteRepo.create({
      ...dto,
      ...vinculosInstitucionales,
      usuario_id: dto.usuario_id ?? null,
      tipo_contrato: this.derivarTipoContrato(dto.tipo_docente),
      categoria: this.normalizarCategoria(dto.tipo_docente, dto.categoria),
      fecha_ingreso: new Date(dto.fecha_ingreso),
      activo: true,
    });

    const saved = await this.docenteRepo.save(docente);
    await this.invalidarCacheDocentes();
    return saved;
  }

  async update(id: number, dto: UpdateDocenteDto): Promise<Docente> {
    const docente = await this.findOne(id);

    if (dto.usuario_id && dto.usuario_id !== docente.usuario_id) {
      await this.validarUsuarioAsociado(dto.usuario_id, id);
    }

    const vinculosInstitucionales = await this.resolverVinculosInstitucionales(
      dto.facultad_id,
      dto.departamento_id,
      docente.facultad_id,
      docente.departamento_id,
    );

    if (dto.modalidad && dto.horas_asignadas !== undefined) {
      await this.validarCargaModalidad(id, dto.horas_asignadas, dto.modalidad);
    }

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

    const tipoDocente = dto.tipo_docente ?? docente.tipo_docente;
    const actualizado = this.docenteRepo.merge(docente, {
      ...dto,
      ...vinculosInstitucionales,
      usuario_id: dto.usuario_id ?? docente.usuario_id,
      tipo_contrato: this.derivarTipoContrato(tipoDocente),
      categoria:
        dto.tipo_docente !== undefined || dto.categoria !== undefined
          ? this.normalizarCategoria(
              tipoDocente,
              dto.categoria ?? docente.categoria,
            )
          : docente.categoria,
      ...(dto.fecha_ingreso && { fecha_ingreso: new Date(dto.fecha_ingreso) }),
    });

    const saved = await this.docenteRepo.save(actualizado);
    await this.invalidarCacheDocentes(id);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const docente = await this.findOne(id);
    await this.docenteRepo.save({ ...docente, activo: false });
    await this.invalidarCacheDocentes(id);
  }

  async reactivar(id: number): Promise<Docente> {
    const docente = await this.docenteRepo.findOne({ where: { id } });
    if (!docente) {
      throw new NotFoundException(`Docente con ID ${id} no encontrado`);
    }
    docente.activo = true;
    const saved = await this.docenteRepo.save(docente);
    await this.invalidarCacheDocentes(id);
    return saved;
  }

  private async invalidarCacheDocentes(id?: number): Promise<void> {
    if (id) await this.cacheManager.del(`docente_${id}_detalle`);
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

    let periodoId: number | null = null;
    let periodoCodigo: string | null = null;
    if (dto.periodo) {
      const periodo = await this.periodoRepo.findOne({
        where: { codigo: dto.periodo },
      });
      if (!periodo) {
        throw new NotFoundException(`Período ${dto.periodo} no encontrado`);
      }
      periodoId = periodo.id;
      periodoCodigo = periodo.codigo;
    }

    const asignaciones: DocenteCurso[] = [];

    for (const item of dto.cursos) {
      const curso = await this.cursoRepo.findOne({
        where: { id: item.cursoId, activo: true },
      });
      if (!curso) {
        throw new NotFoundException(
          `Curso con ID ${item.cursoId} no encontrado o inactivo`,
        );
      }

      // Validar que el curso tenga horas para la modalidad seleccionada
      if (item.tipo_clase === TipoClase.TEORIA && curso.horas_teoria <= 0) {
        throw new BadRequestException(
          `El curso ${curso.codigo} no tiene horas de teoría`,
        );
      }
      if (
        item.tipo_clase === TipoClase.LABORATORIO &&
        curso.horas_laboratorio <= 0
      ) {
        throw new BadRequestException(
          `El curso ${curso.codigo} no tiene horas de laboratorio`,
        );
      }

      // Validar ciclo del curso con el período (si hay período)
      if (periodoCodigo) {
        const isPeriodoImpar = this.esPeriodoImpar(periodoCodigo);
        const cursoCicloImpar = curso.ciclo % 2 !== 0;
        if (isPeriodoImpar !== cursoCicloImpar) {
          const cicloRequerido = isPeriodoImpar ? "impar" : "par";
          throw new BadRequestException(
            `Para el período ${periodoCodigo} solo se pueden asignar cursos de ciclo ${cicloRequerido}. El curso ${curso.codigo} es de ciclo ${curso.ciclo}.`,
          );
        }
      }

      // Verificar duplicado exacto
      const yaExiste = await this.docenteCursoRepo.findOne({
        where: {
          docenteId,
          cursoId: item.cursoId,
          tipo_clase: item.tipo_clase,
          periodoId,
        },
      });
      if (yaExiste) {
        throw new ConflictException(
          `El docente ya tiene asignado el curso ${curso.codigo} como ${item.tipo_clase}`,
        );
      }

      const asignacion = this.docenteCursoRepo.create({
        docenteId,
        cursoId: item.cursoId,
        tipo_clase: item.tipo_clase,
        periodoId,
      });
      await this.docenteCursoRepo.save(asignacion);
      asignaciones.push(asignacion);
    }

    return asignaciones;
  }

  private esPeriodoImpar(periodoCodigo: string): boolean {
    const parts = periodoCodigo.split("-");
    if (parts.length === 2 && parts[1] === "I") {
      return true;
    }
    return false;
  }

  async findCursosHabilitados(
    docenteId: number,
    tipoClase?: TipoClase,
    periodoCodigo?: string,
  ) {
    await this.findOne(docenteId);

    let periodoId: number | null = null;
    if (periodoCodigo) {
      const periodo = await this.periodoRepo.findOne({
        where: { codigo: periodoCodigo },
      });
      if (periodo) periodoId = periodo.id;
    }

    const qb = this.docenteCursoRepo
      .createQueryBuilder("dc")
      .leftJoinAndSelect("dc.curso", "curso")
      .leftJoinAndSelect("curso.ambientes", "ambientes")
      .where("dc.docenteId = :docenteId", { docenteId })
      .andWhere("curso.activo = :activo", { activo: true });

    if (tipoClase) {
      qb.andWhere("dc.tipo_clase = :tipoClase", { tipoClase });
    }
    if (periodoId !== null) {
      qb.andWhere("dc.periodoId = :periodoId", { periodoId });
    }

    const items = await qb.orderBy("curso.nombre", "ASC").getMany();

    // Filter courses by cycle parity if periodoCodigo is provided
    let filteredItems = items;
    if (periodoCodigo) {
      const isPeriodoImpar = this.esPeriodoImpar(periodoCodigo);
      filteredItems = items.filter((item) => {
        return isPeriodoImpar
          ? item.curso.ciclo % 2 !== 0
          : item.curso.ciclo % 2 === 0;
      });
    }

    return filteredItems.map((item) => {
      const gruposReales =
        item.tipo_clase === TipoClase.LABORATORIO ? item.grupos || 1 : 1;
      const result = {
        id: item.id,
        cursoId: item.cursoId,
        tipo_clase: item.tipo_clase,
        curso: item.curso,
        grupos: gruposReales,
      };
      return result;
    });
  }

  async removeAsignacion(
    docenteId: number,
    cursoId: number,
    tipoClase: TipoClase,
    periodoCodigo?: string,
  ): Promise<void> {
    await this.findOne(docenteId);

    const where: any = {
      docenteId,
      cursoId,
      tipo_clase: tipoClase,
    };

    if (periodoCodigo) {
      const periodo = await this.periodoRepo.findOne({
        where: { codigo: periodoCodigo },
      });
      if (periodo) where.periodoId = periodo.id;
    }

    const asignacion = await this.docenteCursoRepo.findOne({ where });

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

  async findAmbientesCompatibles(
    cursoId: number,
    tipoClase: string,
  ): Promise<Ambiente[]> {
    console.log(
      "[findAmbientesCompatibles] cursoId:",
      cursoId,
      "tipoClase:",
      tipoClase,
    );

    const cursoAmbienteRelations = await this.cursoAmbienteRepo.find({
      where: {
        cursoId,
      },
      relations: ["ambiente"],
    });

    console.log(
      "[findAmbientesCompatibles] cursoAmbienteRelations:",
      cursoAmbienteRelations.length,
      "items",
    );
    const ambientes = cursoAmbienteRelations.map((ca) => ca.ambiente);
    console.log(
      "[findAmbientesCompatibles] ambientes:",
      ambientes.map((a) => ({ id: a.id, codigo: a.codigo, tipo: a.tipo })),
    );

    // Ya no filtramos por tipo de clase porque hay casos donde laboratorios se dan en aulas
    return ambientes;
  }

  async asignarAmbientes(
    docenteId: number,
    ambienteIds: number[],
  ): Promise<Ambiente[]> {
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

  private async ensureDocenteExists(docenteId: number): Promise<void> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) {
      throw new NotFoundException(`Docente con ID ${docenteId} no encontrado`);
    }
  }

  private async resolverPeriodoCodigo(
    periodo: number | string,
  ): Promise<string | null> {
    const where =
      typeof periodo === "number" || /^\d+$/.test(String(periodo))
        ? { id: Number(periodo) }
        : { codigo: String(periodo) };

    const periodoEntity = await this.periodoRepo.findOne({ where });
    return periodoEntity?.codigo ?? null;
  }

  private construirCargaPorDia(horarios: HorarioAsignado[]): CargaPorDia {
    const base: CargaPorDia = {
      lunes: 0,
      martes: 0,
      miercoles: 0,
      jueves: 0,
      viernes: 0,
      sabado: 0,
      totalHoras: 0,
      promedioHorasPorDia: 0,
    };

    for (const horario of horarios) {
      if (horario.dia < 1 || horario.dia > 6) {
        continue;
      }

      const diaKey = DIA_KEYS[horario.dia - 1];
      const horas = this.calcularHorasHorario(
        horario.hora_inicio,
        horario.hora_fin,
      );
      base[diaKey] = this.redondearHoras(base[diaKey] + horas);
    }

    const horasPorDia = DIA_KEYS.map((dia) => base[dia]);
    const totalHoras = this.redondearHoras(
      horasPorDia.reduce((acc, horas) => acc + horas, 0),
    );
    const diasConCarga = horasPorDia.filter((horas) => horas > 0).length;

    base.totalHoras = totalHoras;
    base.promedioHorasPorDia =
      diasConCarga > 0 ? this.redondearHoras(totalHoras / diasConCarga) : 0;

    return base;
  }

  private calcularDesequilibrio(distribucion: CargaPorDia): number {
    const horasPorDia = DIA_KEYS.map((dia) => distribucion[dia]);
    return this.redondearHoras(
      Math.max(...horasPorDia) - Math.min(...horasPorDia),
    );
  }

  private calcularHorasHorario(horaInicio: string, horaFin: string): number {
    const minutosInicio = this.aMinutos(horaInicio);
    const minutosFin = this.aMinutos(horaFin);
    return this.redondearHoras(Math.max(0, minutosFin - minutosInicio) / 60);
  }

  private aMinutos(hora: string): number {
    const [horas, minutos] = hora.split(":").map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  }

  private redondearHoras(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private getUmbralDesequilibrio(): number {
    const rawValue = this.configService.get<string>("UMBRAL_DESEQUILIBRIO");
    const parsedValue = Number(rawValue ?? 4);
    return Number.isFinite(parsedValue) ? parsedValue : 4;
  }
}
