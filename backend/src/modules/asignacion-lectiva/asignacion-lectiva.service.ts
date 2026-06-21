import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, IsNull } from "typeorm";
import { AsignacionLectiva } from "../../entities/asignacion-lectiva.entity";
import { Docente } from "../../entities/docente.entity";
import { CursoPlanEstudios } from "../../entities/curso-plan-estudios.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { ParametrosCarga } from "../../entities/parametros-carga.entity";
import { Grupo } from "../../entities/grupo.entity";
import { EstadoAsignacionLectiva } from "../../common/enums/estado-asignacion-lectiva.enum";
import { TipoClase } from "../../common/enums/tipo-clase.enum";
import { CreateAsignacionLectivaDto } from "./dto/create-asignacion-lectiva.dto";
import { UpdateAsignacionLectivaDto } from "./dto/update-asignacion-lectiva.dto";
import { QueryAsignacionLectivaDto } from "./dto/query-asignacion-lectiva.dto";
import { ResumenCoberturaDto } from "./dto/resumen-cobertura.dto";
import { AuditoriaService } from "../auditoria/auditoria.service";
import { EntidadAuditoriaCarga, AccionAuditoriaCarga } from "../../entities/auditoria-carga.entity";
import { ContextoAcademicoService } from "../../common/services/contexto-academico.service";
import { ContextoAcademico, UsuarioAutenticado } from "../../common/interfaces/contexto-academico.interface";
import { Curso } from "../../entities/curso.entity";

@Injectable()
export class AsignacionLectivaService {
  constructor(
    @InjectRepository(AsignacionLectiva)
    private readonly asignacionRepo: Repository<AsignacionLectiva>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(CursoPlanEstudios)
    private readonly cursoPlanRepo: Repository<CursoPlanEstudios>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(ParametrosCarga)
    private readonly paramsRepo: Repository<ParametrosCarga>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    private readonly auditoriaService: AuditoriaService,
    private readonly contextoAcademicoService: ContextoAcademicoService,
  ) {}

  async findAll(
    query: QueryAsignacionLectivaDto,
    contexto?: ContextoAcademico,
  ) {
    const qb = this.asignacionRepo
      .createQueryBuilder("a")
      .leftJoinAndSelect("a.docente", "docente")
      .leftJoinAndSelect("a.curso_plan", "curso_plan")
      .leftJoinAndSelect("curso_plan.curso", "curso")
      .leftJoinAndSelect("a.periodo", "periodo")
      .leftJoinAndSelect("a.grupo", "grupo")
      .leftJoinAndSelect("a.asignado_por", "asignado_por");

    if (contexto && !contexto.verTodo) {
      this.contextoAcademicoService.aplicarFiltroDocente(qb, contexto, "docente");
    }

    if (query.periodo_id) {
      qb.andWhere("a.periodo_id = :periodoId", { periodoId: query.periodo_id });
    }
    if (query.docente_id) {
      qb.andWhere("a.docente_id = :docenteId", { docenteId: query.docente_id });
    }
    if (query.plan_id) {
      qb.andWhere("curso_plan.plan_estudios_id = :planId", {
        planId: query.plan_id,
      });
    }
    if (query.ciclo) {
      qb.andWhere("curso_plan.ciclo = :ciclo", { ciclo: query.ciclo });
    }
    if (query.estado) {
      qb.andWhere("a.estado = :estado", { estado: query.estado });
    }

    qb.orderBy("curso_plan.ciclo", "ASC")
      .addOrderBy("curso.codigo", "ASC")
      .addOrderBy("a.seccion", "ASC");

    return qb.getMany();
  }

