import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
} from 'typeorm';
import { TipoAmbiente } from '../common/enums/tipo-ambiente.enum';
import { Curso } from './curso.entity';

@Entity('ambiente')
export class Ambiente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'enum', enum: TipoAmbiente })
  tipo: TipoAmbiente;

  @Column()
  capacidad: number;

  @Column({ nullable: true })
  piso: number;

  @Column({ nullable: true, length: 50 })
  pabellon: string;

  @Column({ type: 'text', nullable: true })
  equipamiento: string;

  @Column({ default: true })
  activo: boolean;

  @ManyToMany(() => Curso, (curso) => curso.ambientes)
  cursos: Curso[];
}
