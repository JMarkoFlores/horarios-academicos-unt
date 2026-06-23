import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DeclaracionClad } from '../entities/declaracion-clad.entity';
import { DetalleClad } from '../entities/detalle-clad.entity';
import { CreateCladDto } from './dto/create-clad.dto';
import { ObservarCladDto } from './dto/update-clad.dto';
import { EstadoClad } from '../common/enums/estado-clad.enum';
import { HorariosService } from '../horarios/horarios.service';
import { Docente } from '../entities/docente.entity';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { PeriodoAcademico } from '../entities/periodo-academico.entity';
import { ParametrosCarga } from '../entities/parametros-carga.entity';
import { DeclaracionCargaHoraria } from '../entities/declaracion-carga-horaria.entity';

@Injectable()
export class CladService {
  constructor(
    @InjectRepository(DeclaracionClad)
    private readonly cladRepo: Repository<DeclaracionClad>,
    @InjectRepository(DetalleClad)
    private readonly detalleRepo: Repository<DetalleClad>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(DeclaracionCargaHoraria)
    private readonly declaracionRepo: Repository<DeclaracionCargaHoraria>,
    private readonly horariosService: HorariosService,
  ) {}

  async findAll(query: any, user: any) {
    const qb = this.cladRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.docente', 'd')
      .leftJoinAndSelect('d.departamento', 'dpto')
      .leftJoinAndSelect('d.facultad', 'fac')
      .leftJoinAndSelect('c.periodo_academico', 'p')
      .leftJoinAndSelect('c.detalles', 'detalles');

    if (query.periodo_academico_id) {
      qb.andWhere('c.periodo_academico_id = :periodo', { periodo: query.periodo_academico_id });
    }
    if (query.estado) {
      qb.andWhere('c.estado = :estado', { estado: query.estado });
    }

    if (user.rol === 'docente') {
      qb.andWhere('c.docente_id = :docenteId', { docenteId: user.docenteId });
    } else if (user.rol === 'directordepartamento' && user.departamento_id) {
      qb.andWhere('d.departamento_id = :dptoId', { dptoId: user.departamento_id });
    } else if (user.rol === 'decanofacultad' && user.facultad_id) {
      qb.andWhere('d.facultad_id = :facId', { facId: user.facultad_id });
    }

    qb.orderBy('c.created_at', 'DESC');
    return qb.getMany();
  }

  async getMiClad(user: any, periodo: string) {
    return this.cladRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.detalles', 'detalles')
      .leftJoinAndSelect('c.periodo_academico', 'p')
      .where('c.docente_id = :docenteId', { docenteId: user.docenteId })
      .andWhere('p.codigo = :periodo', { periodo })
      .getOne();
  }

  async findOne(id: number) {
    const clad = await this.cladRepo.findOne({
      where: { id },
      relations: ['docente', 'docente.departamento', 'docente.facultad', 'periodo_academico', 'detalles'],
    });
    if (!clad) throw new NotFoundException('CLAD no encontrado');
    return clad;
  }

