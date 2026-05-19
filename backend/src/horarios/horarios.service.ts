import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { ReasignarHorarioDto } from "./dto/reasignar-horario.dto";
import { CrearAsignacionDto } from "./dto/crear-asignacion.dto";
import { ValidacionesService } from "../common/services/validaciones.service";
import { CacheKeyRegistry } from "../common/cache/cache-key-registry";

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
    private readonly validacionesService: ValidacionesService,
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
      .cache(
        `horarios_periodo_${periodo}_docente_${docenteId}_${page}_${limit}`,
        60000,
      )
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

    return await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("docente.id = :docenteId", { docenteId: docente.id })
      .andWhere("horario.periodo = :periodo", { periodo })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .getMany();
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

    const franja = this.validacionesService.verificarFranjaInstitucional(
      dto.hora_inicio,
      dto.hora_fin,
    );
    if (!franja)
      throw new BadRequestException(
        "El slot está fuera de la franja institucional (07:00-22:00)",
      );

    const cruceDoc = await this.validacionesService.verificarCruceDocente(
      horario.docente.id,
      dto.dia_semana,
      dto.hora_inicio,
      dto.hora_fin,
      horario.periodo_academico,
      id,
    );
    if (cruceDoc)
      throw new BadRequestException("El docente tiene un cruce en ese horario");

    const ambienteId = dto.ambiente_id ?? horario.ambiente.id;
    const cruceAmb = await this.validacionesService.verificarCruceAmbiente(
      ambienteId,
      dto.dia_semana,
      dto.hora_inicio,
      dto.hora_fin,
      horario.periodo_academico,
      id,
    );
    if (cruceAmb)
      throw new BadRequestException(
        "El ambiente tiene un cruce en ese horario",
      );

    if (horario.grupo) {
      const cruceGrupo = await this.validacionesService.verificarCruceGrupo(
        horario.grupo.id,
        dto.dia_semana,
        dto.hora_inicio,
        dto.hora_fin,
        horario.periodo_academico,
        id,
      );
      if (cruceGrupo)
        throw new BadRequestException("El grupo tiene un cruce en ese horario");
    }

    horario.dia_semana = dto.dia_semana;
    horario.hora_inicio = dto.hora_inicio;
    horario.hora_fin = dto.hora_fin;
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

    const franja = this.validacionesService.verificarFranjaInstitucional(
      dto.hora_inicio,
      dto.hora_fin,
    );
    if (!franja)
      throw new BadRequestException(
        "El slot está fuera de la franja institucional (07:00-22:00)",
      );

    const cruceDoc = await this.validacionesService.verificarCruceDocente(
      dto.docente_id,
      dto.dia_semana,
      dto.hora_inicio,
      dto.hora_fin,
      dto.periodo_academico,
    );
    if (cruceDoc) {
      const conflictos = await this.obtenerConflictosDocente(
        dto.docente_id,
        dto.dia_semana,
        dto.hora_inicio,
        dto.hora_fin,
        dto.periodo_academico,
      );
      throw new BadRequestException(
        `El docente tiene un cruce en ese horario: ${conflictos}`,
      );
    }

    const cruceAmb = await this.validacionesService.verificarCruceAmbiente(
      dto.ambiente_id,
      dto.dia_semana,
      dto.hora_inicio,
      dto.hora_fin,
      dto.periodo_academico,
    );
    if (cruceAmb) {
      const conflictos = await this.obtenerConflictosAmbiente(
        dto.ambiente_id,
        dto.dia_semana,
        dto.hora_inicio,
        dto.hora_fin,
        dto.periodo_academico,
      );
      throw new BadRequestException(
        `El ambiente tiene un cruce en ese horario: ${conflictos}`,
      );
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
    if (cruceGrupo)
      throw new BadRequestException("El grupo tiene un cruce en ese horario");

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
}
