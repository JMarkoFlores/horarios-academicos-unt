import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ActividadNoLectiva } from './actividad-no-lectiva.entity';

@Entity('horarios_no_lectivos')
@Index('idx_horario_nl_actividad', ['actividad_id'])
@Index('idx_horario_nl_dia', ['dia'])
export class HorarioNoLectivo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'actividad_id' })
  actividad_id: number;

  @ManyToOne(() => ActividadNoLectiva, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actividad_id' })
  actividad: ActividadNoLectiva;

  @Column({ type: 'smallint' })
  dia: number; // 1 = Lunes, 2 = Martes, etc.

  @Column({ type: 'time', name: 'hora_inicio' })
  hora_inicio: string;

  @Column({ type: 'time', name: 'hora_fin' })
  hora_fin: string;

  @Column({ type: 'smallint', name: 'duracion_horas' })
  duracion_horas: number;

  @Column({ length: 200, nullable: true })
  lugar: string | null;
}
