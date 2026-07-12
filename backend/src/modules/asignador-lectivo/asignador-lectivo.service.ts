import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, IsNull } from "typeorm";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { AsignacionLectiva } from "../../entities/asignacion-lectiva.entity";
import { Docente } from "../../entities/docente.entity";
import { Curso } from "../../entities/curso.entity";
import { CursoPlanEstudios } from "../../entities/curso-plan-estudios.entity";
import { Grupo } from "../../entities/grupo.entity";
import { Ambiente } from "../../entities/ambiente.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { ParametrosCarga } from "../../entities/parametros-carga.entity";
import { OfertaAcademica } from "../../entities/oferta-academica.entity";
import { TipoClase } from "../../common/enums/tipo-clase.enum";
import { EstadoHorario } from "../../common/enums/estado-horario.enum";
import { OrigenHorario } from "../../common/enums/origen-horario.enum";
import { EstadoAsignacionLectiva } from "../../common/enums/estado-asignacion-lectiva.enum";
import { EstadoPeriodo } from "../../common/enums/estado-periodo.enum";
import { EstadoCursoPlan } from "../../common/enums/estado-curso-plan.enum";
import { CrearHorarioLectivoDto } from "./dto/crear-horario-lectivo.dto";
import {
  ValidarAsignacionDto,
  ValidacionResultado,
} from "./dto/validar-asignacion.dto";
import { AuditoriaService } from "../auditoria/auditoria.service";
import {
  EntidadAuditoriaCarga,
  AccionAuditoriaCarga,
} from "../../entities/auditoria-carga.entity";
import { ContextoAcademicoService } from "../../common/services/contexto-academico.service";
import {
  ContextoAcademico,
  UsuarioAutenticado,
} from "../../common/interfaces/contexto-academico.interface";

