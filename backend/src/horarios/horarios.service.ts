import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Cache } from "cache-manager";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Docente } from "../entities/docente.entity";
import { Curso } from "../entities/curso.entity";
import { Grupo } from "../entities/grupo.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { AsignacionLectiva } from "../entities/asignacion-lectiva.entity";
import { EstadoAsignacionLectiva } from "../common/enums/estado-asignacion-lectiva.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { EstadoAmbiente } from "../common/enums/estado-ambiente.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";
import { ReasignarHorarioDto } from "./dto/reasignar-horario.dto";
import { CrearAsignacionDto } from "./dto/crear-asignacion.dto";
import { CrearHorarioCargaLectivaDto } from "./dto/crear-horario-carga-lectiva.dto";
import { UpdateHorarioCargaLectivaDto } from "./dto/update-horario-carga-lectiva.dto";
import { ValidarAsignacionDto } from "./dto/validar-asignacion.dto";
import {
  GuardarBatchCargaLectivaDto,
  BloqueHorarioDto,
} from "./dto/guardar-batch-carga-lectiva.dto";
import { ValidacionesService as CommonValidacionesService } from "../common/services/validaciones.service";
import { CacheKeyRegistry } from "../common/cache/cache-key-registry";
import { ValidacionesService as GlobalValidacionesService } from "../validaciones/validaciones.service";
import { AuditoriaService } from "../modules/auditoria/auditoria.service";
import {
  EntidadAuditoriaCarga,
  AccionAuditoriaCarga,
} from "../entities/auditoria-carga.entity";

