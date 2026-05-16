import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('restriccion_institucional')
@Index('idx_restriccion_periodo', ['periodo_academico'])
export class RestriccionInstitucional {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  tipo_restriccion: string;

  @Column({ type: 'jsonb' })
  valor: object;

  @Column({ length: 20 })
  periodo_academico: string;

  @Column({ default: true })
  activo: boolean;
}
