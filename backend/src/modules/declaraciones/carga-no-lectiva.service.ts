import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActividadNoLectiva } from '../../entities/actividad-no-lectiva.entity';
import { HorarioNoLectivo } from '../../entities/horario-no-lectivo.entity';
import { DeclaracionCargaHoraria } from '../../entities/declaracion-carga-horaria.entity';
import {
  CreateActividadNoLectivaDto,
  UpdateActividadNoLectivaDto,
  CreateHorarioNoLectivoDto,
  UpdateHorarioNoLectivoDto,
} from './dto/actividad-no-lectiva.dto';

@Injectable()
export class CargaNoLectivaService {
  constructor(
    @InjectRepository(ActividadNoLectiva)
    private actividadRepo: Repository<ActividadNoLectiva>,
    @InjectRepository(HorarioNoLectivo)
    private horarioRepo: Repository<HorarioNoLectivo>,
    @InjectRepository(DeclaracionCargaHoraria)
    private declaracionRepo: Repository<DeclaracionCargaHoraria>,
  ) {}

  // ── Actividades No Lectivas ─────────────────────────────────────────────

  async getActividadesByDeclaracion(declaracionId: number): Promise<ActividadNoLectiva[]> {
    return this.actividadRepo.find({
      where: { declaracion_id: declaracionId },
      relations: ['horarios'],
      order: { orden: 'ASC', id: 'ASC' },
    });
  }

  async getActividadById(id: number): Promise<ActividadNoLectiva> {
    const actividad = await this.actividadRepo.findOne({
      where: { id },
      relations: ['horarios'],
    });
    if (!actividad) {
      throw new NotFoundException('Actividad no lectiva no encontrada');
    }
    return actividad;
  }

  async createActividad(
    declaracionId: number,
    dto: CreateActividadNoLectivaDto,
  ): Promise<ActividadNoLectiva> {
    const declaracion = await this.declaracionRepo.findOne({
      where: { id: declaracionId },
    });
    if (!declaracion) {
      throw new NotFoundException('Declaración no encontrada');
    }

    const actividad = this.actividadRepo.create({
      declaracion_id: declaracionId,
      ...dto,
      horas_distribuidas: 0,
      horas_pendientes: dto.horas_totales,
    });

    return this.actividadRepo.save(actividad);
  }

  async updateActividad(
    id: number,
    dto: UpdateActividadNoLectivaDto,
  ): Promise<ActividadNoLectiva> {
    const actividad = await this.getActividadById(id);

    // Si se cambian las horas totales, recalcular pendientes
    if (dto.horas_totales !== undefined && dto.horas_totales !== actividad.horas_totales) {
      const horasDistribuidas = this.calcularHorasDistribuidas(actividad);
      const nuevasPendientes = Math.max(0, dto.horas_totales - horasDistribuidas);
      
      Object.assign(actividad, dto, {
        horas_pendientes: nuevasPendientes,
      });
    } else {
      Object.assign(actividad, dto);
    }

    return this.actividadRepo.save(actividad);
  }

  async deleteActividad(id: number): Promise<void> {
    const actividad = await this.getActividadById(id);
    await this.actividadRepo.remove(actividad);
  }

  // ── Horarios No Lectivos ─────────────────────────────────────────────────

  async addHorarioToActividad(
    actividadId: number,
    dto: CreateHorarioNoLectivoDto,
  ): Promise<HorarioNoLectivo> {
    const actividad = await this.getActividadById(actividadId);
    
    // Calcular duración en horas
    const duracion = this.calcularDuracionHoras(dto.hora_inicio, dto.hora_fin);
    
    // Validar que no exceda las horas pendientes
    if (duracion > actividad.horas_pendientes) {
      throw new BadRequestException(
        `No puede asignar ${duracion}h. Solo quedan ${actividad.horas_pendientes}h pendientes.`
      );
    }

    const horario = this.horarioRepo.create({
      actividad_id: actividadId,
      ...dto,
      duracion_horas: duracion,
    });

    const savedHorario = await this.horarioRepo.save(horario);

    // Actualizar contadores de la actividad
    await this.actualizarContadoresActividad(actividadId);

    return savedHorario;
  }

