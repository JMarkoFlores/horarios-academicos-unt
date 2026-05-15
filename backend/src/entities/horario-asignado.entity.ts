import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TipoClase } from '../common/enums/tipo-clase.enum';
import { EstadoHorario } from '../common/enums/estado-horario.enum';
import { Docente } from './docente.entity';
import { Curso } from './curso.entity';
import { Grupo } from './grupo.entity';
import { Ambiente } from './ambiente.entity';

@Entity('horario_asignado')
export class HorarioAsignado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TipoClase })
  tipo_clase: TipoClase;

  @Column()
  dia_semana: number;

  @Column({ type: 'time' })
  hora_inicio: string;

  @Column({ type: 'time' })
  hora_fin: string;

  @Column({ length: 20 })
  periodo_academico: string;

  @Column({
    type: 'enum',
    enum: EstadoHorario,
    default: EstadoHorario.BORRADOR,
  })
  estado: EstadoHorario;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Docente, (docente) => docente.horarios, { nullable: false })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @ManyToOne(() => Curso, { nullable: false })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @ManyToOne(() => Grupo, { nullable: false })
  @JoinColumn({ name: 'grupo_id' })
  grupo: Grupo;

  @ManyToOne(() => Ambiente, { nullable: false })
  @JoinColumn({ name: 'ambiente_id' })
  ambiente: Ambiente;
}
