import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, In, IsNull } from "typeorm";
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
import { DisponibilidadDocente } from "../../entities/disponibilidad-docente.entity";
import { TipoClase } from "../../common/enums/tipo-clase.enum";
import { EstadoHorario } from "../../common/enums/estado-horario.enum";
import { OrigenHorario } from "../../common/enums/origen-horario.enum";
import { EstadoAsignacionLectiva } from "../../common/enums/estado-asignacion-lectiva.enum";
import { EstadoPeriodo } from "../../common/enums/estado-periodo.enum";
import { EstadoCursoPlan } from "../../common/enums/estado-curso-plan.enum";
import { CrearHorarioLectivoDto } from "./dto/crear-horario-lectivo.dto";
import { ValidarAsignacionDto, ValidacionResultado } from "./dto/validar-asignacion.dto";
import { AuditoriaService } from "../auditoria/auditoria.service";
import { EntidadAuditoriaCarga, AccionAuditoriaCarga } from "../../entities/auditoria-carga.entity";
import { ContextoAcademicoService } from "../../common/services/contexto-academico.service";
import { ContextoAcademico, UsuarioAutenticado } from "../../common/interfaces/contexto-academico.interface";

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
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
    private readonly auditoriaService: AuditoriaService,
    private readonly contextoAcademicoService: ContextoAcademicoService,
  ) {}

  async getCursosPendientes(periodoId: number, contexto?: ContextoAcademico) {
    const periodo = await this.periodoRepo.findOne({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException(`Período #${periodoId} no encontrado`);

    const ofertas = await this.ofertaRepo.find({
      where: { periodo_id: periodoId, activo: true },
      relations: ["curso_plan", "curso_plan.curso"],
    });

    const asignaciones = await this.asignacionRepo.find({
      where: { periodo_id: periodoId, estado: Not(EstadoAsignacionLectiva.RECHAZADO) },
      relations: ["curso_plan"],
    });

    const horasAsignadasMap = new Map<number, { teoria: number; practica: number; laboratorio: number }>();
    for (const a of asignaciones) {
      const key = a.curso_plan_id;
      if (!horasAsignadasMap.has(key)) {
        horasAsignadasMap.set(key, { teoria: 0, practica: 0, laboratorio: 0 });
      }
      const entry = horasAsignadasMap.get(key)!;
      const horas = Number(a.horas_asignadas);
      switch (a.tipo_clase) {
        case TipoClase.TEORIA: entry.teoria += horas; break;
        case TipoClase.PRACTICA: entry.practica += horas; break;
        case TipoClase.LABORATORIO: entry.laboratorio += horas; break;
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

      const asignado = horasAsignadasMap.get(cp.id) || { teoria: 0, practica: 0, laboratorio: 0 };
      const tiposRequeridos: string[] = [];
      if (cp.horas_teoria > 0 && asignado.teoria < cp.horas_teoria) tiposRequeridos.push("TEORIA");
      if (cp.horas_practica > 0 && asignado.practica < cp.horas_practica) tiposRequeridos.push("PRACTICA");
      if (cp.horas_laboratorio > 0 && asignado.laboratorio < cp.horas_laboratorio) tiposRequeridos.push("LABORATORIO");

      if (tiposRequeridos.length === 0) continue;

      const grupos = await this.grupoRepo.find({
        where: { curso_id: curso.id, periodo_academico_id: periodoId },
      });

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
        grupos: grupos.map(g => ({
          id: g.id,
          codigo: g.codigo,
          nombre: g.nombre,
          tipo: g.tipo,
          cupoMaximo: g.cupo_maximo,
        })),
        totalAlumnos: grupos.reduce((sum, g) => sum + (g.cupo_maximo || 0), 0),
      });
    }

    return cursosPendientes;
  }

  async getDocentes(periodoId: number, contexto?: ContextoAcademico) {
    const qb = this.docenteRepo.createQueryBuilder("d")
      .leftJoinAndSelect("d.departamento", "dep")
      .where("d.activo = :activo", { activo: true });

    if (contexto && !contexto.verTodo && contexto.departamentoIds.length > 0) {
      qb.andWhere("d.departamento_id IN (:...deps)", { deps: contexto.departamentoIds });
    }

    const docentes = await qb.getMany();
    const resultado: any[] = [];

    for (const docente of docentes) {
      const asignaciones = await this.asignacionRepo.find({
        where: { docente_id: docente.id, periodo_id: periodoId, estado: Not(EstadoAsignacionLectiva.RECHAZADO) },
      });
      const horasLectivas = asignaciones.reduce((sum, a) => sum + Number(a.horas_asignadas), 0);

      const noLectivos = await this.horarioRepo.find({
        where: { docente_id: docente.id, periodo: String(periodoId), tipo_clase: TipoClase.NO_LECTIVA },
      });
      const horasNoLectivas = noLectivos.reduce((sum, h) => {
        const [hi, mi] = h.hora_inicio.split(":").map(Number);
        const [hf, mf] = h.hora_fin.split(":").map(Number);
        return sum + (hf * 60 + mf - hi * 60 - mi) / 60;
      }, 0);

      const params = await this.paramsRepo.findOne({
        where: { periodo_academico: String(periodoId), modalidad: docente.modalidad },
      });
      const maxHoras = params?.horas_max_semanal ?? 40;

      const horariosExistentes = await this.horarioRepo.find({
        where: { docente_id: docente.id, periodo: String(periodoId), tipo_clase: Not(TipoClase.NO_LECTIVA) },
        relations: ["curso", "ambiente", "grupo"],
      });

      const bloques = horariosExistentes.map(h => ({
        id: `h_${h.id}`,
        dia: h.dia,
        horaInicio: h.hora_inicio,
        horaFin: h.hora_fin,
        tipo: "lectiva" as const,
        label: h.curso?.codigo || "",
        cursoId: h.curso_id,
        ambienteId: h.ambiente_id,
        ambienteCodigo: h.ambiente?.codigo || "",
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
        enSuspension: false,
        bloquesExistentes: bloques,
      });
    }

    return resultado;
  }

  async getHorarioDocente(docenteId: number, periodo: string) {
    const horarios = await this.horarioRepo.find({
      where: { docente_id: docenteId, periodo },
      relations: ["curso", "ambiente", "grupo"],
      order: { dia: "ASC", hora_inicio: "ASC" },
    });

    return horarios.map(h => ({
      id: h.id,
      dia: h.dia,
      horaInicio: h.hora_inicio,
      horaFin: h.hora_fin,
      tipo: h.tipo_clase === TipoClase.NO_LECTIVA ? "no-lectiva" : "lectiva",
      tipoClase: h.tipo_clase,
      label: h.curso?.codigo || "",
      sublabel: h.ambiente?.codigo || "",
      cursoId: h.curso_id,
      ambienteId: h.ambiente_id,
      ambienteCodigo: h.ambiente?.codigo || "",
      grupoId: h.grupo_id,
      grupoCodigo: h.grupo?.codigo || "",
      badge: h.tipo_clase === TipoClase.TEORIA ? "TEO" :
             h.tipo_clase === TipoClase.PRACTICA ? "PRA" :
             h.tipo_clase === TipoClase.LABORATORIO ? "LAB" : "NL",
    }));
  }

  async getAmbientes(periodo: string, contexto?: ContextoAcademico) {
    const ambientes = await this.ambienteRepo.find({
      where: { activo: true },
      order: { codigo: "ASC" },
    });

    const resultado: any[] = [];
    for (const amb of ambientes) {
      const ocupacion = await this.horarioRepo.find({
        where: { ambiente_id: amb.id, periodo },
        relations: ["curso", "docente"],
        order: { dia: "ASC", hora_inicio: "ASC" },
      });

      const bloques = ocupacion.map(h => ({
        id: `a_${h.id}`,
        dia: h.dia,
        horaInicio: h.hora_inicio,
        horaFin: h.hora_fin,
        tipo: "lectiva" as const,
        label: h.curso?.codigo || "",
        docenteId: h.docente_id,
        docenteNombre: h.docente ? `${h.docente.apellidos} ${h.docente.nombres}` : "",
      }));

      resultado.push({
        id: amb.id,
        codigo: amb.codigo,
        nombre: amb.nombre,
        tipo: amb.tipo,
        capacidad: amb.capacidad,
        piso: amb.piso,
        pabellon: amb.pabellon,
        estado: amb.estado,
        activo: amb.activo,
        bloquesOcupados: bloques,
        totalBloquesOcupados: bloques.length,
      });
    }

    return resultado;
  }

  async getOcupacionAmbiente(ambienteId: number, periodo: string) {
    const ambiente = await this.ambienteRepo.findOne({ where: { id: ambienteId } });
    if (!ambiente) throw new NotFoundException(`Ambiente #${ambienteId} no encontrado`);

    const ocupacion = await this.horarioRepo.find({
      where: { ambiente_id: ambienteId, periodo },
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
      bloques: ocupacion.map(h => ({
        id: h.id,
        dia: h.dia,
        horaInicio: h.hora_inicio,
        horaFin: h.hora_fin,
        tipoClase: h.tipo_clase,
        cursoCodigo: h.curso?.codigo || "",
        cursoNombre: h.curso?.nombre || "",
        docenteNombre: h.docente ? `${h.docente.apellidos} ${h.docente.nombres}` : "",
        grupoCodigo: h.grupo?.codigo || "",
      })),
    };
  }

  async validar(dto: ValidarAsignacionDto, contexto?: ContextoAcademico): Promise<ValidacionResultado> {
    const errores: string[] = [];
    const advertencias: string[] = [];

    const [docente, curso, ambiente, periodo] = await Promise.all([
      this.docenteRepo.findOne({ where: { id: dto.docente_id } }),
      this.cursoRepo.findOne({ where: { id: dto.curso_id } }),
      this.ambienteRepo.findOne({ where: { id: dto.ambiente_id } }),
      this.periodoRepo.findOne({ where: { id: Number(dto.periodo) } }),
    ]);

    if (!docente) { errores.push("Docente no encontrado"); return { valido: false, errores, advertencias }; }
    if (!curso) { errores.push("Curso no encontrado"); return { valido: false, errores, advertencias }; }
    if (!ambiente) { errores.push("Ambiente no encontrado"); return { valido: false, errores, advertencias }; }
    if (!periodo) { errores.push("Período no encontrado"); return { valido: false, errores, advertencias }; }

    if (!docente.activo) errores.push("El docente no está activo");
    if (ambiente.estado !== "ACTIVO") errores.push("El ambiente no está activo");

    const estadosPermitidos = [EstadoPeriodo.PLANIFICACION, EstadoPeriodo.ASIGNACION_HORARIOS, EstadoPeriodo.EN_CURSO];
    if (!estadosPermitidos.includes(periodo.estado as any)) {
      errores.push(`El período no permite asignaciones (estado: ${periodo.estado})`);
    }

    const horasInicio = this.timeToMinutes(dto.hora_inicio);
    const horasFin = this.timeToMinutes(dto.hora_fin);
    if (horasFin <= horasInicio) errores.push("La hora fin debe ser posterior a la hora inicio");
    if (horasInicio < 420 || horasFin > 1320) errores.push("La franja horaria debe estar entre 07:00 y 22:00");

    const cruceDocente = await this.horarioRepo.findOne({
      where: {
        docente_id: dto.docente_id,
        periodo: dto.periodo,
        dia: dto.dia,
        id: dto.horario_id ? Not(dto.horario_id) : undefined,
      },
    });
    if (cruceDocente) {
      const cruceInicio = this.timeToMinutes(cruceDocente.hora_inicio);
      const cruceFin = this.timeToMinutes(cruceDocente.hora_fin);
      if (horasInicio < cruceFin && horasFin > cruceInicio) {
        errores.push(`Conflicto de horario del docente: ${cruceDocente.curso?.codigo} (${cruceDocente.hora_inicio}-${cruceDocente.hora_fin})`);
      }
    }

    const cruceAmbiente = await this.horarioRepo.findOne({
      where: {
        ambiente_id: dto.ambiente_id,
        periodo: dto.periodo,
        dia: dto.dia,
        id: dto.horario_id ? Not(dto.horario_id) : undefined,
      },
    });
    if (cruceAmbiente) {
      const cruceInicio = this.timeToMinutes(cruceAmbiente.hora_inicio);
      const cruceFin = this.timeToMinutes(cruceAmbiente.hora_fin);
      if (horasInicio < cruceFin && horasFin > cruceInicio) {
        errores.push(`Conflicto de aula: ${cruceAmbiente.curso?.codigo} ya ocupa este horario (${cruceAmbiente.hora_inicio}-${cruceAmbiente.hora_fin})`);
      }
    }

    const duracionHoras = (horasFin - horasInicio) / 60;
    const params = await this.paramsRepo.findOne({
      where: { periodo_academico: dto.periodo, modalidad: docente.modalidad },
    });
    const maxHoras = params?.horas_max_semanal ?? 40;

    const asignacionesActuales = await this.asignacionRepo.find({
      where: { docente_id: dto.docente_id, periodo_id: Number(dto.periodo), estado: Not(EstadoAsignacionLectiva.RECHAZADO) },
    });
    const horasLectivasActuales = asignacionesActuales.reduce((sum, a) => sum + Number(a.horas_asignadas), 0);

    if (!dto.horario_id) {
      const nuevaTotal = horasLectivasActuales + duracionHoras;
      if (nuevaTotal > maxHoras) {
        errores.push(`Excede carga máxima: ${nuevaTotal}h > ${maxHoras}h (lectivas actuales: ${horasLectivasActuales}h)`);
      }
      if (nuevaTotal < 16 && horasLectivasActuales === 0) {
        advertencias.push(`Carga menor al mínimo recomendado: ${nuevaTotal}h < 16h`);
      }
    }

    if (ambiente.capacidad && dto.nro_alumnos && dto.nro_alumnos > ambiente.capacidad) {
      advertencias.push(`N° de alumnos (${dto.nro_alumnos}) excede capacidad del aula (${ambiente.capacidad})`);
    }

    return {
      valido: errores.length === 0,
      errores,
      advertencias,
    };
  }

  async asignar(dto: CrearHorarioLectivoDto, usuario: UsuarioAutenticado) {
    const validacion = await this.validar({
      docente_id: dto.docente_id,
      curso_id: dto.curso_id,
      ambiente_id: dto.ambiente_id,
      periodo: dto.periodo,
      dia: dto.dia,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      tipo_clase: dto.tipo_clase,
      grupo_id: dto.grupo_id,
    }, usuario.contextoAcademico);

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
      periodo: dto.periodo,
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
          periodo_id: Number(dto.periodo),
          tipo_clase: dto.tipo_clase,
          seccion: dto.seccion,
          grupo_id: dto.grupo_id ?? IsNull(),
        },
      });

      if (!existingAsig) {
        const duracionHoras = (this.timeToMinutes(dto.hora_fin) - this.timeToMinutes(dto.hora_inicio)) / 60;
        const asig = this.asignacionRepo.create({
          docente_id: dto.docente_id,
          curso_plan_id: dto.curso_plan_id,
          periodo_id: Number(dto.periodo),
          grupo_id: dto.grupo_id,
          tipo_clase: dto.tipo_clase,
          seccion: dto.seccion,
          nro_alumnos: dto.nro_alumnos || 0,
          horas_asignadas: duracionHoras,
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

    return {
      id: saved.id,
      mensaje: "Asignación creada exitosamente",
    };
  }

  async mover(id: number, dto: CrearHorarioLectivoDto, usuario: UsuarioAutenticado) {
    const existente = await this.horarioRepo.findOne({ where: { id }, relations: ["curso", "ambiente"] });
    if (!existente) throw new NotFoundException(`Horario #${id} no encontrado`);

    const validacion = await this.validar({
      docente_id: dto.docente_id,
      curso_id: dto.curso_id,
      ambiente_id: dto.ambiente_id,
      periodo: dto.periodo,
      dia: dto.dia,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      tipo_clase: dto.tipo_clase,
      grupo_id: dto.grupo_id,
      horario_id: id,
    }, usuario.contextoAcademico);

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
    const periodo = await this.periodoRepo.findOne({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException(`Período #${periodoId} no encontrado`);

    const docentes = await this.getDocentes(periodoId, contexto);
    const cursosPendientes = await this.getCursosPendientes(periodoId, contexto);

    const totalDocentes = docentes.length;
    const docentesCompletos = docentes.filter(d => d.horasLectivasAsignadas >= 16).length;
    const docentesIncompletos = totalDocentes - docentesCompletos;
    const totalCursos = cursosPendientes.length;
    const totalHorasPendientes = cursosPendientes.reduce((sum, c) => {
      return sum + (c.horasTeoria - c.horasAsignadasTeoria)
        + (c.horasPractica - c.horasAsignadasPractica)
        + (c.horasLaboratorio - c.horasAsignadasLaboratorio);
    }, 0);

    const totalHorasRequeridas = docentes.reduce((sum, d) => sum + d.horasLectivasMax, 0);
    const totalHorasAsignadas = docentes.reduce((sum, d) => sum + d.horasLectivasAsignadas, 0);

    return {
      totalDocentes,
      docentesCompletos,
      docentesIncompletos,
      totalCursosPendientes: totalCursos,
      totalHorasPendientes: Math.round(totalHorasPendientes),
      totalHorasRequeridas,
      totalHorasAsignadas,
      porcentajeAvance: totalHorasRequeridas > 0
        ? Math.round((totalHorasAsignadas / totalHorasRequeridas) * 100)
        : 0,
    };
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }
}
