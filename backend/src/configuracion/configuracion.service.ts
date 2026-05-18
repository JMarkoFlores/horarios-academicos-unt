import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { DiaNoLaborable } from "../entities/dia-no-laborable.entity";
import { UpsertRestriccionDto } from "./dto/upsert-restriccion.dto";
import { CreateDiaNoLaborableDto } from "./dto/create-dia-no-laborable.dto";
import { QueryRestriccionDto } from "./dto/query-restriccion.dto";
import { QueryDiaNoLaborableDto } from "./dto/query-dia-no-laborable.dto";

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(RestriccionInstitucional)
    private readonly restriccionRepo: Repository<RestriccionInstitucional>,
    @InjectRepository(DiaNoLaborable)
    private readonly diaNoLaborableRepo: Repository<DiaNoLaborable>,
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
    const qb = this.diaNoLaborableRepo
      .createQueryBuilder("d");

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
      throw new NotFoundException(`Día no laborable con ID ${id} no encontrado`);
    }
    await this.diaNoLaborableRepo.remove(dia);
  }

  // ─── MÉTODOS AUXILIARES (usados por otros módulos) ────────────────────────

  /**
   * Devuelve las restricciones activas de un período como mapa
   * tipo_restriccion → valor para consumo rápido por el motor de horarios.
   */
  async getRestriccionesMap(
    periodo: string,
  ): Promise<Record<string, unknown>> {
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
