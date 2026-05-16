import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Docente } from '../entities/docente.entity';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { QueryDocenteDto } from './dto/query-docente.dto';

@Injectable()
export class DocentesService {
  constructor(
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
  ) {}

  async findAll(query: QueryDocenteDto) {
    const { page = 1, limit = 20, categoria, tipo_contrato, busqueda } = query;

    const qb = this.docenteRepo
      .createQueryBuilder('docente')
      .where('docente.activo = :activo', { activo: true });

    if (categoria) {
      qb.andWhere('docente.categoria = :categoria', { categoria });
    }

    if (tipo_contrato) {
      qb.andWhere('docente.tipo_contrato = :tipo_contrato', { tipo_contrato });
    }

    if (busqueda) {
      qb.andWhere(
        '(docente.nombres ILIKE :busqueda OR docente.apellidos ILIKE :busqueda OR docente.codigo ILIKE :busqueda)',
        { busqueda: `%${busqueda}%` },
      );
    }

    const [items, total] = await qb
      .orderBy('docente.apellidos', 'ASC')
      .addOrderBy('docente.nombres', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .cache(
        `docentes_list_${categoria ?? 'all'}_${tipo_contrato ?? 'all'}_${busqueda ?? 'none'}_${page}_${limit}`,
        60000,
      )
      .getManyAndCount();

    return {
      data: items.map((d) => ({ ...d, antiguedad: this.calcularAntiguedad(d.fecha_ingreso) })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<Docente> {
    const docente = await this.docenteRepo
      .createQueryBuilder('docente')
      .leftJoinAndSelect('docente.disponibilidades', 'disponibilidades')
      .leftJoinAndSelect('docente.horarios', 'horarios')
      .leftJoinAndSelect('docente.colas', 'colas')
      .where('docente.id = :id', { id })
      .cache(`docente_${id}_detalle`, 60000)
      .getOne();

    if (!docente) {
      throw new NotFoundException(`Docente con ID ${id} no encontrado`);
    }

    return docente;
  }

  async findOrdenadosPorJerarquia(periodo: string) {
    const qb = this.docenteRepo
      .createQueryBuilder('docente')
      .where('docente.activo = :activo', { activo: true })
      .addSelect(
        `CASE
          WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'PRINCIPAL'     THEN 1
          WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'ASOCIADO'      THEN 2
          WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'AUXILIAR'      THEN 3
          WHEN docente.tipo_contrato = 'NOMBRADO' AND docente.categoria = 'JEFE_PRACTICA' THEN 4
          WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'PRINCIPAL'     THEN 5
          WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'ASOCIADO'      THEN 6
          WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'AUXILIAR'      THEN 7
          WHEN docente.tipo_contrato = 'CONTRATADO' AND docente.categoria = 'JEFE_PRACTICA' THEN 8
          ELSE 9
        END`,
        'orden_jerarquia',
      )
      .orderBy('orden_jerarquia', 'ASC')
      .addOrderBy('docente.fecha_ingreso', 'ASC');

    const docentes = await qb.getMany();

    return docentes.map((d, index) => ({
      posicion: index + 1,
      ...d,
      antiguedad: this.calcularAntiguedad(d.fecha_ingreso),
      periodo,
    }));
  }

  async create(dto: CreateDocenteDto): Promise<Docente> {
    const emailExistente = await this.docenteRepo.findOne({
      where: { email: dto.email },
    });
    if (emailExistente) {
      throw new ConflictException(`El email '${dto.email}' ya está registrado`);
    }

    const codigoExistente = await this.docenteRepo.findOne({
      where: { codigo: dto.codigo },
    });
    if (codigoExistente) {
      throw new ConflictException(`El código '${dto.codigo}' ya está registrado`);
    }

    const docente = this.docenteRepo.create({
      ...dto,
      fecha_ingreso: new Date(dto.fecha_ingreso),
      activo: true,
    });

    return this.docenteRepo.save(docente);
  }

  async update(id: number, dto: UpdateDocenteDto): Promise<Docente> {
    const docente = await this.findOne(id);

    if (dto.email && dto.email !== docente.email) {
      const emailExistente = await this.docenteRepo.findOne({
        where: { email: dto.email },
      });
      if (emailExistente) {
        throw new ConflictException(`El email '${dto.email}' ya está en uso`);
      }
    }

    if (dto.codigo && dto.codigo !== docente.codigo) {
      const codigoExistente = await this.docenteRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (codigoExistente) {
        throw new ConflictException(`El código '${dto.codigo}' ya está en uso`);
      }
    }

    const actualizado = this.docenteRepo.merge(docente, {
      ...dto,
      ...(dto.fecha_ingreso && { fecha_ingreso: new Date(dto.fecha_ingreso) }),
    });

    return this.docenteRepo.save(actualizado);
  }

  async remove(id: number): Promise<void> {
    const docente = await this.findOne(id);
    await this.docenteRepo.save({ ...docente, activo: false });
  }

  calcularAntiguedad(fechaIngreso: Date): { anios: number; meses: number } {
    const ahora = new Date();
    const ingreso = new Date(fechaIngreso);
    const diffMs = ahora.getTime() - ingreso.getTime();
    const anios = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    const meses = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44),
    );
    return { anios, meses };
  }
}