@Injectable()
export class AsignadorLectivoService {
  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(AsignacionLectiva)
    private readonly asignacionRepo: Repository<AsignacionLectiva>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(CursoPlanEstudios)
    private readonly cursoPlanRepo: Repository<CursoPlanEstudios>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(ParametrosCarga)
    private readonly paramsRepo: Repository<ParametrosCarga>,
    @InjectRepository(OfertaAcademica)
    private readonly ofertaRepo: Repository<OfertaAcademica>,
    private readonly auditoriaService: AuditoriaService,
    private readonly contextoAcademicoService: ContextoAcademicoService,
  ) {}

  private async resolvePeriodo(periodoId: number): Promise<PeriodoAcademico> {
    const periodo = await this.periodoRepo.findOne({
      where: { id: periodoId },
    });
    if (!periodo)
      throw new NotFoundException(`Período #${periodoId} no encontrado`);
    return periodo;
  }

  async getCursosPendientes(periodoId: number, contexto?: ContextoAcademico) {
    const periodo = await this.resolvePeriodo(periodoId);

    const ofertas = await this.ofertaRepo.find({
      where: { periodo_id: periodoId, activo: true },
      relations: ["curso_plan", "curso_plan.curso"],
    });

    const asignaciones = await this.asignacionRepo.find({
      where: {
        periodo_id: periodoId,
        estado: Not(EstadoAsignacionLectiva.RECHAZADO),
      },
      relations: ["curso_plan"],
    });

    const horasAsignadasMap = new Map<
      number,
      { teoria: number; practica: number; laboratorio: number }
    >();
    for (const a of asignaciones) {
      const key = a.curso_plan_id;
      if (!horasAsignadasMap.has(key)) {
        horasAsignadasMap.set(key, { teoria: 0, practica: 0, laboratorio: 0 });
      }
      const entry = horasAsignadasMap.get(key)!;
      const horas = Number(a.horas_asignadas);
      switch (a.tipo_clase) {
        case TipoClase.TEORIA:
          entry.teoria += horas;
          break;
        case TipoClase.PRACTICA:
          entry.practica += horas;
          break;
        case TipoClase.LABORATORIO:
          entry.laboratorio += horas;
          break;
      }
    }

    const cursosPendientes: any[] = [];
    for (const oferta of ofertas) {
      const cp = oferta.curso_plan;
      if (!cp || cp.estado !== EstadoCursoPlan.ACTIVO) continue;
      const curso = cp.curso;
      if (!curso) continue;

      if (contexto && !contexto.verTodo && curso.departamento_id) {
        if (!contexto.departamentoIds.includes(curso.departamento_id)) continue;
      }

      const asignado = horasAsignadasMap.get(cp.id) || {
        teoria: 0,
        practica: 0,
        laboratorio: 0,
      };
      const tiposRequeridos: string[] = [];
      if (cp.horas_teoria > 0 && asignado.teoria < cp.horas_teoria)
        tiposRequeridos.push("TEORIA");
      if (cp.horas_practica > 0 && asignado.practica < cp.horas_practica)
        tiposRequeridos.push("PRACTICA");
      if (
        cp.horas_laboratorio > 0 &&
        asignado.laboratorio < cp.horas_laboratorio
      )
        tiposRequeridos.push("LABORATORIO");

      if (tiposRequeridos.length === 0) continue;

      const grupos = await this.grupoRepo.find({
        where: { curso_id: curso.id, periodo_academico_id: periodoId },
      });

      const ambientes = await this.ambienteRepo
        .createQueryBuilder("a")
        .innerJoin("a.cursos", "c", "c.id = :cursoId", { cursoId: curso.id })
        .getMany();

      cursosPendientes.push({
        cursoPlanId: cp.id,
        cursoId: curso.id,
        codigo: curso.codigo,
        nombre: curso.nombre,
        ciclo: cp.ciclo,
        tipoCurso: cp.tipo_curso,
        horasTeoria: cp.horas_teoria,
        horasPractica: cp.horas_practica,
        horasLaboratorio: cp.horas_laboratorio,
        horasAsignadasTeoria: asignado.teoria,
        horasAsignadasPractica: asignado.practica,
        horasAsignadasLaboratorio: asignado.laboratorio,
        tiposRequeridos,
        grupos: grupos.map((g) => ({
          id: g.id,
          codigo: g.codigo,
          nombre: g.nombre,
          tipo: g.tipo,
          cupoMaximo: g.cupo_maximo,
        })),
        totalAlumnos: grupos.reduce((sum, g) => sum + (g.cupo_maximo || 0), 0),
        ambientesCompatibles: ambientes.map((a) => Number(a.id)),
        departamentoId: curso.departamento_id,
        tieneLaboratorio: curso.tiene_laboratorio,
      });
    }

    return cursosPendientes;
  }

  async getDocentes(periodoId: number, contexto?: ContextoAcademico) {
    const periodo = await this.resolvePeriodo(periodoId);
    const periodoCodigo = periodo.codigo;

    const qb = this.docenteRepo
      .createQueryBuilder("d")
      .leftJoinAndSelect("d.departamento", "dep")
      .leftJoinAndSelect("d.facultad", "fac")
      .where("d.activo = :activo", { activo: true });

    if (contexto && !contexto.verTodo && contexto.departamentoIds.length > 0) {
      qb.andWhere("d.departamento_id IN (:...deps)", {
        deps: contexto.departamentoIds,
      });
    }

    const docentes = await qb.getMany();
    const resultado: any[] = [];

    for (const docente of docentes) {
      const asignaciones = await this.asignacionRepo.find({
        where: {
          docente_id: docente.id,
          periodo_id: periodoId,
          estado: Not(EstadoAsignacionLectiva.RECHAZADO),
        },
      });
      const horasLectivas = asignaciones.reduce(
        (sum, a) => sum + Number(a.horas_asignadas),
        0,
      );

      const noLectivos = await this.horarioRepo.find({
        where: {
          docente_id: docente.id,
          periodo: periodoCodigo,
          tipo_clase: TipoClase.NO_LECTIVA,
        },
      });
      const horasNoLectivas = noLectivos.reduce((sum, h) => {
        return sum + this.calcularDuracionHoras(h.hora_inicio, h.hora_fin);
      }, 0);

      const params = await this.paramsRepo.findOne({
        where: {
          periodo_academico: periodoCodigo,
          modalidad: docente.modalidad,
        },
      });
      const maxHoras = params?.horas_max_semanal ?? 40;

      const horariosExistentes = await this.horarioRepo.find({
        where: {
          docente_id: docente.id,
          periodo: periodoCodigo,
          tipo_clase: Not(TipoClase.NO_LECTIVA),
        },
        relations: ["curso", "ambiente", "grupo"],
      });

      const bloques = horariosExistentes.map((h) => ({
        id: `h_${h.id}`,
        dia: h.dia,
        horaInicio: h.hora_inicio,
        horaFin: h.hora_fin,
        tipo: "lectiva" as const,
        tipoClase: h.tipo_clase,
        label: h.curso?.codigo || "",
        sublabel: h.ambiente?.codigo || "",
        badge: this.getBadge(h.tipo_clase),
        cursoId: h.curso_id,
        cursoNombre: h.curso?.nombre || "",
        ambienteId: h.ambiente_id,
        ambienteCodigo: h.ambiente?.codigo || "",
        grupoId: h.grupo_id,
        grupoCodigo: h.grupo?.codigo || "",
      }));

      resultado.push({
        id: docente.id,
        nombre: docente.nombres,
        apellido: docente.apellidos,
        codigo: docente.codigo,
        categoria: docente.categoria,
        modalidad: docente.modalidad,
        tipoDocente: docente.tipo_docente,
        horasLectivasAsignadas: horasLectivas,
        horasLectivasMax: maxHoras,
        horasNoLectivas: Math.round(horasNoLectivas),
        horasRestantes: maxHoras - horasLectivas - Math.round(horasNoLectivas),
        departamentoId: docente.departamento_id,
        departamentoNombre: docente.departamento?.nombre || "",
        facultadId: (docente as any).facultad?.id
          ? Number((docente as any).facultad.id)
          : null,
        facultadNombre: (docente as any).facultad?.nombre
          ? String((docente as any).facultad.nombre)
          : "",
        enSuspension: false,
        bloquesExistentes: bloques,
        totalCursos: new Set(asignaciones.map((a) => a.curso_plan_id)).size,
      });
    }

    return resultado;
  }

  async getHorarioDocente(docenteId: number, periodoCodigo: string) {
    const horarios = await this.horarioRepo.find({
      where: { docente_id: docenteId, periodo: periodoCodigo },
      relations: ["curso", "ambiente", "grupo"],
      order: { dia: "ASC", hora_inicio: "ASC" },
    });

    return horarios.map((h) => ({
      id: h.id,
      dia: h.dia,
      horaInicio: h.hora_inicio,
      horaFin: h.hora_fin,
      tipo: h.tipo_clase === TipoClase.NO_LECTIVA ? "no-lectiva" : "lectiva",
      tipoClase: h.tipo_clase,
      label: h.curso?.codigo || "",
      sublabel: h.ambiente?.codigo || "",
      cursoId: h.curso_id,
      cursoNombre: h.curso?.nombre || "",
      ambienteId: h.ambiente_id,
      ambienteCodigo: h.ambiente?.codigo || "",
      grupoId: h.grupo_id,
      grupoCodigo: h.grupo?.codigo || "",
      badge: this.getBadge(h.tipo_clase),
      duracion: this.calcularDuracionHoras(h.hora_inicio, h.hora_fin),
    }));
  }

  async getAmbientes(periodoCodigo: string, contexto?: ContextoAcademico) {
    const ambientes = await this.ambienteRepo.find({
      where: { activo: true },
      order: { codigo: "ASC" },
    });

    const resultado: any[] = [];
    for (const amb of ambientes) {
      const ocupacion = await this.horarioRepo.find({
        where: { ambiente_id: amb.id, periodo: periodoCodigo },
        relations: ["curso", "docente"],
        order: { dia: "ASC", hora_inicio: "ASC" },
      });

      const bloques = ocupacion.map((h) => ({
        id: `a_${h.id}`,
        dia: h.dia,
        horaInicio: h.hora_inicio,
        horaFin: h.hora_fin,
        tipo: "lectiva" as const,
        tipoClase: h.tipo_clase,
        label: h.curso?.codigo || "",
        sublabel: h.docente ? `${h.docente.apellidos}` : "",
        badge: this.getBadge(h.tipo_clase),
        docenteId: h.docente_id,
        docenteNombre: h.docente
          ? `${h.docente.apellidos} ${h.docente.nombres}`
          : "",
        cursoNombre: h.curso?.nombre || "",
      }));

      const horasOcupadas = bloques.reduce(
        (sum, b) => sum + this.calcularDuracionHoras(b.horaInicio, b.horaFin),
        0,
      );
      const horasDisponibles = 15 * 6 - horasOcupadas;

      resultado.push({
        id: amb.id,
        codigo: amb.codigo,
        nombre: amb.nombre,
        tipo: amb.tipo,
        capacidad: amb.capacidad,
        piso: amb.piso ? String(amb.piso) : null,
        pabellon: amb.pabellon ? String(amb.pabellon) : null,
        estado: amb.estado,
        activo: amb.activo,
        bloquesOcupados: bloques,
        totalBloquesOcupados: bloques.length,
        horasOcupadas,
        horasDisponibles: Math.max(0, horasDisponibles),
        porcentajeOcupacion: Math.round((horasOcupadas / (15 * 6)) * 100),
      });
    }

    return resultado;
  }

  async getOcupacionAmbiente(ambienteId: number, periodoCodigo: string) {
    const ambiente = await this.ambienteRepo.findOne({
      where: { id: ambienteId },
    });
    if (!ambiente)
      throw new NotFoundException(`Ambiente #${ambienteId} no encontrado`);

    const ocupacion = await this.horarioRepo.find({
      where: { ambiente_id: ambienteId, periodo: periodoCodigo },
      relations: ["curso", "docente", "grupo"],
      order: { dia: "ASC", hora_inicio: "ASC" },
    });

    return {
      ambiente: {
        id: ambiente.id,
        codigo: ambiente.codigo,
        nombre: ambiente.nombre,
        tipo: ambiente.tipo,
        capacidad: ambiente.capacidad,
      },
      bloques: ocupacion.map((h) => ({
        id: h.id,
        dia: h.dia,
        horaInicio: h.hora_inicio,
        horaFin: h.hora_fin,
        tipoClase: h.tipo_clase,
        badge: this.getBadge(h.tipo_clase),
        cursoCodigo: h.curso?.codigo || "",
        cursoNombre: h.curso?.nombre || "",
        docenteNombre: h.docente
          ? `${h.docente.apellidos} ${h.docente.nombres}`
          : "",
        grupoCodigo: h.grupo?.codigo || "",
        duracion: this.calcularDuracionHoras(h.hora_inicio, h.hora_fin),
      })),
    };
  }

  async validar(
    dto: ValidarAsignacionDto,
    contexto?: ContextoAcademico,
  ): Promise<ValidacionResultado> {
    const errores: string[] = [];
    const advertencias: string[] = [];

    const [docente, curso, ambiente, periodo] = await Promise.all([
      this.docenteRepo.findOne({ where: { id: dto.docente_id } }),
      this.cursoRepo.findOne({ where: { id: dto.curso_id } }),
      this.ambienteRepo.findOne({ where: { id: dto.ambiente_id } }),
      this.periodoRepo.findOne({ where: { codigo: dto.periodo } }),
    ]);

    if (!docente) {
      errores.push("Docente no encontrado");
      return { valido: false, errores, advertencias };
    }
    if (!curso) {
      errores.push("Curso no encontrado");
      return { valido: false, errores, advertencias };
    }
    if (!ambiente) {
      errores.push("Ambiente no encontrado");
      return { valido: false, errores, advertencias };
    }

    const periodoId = periodo?.id ?? 0;

    if (!docente.activo) errores.push("El docente no está activo");
    if (ambiente.estado !== "ACTIVO")
      errores.push("El ambiente no está activo");

    const horasInicio = this.timeToMinutes(dto.hora_inicio);
    const horasFin = this.timeToMinutes(dto.hora_fin);
    if (horasFin <= horasInicio)
      errores.push("La hora fin debe ser posterior a la hora inicio");
    if (horasInicio < 420 || horasFin > 1320)
      errores.push("La franja horaria debe estar entre 07:00 y 22:00");

    const duracionHoras = (horasFin - horasInicio) / 60;

    if (!dto.horario_id) {
      const cruceDocente = await this.horarioRepo.findOne({
        where: {
          docente_id: dto.docente_id,
          periodo: dto.periodo,
          dia: dto.dia,
        },
      });
      if (cruceDocente) {
        const ci = this.timeToMinutes(cruceDocente.hora_inicio);
        const cf = this.timeToMinutes(cruceDocente.hora_fin);
        if (horasInicio < cf && horasFin > ci) {
          errores.push(
            `Conflicto docente: ${cruceDocente.curso?.codigo} (${cruceDocente.hora_inicio}-${cruceDocente.hora_fin})`,
          );
        }
      }

      const cruceAmbiente = await this.horarioRepo.findOne({
        where: {
          ambiente_id: dto.ambiente_id,
          periodo: dto.periodo,
          dia: dto.dia,
        },
      });
      if (cruceAmbiente) {
        const ci = this.timeToMinutes(cruceAmbiente.hora_inicio);
        const cf = this.timeToMinutes(cruceAmbiente.hora_fin);
        if (horasInicio < cf && horasFin > ci) {
          errores.push(
            `Aula ocupada: ${cruceAmbiente.curso?.codigo} (${cruceAmbiente.hora_inicio}-${cruceAmbiente.hora_fin})`,
          );
        }
      }
    }

    const params = await this.paramsRepo.findOne({
      where: { periodo_academico: dto.periodo, modalidad: docente.modalidad },
    });
    const maxHoras = params?.horas_max_semanal ?? 40;

    const asignacionesActuales = await this.asignacionRepo.find({
      where: {
        docente_id: dto.docente_id,
        periodo_id: periodoId,
        estado: Not(EstadoAsignacionLectiva.RECHAZADO),
      },
    });
    const horasLectivasActuales = asignacionesActuales.reduce(
      (sum, a) => sum + Number(a.horas_asignadas),
      0,
    );

    if (!dto.horario_id) {
      const nuevaTotal = horasLectivasActuales + duracionHoras;
      if (nuevaTotal > maxHoras) {
        errores.push(`Excede carga máxima: ${nuevaTotal}h > ${maxHoras}h`);
      }
      if (nuevaTotal < 16 && horasLectivasActuales === 0) {
        advertencias.push(`Carga menor al mínimo: ${nuevaTotal}h < 16h`);
      }
    }

    if (
      ambiente.capacidad &&
      dto.nro_alumnos &&
      dto.nro_alumnos > ambiente.capacidad
    ) {
      advertencias.push(
        `Alumnos (${dto.nro_alumnos}) excede capacidad (${ambiente.capacidad})`,
      );
    }

    return { valido: errores.length === 0, errores, advertencias };
  }

  async asignar(dto: CrearHorarioLectivoDto, usuario: UsuarioAutenticado) {
    const periodo = await this.periodoRepo.findOne({
      where: { codigo: dto.periodo },
    });
    const periodoCodigo = periodo?.codigo || dto.periodo;
    const periodoId = periodo?.id ?? 0;

    const validacion = await this.validar(
      {
        docente_id: dto.docente_id,
        curso_id: dto.curso_id,
        ambiente_id: dto.ambiente_id,
        periodo: periodoCodigo,
        dia: dto.dia,
        hora_inicio: dto.hora_inicio,
        hora_fin: dto.hora_fin,
        tipo_clase: dto.tipo_clase,
        grupo_id: dto.grupo_id,
        nro_alumnos: dto.nro_alumnos,
      },
      usuario.contextoAcademico,
    );

    if (!validacion.valido) {
      throw new BadRequestException({
        message: "La asignación no es válida",
        errores: validacion.errores,
        advertencias: validacion.advertencias,
      });
    }

    const horario = this.horarioRepo.create({
      docente_id: dto.docente_id,
      curso_id: dto.curso_id,
      grupo_id: dto.grupo_id,
      ambiente_id: dto.ambiente_id,
      periodo: periodoCodigo,
      dia: dto.dia,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      tipo_clase: dto.tipo_clase,
      estado: EstadoHorario.BORRADOR,
      origen: OrigenHorario.AJUSTE_MANUAL,
      modificado_por: usuario.email,
    });
    const saved = await this.horarioRepo.save(horario);

    if (dto.curso_plan_id && dto.seccion) {
      const existingAsig = await this.asignacionRepo.findOne({
        where: {
          docente_id: dto.docente_id,
          curso_plan_id: dto.curso_plan_id,
          periodo_id: periodoId,
          tipo_clase: dto.tipo_clase,
          seccion: dto.seccion,
          grupo_id: dto.grupo_id ?? IsNull(),
        },
      });

      if (!existingAsig) {
        const asig = this.asignacionRepo.create({
          docente_id: dto.docente_id,
          curso_plan_id: dto.curso_plan_id,
          periodo_id: periodoId,
          grupo_id: dto.grupo_id,
          tipo_clase: dto.tipo_clase,
          seccion: dto.seccion,
          nro_alumnos: dto.nro_alumnos || 0,
          horas_asignadas: this.calcularDuracionHoras(
            dto.hora_inicio,
            dto.hora_fin,
          ),
          estado: EstadoAsignacionLectiva.PENDIENTE,
          asignado_por_id: usuario.id,
        });
        await this.asignacionRepo.save(asig);
      }
    }

    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.HORARIO_ASIGNADO,
      entidad_id: saved.id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.CREAR,
      estado_anterior: null,
      estado_nuevo: saved.estado,
      datos_anteriores: null,
      datos_nuevos: {
        docente_id: saved.docente_id,
        curso_id: saved.curso_id,
        ambiente_id: saved.ambiente_id,
        dia: saved.dia,
        hora_inicio: saved.hora_inicio,
        hora_fin: saved.hora_fin,
        tipo_clase: saved.tipo_clase,
      },
      ip: "0.0.0.0",
    });

    return { id: saved.id, mensaje: "Asignación creada exitosamente" };
  }

  async mover(
    id: number,
    dto: CrearHorarioLectivoDto,
    usuario: UsuarioAutenticado,
  ) {
    const existente = await this.horarioRepo.findOne({
      where: { id },
      relations: ["curso", "ambiente"],
    });
    if (!existente) throw new NotFoundException(`Horario #${id} no encontrado`);

    const periodo = await this.periodoRepo.findOne({
      where: { codigo: dto.periodo },
    });
    const periodoCodigo = periodo?.codigo || dto.periodo;

    const validacion = await this.validar(
      {
        docente_id: dto.docente_id,
        curso_id: dto.curso_id,
        ambiente_id: dto.ambiente_id,
        periodo: periodoCodigo,
        dia: dto.dia,
        hora_inicio: dto.hora_inicio,
        hora_fin: dto.hora_fin,
        tipo_clase: dto.tipo_clase,
        grupo_id: dto.grupo_id,
        horario_id: id,
      },
      usuario.contextoAcademico,
    );

    if (!validacion.valido) {
      throw new BadRequestException({
        message: "La reasignación no es válida",
        errores: validacion.errores,
        advertencias: validacion.advertencias,
      });
    }

    const datosAnteriores = {
      ambiente_id: existente.ambiente_id,
      dia: existente.dia,
      hora_inicio: existente.hora_inicio,
      hora_fin: existente.hora_fin,
      curso_codigo: existente.curso?.codigo,
    };

    existente.docente_id = dto.docente_id;
    existente.curso_id = dto.curso_id;
    existente.grupo_id = dto.grupo_id;
    existente.ambiente_id = dto.ambiente_id;
    existente.dia = dto.dia;
    existente.hora_inicio = dto.hora_inicio;
    existente.hora_fin = dto.hora_fin;
    existente.tipo_clase = dto.tipo_clase;
    existente.modificado_por = usuario.email;

    const saved = await this.horarioRepo.save(existente);

    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.HORARIO_ASIGNADO,
      entidad_id: saved.id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.ACTUALIZAR,
      estado_anterior: null,
      estado_nuevo: null,
      datos_anteriores: datosAnteriores,
      datos_nuevos: {
        ambiente_id: saved.ambiente_id,
        dia: saved.dia,
        hora_inicio: saved.hora_inicio,
        hora_fin: saved.hora_fin,
      },
      ip: "0.0.0.0",
    });

    return { id: saved.id, mensaje: "Horario movido exitosamente" };
  }

  async eliminar(id: number, usuario: UsuarioAutenticado) {
    const existente = await this.horarioRepo.findOne({
      where: { id },
      relations: ["curso", "ambiente", "docente"],
    });
    if (!existente) throw new NotFoundException(`Horario #${id} no encontrado`);

    const datosAnteriores = {
      docente_id: existente.docente_id,
      curso_id: existente.curso_id,
      ambiente_id: existente.ambiente_id,
      dia: existente.dia,
      hora_inicio: existente.hora_inicio,
      hora_fin: existente.hora_fin,
      tipo_clase: existente.tipo_clase,
      curso_codigo: existente.curso?.codigo,
    };

    await this.horarioRepo.remove(existente);

    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.HORARIO_ASIGNADO,
      entidad_id: id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.ELIMINAR,
      estado_anterior: null,
      estado_nuevo: null,
      datos_anteriores: datosAnteriores,
      datos_nuevos: null,
      ip: "0.0.0.0",
    });

    return { mensaje: "Horario eliminado exitosamente" };
  }

  async getProgreso(periodoId: number, contexto?: ContextoAcademico) {
    await this.resolvePeriodo(periodoId);

    const docentes = await this.getDocentes(periodoId, contexto);
    const cursosPendientes = await this.getCursosPendientes(
      periodoId,
      contexto,
    );

    const totalDocentes = docentes.length;
    const docentesCompletos = docentes.filter(
      (d) => d.horasLectivasAsignadas >= 16,
    ).length;
    const docentesIncompletos = totalDocentes - docentesCompletos;
    const totalCursos = cursosPendientes.length;
    const totalHorasPendientes = cursosPendientes.reduce((sum, c) => {
      return (
        sum +
        (c.horasTeoria - c.horasAsignadasTeoria) +
        (c.horasPractica - c.horasAsignadasPractica) +
        (c.horasLaboratorio - c.horasAsignadasLaboratorio)
      );
    }, 0);

    const totalHorasRequeridas = docentes.reduce(
      (sum, d) => sum + d.horasLectivasMax,
      0,
    );
    const totalHorasAsignadas = docentes.reduce(
      (sum, d) => sum + d.horasLectivasAsignadas,
      0,
    );

    const distribucionCiclos: Record<
      number,
      { total: number; asignados: number }
    > = {};
    for (const c of cursosPendientes) {
      if (!distribucionCiclos[c.ciclo])
        distribucionCiclos[c.ciclo] = { total: 0, asignados: 0 };
      distribucionCiclos[c.ciclo].total++;
    }

    return {
      totalDocentes,
      docentesCompletos,
      docentesIncompletos,
      totalCursosPendientes: totalCursos,
      totalHorasPendientes: Math.round(totalHorasPendientes),
      totalHorasRequeridas,
      totalHorasAsignadas,
      porcentajeAvance:
        totalHorasRequeridas > 0
          ? Math.round((totalHorasAsignadas / totalHorasRequeridas) * 100)
          : 0,
      distribucionCiclos,
    };
  }

  private calcularDuracionHoras(inicio: string, fin: string): number {
    const hi = this.timeToMinutes(inicio);
    const hf = this.timeToMinutes(fin);
    return (hf - hi) / 60;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  private getBadge(tipoClase: string): string {
    switch (tipoClase) {
      case TipoClase.TEORIA:
        return "TEO";
      case TipoClase.PRACTICA:
        return "PRA";
      case TipoClase.LABORATORIO:
        return "LAB";
      case TipoClase.NO_LECTIVA:
        return "NL";
      default:
        return "??";
    }
  }
}
