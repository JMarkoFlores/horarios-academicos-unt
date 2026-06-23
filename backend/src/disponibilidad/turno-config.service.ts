import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TurnoConfig, TipoTurno } from "../entities/turno-config.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";

export interface SlotDisponibilidad {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
}

@Injectable()
export class TurnoConfigService {
  private readonly logger = new Logger(TurnoConfigService.name);

  constructor(
    @InjectRepository(TurnoConfig)
    private readonly turnoConfigRepo: Repository<TurnoConfig>,
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
  ) {}

  async obtenerTurnosActivos(facultadId?: number): Promise<TurnoConfig[]> {
    const where: any = { activo: true };
    if (facultadId) {
      where.facultad_id = facultadId;
    } else {
      where.facultad_id = null; // Configuración global
    }

    return this.turnoConfigRepo.find({
      where,
      order: { hora_inicio: "ASC" },
    });
  }

  async obtenerTurnoPorId(id: number): Promise<TurnoConfig> {
    const turno = await this.turnoConfigRepo.findOne({ where: { id } });
    if (!turno) {
      throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    }
    return turno;
  }

  async crearTurnoConfig(config: Partial<TurnoConfig>): Promise<TurnoConfig> {
    const nuevoTurno = this.turnoConfigRepo.create(config);
    return this.turnoConfigRepo.save(nuevoTurno);
  }

  async actualizarTurnoConfig(
    id: number,
    config: Partial<TurnoConfig>,
  ): Promise<TurnoConfig> {
    await this.obtenerTurnoPorId(id);
    await this.turnoConfigRepo.update(id, config);
    return this.obtenerTurnoPorId(id);
  }

  async eliminarTurnoConfig(id: number): Promise<void> {
    await this.obtenerTurnoPorId(id);
    await this.turnoConfigRepo.delete(id);
  }

  /**
   * Convierte turnos seleccionados a slots de disponibilidad
   * @param turnoIds IDs de los turnos seleccionados
   * @param docenteId ID del docente
   * @param periodo Código del periodo académico
   * @returns Lista de slots de disponibilidad
   */
  async convertirTurnosASlots(
    turnoIds: number[],
    docenteId: number,
    periodo: string,
  ): Promise<SlotDisponibilidad[]> {
    const slots: SlotDisponibilidad[] = [];

    for (const turnoId of turnoIds) {
      const turno = await this.obtenerTurnoPorId(turnoId);
      const slotsTurno = this.generarSlotsDesdeTurno(turno);
      slots.push(...slotsTurno);
    }

    // Eliminar duplicados
    const slotsUnicos = this.eliminarDuplicados(slots);

    this.logger.log(
      `Generados ${slotsUnicos.length} slots desde ${turnoIds.length} turnos para docente ${docenteId}`,
    );

    return slotsUnicos;
  }

  /**
   * Genera slots de disponibilidad desde una configuración de turno
   */
  private generarSlotsDesdeTurno(turno: TurnoConfig): SlotDisponibilidad[] {
    const slots: SlotDisponibilidad[] = [];
    const dias = turno.dias_habilitados || [1, 2, 3, 4, 5]; // Default: lunes-viernes

    const [horaInicio, minInicio] = turno.hora_inicio.split(":").map(Number);
    const [horaFin, minFin] = turno.hora_fin.split(":").map(Number);

    const inicioMinutos = horaInicio * 60 + minInicio;
    const finMinutos = horaFin * 60 + minFin;
    const intervalo = turno.intervalo_minutos || 60;

    for (const dia of dias) {
      for (let minutos = inicioMinutos; minutos < finMinutos; minutos += intervalo) {
        const hInicio = Math.floor(minutos / 60);
        const mInicio = minutos % 60;
        const hFin = Math.floor((minutos + intervalo) / 60);
        const mFin = (minutos + intervalo) % 60;

        slots.push({
          dia_semana: dia,
          hora_inicio: `${hInicio.toString().padStart(2, "0")}:${mInicio.toString().padStart(2, "0")}`,
          hora_fin: `${hFin.toString().padStart(2, "0")}:${mFin.toString().padStart(2, "0")}`,
          disponible: true,
        });
      }
    }

    return slots;
  }