  async create(dto: CreateCladDto, user: any) {
    if (!user.docenteId) throw new BadRequestException('Usuario no es docente');

    const docente = await this.docenteRepo.findOne({ where: { id: user.docenteId } });
    if (!docente) throw new NotFoundException('Docente no encontrado');

    const sumHoras = dto.detalles.reduce((acc, curr) => acc + curr.horas_semanales, 0);

    const periodo = await this.cladRepo.manager.findOne(PeriodoAcademico, { where: { id: dto.periodo_academico_id } });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');

    const paramCarga = await this.cladRepo.manager.findOne(ParametrosCarga, {
      where: {
        periodo_academico: periodo.codigo,
        categoria: docente.categoria || '',
        modalidad: docente.modalidad || ''
      }
    });
    const horasMaxSemanal = paramCarga?.horas_max_semanal ?? 40;

    const declaracion = await this.declaracionRepo.findOne({
      where: { docente_id: user.docenteId, periodo_academico_id: dto.periodo_academico_id }
    });
    const horasCAD = declaracion?.total_horas_general ?? 0;
    const totalFinal = horasCAD + sumHoras;
    if (totalFinal > horasMaxSemanal) {
      throw new BadRequestException(
        `La suma de Carga Académica (${horasCAD}h) + Carga Adicional CLAD (${sumHoras}h) = ${totalFinal}h excede el máximo de ${horasMaxSemanal}h semanales permitidas para su categoría/modalidad.`
      );
    }

    const estadosActivos = [EstadoClad.BORRADOR, EstadoClad.ENVIADO_DPTO, EstadoClad.VALIDADO_DPTO, EstadoClad.VALIDADO_DEPENDENCIA, EstadoClad.APROBADO_FINAL];

    for (const det of dto.detalles) {
      for (const hor of det.horario) {
        const conflictos = await this.horarioRepo.createQueryBuilder('h')
          .where('h.docente_id = :docenteId', { docenteId: user.docenteId })
          .andWhere('h.dia = :dia', { dia: hor.dia })
          .andWhere('h.periodo = :periodo', { periodo: periodo.codigo })
          .andWhere('h.hora_inicio < CAST(:horaFin AS TIME)', { horaFin: hor.hora_fin })
          .andWhere('h.hora_fin > CAST(:horaInicio AS TIME)', { horaInicio: hor.hora_inicio })
          .getMany();

        if (conflictos.length > 0) {
          throw new BadRequestException(`Cruce de horario detectado en ${det.nombre_curso} (Día ${hor.dia} ${hor.hora_inicio}-${hor.hora_fin}) con un curso de Pregrado.`);
        }
      }
    }

    const existingClads = await this.cladRepo.find({
      where: {
        docente_id: user.docenteId,
        periodo_academico_id: dto.periodo_academico_id,
        estado: In(estadosActivos),
      },
      relations: ['detalles'],
    });

    for (const existing of existingClads) {
      for (const det of existing.detalles) {
        const horarios = Array.isArray(det.horario) ? det.horario as any[] : [];
        for (const h of horarios) {
          for (const nuevoDet of dto.detalles) {
            for (const nuevoHor of nuevoDet.horario) {
              if (h.dia === nuevoHor.dia &&
                  h.hora_inicio < nuevoHor.hora_fin &&
                  h.hora_fin > nuevoHor.hora_inicio) {
                throw new BadRequestException(
                  `Cruce de horario detectado en ${nuevoDet.nombre_curso} (Día ${nuevoHor.dia} ${nuevoHor.hora_inicio}-${nuevoHor.hora_fin}) con otra declaración CLAD existente (${det.nombre_curso}).`
                );
              }
            }
          }
        }
      }
    }

    const clad = this.cladRepo.create({
      docente_id: user.docenteId,
      periodo_academico_id: dto.periodo_academico_id,
      tipo_dependencia: dto.tipo_dependencia,
      nombre_dependencia: dto.nombre_dependencia,
      estado: EstadoClad.BORRADOR,
      observaciones: dto.observaciones,
      total_horas: sumHoras,
    });

    const savedClad = await this.cladRepo.save(clad);

    const detalles = dto.detalles.map(d => this.detalleRepo.create({
      declaracion_clad_id: savedClad.id,
      ...d
    }));
    await this.detalleRepo.save(detalles);

    return this.findOne(savedClad.id);
  }

  async update(id: number, dto: CreateCladDto, user: any) {
    const clad = await this.findOne(id);
    if (clad.docente_id !== user.docenteId) throw new ForbiddenException('No es el propietario');
    if (clad.estado !== EstadoClad.BORRADOR && clad.estado !== EstadoClad.OBSERVADO_DPTO && clad.estado !== EstadoClad.OBSERVADO_DEPENDENCIA) {
      throw new BadRequestException('No se puede editar en el estado actual');
    }

    const sumHoras = dto.detalles.reduce((acc, curr) => acc + curr.horas_semanales, 0);

    const periodo = await this.cladRepo.manager.findOne(PeriodoAcademico, { where: { id: dto.periodo_academico_id } });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');

    const paramCarga = await this.cladRepo.manager.findOne(ParametrosCarga, {
      where: {
        periodo_academico: periodo.codigo,
        categoria: clad.docente.categoria || '',
        modalidad: clad.docente.modalidad || ''
      }
    });
    const horasMaxSemanal = paramCarga?.horas_max_semanal ?? 40;

    const declaracion = await this.declaracionRepo.findOne({
      where: { docente_id: user.docenteId, periodo_academico_id: dto.periodo_academico_id }
    });
    const horasCAD = declaracion?.total_horas_general ?? 0;
    const totalFinal = horasCAD + sumHoras;
    if (totalFinal > horasMaxSemanal) {
      throw new BadRequestException(
        `La suma de Carga Académica (${horasCAD}h) + Carga Adicional CLAD (${sumHoras}h) = ${totalFinal}h excede el máximo de ${horasMaxSemanal}h semanales permitidas para su categoría/modalidad.`
      );
    }

    const estadosActivos = [EstadoClad.BORRADOR, EstadoClad.ENVIADO_DPTO, EstadoClad.VALIDADO_DPTO, EstadoClad.VALIDADO_DEPENDENCIA, EstadoClad.APROBADO_FINAL];

    for (const det of dto.detalles) {
      for (const hor of det.horario) {
        const conflictos = await this.horarioRepo.createQueryBuilder('h')
          .where('h.docente_id = :docenteId', { docenteId: user.docenteId })
          .andWhere('h.dia = :dia', { dia: hor.dia })
          .andWhere('h.periodo = :periodo', { periodo: periodo.codigo })
          .andWhere('h.hora_inicio < CAST(:horaFin AS TIME)', { horaFin: hor.hora_fin })
          .andWhere('h.hora_fin > CAST(:horaInicio AS TIME)', { horaInicio: hor.hora_inicio })
          .getMany();

        if (conflictos.length > 0) {
          throw new BadRequestException(`Cruce de horario detectado en ${det.nombre_curso} (Día ${hor.dia} ${hor.hora_inicio}-${hor.hora_fin}) con un curso de Pregrado.`);
        }
      }
    }

    const existingClads = await this.cladRepo.find({
      where: {
        docente_id: user.docenteId,
        periodo_academico_id: dto.periodo_academico_id,
        estado: In(estadosActivos),
      },
      relations: ['detalles'],
    });

    for (const existing of existingClads) {
      if (existing.id === id) continue;
      for (const det of existing.detalles) {
        const horarios = Array.isArray(det.horario) ? det.horario as any[] : [];
        for (const h of horarios) {
          for (const nuevoDet of dto.detalles) {
            for (const nuevoHor of nuevoDet.horario) {
              if (h.dia === nuevoHor.dia &&
                  h.hora_inicio < nuevoHor.hora_fin &&
                  h.hora_fin > nuevoHor.hora_inicio) {
                throw new BadRequestException(
                  `Cruce de horario detectado en ${nuevoDet.nombre_curso} (Día ${nuevoHor.dia} ${nuevoHor.hora_inicio}-${nuevoHor.hora_fin}) con otra declaración CLAD existente (${det.nombre_curso}).`
                );
              }
            }
          }
        }
      }
    }

    clad.tipo_dependencia = dto.tipo_dependencia;
    clad.nombre_dependencia = dto.nombre_dependencia;
    clad.observaciones = dto.observaciones;
    clad.total_horas = sumHoras;

    await this.cladRepo.save(clad);

    await this.detalleRepo.delete({ declaracion_clad_id: id });
    const detalles = dto.detalles.map(d => this.detalleRepo.create({
      declaracion_clad_id: id,
      ...d
    }));
    await this.detalleRepo.save(detalles);

    return this.findOne(id);
  }

