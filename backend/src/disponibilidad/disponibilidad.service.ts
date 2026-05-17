import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectDataSource } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Docente } from "../entities/docente.entity";
import { GuardarDisponibilidadDto } from "./dto/guardar-disponibilidad.dto";
import { CreateRestriccionDto } from "./dto/create-restriccion.dto";

@Injectable()
export class DisponibilidadService {
  constructor(
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
    @InjectRepository(RestriccionInstitucional)
    private readonly restriccionRepo: Repository<RestriccionInstitucional>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getByDocente(docenteId: number, periodo: string) {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) {
      throw new NotFoundException(`Docente con ID ${docenteId} no encontrado`);
    }

    const slots = await this.disponibilidadRepo.find({
      where: {
        docente: { id: docenteId },
        periodo_academico: periodo,
      },
      order: { dia_semana: "ASC", hora_inicio: "ASC" },
    });

    return {
      docente: {
        id: docente.id,
        nombres: docente.nombres,
        apellidos: docente.apellidos,
        codigo: docente.codigo,
      },
      periodo,
      slots,
    };
  }

  async guardarDisponibilidadMasiva(
    docenteId: number,
    dto: GuardarDisponibilidadDto,
  ) {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) {
      throw new NotFoundException(`Docente con ID ${docenteId} no encontrado`);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .delete()
        .from(DisponibilidadDocente)
        .where('"docente_id" = :docenteId', { docenteId })
        .andWhere("periodo_academico = :periodo", { periodo: dto.periodo })
        .execute();

      const nuevosSlots = dto.slots.map((slot) =>
        manager.create(DisponibilidadDocente, {
          dia_semana: slot.dia_semana,
          hora_inicio: slot.hora_inicio,
          hora_fin: slot.hora_fin,
          disponible: slot.disponible,
          periodo_academico: dto.periodo,
          docente,
        }),
      );

      await manager.save(DisponibilidadDocente, nuevosSlots);
    });

    return this.getByDocente(docenteId, dto.periodo);
  }

  async getResumenDocentes(periodo: string) {
    const registros = await this.disponibilidadRepo
      .createQueryBuilder("d")
      .innerJoinAndSelect("d.docente", "docente")
      .where("d.periodo_academico = :periodo", { periodo })
      .andWhere("d.disponible = :disponible", { disponible: true })
      .orderBy("docente.apellidos", "ASC")
      .getMany();

    const docenteMap = new Map<
      number,
      { docente: object; slots_disponibles: number; horas_disponibles: number }
    >();

    for (const registro of registros) {
      const id = registro.docente.id;

      if (!docenteMap.has(id)) {
        docenteMap.set(id, {
          docente: {
            id: registro.docente.id,
            codigo: registro.docente.codigo,
            nombres: registro.docente.nombres,
            apellidos: registro.docente.apellidos,
            categoria: registro.docente.categoria,
            tipo_contrato: registro.docente.tipo_contrato,
          },
          slots_disponibles: 0,
          horas_disponibles: 0,
        });
      }

      const entry = docenteMap.get(id)!;
      entry.slots_disponibles++;

      const [hiH, hiM] = registro.hora_inicio.split(":").map(Number);
      const [hfH, hfM] = registro.hora_fin.split(":").map(Number);
      entry.horas_disponibles += (hfH * 60 + hfM - hiH * 60 - hiM) / 60;
    }

    return Array.from(docenteMap.values());
  }

  async getRestricciones(periodo: string, page = 1, limit = 20) {
    const [items, total] = await this.restriccionRepo
      .createQueryBuilder('restriccion')
      .where('restriccion.periodo_academico = :periodo', { periodo })
      .andWhere('restriccion.activo = :activo', { activo: true })
      .orderBy('restriccion.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`restricciones_periodo_${periodo}_${page}_${limit}`, 60000)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async upsertRestriccion(
    dto: CreateRestriccionDto,
  ): Promise<RestriccionInstitucional> {
    const restriccion = this.restriccionRepo.create({
      tipo_restriccion: dto.tipo_restriccion,
      valor: dto.valor,
      periodo_academico: dto.periodo_academico,
      activo: dto.activo ?? true,
    });
    return this.restriccionRepo.save(restriccion);
  }

  async getPeriodos(page = 1, limit = 20) {
    const [items, total] = await this.periodoRepo
      .createQueryBuilder('periodo')
      .orderBy('periodo.codigo', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`periodos_${page}_${limit}`, 60000)
      .getManyAndCount();

    return { items, total, page, limit };
  }
}