  async findOne(id: number, contexto?: ContextoAcademico) {
    const asignacion = await this.asignacionRepo.findOne({
      where: { id },
      relations: [
        "docente",
        "curso_plan",
        "curso_plan.curso",
        "periodo",
        "grupo",
        "asignado_por",
        "confirmado_por",
      ],
    });
    if (!asignacion) {
      throw new NotFoundException(`Asignación lectiva #${id} no encontrada`);
    }

    if (contexto) {
      this.contextoAcademicoService.assertAccesoDocente(
        contexto,
        asignacion.docente,
        "No puede acceder a asignaciones fuera de su unidad académica",
      );
    }

    return asignacion;
  }

  async findByDocente(
    docenteId: number,
    periodoId?: number,
    contexto?: ContextoAcademico,
  ) {
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    if (!docente) {
      throw new NotFoundException(`Docente #${docenteId} no encontrado`);
    }
    if (contexto) {
      this.contextoAcademicoService.assertAccesoDocente(contexto, docente);
    }

    const where: any = { docente_id: docenteId };
    if (periodoId) where.periodo_id = periodoId;
    return this.asignacionRepo.find({
      where,
      relations: ["curso_plan", "curso_plan.curso", "periodo", "grupo"],
      order: { created_at: "DESC" },
    });
  }

