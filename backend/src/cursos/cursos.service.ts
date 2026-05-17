import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Curso } from '../entities/curso.entity';
import { Ambiente } from '../entities/ambiente.entity';
import { TipoAmbiente } from '../common/enums/tipo-ambiente.enum';
import { TipoClase } from '../common/enums/tipo-clase.enum';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';
import { QueryCursoDto } from './dto/query-curso.dto';

@Injectable()
export class CursosService {
  constructor(
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
  ) {}

  async findAll(query: QueryCursoDto) {
    const { page = 1, limit = 20, ciclo, tiene_laboratorio } = query;

    const qb = this.cursoRepo
      .createQueryBuilder('curso')
      .where('curso.activo = :activo', { activo: true });

    if (ciclo !== undefined) {
      qb.andWhere('curso.ciclo = :ciclo', { ciclo });
    }

    if (tiene_laboratorio !== undefined) {
      qb.andWhere('curso.tiene_laboratorio = :tiene_laboratorio', {
        tiene_laboratorio,
      });
    }

    const [items, total] = await qb
      .orderBy('curso.ciclo', 'ASC')
      .addOrderBy('curso.nombre', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .cache(`cursos_list_${ciclo ?? 'all'}_${tiene_laboratorio ?? 'all'}_${page}_${limit}`, 60000)
      .getManyAndCount();

    return {
      items: items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<Curso> {
    const curso = await this.cursoRepo
      .createQueryBuilder('curso')
      .leftJoinAndSelect('curso.ambientes', 'ambientes')
      .where('curso.id = :id', { id })
      .cache(`curso_${id}_detalle`, 60000)
      .getOne();

    if (!curso) {
      throw new NotFoundException(`Curso con ID ${id} no encontrado`);
    }

    return curso;
  }

  async create(dto: CreateCursoDto): Promise<Curso> {
    const existe = await this.cursoRepo.findOne({ where: { codigo: dto.codigo } });
    if (existe) {
      throw new ConflictException(`El código de curso '${dto.codigo}' ya existe`);
    }

    const curso = this.cursoRepo.create({ ...dto, activo: true });
    return this.cursoRepo.save(curso);
  }

  async update(id: number, dto: UpdateCursoDto): Promise<Curso> {
    const curso = await this.findOne(id);

    if (dto.codigo && dto.codigo !== curso.codigo) {
      const existe = await this.cursoRepo.findOne({ where: { codigo: dto.codigo } });
      if (existe) {
        throw new ConflictException(`El código '${dto.codigo}' ya está en uso`);
      }
    }

    const actualizado = this.cursoRepo.merge(curso, dto);
    return this.cursoRepo.save(actualizado);
  }

  async remove(id: number): Promise<void> {
    const curso = await this.findOne(id);
    await this.cursoRepo.save({ ...curso, activo: false });
  }

  async asignarAmbientes(
    cursoId: number,
    ambienteIds: number[],
    tipoClase: TipoClase,
  ): Promise<Curso> {
    const tipoRequerido =
      tipoClase === TipoClase.TEORIA ? TipoAmbiente.AULA : TipoAmbiente.LABORATORIO;

    const nuevosAmbientes = await this.ambienteRepo.find({
      where: { id: In(ambienteIds), activo: true },
    });

    if (nuevosAmbientes.length !== ambienteIds.length) {
      throw new BadRequestException('Uno o más ambientes no existen o están inactivos');
    }

    const invalidos = nuevosAmbientes.filter((a) => a.tipo !== tipoRequerido);
    if (invalidos.length > 0) {
      throw new BadRequestException(
        `Para ${tipoClase}, todos los ambientes deben ser de tipo ${tipoRequerido}`,
      );
    }

    const curso = await this.cursoRepo
      .createQueryBuilder('curso')
      .leftJoinAndSelect('curso.ambientes', 'ambientes')
      .where('curso.id = :cursoId', { cursoId })
      .cache(`curso_${cursoId}_ambientes`, 60000)
      .getOne();

    if (!curso) {
      throw new NotFoundException(`Curso con ID ${cursoId} no encontrado`);
    }

    const ambientesOtroTipo = curso.ambientes.filter((a) => a.tipo !== tipoRequerido);
    curso.ambientes = [...ambientesOtroTipo, ...nuevosAmbientes];

    return this.cursoRepo.save(curso);
  }

  async getAmbientesCompatibles(cursoId: number, tipoClase: TipoClase) {
    const tipoRequerido =
      tipoClase === TipoClase.TEORIA ? TipoAmbiente.AULA : TipoAmbiente.LABORATORIO;

    const curso = await this.cursoRepo
      .createQueryBuilder('curso')
      .leftJoinAndSelect('curso.ambientes', 'ambientes')
      .where('curso.id = :cursoId', { cursoId })
      .cache(`curso_${cursoId}_ambientes_compatibles`, 60000)
      .getOne();

    if (!curso) {
      throw new NotFoundException(`Curso con ID ${cursoId} no encontrado`);
    }

    return curso.ambientes.filter((a) => a.tipo === tipoRequerido);
  }
}
