import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { ConflictoAsignacion } from '../entities/conflicto-asignacion.entity';
import { Ambiente } from '../entities/ambiente.entity';
import { EstadoHorario } from '../common/enums/estado-horario.enum';
import { ReasignarHorarioDto } from './dto/reasignar-horario.dto';
import { ValidacionesService } from '../common/services/validaciones.service';

@Injectable()
export class HorariosService {
  constructor(
    @InjectRepository(HorarioAsignado) private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(ConflictoAsignacion) private readonly conflictoRepo: Repository<ConflictoAsignacion>,
    @InjectRepository(Ambiente) private readonly ambienteRepo: Repository<Ambiente>,
    private readonly validacionesService: ValidacionesService,
  ) {}

  async findAllByPeriodo(periodo: string): Promise<HorarioAsignado[]> {
    return this.horarioRepo.find({
      where: { periodo_academico: periodo },
      relations: ['docente', 'curso', 'ambiente', 'grupo'],
      order: { dia_semana: 'ASC', hora_inicio: 'ASC' },
    });
  }

  async findByDocente(docenteId: number, periodo: string): Promise<HorarioAsignado[]> {
    return this.horarioRepo.find({
      where: { docente: { id: docenteId }, periodo_academico: periodo },
      relations: ['docente', 'curso', 'ambiente', 'grupo'],
      order: { dia_semana: 'ASC', hora_inicio: 'ASC' },
    });
  }

  async findByAmbiente(ambienteId: number, periodo: string): Promise<HorarioAsignado[]> {
    return this.horarioRepo.find({
      where: { ambiente: { id: ambienteId }, periodo_academico: periodo },
      relations: ['docente', 'curso', 'ambiente', 'grupo'],
      order: { dia_semana: 'ASC', hora_inicio: 'ASC' },
    });
  }

  async findConflictos(periodo: string): Promise<ConflictoAsignacion[]> {
    return this.conflictoRepo.find({
      where: { periodo_academico: periodo },
      relations: ['docente', 'ambiente'],
      order: { created_at: 'DESC' },
    });
  }

  async resolverConflicto(id: number): Promise<ConflictoAsignacion> {
    const conflicto = await this.conflictoRepo.findOne({ where: { id } });
    if (!conflicto) throw new NotFoundException(`Conflicto ${id} no encontrado`);

    conflicto.resuelto = true;
    return this.conflictoRepo.save(conflicto);
  }

  async reasignarManual(id: number, dto: ReasignarHorarioDto): Promise<HorarioAsignado> {
    const horario = await this.horarioRepo.findOne({
      where: { id },
      relations: ['docente', 'ambiente', 'grupo'],
    });
    if (!horario) throw new NotFoundException(`Horario ${id} no encontrado`);

    const franja = this.validacionesService.verificarFranjaInstitucional(dto.hora_inicio, dto.hora_fin);
    if (!franja) throw new BadRequestException('El slot está fuera de la franja institucional (07:00-22:00)');

    const cruceDoc = await this.validacionesService.verificarCruceDocente(
      horario.docente.id, dto.dia_semana, dto.hora_inicio, dto.hora_fin, horario.periodo_academico, id,
    );
    if (cruceDoc) throw new BadRequestException('El docente tiene un cruce en ese horario');

    const ambienteId = dto.ambiente_id ?? horario.ambiente.id;
    const cruceAmb = await this.validacionesService.verificarCruceAmbiente(
      ambienteId, dto.dia_semana, dto.hora_inicio, dto.hora_fin, horario.periodo_academico, id,
    );
    if (cruceAmb) throw new BadRequestException('El ambiente tiene un cruce en ese horario');

    if (horario.grupo) {
      const cruceGrupo = await this.validacionesService.verificarCruceGrupo(
        horario.grupo.id, dto.dia_semana, dto.hora_inicio, dto.hora_fin, horario.periodo_academico, id,
      );
      if (cruceGrupo) throw new BadRequestException('El grupo tiene un cruce en ese horario');
    }

    horario.dia_semana = dto.dia_semana;
    horario.hora_inicio = dto.hora_inicio;
    horario.hora_fin = dto.hora_fin;
    horario.estado = EstadoHorario.BORRADOR;

    if (dto.ambiente_id) {
      const nuevoAmbiente = await this.ambienteRepo.findOne({ where: { id: dto.ambiente_id } });
      if (!nuevoAmbiente) throw new NotFoundException(`Ambiente ${dto.ambiente_id} no encontrado`);
      horario.ambiente = nuevoAmbiente;
    }

    return this.horarioRepo.save(horario);
  }
}
