import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('dia_no_laborable')
@Index('idx_dia_no_laborable_periodo', ['periodo_academico'])
export class DiaNoLaborable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ length: 200 })
  descripcion: string;

  @Column({ length: 30 })
  tipo: string;

  @Column({ default: true })
  afecta_aulas: boolean;

  @Column({ default: true })
  afecta_laboratorios: boolean;

  @Column({ length: 20 })
  periodo_academico: string;
}