  async create(
    dto: CreateAsignacionLectivaDto,
    usuario: UsuarioAutenticado,
  ) {
    const contexto = usuario.contextoAcademico;
    if (contexto) {
      this.contextoAcademicoService.assertAlcanceAsignado(contexto);
    }

    // A1-V5: El curso debe pertenecer al plan activo
    const cursoPlan = await this.cursoPlanRepo.findOne({
      where: { id: dto.curso_plan_id },
      relations: ["curso", "plan_estudios"],
    });
    if (!cursoPlan) {
      throw new NotFoundException(
        `Curso en plan #${dto.curso_plan_id} no encontrado`,
      );
    }
    if (cursoPlan.estado !== "ACTIVO") {
      throw new BadRequestException(
        "El curso no está activo en el plan de estudios",
      );
    }

    // A1-V6: El período debe estar en estado PLANIFICACION o ASIGNACION_HORARIOS
    const periodo = await this.periodoRepo.findOne({
      where: { id: dto.periodo_id },
    });
    if (!periodo) {
      throw new NotFoundException(`Período #${dto.periodo_id} no encontrado`);
    }
    const estadosPermitidos = ["planificacion", "asignacionhorarios"];
    if (!estadosPermitidos.includes(periodo.estado)) {
      throw new BadRequestException(
        `El período está en estado "${periodo.estado}". Solo se puede asignar en PLANIFICACION o ASIGNACION_HORARIOS`,
      );
    }

    // A1-V1: Docente debe tener modalidad definida
    const docente = await this.docenteRepo.findOne({
      where: { id: dto.docente_id },
    });
    if (!docente) {
      throw new NotFoundException(`Docente #${dto.docente_id} no encontrado`);
    }
    if (!docente.modalidad) {
      throw new BadRequestException(
        "El docente no tiene una modalidad asignada. Defina la modalidad antes de asignar cursos.",
      );
    }

    if (contexto) {
      this.contextoAcademicoService.assertAccesoDocente(
        contexto,
        docente,
        "No puede asignar cursos a docentes fuera de su departamento",
      );
      await this.validarCursoEnAlcance(cursoPlan.curso_id, contexto);
    }

    // Validar unicidad
    const existing = await this.asignacionRepo.findOne({
      where: {
        docente_id: dto.docente_id,
        curso_plan_id: dto.curso_plan_id,
        periodo_id: dto.periodo_id,
        tipo_clase: dto.tipo_clase,
        seccion: dto.seccion,
        grupo_id: dto.grupo_id ?? IsNull(),
      },
    });
    if (existing) {
      throw new ConflictException(
        "El docente ya tiene una asignación para este curso/periodo/tipo/sección",
      );
    }

    // A1-V7: Horas del curso no pueden exceder las definidas en el plan
    const horasPlan = this.getHorasPorTipo(cursoPlan, dto.tipo_clase);
    if (dto.horas_asignadas > horasPlan) {
      throw new BadRequestException(
        `Las horas asignadas (${dto.horas_asignadas}) exceden las horas del plan para ${dto.tipo_clase} (${horasPlan})`,
      );
    }

    // A1-V2: Validar carga máxima semanal
    await this.validarCargaMaxima(
      dto.docente_id,
      dto.periodo_id,
      dto.horas_asignadas,
      docente,
    );

    // A1-V3: Validar cursos máximos
    await this.validarCursosMaximos(dto.docente_id, dto.periodo_id, docente);

    const asignacion = this.asignacionRepo.create({
      ...dto,
      asignado_por_id: usuario.id,
    });
    const saved = await this.asignacionRepo.save(asignacion);

    // Audit logging
    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.ASIGNACION_LECTIVA,
      entidad_id: saved.id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.CREAR,
      estado_anterior: null,
      estado_nuevo: saved.estado,
      datos_anteriores: null,
      datos_nuevos: {
        docente_id: saved.docente_id,
        curso_plan_id: saved.curso_plan_id,
        periodo_id: saved.periodo_id,
        tipo_clase: saved.tipo_clase,
        seccion: saved.seccion,
        horas_asignadas: saved.horas_asignadas,
      },
      ip: "0.0.0.0",
    });

    return saved;
  }

  async update(
    id: number,
    dto: UpdateAsignacionLectivaDto,
    usuario: UsuarioAutenticado,
  ) {
    const asignacion = await this.findOne(id, usuario.contextoAcademico);

    if (asignacion.estado !== EstadoAsignacionLectiva.PENDIENTE) {
      throw new BadRequestException(
        `No se puede modificar una asignación en estado "${asignacion.estado}"`,
      );
    }

    const datosAnteriores = {
      horas_asignadas: asignacion.horas_asignadas,
      tipo_clase: asignacion.tipo_clase,
      seccion: asignacion.seccion,
      observaciones: asignacion.observaciones,
    };

    if (
      dto.horas_asignadas !== undefined &&
      dto.horas_asignadas !== asignacion.horas_asignadas
    ) {
      const cursoPlan = await this.cursoPlanRepo.findOne({
        where: { id: asignacion.curso_plan_id },
        relations: ["curso"],
      });
      if (!cursoPlan)
        throw new NotFoundException("Curso en plan no encontrado");

      const horasPlan = this.getHorasPorTipo(
        cursoPlan,
        dto.tipo_clase || asignacion.tipo_clase,
      );
      if (dto.horas_asignadas > horasPlan) {
        throw new BadRequestException(
          `Las horas asignadas exceden las horas del plan (${horasPlan})`,
        );
      }

      const docente = await this.docenteRepo.findOne({
        where: { id: asignacion.docente_id },
      });
      if (!docente) throw new NotFoundException("Docente no encontrado");

      await this.validarCargaMaxima(
        asignacion.docente_id,
        asignacion.periodo_id,
        dto.horas_asignadas - asignacion.horas_asignadas,
        docente,
      );
    }

    Object.assign(asignacion, dto);
    const saved = await this.asignacionRepo.save(asignacion);

    // Audit logging
    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.ASIGNACION_LECTIVA,
      entidad_id: saved.id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.ACTUALIZAR,
      estado_anterior: null,
      estado_nuevo: null,
      datos_anteriores: datosAnteriores,
      datos_nuevos: {
        horas_asignadas: saved.horas_asignadas,
        tipo_clase: saved.tipo_clase,
        seccion: saved.seccion,
        observaciones: saved.observaciones,
      },
      ip: "0.0.0.0",
    });

    return saved;
  }

  async confirmar(id: number, usuario: UsuarioAutenticado) {
    const asignacion = await this.findOne(id, usuario.contextoAcademico);
    if (asignacion.estado !== EstadoAsignacionLectiva.PENDIENTE) {
      throw new BadRequestException(
        `No se puede confirmar una asignación en estado "${asignacion.estado}"`,
      );
    }
    const estadoAnterior = asignacion.estado;
    asignacion.estado = EstadoAsignacionLectiva.CONFIRMADO;
    asignacion.confirmado_por_id = usuario.id;
    asignacion.confirmado_en = new Date();
    const saved = await this.asignacionRepo.save(asignacion);

    // Audit logging
    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.ASIGNACION_LECTIVA,
      entidad_id: saved.id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.CONFIRMAR,
      estado_anterior: estadoAnterior,
      estado_nuevo: saved.estado,
      datos_anteriores: null,
      datos_nuevos: {
        confirmado_por_id: saved.confirmado_por_id,
        confirmado_en: saved.confirmado_en,
      },
      ip: "0.0.0.0",
    });

    return saved;
  }

  async rechazar(
    id: number,
    usuario: UsuarioAutenticado,
    observaciones: string,
  ) {
    const asignacion = await this.findOne(id, usuario.contextoAcademico);
    if (asignacion.estado !== EstadoAsignacionLectiva.PENDIENTE) {
      throw new BadRequestException(
        `No se puede rechazar una asignación en estado "${asignacion.estado}"`,
      );
    }
    if (!observaciones || observaciones.trim().length === 0) {
      throw new BadRequestException(
        "Debe proporcionar observaciones para rechazar la asignación",
      );
    }
    const estadoAnterior = asignacion.estado;
    asignacion.estado = EstadoAsignacionLectiva.RECHAZADO;
    asignacion.confirmado_por_id = usuario.id;
    asignacion.confirmado_en = new Date();
    asignacion.observaciones = observaciones;
    const saved = await this.asignacionRepo.save(asignacion);

    // Audit logging
    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.ASIGNACION_LECTIVA,
      entidad_id: saved.id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.RECHAZAR,
      estado_anterior: estadoAnterior,
      estado_nuevo: saved.estado,
      datos_anteriores: null,
      datos_nuevos: {
        observaciones: saved.observaciones,
        confirmado_por_id: saved.confirmado_por_id,
        confirmado_en: saved.confirmado_en,
      },
      ip: "0.0.0.0",
    });

    return saved;
  }

  async remove(id: number, usuario: UsuarioAutenticado) {
    const asignacion = await this.findOne(id, usuario.contextoAcademico);
    if (asignacion.estado !== EstadoAsignacionLectiva.PENDIENTE) {
      throw new BadRequestException(
        `No se puede eliminar una asignación en estado "${asignacion.estado}"`,
      );
    }

    const datosAnteriores = {
      docente_id: asignacion.docente_id,
      curso_plan_id: asignacion.curso_plan_id,
      periodo_id: asignacion.periodo_id,
      tipo_clase: asignacion.tipo_clase,
      seccion: asignacion.seccion,
      horas_asignadas: asignacion.horas_asignadas,
      estado: asignacion.estado,
    };

    await this.asignacionRepo.remove(asignacion);

    // Audit logging
    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.ASIGNACION_LECTIVA,
      entidad_id: id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.ELIMINAR,
      estado_anterior: datosAnteriores.estado,
      estado_nuevo: null,
      datos_anteriores: datosAnteriores,
      datos_nuevos: null,
      ip: "0.0.0.0",
      motivo: "Eliminación de asignación lectiva",
    });
  }

  async getResumen(
    periodoId?: number,
    planId?: number,
    contexto?: ContextoAcademico,
  ): Promise<ResumenCoberturaDto> {
    const qb = this.asignacionRepo
      .createQueryBuilder("a")
      .leftJoin("a.docente", "docente");

    if (contexto && !contexto.verTodo) {
      this.contextoAcademicoService.aplicarFiltroDocente(qb, contexto, "docente");
    }

    if (periodoId) {
      qb.andWhere("a.periodo_id = :periodoId", { periodoId });
    }
    if (planId) {
      qb.innerJoin("a.curso_plan", "cp").andWhere(
        "cp.plan_estudios_id = :planId",
        { planId },
      );
    }

    const asignaciones = await qb.getMany();

    const total = asignaciones.length;
    const asignados = asignaciones.filter(
      (a) => a.estado === EstadoAsignacionLectiva.CONFIRMADO,
    ).length;
    const pendientes = asignaciones.filter(
      (a) => a.estado === EstadoAsignacionLectiva.PENDIENTE,
    ).length;
    const totalHoras = asignaciones.reduce(
      (sum, a) => sum + Number(a.horas_asignadas),
      0,
    );
    const docentesUnicos = new Set(asignaciones.map((a) => a.docente_id)).size;

    const result = new ResumenCoberturaDto();
    result.total_cursos = total;
    result.asignados = asignados;
    result.pendientes = pendientes;
    result.sin_docente = 0;
    result.total_horas_asignadas = totalHoras;
    result.total_docentes = docentesUnicos;
    return result;
  }

  private async validarCursoEnAlcance(
    cursoId: number,
    contexto: ContextoAcademico,
  ): Promise<void> {
    if (contexto.verTodo) {
      return;
    }

    const curso = await this.cursoRepo.findOne({ where: { id: cursoId } });
    if (!curso?.departamento_id) {
      return;
    }

    if (!contexto.departamentoIds.includes(curso.departamento_id)) {
      throw new ForbiddenException(
        "No puede asignar cursos fuera de su departamento",
      );
    }
  }

  private getHorasPorTipo(
    cursoPlan: CursoPlanEstudios,
    tipoClase: TipoClase,
  ): number {
    switch (tipoClase) {
      case TipoClase.TEORIA:
        return cursoPlan.horas_teoria;
      case TipoClase.PRACTICA:
        return cursoPlan.horas_practica;
      case TipoClase.LABORATORIO:
        return cursoPlan.horas_laboratorio;
    }
  }

  private async validarCargaMaxima(
    docenteId: number,
    periodoId: number,
    nuevasHoras: number,
    docente: Docente,
  ) {
    const asignacionesActuales = await this.asignacionRepo.find({
      where: {
        docente_id: docenteId,
        periodo_id: periodoId,
        estado: Not(EstadoAsignacionLectiva.RECHAZADO),
      },
    });

    const horasActuales = asignacionesActuales.reduce(
      (sum, a) => sum + Number(a.horas_asignadas),
      0,
    );
    const totalHoras = horasActuales + nuevasHoras;

    // Buscar ParametrosCarga para la modalidad del docente
    const params = await this.paramsRepo.findOne({
      where: {
        periodo_academico: String(periodoId),
        modalidad: docente.modalidad,
      },
    });

    const maxHoras = params?.horas_max_semanal ?? 40;
    if (totalHoras > maxHoras) {
      throw new BadRequestException(
        `La carga total (${totalHoras}h) excede el máximo semanal (${maxHoras}h) para la modalidad ${docente.modalidad}`,
      );
    }
  }

  private async validarCursosMaximos(
    docenteId: number,
    periodoId: number,
    docente: Docente,
  ) {
    const asignacionesActuales = await this.asignacionRepo.find({
      where: {
        docente_id: docenteId,
        periodo_id: periodoId,
        estado: Not(EstadoAsignacionLectiva.RECHAZADO),
      },
    });

    const cursosDistintos = new Set(
      asignacionesActuales.map((a) => a.curso_plan_id),
    ).size;
    const nuevosCursos = cursosDistintos + 1;

    const params = await this.paramsRepo.findOne({
      where: {
        periodo_academico: String(periodoId),
        modalidad: docente.modalidad,
      },
    });

    const maxCursos = params?.cursos_max_docente ?? 8;
    if (nuevosCursos > maxCursos) {
      throw new BadRequestException(
        `El número de cursos (${nuevosCursos}) excede el máximo permitido (${maxCursos}) para la modalidad ${docente.modalidad}`,
      );
    }
  }
}
