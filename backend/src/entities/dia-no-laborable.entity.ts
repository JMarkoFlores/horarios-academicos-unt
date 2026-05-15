import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('dia_no_laborable')
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
