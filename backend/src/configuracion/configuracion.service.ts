import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { DiaNoLaborable } from "../entities/dia-no-laborable.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { DiaActivo } from "../entities/dia-activo.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { ConfiguracionGeneral } from "../entities/configuracion-general.entity";
import { UpsertRestriccionDto } from "./dto/upsert-restriccion.dto";
import { CreateDiaNoLaborableDto } from "./dto/create-dia-no-laborable.dto";
import { QueryRestriccionDto } from "./dto/query-restriccion.dto";
import { QueryDiaNoLaborableDto } from "./dto/query-dia-no-laborable.dto";
import { CreateTurnoDto } from "./dto/create-turno.dto";
import { UpsertDiaActivoDto } from "./dto/upsert-dia-activo.dto";
import { UpsertParametrosCargaDto } from "./dto/upsert-parametros-carga.dto";
import { UpdateConfiguracionGeneralDto } from "./dto/update-configuracion-general.dto";

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(RestriccionInstitucional)
    private readonly restriccionRepo: Repository<RestriccionInstitucional>,
    @InjectRepository(DiaNoLaborable)
    private readonly diaNoLaborableRepo: Repository<DiaNoLaborable>,
    @InjectRepository(TurnoHorario)
    private readonly turnoRepo: Repository<TurnoHorario>,
    @InjectRepository(DiaActivo)
    private readonly diaActivoRepo: Repository<DiaActivo>,
    @InjectRepository(ParametrosCarga)
    private readonly parametrosCargaRepo: Repository<ParametrosCarga>,
    @InjectRepository(ConfiguracionGeneral)
    private readonly configuracionGeneralRepo: Repository<ConfiguracionGeneral>,
  ) {}

  // ─── RESTRICCIONES ────────────────────────────────────────────────────────

  async findRestricciones(
    query: QueryRestriccionDto,
  ): Promise<RestriccionInstitucional[]> {
    const qb = this.restriccionRepo
      .createQueryBuilder("r")
      .where("r.activo = true");

    if (query.periodo) {
      qb.andWhere("r.periodo_academico = :periodo", {
        periodo: query.periodo,
      });
    }

    return qb.orderBy("r.tipo_restriccion", "ASC").getMany();
  }

  /**
   * Crea una restricción nueva o la actualiza si ya existe para el mismo
   * tipo_restriccion + periodo_academico (upsert semántico de negocio).
   */
  async upsertRestriccion(
    dto: UpsertRestriccionDto,
  ): Promise<{ restriccion: RestriccionInstitucional; created: boolean }> {
    const existente = await this.restriccionRepo.findOne({
      where: {
        tipo_restriccion: dto.tipo_restriccion,
        periodo_academico: dto.periodo_academico,
      },
    });

    if (existente) {
      const actualizada = this.restriccionRepo.merge(existente, {
        valor: dto.valor,
        activo: dto.activo ?? existente.activo,
      });
      const saved = await this.restriccionRepo.save(actualizada);
      return { restriccion: saved, created: false };
    }

    const nueva = this.restriccionRepo.create({
      tipo_restriccion: dto.tipo_restriccion,
      valor: dto.valor,
      periodo_academico: dto.periodo_academico,
      activo: dto.activo ?? true,
    });
    const saved = await this.restriccionRepo.save(nueva);
    return { restriccion: saved, created: true };
  }

  async removeRestriccion(id: number): Promise<void> {
    const restriccion = await this.restriccionRepo.findOne({ where: { id } });
    if (!restriccion) {
      throw new NotFoundException(`Restricción con ID ${id} no encontrada`);
    }
    await this.restriccionRepo.remove(restriccion);
  }

  // ─── DÍAS NO LABORABLES ───────────────────────────────────────────────────

  async findDiasNoLaborables(
    query: QueryDiaNoLaborableDto,
  ): Promise<DiaNoLaborable[]> {
    const qb = this.diaNoLaborableRepo.createQueryBuilder("d");

    if (query.periodo) {
      qb.where("d.periodo_academico = :periodo", { periodo: query.periodo });
    }

    return qb.orderBy("d.fecha", "ASC").getMany();
  }

  async createDiaNoLaborable(
    dto: CreateDiaNoLaborableDto,
  ): Promise<DiaNoLaborable> {
    // Verificar que no exista ya esa fecha para el mismo período
    const existe = await this.diaNoLaborableRepo.findOne({
      where: {
        fecha: new Date(dto.fecha) as unknown as Date,
        periodo_academico: dto.periodo_academico,
      },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe un día no laborable registrado para la fecha ${dto.fecha} en el período ${dto.periodo_academico}`,
      );
    }

    const dia = this.diaNoLaborableRepo.create({
      fecha: new Date(dto.fecha) as unknown as Date,
      descripcion: dto.descripcion,
      tipo: dto.tipo,
      afecta_aulas: dto.afecta_aulas ?? true,
      afecta_laboratorios: dto.afecta_laboratorios ?? true,
      periodo_academico: dto.periodo_academico,
    });

    return this.diaNoLaborableRepo.save(dia);
  }

  async removeDiaNoLaborable(id: number): Promise<void> {
    const dia = await this.diaNoLaborableRepo.findOne({ where: { id } });
    if (!dia) {
      throw new NotFoundException(
        `Día no laborable con ID ${id} no encontrado`,
      );
    }
    await this.diaNoLaborableRepo.remove(dia);
  }

  // ─── TURNOS HORARIOS ─────────────────────────────────────────────────────

  async findTurnos(): Promise<TurnoHorario[]> {
    return this.turnoRepo.find({ order: { hora_inicio: "ASC" } });
  }

  async createTurno(dto: CreateTurnoDto): Promise<TurnoHorario> {
    if (dto.hora_inicio >= dto.hora_fin) {
      throw new BadRequestException(
        "La hora de inicio debe ser anterior a la hora de fin",
      );
    }

    const turnos = await this.turnoRepo.find({ where: { activo: true } });
    for (const t of turnos) {
      const solapado =
        dto.hora_inicio < t.hora_fin && dto.hora_fin > t.hora_inicio;
      if (solapado) {
        throw new ConflictException(
          `El turno se superpone con el turno existente "${t.nombre}" (${t.hora_inicio}–${t.hora_fin})`,
        );
      }
    }

    const turno = this.turnoRepo.create({ ...dto, activo: dto.activo ?? true });
    return this.turnoRepo.save(turno);
  }

  async removeTurno(id: number): Promise<void> {
    const turno = await this.turnoRepo.findOne({ where: { id } });
    if (!turno) throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    await this.turnoRepo.remove(turno);
  }

  // ─── DÍAS ACTIVOS ─────────────────────────────────────────────────────────

  async findDiasActivos(): Promise<DiaActivo[]> {
    return this.diaActivoRepo.find({ order: { dia_semana: "ASC" } });
  }

  async upsertDiaActivo(dto: UpsertDiaActivoDto): Promise<DiaActivo> {
    if (dto.dia_semana < 1 || dto.dia_semana > 7) {
      throw new BadRequestException(
        "dia_semana debe estar entre 1 (Lunes) y 7 (Domingo)",
      );
    }
    const existente = await this.diaActivoRepo.findOne({
      where: { dia_semana: dto.dia_semana },
    });
    if (existente) {
      const actualizado = this.diaActivoRepo.merge(existente, dto);
      return this.diaActivoRepo.save(actualizado);
    }
    const nuevo = this.diaActivoRepo.create(dto);
    return this.diaActivoRepo.save(nuevo);
  }

  // ─── PARÁMETROS DE CARGA ──────────────────────────────────────────────────

  async findParametrosCarga(periodo: string): Promise<ParametrosCarga[]> {
    return this.parametrosCargaRepo.find({
      where: { periodo_academico: periodo },
      order: { tipo_docente: "ASC", categoria: "ASC", modalidad: "ASC" },
    });
  }

  async upsertParametrosCarga(
    dto: UpsertParametrosCargaDto,
  ): Promise<ParametrosCarga> {
    if (dto.horas_min_semanal > dto.horas_max_semanal) {
      throw new BadRequestException(
        "horas_min_semanal no puede ser mayor que horas_max_semanal",
      );
    }
    if (dto.cursos_min_docente > dto.cursos_max_docente) {
      throw new BadRequestException(
        "cursos_min_docente no puede ser mayor que cursos_max_docente",
      );
    }

    const existente = await this.parametrosCargaRepo.findOne({
      where: {
        periodo_academico: dto.periodo_academico,
        tipo_docente: dto.tipo_docente,
        categoria: dto.categoria,
        modalidad: dto.modalidad,
      },
    });
    if (existente) {
      const actualizado = this.parametrosCargaRepo.merge(existente, dto);
      return this.parametrosCargaRepo.save(actualizado);
    }
    const nuevo = this.parametrosCargaRepo.create(dto);
    return this.parametrosCargaRepo.save(nuevo);
  }

  async deleteParametrosCarga(id: number): Promise<void> {
    const p = await this.parametrosCargaRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Parámetro con ID ${id} no encontrado`);
    await this.parametrosCargaRepo.remove(p);
  }

  // ─── CONFIGURACIÓN GENERAL ────────────────────────────────────────────────

  async getConfiguracionGeneral(): Promise<ConfiguracionGeneral> {
    const config = await this.configuracionGeneralRepo.findOne({
      where: { id: 1 },
    });
    if (config) return config;
    const defecto = this.configuracionGeneralRepo.create({ id: 1 });
    return this.configuracionGeneralRepo.save(defecto);
  }

  async updateConfiguracionGeneral(
    dto: UpdateConfiguracionGeneralDto,
  ): Promise<ConfiguracionGeneral> {
    const config = await this.getConfiguracionGeneral();
    const actualizado = this.configuracionGeneralRepo.merge(config, dto);
    return this.configuracionGeneralRepo.save(actualizado);
  }

  // ─── MÉTODOS AUXILIARES (usados por otros módulos) ────────────────────────

  /**
   * Devuelve las restricciones activas de un período como mapa
   * tipo_restriccion → valor para consumo rápido por el motor de horarios.
   */
  async getRestriccionesMap(periodo: string): Promise<Record<string, unknown>> {
    const lista = await this.restriccionRepo.find({
      where: { periodo_academico: periodo, activo: true },
    });
    return Object.fromEntries(lista.map((r) => [r.tipo_restriccion, r.valor]));
  }

  /**
   * Retorna true si la fecha recibida es un día no laborable en el período.
   */
  async esDiaNoLaborable(fecha: Date, periodo: string): Promise<boolean> {
    const count = await this.diaNoLaborableRepo
      .createQueryBuilder("d")
      .where("d.fecha = :fecha", { fecha: fecha.toISOString().split("T")[0] })
      .andWhere("d.periodo_academico = :periodo", { periodo })
      .getCount();
    return count > 0;
  }
}