  async updateHorario(
    id: number,
    dto: UpdateHorarioNoLectivoDto,
  ): Promise<HorarioNoLectivo> {
    const horario = await this.horarioRepo.findOne({
      where: { id },
      relations: ['actividad'],
    });
    if (!horario) {
      throw new NotFoundException('Horario no encontrado');
    }

    const actividad = horario.actividad;
    const duracionActual = horario.duracion_horas;
    const nuevaDuracion = dto.hora_inicio && dto.hora_fin
      ? this.calcularDuracionHoras(dto.hora_inicio, dto.hora_fin)
      : duracionActual;

    // Validar que la nueva duración no exceda las horas disponibles
    if (nuevaDuracion > duracionActual) {
      const delta = nuevaDuracion - duracionActual;
      if (delta > actividad.horas_pendientes) {
        throw new BadRequestException(
          `No puede extender ${delta}h. Solo quedan ${actividad.horas_pendientes}h pendientes.`
        );
      }
    }

    Object.assign(horario, dto);
    if (dto.hora_inicio && dto.hora_fin) {
      horario.duracion_horas = nuevaDuracion;
    }

    const savedHorario = await this.horarioRepo.save(horario);
    await this.actualizarContadoresActividad(actividad.id);

    return savedHorario;
  }

  async deleteHorario(id: number): Promise<void> {
    const horario = await this.horarioRepo.findOne({
      where: { id },
      relations: ['actividad'],
    });
    if (!horario) {
      throw new NotFoundException('Horario no encontrado');
    }

    const actividadId = horario.actividad.id;
    await this.horarioRepo.remove(horario);
    await this.actualizarContadoresActividad(actividadId);
  }

  // ── Utilidades ───────────────────────────────────────────────────────────

  private calcularDuracionHoras(horaInicio: string, horaFin: string): number {
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    const inicioMin = h1 * 60 + m1;
    const finMin = h2 * 60 + m2;
    return Math.max(1, Math.round((finMin - inicioMin) / 60));
  }

  private calcularHorasDistribuidas(actividad: ActividadNoLectiva): number {
    return actividad.horarios.reduce((sum, h) => sum + h.duracion_horas, 0);
  }

  private async actualizarContadoresActividad(actividadId: number): Promise<void> {
    const actividad = await this.actividadRepo.findOne({
      where: { id: actividadId },
      relations: ['horarios'],
    });
    if (!actividad) return;

    const distribuidas = this.calcularHorasDistribuidas(actividad);
    const pendientes = Math.max(0, actividad.horas_totales - distribuidas);

    await this.actividadRepo.update(actividadId, {
      horas_distribuidas: distribuidas,
      horas_pendientes: pendientes,
    });
  }

  async getResumenActividad(actividadId: number): Promise<{
    actividad: ActividadNoLectiva;
    horas_totales: number;
    horas_distribuidas: number;
    horas_pendientes: number;
    porcentaje_completado: number;
    distribucion_por_dia: Record<number, number>;
  }> {
    const actividad = await this.getActividadById(actividadId);
    const distribuidas = this.calcularHorasDistribuidas(actividad);
    const pendientes = Math.max(0, actividad.horas_totales - distribuidas);
    const porcentaje = actividad.horas_totales > 0
      ? Math.round((distribuidas / actividad.horas_totales) * 100)
      : 0;

    const distribucionPorDia: Record<number, number> = {};
    actividad.horarios.forEach(h => {
      distribucionPorDia[h.dia] = (distribucionPorDia[h.dia] || 0) + h.duracion_horas;
    });

    return {
      actividad,
      horas_totales: actividad.horas_totales,
      horas_distribuidas: distribuidas,
      horas_pendientes: pendientes,
      porcentaje_completado: porcentaje,
      distribucion_por_dia: distribucionPorDia,
    };
  }

  async getResumenDeclaracion(declaracionId: number): Promise<{
    total_actividades: number;
    total_horas_no_lectivas: number;
    total_horas_distribuidas: number;
    total_horas_pendientes: number;
    actividades: Array<{
      id: number;
      tipo: string;
      descripcion: string;
      horas_totales: number;
      horas_distribuidas: number;
      horas_pendientes: number;
      porcentaje_completado: number;
    }>;
  }> {
    const actividades = await this.getActividadesByDeclaracion(declaracionId);
    
    const totalHorasNoLectivas = actividades.reduce((sum, a) => sum + a.horas_totales, 0);
    const totalHorasDistribuidas = actividades.reduce((sum, a) => sum + a.horas_distribuidas, 0);
    const totalHorasPendientes = actividades.reduce((sum, a) => sum + a.horas_pendientes, 0);

    const actividadesResumen = actividades.map(a => {
      const porcentaje = a.horas_totales > 0
        ? Math.round((a.horas_distribuidas / a.horas_totales) * 100)
        : 0;
      return {
        id: a.id,
        tipo: a.tipo,
        descripcion: a.descripcion,
        horas_totales: a.horas_totales,
        horas_distribuidas: a.horas_distribuidas,
        horas_pendientes: a.horas_pendientes,
        porcentaje_completado: porcentaje,
      };
    });

    return {
      total_actividades: actividades.length,
      total_horas_no_lectivas: totalHorasNoLectivas,
      total_horas_distribuidas: totalHorasDistribuidas,
      total_horas_pendientes: totalHorasPendientes,
      actividades: actividadesResumen,
    };
  }
}