@Injectable()
export class HorariosService {
  private readonly logger = new Logger(HorariosService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(ConflictoAsignacion)
    private readonly conflictoRepo: Repository<ConflictoAsignacion>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(DeclaracionCargaHoraria)
    private readonly declaracionRepo: Repository<DeclaracionCargaHoraria>,
    @InjectRepository(AsignacionLectiva)
    private readonly asignacionLectivaRepo: Repository<AsignacionLectiva>,
    private readonly dataSource: DataSource,
    private readonly commonValidacionesService: CommonValidacionesService,
    private readonly validacionesService: GlobalValidacionesService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAllByPeriodo(periodo: string, page = 1, limit = 20) {
    const [items, total] = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .leftJoinAndSelect("horario.asignacion_lectiva", "asignacion_lectiva")
      .where("horario.periodo = :periodo", { periodo })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`horarios_periodo_${periodo}_${page}_${limit}`, 60000)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findByDocente(
    docenteId: number,
    periodo: string,
    page = 1,
    limit = 20,
  ) {
    // Invalidar caché para asegurar datos frescos
    await this.cacheManager.del(
      `horarios_periodo_${periodo}_docente_${docenteId}_${page}_${limit}`,
    );

    const [items, total] = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("docente.id = :docenteId", { docenteId })
      .andWhere("horario.periodo = :periodo", { periodo })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findByAmbiente(
    ambienteId: number,
    periodo: string,
    page = 1,
    limit = 20,
  ) {
    const [items, total] = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("ambiente.id = :ambienteId", { ambienteId })
      .andWhere("horario.periodo = :periodo", { periodo })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .cache(
        `horarios_periodo_${periodo}_ambiente_${ambienteId}_${page}_${limit}`,
        60000,
      )
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findByDia(dia: number, periodo: string, page = 1, limit = 50) {
    const [items, total] = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("horario.dia = :dia", { dia })
      .andWhere("horario.periodo = :periodo", { periodo })
      .orderBy("horario.hora_inicio", "ASC")
      .addOrderBy("horario.hora_fin", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findConflictos(periodo: string, page = 1, limit = 20) {
    const [items, total] = await this.conflictoRepo
      .createQueryBuilder("conflicto")
      .leftJoinAndSelect("conflicto.docente", "docente")
      .leftJoinAndSelect("conflicto.ambiente", "ambiente")
      .where("conflicto.periodo_academico = :periodo", { periodo })
      .orderBy("conflicto.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`conflictos_periodo_${periodo}_${page}_${limit}`, 60000)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findHorariosByDocenteEmail(email: string, periodo: string) {
    const docente = await this.docenteRepo.findOne({ where: { email } });
    if (!docente) throw new NotFoundException("Docente no encontrado");

    const horarios = await this.findHorariosByDocenteId(docente.id, periodo);

    return {
      horarios,
      docente: {
        id: docente.id,
        nombres: docente.nombres,
        apellidos: docente.apellidos,
        codigo: docente.codigo,
        email: docente.email,
      },
    };
  }

  async getDocenteById(docenteId: number) {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) throw new NotFoundException("Docente no encontrado");
    return {
      id: docente.id,
      nombres: docente.nombres,
      apellidos: docente.apellidos,
      codigo: docente.codigo,
      email: docente.email,
      categoria: docente.categoria,
    };
  }

  async findHorariosByDocenteId(docenteId: number, periodo: string) {
    const horarios: any[] = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("docente.id = :docenteId", { docenteId })
      .andWhere("horario.periodo = :periodo", { periodo })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .getMany();

    // Obtener carga no lectiva de la declaración si existe
    const declaracion = await this.declaracionRepo.findOne({
      where: { docente_id: docenteId },
      relations: ["periodo_academico"],
    });

    if (declaracion && declaracion.periodo_academico?.codigo === periodo) {
      const estadosAprobados = [
        "VALIDADO_DPTO",
        "APROBADO_FACULTAD",
        "CERRADO",
      ];
      if (estadosAprobados.includes(declaracion.estado)) {
        const cargaNoLectiva =
          (declaracion.carga_no_lectiva as any)?.actividades || [];
        for (const actividad of cargaNoLectiva) {
          if (actividad.horarios && Array.isArray(actividad.horarios)) {
            for (const h of actividad.horarios) {
              horarios.push({
                id: 0,
                dia: h.dia,
                dia_semana: h.dia,
                hora_inicio: h.hora_inicio,
                hora_fin: h.hora_fin,
                tipo_clase: TipoClase.NO_LECTIVA,
                curso: null,
                ambiente: null,
                grupo: null,
                docente: null,
                periodo: periodo,
                actividad_nombre:
                  actividad.descripcion ||
                  actividad.nombre ||
                  `Actividad ${actividad.id}`,
              });
            }
          }
        }
      }
    }

    return horarios;
  }

  async getOcupacionHeatmap(periodo: string) {
    const data = await this.horarioRepo
      .createQueryBuilder("h")
      .select("h.dia", "dia")
      .addSelect("h.hora_inicio", "hora_inicio")
      .addSelect("h.hora_fin", "hora_fin")
      .addSelect("COUNT(h.id)", "count")
      .where("h.periodo = :periodo", { periodo })
      .groupBy("h.dia")
      .addGroupBy("h.hora_inicio")
      .addGroupBy("h.hora_fin")
      .getRawMany();
    return data;
  }

  async reasignarManual(
    id: number,
    dto: ReasignarHorarioDto,
  ): Promise<HorarioAsignado> {
    const horario = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("horario.id = :id", { id })
      .getOne();

    if (!horario) throw new NotFoundException(`Horario ${id} no encontrado`);

    const dia = dto.dia_semana ?? horario.dia;
    const horaInicio = dto.hora_inicio ?? horario.hora_inicio;
    const horaFin = dto.hora_fin ?? horario.hora_fin;

    const franja = await this.validacionesService.verificarFranjaInstitucional(
      dia,
      horaInicio,
      horaFin,
    );
    if (!franja.valido) {
      throw new ConflictException(franja.motivo);
    }

    const disponibilidad =
      await this.validacionesService.verificarDisponibilidadDocente(
        horario.docente.id,
        dia,
        horaInicio,
        horaFin,
        horario.periodo,
      );
    if (!disponibilidad.valido) {
      throw new ConflictException(disponibilidad.motivo);
    }

    const cruceDoc = await this.validacionesService.verificarCruceDocente(
      horario.docente.id,
      dia,
      horaInicio,
      horaFin,
      horario.periodo,
      id,
    );
    if (!cruceDoc.valido) {
      throw new ConflictException(cruceDoc.motivo);
    }

    const ambienteId = dto.ambiente_id ?? horario.ambiente.id;
    const cruceAmb = await this.validacionesService.verificarCruceAmbiente(
      ambienteId,
      dia,
      horaInicio,
      horaFin,
      horario.periodo,
      id,
    );
    if (!cruceAmb.valido) {
      throw new ConflictException(cruceAmb.motivo);
    }

    if (horario.grupo) {
      const cruceGrupo = await this.validacionesService.verificarCruceGrupo(
        horario.grupo.id,
        dia,
        horaInicio,
        horaFin,
        horario.periodo,
        id,
      );
      if (!cruceGrupo.valido) {
        throw new ConflictException(cruceGrupo.motivo);
      }
    }

    horario.dia_semana = dia;
    horario.hora_inicio = horaInicio;
    horario.hora_fin = horaFin;
    horario.estado = EstadoHorario.BORRADOR;

    if (dto.ambiente_id) {
      const nuevoAmbiente = await this.ambienteRepo.findOne({
        where: { id: dto.ambiente_id },
      });
      if (!nuevoAmbiente)
        throw new NotFoundException(
          `Ambiente ${dto.ambiente_id} no encontrado`,
        );
      horario.ambiente = nuevoAmbiente;
    }

    const updated = await this.horarioRepo.save(horario);
    await this.invalidateHorariosCache();
    return updated;
  }

  async crearAsignacion(dto: CrearAsignacionDto): Promise<HorarioAsignado> {
    const docente = await this.docenteRepo.findOne({
      where: { id: dto.docente_id },
      relations: ["disponibilidades"],
    });
    if (!docente)
      throw new NotFoundException(`Docente ${dto.docente_id} no encontrado`);

    const curso = await this.cursoRepo.findOne({
      where: { id: dto.curso_id },
    });
    if (!curso)
      throw new NotFoundException(`Curso ${dto.curso_id} no encontrado`);

    const ambiente = await this.ambienteRepo.findOne({
      where: { id: dto.ambiente_id },
    });
    if (!ambiente)
      throw new NotFoundException(`Ambiente ${dto.ambiente_id} no encontrado`);

    if (ambiente.estado !== EstadoAmbiente.ACTIVO) {
      throw new BadRequestException(
        `El ambiente ${ambiente.codigo} no está activo (estado: ${ambiente.estado})`,
      );
    }

    const franja = await this.validacionesService.verificarFranjaInstitucional(
      dto.dia_semana,
      dto.hora_inicio,
      dto.hora_fin,
    );
    if (!franja.valido) {
      throw new ConflictException(franja.motivo);
    }

    const disponibilidad =
      await this.validacionesService.verificarDisponibilidadDocente(
        dto.docente_id,
        dto.dia_semana,
        dto.hora_inicio,
        dto.hora_fin,
        dto.periodo_academico,
      );
    if (!disponibilidad.valido) {
      throw new ConflictException(disponibilidad.motivo);
    }

    const cruceDoc = await this.validacionesService.verificarCruceDocente(
      dto.docente_id,
      dto.dia_semana,
      dto.hora_inicio,
      dto.hora_fin,
      dto.periodo_academico,
    );
    if (!cruceDoc.valido) {
      throw new ConflictException(cruceDoc.motivo);
    }

    const cruceAmb = await this.validacionesService.verificarCruceAmbiente(
      dto.ambiente_id,
      dto.dia_semana,
      dto.hora_inicio,
      dto.hora_fin,
      dto.periodo_academico,
    );
    if (!cruceAmb.valido) {
      throw new ConflictException(cruceAmb.motivo);
    }

    const grupo = await this.grupoRepo.findOne({
      where: { id: dto.grupo_id },
      relations: ["curso"],
    });
    if (!grupo)
      throw new NotFoundException(`Grupo con ID ${dto.grupo_id} no encontrado`);

    if (grupo.curso.id !== dto.curso_id) {
      throw new BadRequestException(
        `El grupo con ID ${dto.grupo_id} no pertenece al curso seleccionado`,
      );
    }

    const cruceGrupo = await this.validacionesService.verificarCruceGrupo(
      dto.grupo_id,
      dto.dia_semana,
      dto.hora_inicio,
      dto.hora_fin,
      dto.periodo_academico,
    );
    if (!cruceGrupo.valido) {
      throw new ConflictException(cruceGrupo.motivo);
    }

    const [h, m] = dto.hora_inicio.split(":").map(Number);
    const [hf, mf] = dto.hora_fin.split(":").map(Number);
    const duracionHoras = (hf * 60 + mf - (h * 60 + m)) / 60;

    const cargaSemanal =
      await this.commonValidacionesService.verificarCargaHorariaSemanalDocente(
        dto.docente_id,
        duracionHoras,
        dto.periodo_academico,
      );
    if (!cargaSemanal.valido) {
      throw new BadRequestException(
        `El docente supera su carga horaria semanal máxima (${cargaSemanal.horasSemana + duracionHoras}h > ${cargaSemanal.maxSemanal}h permitidas)`,
      );
    }

    const cursosCheck =
      await this.commonValidacionesService.verificarCursosDocente(
        dto.docente_id,
        dto.periodo_academico,
        dto.curso_id,
      );
    if (!cursosCheck.valido) {
      throw new BadRequestException(
        `El docente supera la cantidad máxima de cursos permitidos (máx. ${cursosCheck.maxCursos})`,
      );
    }

    const nuevaAsignacion = this.horarioRepo.create({
      docente,
      curso,
      ambiente,
      grupo,
      dia: dto.dia_semana,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      tipo_clase: dto.tipo_clase,
      periodo: dto.periodo_academico,
      estado: EstadoHorario.BORRADOR,
      origen: OrigenHorario.AJUSTE_MANUAL,
    });

    const saved = await this.horarioRepo.save(nuevaAsignacion);
    await this.invalidateHorariosCache();
    return saved;
  }

  private async obtenerConflictosDocente(
    docenteId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<string> {
    const conflictos = await this.horarioRepo
      .createQueryBuilder("h")
      .leftJoinAndSelect("h.curso", "curso")
      .where("h.docente_id = :docenteId", { docenteId })
      .andWhere("h.dia = :diaSemana", { diaSemana })
      .andWhere("h.periodo = :periodo", { periodo })
      .andWhere("h.hora_inicio < CAST(:horaFin AS TIME)", { horaFin })
      .andWhere("h.hora_fin > CAST(:horaInicio AS TIME)", { horaInicio })
      .getMany();

    return conflictos
      .map(
        (c) =>
          `${c.curso?.nombre || "Asignación"} (${c.hora_inicio.substring(0, 5)} - ${c.hora_fin.substring(0, 5)})`,
      )
      .join(", ");
  }

  private async obtenerConflictosAmbiente(
    ambienteId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<string> {
    const conflictos = await this.horarioRepo
      .createQueryBuilder("h")
      .leftJoinAndSelect("h.curso", "curso")
      .where("h.ambiente_id = :ambienteId", { ambienteId })
      .andWhere("h.dia = :diaSemana", { diaSemana })
      .andWhere("h.periodo = :periodo", { periodo })
      .andWhere("h.hora_inicio < CAST(:horaFin AS TIME)", { horaFin })
      .andWhere("h.hora_fin > CAST(:horaInicio AS TIME)", { horaInicio })
      .getMany();

    return conflictos
      .map(
        (c) =>
          `${c.curso?.nombre || "Asignación"} (${c.hora_inicio.substring(0, 5)} - ${c.hora_fin.substring(0, 5)})`,
      )
      .join(", ");
  }

  async invalidateHorariosCache(): Promise<void> {
    const prefixes = ["http_cache:GET:/horarios", "http_cache:GET:/dashboard"];

    for (const prefix of prefixes) {
      const keys = CacheKeyRegistry.findByPrefix(prefix);
      for (const key of keys) {
        await this.cacheManager.del(key);
        CacheKeyRegistry.forget(key);
      }
    }
  }

  async getMatrizDisponibilidad(periodo: string, ambienteIds?: number[]) {
    const horas: string[] = [];
    for (let h = 7; h <= 21; h++) {
      horas.push(`${h.toString().padStart(2, "0")}:00`);
    }
    const diasSemana = [1, 2, 3, 4, 5, 6]; // Mon-Sat

    const matriz: any[] = [];

    // Get all assigned schedules for the period
    const query = this.horarioRepo
      .createQueryBuilder("h")
      .leftJoinAndSelect("h.docente", "docente")
      .leftJoinAndSelect("h.curso", "curso")
      .leftJoinAndSelect("h.grupo", "grupo")
      .leftJoinAndSelect("h.ambiente", "ambiente")
      .where("h.periodo = :periodo", { periodo })
      .andWhere("h.estado = :estado", { estado: EstadoHorario.PUBLICADO });

    if (ambienteIds && ambienteIds.length > 0) {
      query.andWhere("h.ambiente_id IN (:...ambienteIds)", { ambienteIds });
    }

    const horarios = await query.getMany();

    for (const dia of diasSemana) {
      for (const hora of horas) {
        const horaFin = this.calcularHoraFin(hora);

        // Check if this cell is occupied
        const ocupado = horarios.find(
          (h) => h.dia === dia && h.hora_inicio === hora,
        );

        if (ocupado) {
          matriz.push({
            dia,
            horaInicio: hora,
            horaFin,
            estado: "OCUPADO",
            metadata: {
              docenteNombre: ocupado.docente?.apellidos,
              cursoNombre: ocupado.curso?.nombre,
              grupo: ocupado.grupo?.codigo,
              ambienteCodigo: ocupado.ambiente?.codigo,
            },
          });
        } else {
          matriz.push({
            dia,
            horaInicio: hora,
            horaFin,
            estado: "LIBRE",
          });
        }
      }
    }

    return matriz;
  }

  private calcularHoraFin(horaInicio: string): string {
    const [h, m] = horaInicio.split(":").map(Number);
    const proximaHora = h + 1;
    return `${proximaHora.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }

  // ─── MÉTODOS PARA CARGA LECTIVA ────────────────────────────────────────

  async getAsignacionesPendientes(
    periodoId: number,
    facultadId?: number,
    deptoId?: number,
    escuelaId?: number,
  ): Promise<any> {
    const query = this.asignacionLectivaRepo
      .createQueryBuilder("al")
      .leftJoinAndSelect("al.docente", "docente")
      .leftJoinAndSelect("al.curso_plan", "cp")
      .leftJoinAndSelect("cp.curso", "curso")
      .leftJoinAndSelect("al.grupo", "grupo")
      .where("al.periodo_id = :periodoId", { periodoId })
      .andWhere("al.estado IN (:...estados)", {
        estados: [
          EstadoAsignacionLectiva.PENDIENTE,
          EstadoAsignacionLectiva.CONFIRMADO,
          EstadoAsignacionLectiva.RECHAZADO,
        ],
      });

    // Filtros de contexto académico
    if (facultadId) {
      query.andWhere("curso.facultad_id = :facultadId", { facultadId });
    }
    if (deptoId) {
      query.andWhere("curso.departamento_id = :deptoId", { deptoId });
    }
    if (escuelaId) {
      query.andWhere("curso.escuela_id = :escuelaId", { escuelaId });
    }

    const asignaciones = await query.getMany();

    // Contar horarios por asignación (para que el frontend sepa cuáles ya tienen programación)
    const asignacionesConInfo: any[] = [];
    for (const asignacion of asignaciones) {
      const horariosCount = await this.horarioRepo.count({
        where: { asignacion_lectiva_id: asignacion.id },
      });
      asignacionesConInfo.push({
        id: asignacion.id,
        docente_id: asignacion.docente_id,
        curso_plan_id: asignacion.curso_plan_id,
        periodo_id: asignacion.periodo_id,
        grupo_id: asignacion.grupo_id,
        tipo_clase: asignacion.tipo_clase,
        seccion: asignacion.seccion,
        horas_asignadas: asignacion.horas_asignadas,
        nro_alumnos: asignacion.nro_alumnos,
        estado: asignacion.estado,
        observaciones: asignacion.observaciones,
        docente: asignacion.docente,
        curso_plan: asignacion.curso_plan,
        grupo: asignacion.grupo,
        horariosCount,
      });
    }

    // Agrupar por docente
    const agrupadas: Record<number, any> = {};
    for (const asignacion of asignacionesConInfo) {
      const docenteId = asignacion.docente_id;
      if (!agrupadas[docenteId]) {
        agrupadas[docenteId] = {
          docente: asignacion.docente,
          asignaciones: [],
        };
      }
      agrupadas[docenteId].asignaciones.push(asignacion);
    }

    return agrupadas;
  }

  async findByAsignacionLectiva(
    asignacionLectivaId: number,
  ): Promise<HorarioAsignado[]> {
    return this.horarioRepo.find({
      where: { asignacion_lectiva_id: asignacionLectivaId },
      relations: ["docente", "curso", "ambiente", "grupo"],
    });
  }

  async crearHorarioCargaLectiva(
    dto: CrearHorarioCargaLectivaDto,
    usuario: any,
  ): Promise<HorarioAsignado> {
    // Validar que asignación lectiva existe y está CONFIRMADA
    const asignacion = await this.asignacionLectivaRepo.findOne({
      where: { id: dto.asignacion_lectiva_id },
      relations: [
        "docente",
        "curso_plan",
        "curso_plan.curso",
        "grupo",
        "periodo",
      ],
    });

    if (!asignacion) {
      throw new NotFoundException("Asignación lectiva no encontrada");
    }
    if (asignacion.estado !== EstadoAsignacionLectiva.CONFIRMADO) {
      throw new BadRequestException(
        "Solo se pueden asignar horarios a asignaciones confirmadas",
      );
    }

    // Validar ambiente
    const ambiente = await this.ambienteRepo.findOne({
      where: { id: dto.ambiente_id },
    });
    if (!ambiente) {
      throw new NotFoundException("Ambiente no encontrado");
    }
    if (ambiente.estado !== EstadoAmbiente.ACTIVO) {
      throw new BadRequestException(
        `El ambiente ${ambiente.codigo} no está activo (estado: ${ambiente.estado})`,
      );
    }

    // Validar aforo
    if (asignacion.nro_alumnos > ambiente.capacidad) {
      throw new BadRequestException(
        `El aula tiene capacidad insuficiente (${ambiente.capacidad} alumnos para ${asignacion.nro_alumnos})`,
      );
    }

    // Validaciones existentes (franja, disponibilidad, cruces)
    const periodo = asignacion.periodo.codigo;
    const franja = await this.validacionesService.verificarFranjaInstitucional(
      dto.dia,
      dto.hora_inicio,
      dto.hora_fin,
    );
    if (!franja.valido) {
      throw new ConflictException(franja.motivo);
    }

    const disponibilidad =
      await this.validacionesService.verificarDisponibilidadDocente(
        asignacion.docente.id,
        dto.dia,
        dto.hora_inicio,
        dto.hora_fin,
        periodo,
      );
    if (!disponibilidad.valido) {
      throw new ConflictException(disponibilidad.motivo);
    }

    const cruceDoc = await this.validacionesService.verificarCruceDocente(
      asignacion.docente.id,
      dto.dia,
      dto.hora_inicio,
      dto.hora_fin,
      periodo,
    );
    if (!cruceDoc.valido) {
      throw new ConflictException(cruceDoc.motivo);
    }

    const cruceAmb = await this.validacionesService.verificarCruceAmbiente(
      dto.ambiente_id,
      dto.dia,
      dto.hora_inicio,
      dto.hora_fin,
      periodo,
    );
    if (!cruceAmb.valido) {
      throw new ConflictException(cruceAmb.motivo);
    }

    if (asignacion.grupo) {
      const cruceGrupo = await this.validacionesService.verificarCruceGrupo(
        asignacion.grupo.id,
        dto.dia,
        dto.hora_inicio,
        dto.hora_fin,
        periodo,
      );
      if (!cruceGrupo.valido) {
        throw new ConflictException(cruceGrupo.motivo);
      }
    }

    // Validar cruces con carga no lectiva
    const crucesNoLectiva = await this.validarCrucesNoLectiva(
      asignacion.docente.id,
      asignacion.periodo_id,
      dto.dia,
      dto.hora_inicio,
      dto.hora_fin,
    );
    if (crucesNoLectiva.tieneCruce) {
      throw new ConflictException(
        `Conflicto con carga no lectiva: ${crucesNoLectiva.actividades
          .map((a) => a.nombre)
          .join(", ")}`,
      );
    }

    // Validar horas totales no excedan asignación
    const horariosExistentes = await this.findByAsignacionLectiva(
      dto.asignacion_lectiva_id,
    );
    const [h, m] = dto.hora_inicio.split(":").map(Number);
    const [hf, mf] = dto.hora_fin.split(":").map(Number);
    const duracionNueva = (hf * 60 + mf - (h * 60 + m)) / 60;

    const horasExistentes = horariosExistentes.reduce((sum, h) => {
      const [hi, mi] = h.hora_inicio.split(":").map(Number);
      const [hf2, mf2] = h.hora_fin.split(":").map(Number);
      return sum + (hf2 * 60 + mf2 - (hi * 60 + mi)) / 60;
    }, 0);

    if (horasExistentes + duracionNueva > asignacion.horas_asignadas) {
      throw new BadRequestException(
        `Las horas totales (${horasExistentes + duracionNueva}h) exceden las horas asignadas (${asignacion.horas_asignadas}h)`,
      );
    }

    // Crear horario
    const nuevoHorario = this.horarioRepo.create({
      docente: asignacion.docente,
      curso: asignacion.curso_plan.curso,
      ambiente,
      grupo: asignacion.grupo,
      dia: dto.dia,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      tipo_clase: asignacion.tipo_clase,
      periodo,
      estado: EstadoHorario.BORRADOR,
      origen: OrigenHorario.ASIGNACION_LECTIVA,
      asignacion_lectiva: asignacion,
    });

    const saved = await this.horarioRepo.save(nuevoHorario);
    await this.invalidateHorariosCache();
    return saved;
  }

  async actualizarHorarioCargaLectiva(
    id: number,
    dto: UpdateHorarioCargaLectivaDto,
    usuario: any,
  ): Promise<HorarioAsignado> {
    const horario = await this.horarioRepo.findOne({
      where: { id },
      relations: ["asignacion_lectiva", "docente", "ambiente"],
    });

    if (!horario) {
      throw new NotFoundException(`Horario ${id} no encontrado`);
    }

    if (horario.origen !== OrigenHorario.ASIGNACION_LECTIVA) {
      throw new BadRequestException(
        "Este horario no fue creado desde asignación lectiva",
      );
    }

    // Actualizar campos si se proporcionan
    if (dto.ambiente_id) {
      const ambiente = await this.ambienteRepo.findOne({
        where: { id: dto.ambiente_id },
      });
      if (!ambiente) {
        throw new NotFoundException("Ambiente no encontrado");
      }
      if (ambiente.estado !== EstadoAmbiente.ACTIVO) {
        throw new BadRequestException(
          `El ambiente ${ambiente.codigo} no está activo`,
        );
      }
      horario.ambiente = ambiente;
    }

    if (dto.dia) horario.dia = dto.dia;
    if (dto.hora_inicio) horario.hora_inicio = dto.hora_inicio;
    if (dto.hora_fin) horario.hora_fin = dto.hora_fin;

    horario.estado = EstadoHorario.BORRADOR;

    const updated = await this.horarioRepo.save(horario);
    await this.invalidateHorariosCache();
    return updated;
  }

  async eliminarHorarioCargaLectiva(id: number, usuario: any): Promise<void> {
    const horario = await this.horarioRepo.findOne({
      where: { id },
    });

    if (!horario) {
      throw new NotFoundException(`Horario ${id} no encontrado`);
    }

    if (horario.origen !== OrigenHorario.ASIGNACION_LECTIVA) {
      throw new BadRequestException(
        "Este horario no fue creado desde asignación lectiva",
      );
    }

    await this.horarioRepo.delete(id);
    await this.invalidateHorariosCache();
  }

  async validarCrucesNoLectiva(
    docenteId: number,
    periodoId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
  ): Promise<{ tieneCruce: boolean; actividades: any[] }> {
    const declaracion = await this.declaracionRepo.findOne({
      where: { docente_id: docenteId, periodo_academico_id: periodoId },
      relations: ["periodo_academico"],
    });

    if (
      !declaracion ||
      !["VALIDADO_DPTO", "APROBADO_FACULTAD", "CERRADO"].includes(
        declaracion.estado,
      )
    ) {
      return { tieneCruce: false, actividades: [] };
    }

    const cargaNoLectiva =
      (declaracion.carga_no_lectiva as any)?.actividades || [];
    const cruces: any[] = [];

    for (const actividad of cargaNoLectiva) {
      if (!actividad.horarios) continue;
      for (const h of actividad.horarios) {
        if (
          this.seSuperponen(
            h.dia,
            h.hora_inicio,
            h.hora_fin,
            dia,
            horaInicio,
            horaFin,
          )
        ) {
          cruces.push({
            actividad_id: actividad.id,
            nombre: actividad.descripcion || actividad.nombre,
            dia: h.dia,
            hora_inicio: h.hora_inicio,
            hora_fin: h.hora_fin,
          });
        }
      }
    }

    return { tieneCruce: cruces.length > 0, actividades: cruces };
  }

  async validarAsignacion(
    dto: ValidarAsignacionDto,
  ): Promise<{ valido: boolean; errores: string[]; advertencias: string[] }> {
    const errores: string[] = [];
    const advertencias: string[] = [];

    // Validar asignación lectiva
    const asignacion = await this.asignacionLectivaRepo.findOne({
      where: { id: dto.asignacion_lectiva_id },
      relations: [
        "docente",
        "curso_plan",
        "curso_plan.curso",
        "grupo",
        "periodo",
      ],
    });

    if (!asignacion) {
      errores.push("Asignación lectiva no encontrada");
      return { valido: false, errores, advertencias };
    }

    if (asignacion.estado !== EstadoAsignacionLectiva.CONFIRMADO) {
      errores.push("La asignación lectiva no está confirmada");
      return { valido: false, errores, advertencias };
    }

    // Validar ambiente
    const ambiente = await this.ambienteRepo.findOne({
      where: { id: dto.ambiente_id },
    });
    if (!ambiente) {
      errores.push("Ambiente no encontrado");
      return { valido: false, errores, advertencias };
    }

    if (ambiente.estado !== EstadoAmbiente.ACTIVO) {
      errores.push(`El ambiente ${ambiente.codigo} no está activo`);
    }

    // Validar aforo
    if (asignacion.nro_alumnos > ambiente.capacidad) {
      advertencias.push(
        `El aula tiene capacidad insuficiente (${ambiente.capacidad} alumnos para ${asignacion.nro_alumnos})`,
      );
    }

    const periodo = asignacion.periodo.codigo;

    // Validar franja institucional
    const franja = await this.validacionesService.verificarFranjaInstitucional(
      dto.dia,
      dto.hora_inicio,
      dto.hora_fin,
    );
    if (!franja.valido) {
      errores.push(franja.motivo);
    }

    // Validar disponibilidad docente
    const disponibilidad =
      await this.validacionesService.verificarDisponibilidadDocente(
        asignacion.docente.id,
        dto.dia,
        dto.hora_inicio,
        dto.hora_fin,
        periodo,
      );
    if (!disponibilidad.valido) {
      errores.push(disponibilidad.motivo);
    }

    // Validar cruce docente
    const cruceDoc = await this.validacionesService.verificarCruceDocente(
      asignacion.docente.id,
      dto.dia,
      dto.hora_inicio,
      dto.hora_fin,
      periodo,
    );
    if (!cruceDoc.valido) {
      errores.push(cruceDoc.motivo);
    }

    // Validar cruce ambiente
    const cruceAmb = await this.validacionesService.verificarCruceAmbiente(
      dto.ambiente_id,
      dto.dia,
      dto.hora_inicio,
      dto.hora_fin,
      periodo,
    );
    if (!cruceAmb.valido) {
      errores.push(cruceAmb.motivo);
    }

    // Validar cruce grupo
    if (asignacion.grupo) {
      const cruceGrupo = await this.validacionesService.verificarCruceGrupo(
        asignacion.grupo.id,
        dto.dia,
        dto.hora_inicio,
        dto.hora_fin,
        periodo,
      );
      if (!cruceGrupo.valido) {
        errores.push(cruceGrupo.motivo);
      }
    }

    // Validar cruces con carga no lectiva
    const crucesNoLectiva = await this.validarCrucesNoLectiva(
      asignacion.docente.id,
      asignacion.periodo_id,
      dto.dia,
      dto.hora_inicio,
      dto.hora_fin,
    );
    if (crucesNoLectiva.tieneCruce) {
      errores.push(
        `Conflicto con carga no lectiva: ${crucesNoLectiva.actividades
          .map((a) => a.nombre)
          .join(", ")}`,
      );
    }

    // Validar horas totales
    const horariosExistentes = await this.findByAsignacionLectiva(
      dto.asignacion_lectiva_id,
    );
    const [h, m] = dto.hora_inicio.split(":").map(Number);
    const [hf, mf] = dto.hora_fin.split(":").map(Number);
    const duracionNueva = (hf * 60 + mf - (h * 60 + m)) / 60;

    const horasExistentes = horariosExistentes.reduce((sum, h) => {
      const [hi, mi] = h.hora_inicio.split(":").map(Number);
      const [hf2, mf2] = h.hora_fin.split(":").map(Number);
      return sum + (hf2 * 60 + mf2 - (hi * 60 + mi)) / 60;
    }, 0);

    if (horasExistentes + duracionNueva > asignacion.horas_asignadas) {
      errores.push(
        `Las horas totales (${horasExistentes + duracionNueva}h) exceden las horas asignadas (${asignacion.horas_asignadas}h)`,
      );
    }

    return {
      valido: errores.length === 0,
      errores,
      advertencias,
    };
  }

  async getProgresoCargaLectiva(
    periodoId: number,
    facultadId?: number,
    deptoId?: number,
  ): Promise<any> {
    const query = this.asignacionLectivaRepo
      .createQueryBuilder("al")
      .leftJoinAndSelect("al.docente", "docente")
      .leftJoinAndSelect("al.curso_plan", "cp")
      .leftJoinAndSelect("cp.curso", "curso")
      .where("al.periodo_id = :periodoId", { periodoId })
      .andWhere("al.estado IN (:...estados)", {
        estados: [
          EstadoAsignacionLectiva.PENDIENTE,
          EstadoAsignacionLectiva.CONFIRMADO,
          EstadoAsignacionLectiva.RECHAZADO,
        ],
      });

    if (facultadId) {
      query.andWhere("curso.facultad_id = :facultadId", { facultadId });
    }
    if (deptoId) {
      query.andWhere("curso.departamento_id = :deptoId", { deptoId });
    }

    const asignaciones = await query.getMany();

    const progreso: Record<number, any> = {};
    for (const asignacion of asignaciones) {
      const docenteId = asignacion.docente_id;
      if (!progreso[docenteId]) {
        progreso[docenteId] = {
          docente: asignacion.docente,
          total: 0,
          programadas: 0,
          pendientes: 0,
        };
      }

      const horariosCount = await this.horarioRepo.count({
        where: { asignacion_lectiva_id: asignacion.id },
      });

      progreso[docenteId].total += asignacion.horas_asignadas;
      if (horariosCount > 0) {
        progreso[docenteId].programadas += asignacion.horas_asignadas;
      } else {
        progreso[docenteId].pendientes += asignacion.horas_asignadas;
      }
    }

    return progreso;
  }

  private seSuperponen(
    dia1: number,
    ini1: string,
    fin1: string,
    dia2: number,
    ini2: string,
    fin2: string,
  ): boolean {
    if (dia1 !== dia2) return false;
    return ini1 < fin2 && fin1 > ini2;
  }

  async guardarBatchCargaLectiva(
    dto: GuardarBatchCargaLectivaDto,
    usuario: any,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const operacionesAudit: Array<{
      id: number;
      accion: string;
      datos: Record<string, unknown>;
    }> = [];

    try {
      const asignacion = await queryRunner.manager.findOne(AsignacionLectiva, {
        where: { id: dto.asignacion_lectiva_id },
        relations: [
          "docente",
          "curso_plan",
          "curso_plan.curso",
          "grupo",
          "periodo",
        ],
      });

      if (!asignacion) {
        throw new NotFoundException("Asignación lectiva no encontrada");
      }

      if (!asignacion.grupo || !asignacion.grupo.id) {
        throw new BadRequestException(
          "La asignación lectiva no tiene grupo asignado",
        );
      }

      // Validar estado de asignación: solo se puede programar si está CONFIRMADO
      if (asignacion.estado !== EstadoAsignacionLectiva.CONFIRMADO) {
        throw new BadRequestException(
          `No se puede programar horarios de una asignación en estado "${asignacion.estado}". Solo se permite programar asignaciones CONFIRMADAS.`,
        );
      }

      const periodo = asignacion.periodo.codigo;

      // Verificar integridad del payload
      this.validarIntegridadPayload(dto.bloques);

      // Obtener horarios existentes
      const horariosExistentes = await queryRunner.manager.find(
        HorarioAsignado,
        {
          where: { asignacion_lectiva_id: dto.asignacion_lectiva_id },
        },
      );

      // Reconstruir estado final con datos reales
      const estadoFinal = this.reconstruirEstadoFinal(
        horariosExistentes,
        dto.bloques,
        asignacion,
        periodo,
      );

      // Calcular horas totales sobre estado final
      const horasTotales = estadoFinal.reduce((sum, h) => {
        const [hi, mi] = h.hora_inicio.split(":").map(Number);
        const [hf, mf] = h.hora_fin.split(":").map(Number);
        return sum + (hf * 60 + mf - (hi * 60 + mi)) / 60;
      }, 0);

      if (horasTotales > asignacion.horas_asignadas) {
        throw new BadRequestException(
          `Las horas totales (${horasTotales}h) exceden las horas asignadas (${asignacion.horas_asignadas}h)`,
        );
      }

      // Validar conflictos en estado final
      this.validarConflictosEnEstadoFinal(estadoFinal);

      // Validar cada bloque del payload
      for (const bloque of dto.bloques) {
        if (bloque.operacion === "DELETE") continue;

        this.validarBloqueDto(bloque);

        await this.validarBloqueEnTransaccion(
          bloque,
          asignacion,
          periodo,
          estadoFinal,
          queryRunner,
        );
      }

      // Procesar operaciones
      const existentesMap = new Map(horariosExistentes.map((h) => [h.id, h]));

      for (const bloque of dto.bloques) {
        if (bloque.operacion === "DELETE") {
          if (bloque.horario_id && existentesMap.has(bloque.horario_id)) {
            const horario = existentesMap.get(bloque.horario_id)!;
            operacionesAudit.push({
              id: bloque.horario_id,
              accion: "ELIMINAR",
              datos: {
                dia: horario.dia,
                hora_inicio: horario.hora_inicio,
                hora_fin: horario.hora_fin,
                ambiente_id: horario.ambiente_id,
              },
            });
            await queryRunner.manager.delete(
              HorarioAsignado,
              bloque.horario_id,
            );
          }
        } else if (bloque.operacion === "CREATE") {
          const nuevoHorario = queryRunner.manager.create(HorarioAsignado, {
            docente_id: asignacion.docente.id,
            curso_id: asignacion.curso_plan.curso.id,
            grupo_id: asignacion.grupo.id,
            periodo,
            tipo_clase: asignacion.tipo_clase,
            ambiente_id: bloque.ambiente_id,
            dia: bloque.dia,
            hora_inicio: bloque.hora_inicio + ":00",
            hora_fin: bloque.hora_fin + ":00",
            asignacion_lectiva_id: dto.asignacion_lectiva_id,
            estado: EstadoHorario.BORRADOR,
            origen: OrigenHorario.ASIGNACION_LECTIVA,
          });
          const saved = await queryRunner.manager.save(nuevoHorario);
          operacionesAudit.push({
            id: saved.id,
            accion: "CREAR",
            datos: {
              dia: bloque.dia,
              hora_inicio: bloque.hora_inicio,
              hora_fin: bloque.hora_fin,
              ambiente_id: bloque.ambiente_id,
            },
          });
        } else if (bloque.operacion === "UPDATE") {
          if (bloque.horario_id && existentesMap.has(bloque.horario_id)) {
            const horarioAnterior = existentesMap.get(bloque.horario_id)!;
            operacionesAudit.push({
              id: bloque.horario_id,
              accion: "ACTUALIZAR",
              datos: {
                anterior: {
                  dia: horarioAnterior.dia,
                  hora_inicio: horarioAnterior.hora_inicio,
                  hora_fin: horarioAnterior.hora_fin,
                  ambiente_id: horarioAnterior.ambiente_id,
                },
                nuevo: {
                  dia: bloque.dia,
                  hora_inicio: bloque.hora_inicio,
                  hora_fin: bloque.hora_fin,
                  ambiente_id: bloque.ambiente_id,
                },
              },
            });
            await queryRunner.manager.update(
              HorarioAsignado,
              bloque.horario_id,
              {
                ambiente_id: bloque.ambiente_id,
                dia: bloque.dia,
                hora_inicio: bloque.hora_inicio + ":00",
                hora_fin: bloque.hora_fin + ":00",
                estado: EstadoHorario.BORRADOR,
              },
            );
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Registrar auditoría después del commit (fuera de la transacción)
    try {
      for (const op of operacionesAudit) {
        const accionEnum =
          op.accion === "CREAR"
            ? AccionAuditoriaCarga.CREAR
            : op.accion === "ACTUALIZAR"
              ? AccionAuditoriaCarga.ACTUALIZAR
              : AccionAuditoriaCarga.ELIMINAR;

        await this.auditoriaService.registrarCarga({
          entidad: EntidadAuditoriaCarga.HORARIO_ASIGNADO,
          entidad_id: op.id,
          usuario_id: usuario.id,
          accion: accionEnum,
          estado_anterior:
            op.accion === "ELIMINAR"
              ? null
              : (op.datos as any).anterior
                ? JSON.stringify((op.datos as any).anterior)
                : null,
          estado_nuevo:
            op.accion === "ELIMINAR"
              ? null
              : (op.datos as any).nuevo
                ? JSON.stringify((op.datos as any).nuevo)
                : null,
          datos_anteriores: op.accion === "ELIMINAR" ? op.datos : null,
          datos_nuevos: op.accion !== "ELIMINAR" ? op.datos : null,
          ip: "0.0.0.0", // IP placeholder - en producción se obtiene del request
        });
      }
    } catch (auditError) {
      this.logger.warn(
        `Error registrando auditoría (datos ya guardados): ${auditError.message}`,
      );
    }

  }

  private validarIntegridadPayload(bloques: BloqueHorarioDto[]): void {
    const updateIds = new Set<number>();
    const deleteIds = new Set<number>();

    for (const bloque of bloques) {
      if (bloque.operacion === "UPDATE") {
        if (!bloque.horario_id) {
          throw new BadRequestException("UPDATE requiere horario_id");
        }
        if (updateIds.has(bloque.horario_id)) {
          throw new BadRequestException(
            `UPDATE duplicado para horario_id ${bloque.horario_id}`,
          );
        }
        if (deleteIds.has(bloque.horario_id)) {
          throw new BadRequestException(
            `No se puede UPDATE y DELETE el mismo horario_id ${bloque.horario_id}`,
          );
        }
        updateIds.add(bloque.horario_id);
      } else if (bloque.operacion === "DELETE") {
        if (!bloque.horario_id) {
          throw new BadRequestException("DELETE requiere horario_id");
        }
        if (deleteIds.has(bloque.horario_id)) {
          throw new BadRequestException(
            `DELETE duplicado para horario_id ${bloque.horario_id}`,
          );
        }
        if (updateIds.has(bloque.horario_id)) {
          throw new BadRequestException(
            `No se puede DELETE y UPDATE el mismo horario_id ${bloque.horario_id}`,
          );
        }
        deleteIds.add(bloque.horario_id);
      }
    }
  }

  private reconstruirEstadoFinal(
    horariosExistentes: HorarioAsignado[],
    bloquesPayload: BloqueHorarioDto[],
    asignacion: AsignacionLectiva,
    periodo: string,
  ): HorarioAsignado[] {
    const existentesMap = new Map(horariosExistentes.map((h) => [h.id, h]));
    const idsAEliminar = new Set(
      bloquesPayload
        .filter((b) => b.operacion === "DELETE" && b.horario_id)
        .map((b) => b.horario_id),
    );
    const actualizacionesMap = new Map(
      bloquesPayload
        .filter((b) => b.operacion === "UPDATE" && b.horario_id)
        .map((b) => [b.horario_id, b]),
    );
    const creaciones = bloquesPayload.filter((b) => b.operacion === "CREATE");

    const estadoFinal: HorarioAsignado[] = [];

    // Horarios existentes que permanecen sin cambios
    for (const [id, horario] of existentesMap) {
      if (!idsAEliminar.has(id) && !actualizacionesMap.has(id)) {
        estadoFinal.push(horario);
      }
    }

    // Horarios actualizados
    for (const [id, bloque] of actualizacionesMap) {
      if (existentesMap.has(id)) {
        const horarioOriginal = existentesMap.get(id)!;
        estadoFinal.push({
          ...horarioOriginal,
          ambiente_id: bloque.ambiente_id,
          dia: bloque.dia,
          hora_inicio: bloque.hora_inicio + ":00",
          hora_fin: bloque.hora_fin + ":00",
        } as HorarioAsignado);
      }
    }

    // Horarios nuevos con datos reales
    for (const bloque of creaciones) {
      estadoFinal.push({
        id: 0,
        docente_id: asignacion.docente.id,
        curso_id: asignacion.curso_plan.curso.id,
        grupo_id: asignacion.grupo.id,
        ambiente_id: bloque.ambiente_id,
        periodo,
        tipo_clase: asignacion.tipo_clase,
        dia: bloque.dia,
        hora_inicio: bloque.hora_inicio + ":00",
        hora_fin: bloque.hora_fin + ":00",
        estado: EstadoHorario.BORRADOR,
        origen: OrigenHorario.ASIGNACION_LECTIVA,
        asignacion_lectiva_id: asignacion.id,
        periodo_academico: periodo,
        dia_semana: bloque.dia,
        creado_en: new Date(),
        actualizado_en: new Date(),
      } as any);
    }

    return estadoFinal;
  }

  private validarConflictosEnEstadoFinal(estadoFinal: HorarioAsignado[]): void {
    for (let i = 0; i < estadoFinal.length; i++) {
      for (let j = i + 1; j < estadoFinal.length; j++) {
        const a = estadoFinal[i];
        const b = estadoFinal[j];

        if (a.id === b.id && a.id !== 0) continue;

        if (
          a.docente_id === b.docente_id &&
          this.seSuperponen(
            a.dia,
            a.hora_inicio,
            a.hora_fin,
            b.dia,
            b.hora_inicio,
            b.hora_fin,
          )
        ) {
          throw new ConflictException(
            `Conflicto: dos bloques del mismo docente se superponen (${a.dia} ${a.hora_inicio}-${a.hora_fin})`,
          );
        }

        if (
          a.ambiente_id === b.ambiente_id &&
          this.seSuperponen(
            a.dia,
            a.hora_inicio,
            a.hora_fin,
            b.dia,
            b.hora_inicio,
            b.hora_fin,
          )
        ) {
          throw new ConflictException(
            `Conflicto: dos bloques ocupan el mismo ambiente en el mismo rango`,
          );
        }

        if (
          a.grupo_id === b.grupo_id &&
          this.seSuperponen(
            a.dia,
            a.hora_inicio,
            a.hora_fin,
            b.dia,
            b.hora_inicio,
            b.hora_fin,
          )
        ) {
          throw new ConflictException(
            `Conflicto: dos bloques del mismo grupo se superponen`,
          );
        }
      }
    }
  }

  private validarBloqueDto(bloque: BloqueHorarioDto): void {
    if (bloque.operacion === "DELETE") {
      if (!bloque.horario_id) {
        throw new BadRequestException("DELETE requiere horario_id");
      }
    } else {
      if (!bloque.ambiente_id) {
        throw new BadRequestException("CREATE/UPDATE requieren ambiente_id");
      }
      if (!bloque.dia) {
        throw new BadRequestException("CREATE/UPDATE requieren dia");
      }
      if (!bloque.hora_inicio) {
        throw new BadRequestException("CREATE/UPDATE requieren hora_inicio");
      }
      if (!bloque.hora_fin) {
        throw new BadRequestException("CREATE/UPDATE requieren hora_fin");
      }

      const [hi, mi] = bloque.hora_inicio.split(":").map(Number);
      const [hf, mf] = bloque.hora_fin.split(":").map(Number);
      if (hi * 60 + mi >= hf * 60 + mf) {
        throw new BadRequestException(
          "hora_inicio debe ser menor que hora_fin",
        );
      }

      if (bloque.operacion === "UPDATE" && !bloque.horario_id) {
        throw new BadRequestException("UPDATE requiere horario_id");
      }
    }
  }

  async validarBloqueEnTransaccion(
    bloque: BloqueHorarioDto,
    asignacion: AsignacionLectiva,
    periodo: string,
    estadoFinal: HorarioAsignado[],
    queryRunner: any,
  ): Promise<void> {
    const franja = await this.validacionesService.verificarFranjaInstitucional(
      bloque.dia,
      bloque.hora_inicio,
      bloque.hora_fin,
    );
    if (!franja.valido) throw new ConflictException(franja.motivo);

    const cruceDoc = await this.validacionesService.verificarCruceDocente(
      asignacion.docente.id,
      bloque.dia,
      bloque.hora_inicio,
      bloque.hora_fin,
      periodo,
      bloque.operacion === "UPDATE" ? bloque.horario_id : undefined,
    );
    if (!cruceDoc.valido) throw new ConflictException(cruceDoc.motivo);

    const cruceAmb = await this.validacionesService.verificarCruceAmbiente(
      bloque.ambiente_id,
      bloque.dia,
      bloque.hora_inicio,
      bloque.hora_fin,
      periodo,
      bloque.operacion === "UPDATE" ? bloque.horario_id : undefined,
    );
    if (!cruceAmb.valido) throw new ConflictException(cruceAmb.motivo);

    const cruceGrupo = await this.validacionesService.verificarCruceGrupo(
      asignacion.grupo.id,
      bloque.dia,
      bloque.hora_inicio,
      bloque.hora_fin,
      periodo,
      bloque.operacion === "UPDATE" ? bloque.horario_id : undefined,
    );
    if (!cruceGrupo.valido) throw new ConflictException(cruceGrupo.motivo);

    const crucesNoLectiva = await this.validarCrucesNoLectiva(
      asignacion.docente.id,
      asignacion.periodo_id,
      bloque.dia,
      bloque.hora_inicio,
      bloque.hora_fin,
    );
    if (crucesNoLectiva.tieneCruce) {
      throw new ConflictException("Conflicto con carga no lectiva");
    }

    // Validar aforo/capacidad del ambiente
    const ambiente = await queryRunner.manager.findOne(Ambiente, {
      where: { id: bloque.ambiente_id },
    });
    if (!ambiente) {
      throw new NotFoundException('Ambiente no encontrado');
    }
    // No validar capacidad para laboratorios (código empieza con LAB o tipo es LABORATORIO)
    const esLaboratorio = ambiente.codigo?.toUpperCase().startsWith('LAB') || ambiente.tipo?.toUpperCase().includes('LABORATORIO');
    if (!esLaboratorio && ambiente.capacidad && asignacion.nro_alumnos && asignacion.nro_alumnos > ambiente.capacidad) {
      throw new ConflictException(
        `El ambiente ${ambiente.codigo} tiene capacidad de ${ambiente.capacidad} alumnos, pero la asignación tiene ${asignacion.nro_alumnos} alumnos.`
      );
    }
  }
}
