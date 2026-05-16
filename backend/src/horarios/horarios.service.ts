import {
  Injectable,
  NotFoundException,
  BadRequestException,
<<<<<<< HEAD
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { ReasignarHorarioDto } from "./dto/reasignar-horario.dto";
import { ValidacionesService } from "../common/services/validaciones.service";
=======
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { ConflictoAsignacion } from '../entities/conflicto-asignacion.entity';
import { Ambiente } from '../entities/ambiente.entity';
import { EstadoHorario } from '../common/enums/estado-horario.enum';
import { ReasignarHorarioDto } from './dto/reasignar-horario.dto';
import { ValidacionesService } from '../common/services/validaciones.service';
import { CacheKeyRegistry } from '../common/cache/cache-key-registry';
>>>>>>> develop

@Injectable()
export class HorariosService {
  constructor(
<<<<<<< HEAD
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(ConflictoAsignacion)
    private readonly conflictoRepo: Repository<ConflictoAsignacion>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    private readonly validacionesService: ValidacionesService,
  ) {}

  async findAllByPeriodo(periodo: string): Promise<HorarioAsignado[]> {
    return this.horarioRepo.find({
      where: { periodo_academico: periodo },
      relations: ["docente", "curso", "ambiente", "grupo"],
      order: { dia_semana: "ASC", hora_inicio: "ASC" },
    });
  }

  async findByDocente(
    docenteId: number,
    periodo: string,
  ): Promise<HorarioAsignado[]> {
    return this.horarioRepo.find({
      where: { docente: { id: docenteId }, periodo_academico: periodo },
      relations: ["docente", "curso", "ambiente", "grupo"],
      order: { dia_semana: "ASC", hora_inicio: "ASC" },
    });
  }

  async findByAmbiente(
    ambienteId: number,
    periodo: string,
  ): Promise<HorarioAsignado[]> {
    return this.horarioRepo.find({
      where: { ambiente: { id: ambienteId }, periodo_academico: periodo },
      relations: ["docente", "curso", "ambiente", "grupo"],
      order: { dia_semana: "ASC", hora_inicio: "ASC" },
    });
  }

  async findConflictos(periodo: string): Promise<ConflictoAsignacion[]> {
    return this.conflictoRepo.find({
      where: { periodo_academico: periodo },
      relations: ["docente", "ambiente"],
      order: { created_at: "DESC" },
    });
=======
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(HorarioAsignado) private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(ConflictoAsignacion) private readonly conflictoRepo: Repository<ConflictoAsignacion>,
    @InjectRepository(Ambiente) private readonly ambienteRepo: Repository<Ambiente>,
    private readonly validacionesService: ValidacionesService,
  ) {}

  async findAllByPeriodo(periodo: string, page = 1, limit = 20) {
    const [data, total] = await this.horarioRepo
      .createQueryBuilder('horario')
      .leftJoinAndSelect('horario.docente', 'docente')
      .leftJoinAndSelect('horario.curso', 'curso')
      .leftJoinAndSelect('horario.ambiente', 'ambiente')
      .leftJoinAndSelect('horario.grupo', 'grupo')
      .where('horario.periodo_academico = :periodo', { periodo })
      .orderBy('horario.dia_semana', 'ASC')
      .addOrderBy('horario.hora_inicio', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`horarios_periodo_${periodo}_${page}_${limit}`, 60000)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findByDocente(docenteId: number, periodo: string, page = 1, limit = 20) {
    const [data, total] = await this.horarioRepo
      .createQueryBuilder('horario')
      .leftJoinAndSelect('horario.docente', 'docente')
      .leftJoinAndSelect('horario.curso', 'curso')
      .leftJoinAndSelect('horario.ambiente', 'ambiente')
      .leftJoinAndSelect('horario.grupo', 'grupo')
      .where('docente.id = :docenteId', { docenteId })
      .andWhere('horario.periodo_academico = :periodo', { periodo })
      .orderBy('horario.dia_semana', 'ASC')
      .addOrderBy('horario.hora_inicio', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`horarios_periodo_${periodo}_docente_${docenteId}_${page}_${limit}`, 60000)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findByAmbiente(ambienteId: number, periodo: string, page = 1, limit = 20) {
    const [data, total] = await this.horarioRepo
      .createQueryBuilder('horario')
      .leftJoinAndSelect('horario.docente', 'docente')
      .leftJoinAndSelect('horario.curso', 'curso')
      .leftJoinAndSelect('horario.ambiente', 'ambiente')
      .leftJoinAndSelect('horario.grupo', 'grupo')
      .where('ambiente.id = :ambienteId', { ambienteId })
      .andWhere('horario.periodo_academico = :periodo', { periodo })
      .orderBy('horario.dia_semana', 'ASC')
      .addOrderBy('horario.hora_inicio', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`horarios_periodo_${periodo}_ambiente_${ambienteId}_${page}_${limit}`, 60000)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findConflictos(periodo: string, page = 1, limit = 20) {
    const [data, total] = await this.conflictoRepo
      .createQueryBuilder('conflicto')
      .leftJoinAndSelect('conflicto.docente', 'docente')
      .leftJoinAndSelect('conflicto.ambiente', 'ambiente')
      .where('conflicto.periodo_academico = :periodo', { periodo })
      .orderBy('conflicto.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`conflictos_periodo_${periodo}_${page}_${limit}`, 60000)
      .getManyAndCount();

    return { data, total, page, limit };
>>>>>>> develop
  }

  async resolverConflicto(id: number): Promise<ConflictoAsignacion> {
    const conflicto = await this.conflictoRepo.findOne({ where: { id } });
    if (!conflicto)
      throw new NotFoundException(`Conflicto ${id} no encontrado`);

    conflicto.resuelto = true;
    const updated = await this.conflictoRepo.save(conflicto);
    await this.invalidateHorariosCache();
    return updated;
  }

<<<<<<< HEAD
  async reasignarManual(
    id: number,
    dto: ReasignarHorarioDto,
  ): Promise<HorarioAsignado> {
    const horario = await this.horarioRepo.findOne({
      where: { id },
      relations: ["docente", "ambiente", "grupo"],
    });
=======
  async reasignarManual(id: number, dto: ReasignarHorarioDto): Promise<HorarioAsignado> {
    const horario = await this.horarioRepo
      .createQueryBuilder('horario')
      .leftJoinAndSelect('horario.docente', 'docente')
      .leftJoinAndSelect('horario.ambiente', 'ambiente')
      .leftJoinAndSelect('horario.grupo', 'grupo')
      .where('horario.id = :id', { id })
      .cache(`horario_${id}_reasignacion`, 60000)
      .getOne();
>>>>>>> develop
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

  private async invalidateHorariosCache(): Promise<void> {
    const prefixes = [
      'http_cache:GET:/horarios',
      'http_cache:GET:/dashboard',
    ];

    for (const prefix of prefixes) {
      const keys = CacheKeyRegistry.findByPrefix(prefix);
      for (const key of keys) {
        await this.cacheManager.del(key);
        CacheKeyRegistry.forget(key);
      }
    }
  }
}