  async remove(id: number, user: any) {
    const clad = await this.findOne(id);
    if (user.rol !== 'admin' && clad.docente_id !== user.docenteId) throw new ForbiddenException();
    if (clad.estado !== EstadoClad.BORRADOR) throw new BadRequestException('Solo se pueden eliminar borradores');
    await this.cladRepo.remove(clad);
    return { success: true };
  }

  async enviar(id: number, user: any) {
    const clad = await this.findOne(id);
    if (clad.docente_id !== user.docenteId) throw new ForbiddenException();
    if (clad.estado !== EstadoClad.BORRADOR && clad.estado !== EstadoClad.OBSERVADO_DPTO && clad.estado !== EstadoClad.OBSERVADO_DEPENDENCIA) {
      throw new BadRequestException('Estado inválido para enviar');
    }
    
    clad.estado = EstadoClad.ENVIADO_DPTO;
    clad.fecha_envio = new Date();
    clad.firma_docente = { fecha: new Date(), ip: '127.0.0.1', id: user.sub };
    
    return this.cladRepo.save(clad);
  }

  async validarDpto(id: number, user: any) {
    const clad = await this.findOne(id);
    if (user.rol !== 'admin' && clad.docente.departamento_id !== user.departamento_id) throw new ForbiddenException();
    if (clad.estado !== EstadoClad.ENVIADO_DPTO) throw new BadRequestException('Estado inválido');
    
    clad.estado = EstadoClad.VALIDADO_DPTO;
    clad.fecha_validacion_dpto = new Date();
    clad.firma_director_dpto = { fecha: new Date(), id: user.sub };
    
    return this.cladRepo.save(clad);
  }

  async observarDpto(id: number, dto: ObservarCladDto, user: any) {
    const clad = await this.findOne(id);
    if (user.rol !== 'admin' && clad.docente.departamento_id !== user.departamento_id) throw new ForbiddenException();
    
    clad.estado = EstadoClad.OBSERVADO_DPTO;
    clad.observaciones = dto.motivo_observacion;
    
    return this.cladRepo.save(clad);
  }

  async validarDependencia(id: number, user: any) {
    const clad = await this.findOne(id);
    if (clad.estado !== EstadoClad.VALIDADO_DPTO) throw new BadRequestException('Estado inválido');
    
    clad.estado = EstadoClad.VALIDADO_DEPENDENCIA;
    clad.fecha_validacion_dependencia = new Date();
    clad.firma_director_dependencia = { fecha: new Date(), id: user.sub };
    
    return this.cladRepo.save(clad);
  }

  async observarDependencia(id: number, dto: ObservarCladDto, user: any) {
    const clad = await this.findOne(id);
    clad.estado = EstadoClad.OBSERVADO_DEPENDENCIA;
    clad.observaciones = dto.motivo_observacion;
    return this.cladRepo.save(clad);
  }

  async aprobarFinal(id: number, user: any) {
    const clad = await this.findOne(id);
    if (user.rol !== 'admin' && clad.docente.facultad_id !== user.facultad_id) throw new ForbiddenException();
    if (clad.estado !== EstadoClad.VALIDADO_DEPENDENCIA) throw new BadRequestException('Estado inválido');
    
    clad.estado = EstadoClad.APROBADO_FINAL;
    clad.fecha_aprobacion_final = new Date();
    clad.firma_decano = { fecha: new Date(), id: user.sub };
    
    return this.cladRepo.save(clad);
  }
}
