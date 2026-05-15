import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HorarioAsignado } from '../../entities/horario-asignado.entity';
import { DisponibilidadDocente } from '../../entities/disponibilidad-docente.entity';

@Injectable()
export class ValidacionesService {
  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
  ) {}

  async verificarCruceDocente(
    docenteId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
    excluirId?: number,
  ): Promise<boolean> {
    const qb = this.horarioRepo
      .createQueryBuilder('h')
      .innerJoin('h.docente', 'd')
      .where('d.id = :docenteId', { docenteId })
      .andWhere('h.dia_semana = :diaSemana', { diaSemana })
      .andWhere('h.periodo_academico = :periodo', { periodo })
      .andWhere('h.hora_inicio < CAST(:horaFin AS TIME)', { horaFin })
      .andWhere('h.hora_fin > CAST(:horaInicio AS TIME)', { horaInicio });

    if (excluirId) {
      qb.andWhere('h.id != :excluirId', { excluirId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  async verificarCruceAmbiente(
    ambienteId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
    excluirId?: number,
  ): Promise<boolean> {
    const qb = this.horarioRepo
      .createQueryBuilder('h')
      .innerJoin('h.ambiente', 'a')
      .where('a.id = :ambienteId', { ambienteId })
      .andWhere('h.dia_semana = :diaSemana', { diaSemana })
      .andWhere('h.periodo_academico = :periodo', { periodo })
      .andWhere('h.hora_inicio < CAST(:horaFin AS TIME)', { horaFin })
      .andWhere('h.hora_fin > CAST(:horaInicio AS TIME)', { horaInicio });

    if (excluirId) {
      qb.andWhere('h.id != :excluirId', { excluirId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  async verificarCruceGrupo(
    grupoId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
    excluirId?: number,
  ): Promise<boolean> {
    const qb = this.horarioRepo
      .createQueryBuilder('h')
      .innerJoin('h.grupo', 'g')
      .where('g.id = :grupoId', { grupoId })
      .andWhere('h.dia_semana = :diaSemana', { diaSemana })
      .andWhere('h.periodo_academico = :periodo', { periodo })
      .andWhere('h.hora_inicio < CAST(:horaFin AS TIME)', { horaFin })
      .andWhere('h.hora_fin > CAST(:horaInicio AS TIME)', { horaInicio });

    if (excluirId) {
      qb.andWhere('h.id != :excluirId', { excluirId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  async verificarDisponibilidadDocente(
    docenteId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<boolean> {
    const count = await this.disponibilidadRepo
      .createQueryBuilder('d')
      .innerJoin('d.docente', 'doc')
      .where('doc.id = :docenteId', { docenteId })
      .andWhere('d.dia_semana = :diaSemana', { diaSemana })
      .andWhere('d.periodo_academico = :periodo', { periodo })
      .andWhere('d.disponible = true')
      .andWhere('CAST(:horaInicio AS TIME) >= d.hora_inicio', { horaInicio })
      .andWhere('CAST(:horaFin AS TIME) <= d.hora_fin', { horaFin })
      .getCount();

    return count > 0;
  }

  verificarFranjaInstitucional(horaInicio: string, horaFin: string): boolean {
    const toMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const inicioMin = toMinutes(horaInicio);
    const finMin = toMinutes(horaFin);
    return inicioMin >= 7 * 60 && finMin <= 22 * 60 && inicioMin < finMin;
  }
}
