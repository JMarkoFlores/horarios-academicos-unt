import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Docente } from '../../entities/docente.entity';

@Injectable()
export class DeclaracionesService {
  constructor(
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
  ) {}

  async getDocentesActivos(): Promise<Docente[]> {
    return this.docenteRepo.find({
      where: { activo: true },
      select: ['id', 'codigo', 'nombres', 'apellidos', 'email'],
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });
  }

  async getDocenteById(id: number): Promise<Docente | null> {
    return this.docenteRepo.findOne({
      where: { id, activo: true },
      select: ['id', 'codigo', 'nombres', 'apellidos', 'email', 'categoria', 'tipo_contrato'],
    });
  }
}