  /**
   * Elimina slots duplicados basados en día, hora_inicio y hora_fin
   */
  private eliminarDuplicados(slots: SlotDisponibilidad[]): SlotDisponibilidad[] {
    const mapa = new Map<string, SlotDisponibilidad>();

    for (const slot of slots) {
      const key = `${slot.dia_semana}-${slot.hora_inicio}-${slot.hora_fin}`;
      mapa.set(key, slot);
    }

    return Array.from(mapa.values());
  }

  /**
   * Guarda slots de disponibilidad en la base de datos
   */
  async guardarSlotsDisponibilidad(
    slots: SlotDisponibilidad[],
    docenteId: number,
    periodo: string,
  ): Promise<void> {
    // Eliminar slots existentes para el docente y periodo
    await this.disponibilidadRepo.delete({
      docente: { id: docenteId },
      periodo_academico: periodo,
    });

    // Crear nuevos slots
    const entidades = slots.map((slot) =>
      this.disponibilidadRepo.create({
        docente: { id: docenteId } as any,
        periodo_academico: periodo,
        dia_semana: slot.dia_semana,
        hora_inicio: slot.hora_inicio,
        hora_fin: slot.hora_fin,
        disponible: slot.disponible,
      }),
    );

    await this.disponibilidadRepo.save(entidades);

    this.logger.log(
      `Guardados ${entidades.length} slots de disponibilidad para docente ${docenteId}`,
    );
  }

  /**
   * Aplica turnos seleccionados a un docente (convierte y guarda)
   */
  async aplicarTurnosADocente(
    turnoIds: number[],
    docenteId: number,
    periodo: string,
  ): Promise<void> {
    const slots = await this.convertirTurnosASlots(turnoIds, docenteId, periodo);
    await this.guardarSlotsDisponibilidad(slots, docenteId, periodo);
  }

  /**
   * Inicializa configuración de turnos por defecto para UNT
   */
  async inicializarTurnosPorDefecto(): Promise<void> {
    const existeConfig = await this.turnoConfigRepo.count();
    if (existeConfig > 0) {
      this.logger.log("Ya existe configuración de turnos, omitiendo inicialización");
      return;
    }

    const turnosDefault: Partial<TurnoConfig>[] = [
      {
        nombre: "Mañana",
        tipo: TipoTurno.MANANA,
        hora_inicio: "07:00",
        hora_fin: "13:00",
        intervalo_minutos: 60,
        dias_habilitados: [1, 2, 3, 4, 5],
        activo: true,
        descripcion: "Turno mañana (07:00 - 13:00)",
      },
      {
        nombre: "Tarde",
        tipo: TipoTurno.TARDE,
        hora_inicio: "13:00",
        hora_fin: "18:00",
        intervalo_minutos: 60,
        dias_habilitados: [1, 2, 3, 4, 5],
        activo: true,
        descripcion: "Turno tarde (13:00 - 18:00)",
      },
      {
        nombre: "Noche",
        tipo: TipoTurno.NOCHE,
        hora_inicio: "18:00",
        hora_fin: "22:00",
        intervalo_minutos: 60,
        dias_habilitados: [1, 2, 3, 4, 5],
        activo: true,
        descripcion: "Turno noche (18:00 - 22:00)",
      },
      {
        nombre: "Sábado Mañana",
        tipo: TipoTurno.SABADO_MANANA,
        hora_inicio: "07:00",
        hora_fin: "13:00",
        intervalo_minutos: 60,
        dias_habilitados: [6],
        activo: true,
        descripcion: "Turno sábado mañana (07:00 - 13:00)",
      },
    ];

    for (const turno of turnosDefault) {
      await this.crearTurnoConfig(turno);
    }

    this.logger.log("Inicializados ${turnosDefault.length} turnos por defecto");
  }
}
