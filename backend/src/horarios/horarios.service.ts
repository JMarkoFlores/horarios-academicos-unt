import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cache } from "cache-manager";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Docente } from "../entities/docente.entity";
import { Curso } from "../entities/curso.entity";
import { Grupo } from "../entities/grupo.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { EstadoAmbiente } from "../common/enums/estado-ambiente.enum";
import { ReasignarHorarioDto } from "./dto/reasignar-horario.dto";
import { CrearAsignacionDto } from "./dto/crear-asignacion.dto";
import { ValidacionesService as CommonValidacionesService } from "../common/services/validaciones.service";
import { CacheKeyRegistry } from "../common/cache/cache-key-registry";
import { ValidacionesService as GlobalValidacionesService } from "../validaciones/validaciones.service";

@Injectable()
export class HorariosService {
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
    private readonly commonValidacionesService: CommonValidacionesService,
    private readonly validacionesService: GlobalValidacionesService,
  ) {}

  async findAllByPeriodo(periodo: string, page = 1, limit = 20) {
    const [items, total] = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
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

  async findByDia(
    dia: number,
    periodo: string,
    page = 1,
    limit = 50,
  ) {
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

  async findHorariosByDocenteId(docenteId: number, periodo: string) {
    return await this.horarioRepo
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

  private async invalidateHorariosCache(): Promise<void> {
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
}
