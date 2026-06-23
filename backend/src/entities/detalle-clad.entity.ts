import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { DeclaracionClad } from './declaracion-clad.entity';

@Entity('detalles_clad')
@Index('idx_detalle_clad_declaracion', ['declaracion_clad_id'])
export class DetalleClad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  declaracion_clad_id: number;

  @ManyToOne(() => DeclaracionClad, (clad) => clad.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'declaracion_clad_id' })
  declaracion: DeclaracionClad;

  @Column()
  nombre_curso: string;

  @Column({ nullable: true })
  codigo_curso: string;

  @Column({ type: 'date' })
  fecha_inicio: Date;

  @Column({ type: 'date' })
  fecha_fin: Date;

  @Column({ type: 'jsonb' })
  horario: object; // { dia: number, hora_inicio: string, hora_fin: string, lugar: string }[]

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  horas_semanales: number;
}
