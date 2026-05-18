import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
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
    const periodoAcademico = await this.periodoRepo.findOne({
      where: { codigo: periodo },
    });
    if (!periodoAcademico) {
      throw new NotFoundException(`Periodo académico ${periodo} no encontrado`);
    }

    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) {
      throw new NotFoundException(`Docente con ID ${docenteId} no encontrado`);
    }

    const dbSlots = await this.disponibilidadRepo.find({
      where: {
        docente: { id: docenteId },
        periodo_academico: periodo,
      },
    });

    const timeToMinutes = (t: string): number => {
      const parts = t.split(":").map(Number);
      const h = parts[0] || 0;
      const m = parts[1] || 0;
      return h * 60 + m;
    };

    const isAvailable = (dia: number, hour: number): boolean => {
      const blockStart = hour * 60;
      const blockEnd = (hour + 1) * 60;

      const coveringSlots = dbSlots.filter((s) => {
        if (s.dia_semana !== dia) return false;
        const start = timeToMinutes(s.hora_inicio);
        const end = timeToMinutes(s.hora_fin);
        return start <= blockStart && end >= blockEnd;
      });

      if (coveringSlots.length === 0) return false;

      // Si algún slot que lo cubre es disponible, se considera disponible
      return coveringSlots.some((s) => s.disponible);
    };

    const slots: any[] = [];
    // 15 horas desde las 07:00 hasta las 21:00 (bloques de 1 hora hasta las 22:00)
    for (let h = 7; h <= 21; h++) {
      for (let d = 1; d <= 5; d++) {
        const hInicioStr = `${h.toString().padStart(2, "0")}:00:00`;
        const hFinStr = `${(h + 1).toString().padStart(2, "0")}:00:00`;
        slots.push({
          dia_semana: d,
          hora_inicio: hInicioStr,
          hora_fin: hFinStr,
          disponible: isAvailable(d, h),
          periodo_academico: periodo,
        });
      }
    }

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
    const periodoAcademico = await this.periodoRepo.findOne({
      where: { codigo: dto.periodo },
    });
    if (!periodoAcademico) {
      throw new NotFoundException(`Periodo académico ${dto.periodo} no encontrado`);
    }

    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) {
      throw new NotFoundException(`Docente con ID ${docenteId} no encontrado`);
    }

    await this.dataSource.transaction(async (manager) => {
      // Eliminar disponibilidad previa para este período y docente
      await manager
        .createQueryBuilder()
        .delete()
        .from(DisponibilidadDocente)
        .where('"docente_id" = :docenteId', { docenteId })
        .andWhere("periodo_academico = :periodo", { periodo: dto.periodo })
        .execute();

      // Mapear y normalizar los nuevos slots a HH:mm:00
      const nuevosSlots = dto.slots.map((slot) => {
        const hInicio = slot.hora_inicio.length === 5 ? `${slot.hora_inicio}:00` : slot.hora_inicio;
        const hFin = slot.hora_fin.length === 5 ? `${slot.hora_fin}:00` : slot.hora_fin;

        const [hiH, hiM] = hInicio.split(":").map(Number);
        const [hfH, hfM] = hFin.split(":").map(Number);
        if (hiH * 60 + hiM >= hfH * 60 + hfM) {
          throw new BadRequestException(
            `La hora de inicio (${slot.hora_inicio}) debe ser menor que la hora de fin (${slot.hora_fin})`,
          );
        }

        return manager.create(DisponibilidadDocente, {
          dia_semana: slot.dia_semana,
          hora_inicio: hInicio,
          hora_fin: hFin,
          disponible: slot.disponible,
          periodo_academico: dto.periodo,
          docente,
        });
      });

      await manager.save(DisponibilidadDocente, nuevosSlots);
    });

    return this.getByDocente(docenteId, dto.periodo);
  }

  async getResumenDocentes(periodo: string) {
    const periodoAcademico = await this.periodoRepo.findOne({
      where: { codigo: periodo },
    });
    if (!periodoAcademico) {
      throw new NotFoundException(`Periodo académico ${periodo} no encontrado`);
    }

    const allTeachers = await this.docenteRepo.find({
      where: { activo: true },
      order: { apellidos: "ASC" },
    });

    // Obtener los slots donde disponible = true para este período
    const registros = await this.disponibilidadRepo
      .createQueryBuilder("d")
      .innerJoinAndSelect("d.docente", "docente")
      .where("d.periodo_academico = :periodo", { periodo })
      .andWhere("d.disponible = :disponible", { disponible: true })
      .andWhere("docente.activo = :activo", { activo: true })
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

    const detalle = Array.from(docenteMap.values());
    const declaredTeacherIds = new Set(docenteMap.keys());

    const declararon = declaredTeacherIds.size;
    const faltan = allTeachers.filter((t) => !declaredTeacherIds.has(t.id)).length;

    return {
      declararon,
      faltan,
      detalle,
    };
  }

  async getRestricciones(periodo: string, page = 1, limit = 20) {
    const [items, total] = await this.restriccionRepo
      .createQueryBuilder("restriccion")
      .where("restriccion.periodo_academico = :periodo", { periodo })
      .andWhere("restriccion.activo = :activo", { activo: true })
      .orderBy("restriccion.id", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`restricciones_periodo_${periodo}_${page}_${limit}`, 60000)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async eliminarDisponibilidad(docenteId: number, periodo: string) {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
    });
    if (!docente) {
      throw new NotFoundException(`Docente con ID ${docenteId} no encontrado`);
    }
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(DisponibilidadDocente)
      .where('"docente_id" = :docenteId', { docenteId })
      .andWhere("periodo_academico = :periodo", { periodo })
      .execute();
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
      .createQueryBuilder("periodo")
      .orderBy("periodo.codigo", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`periodos_${page}_${limit}`, 60000)
      .getManyAndCount();

    return { items, total, page, limit };
  }
}
