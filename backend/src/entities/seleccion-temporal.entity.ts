import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Docente } from './docente.entity';
import { Ambiente } from './ambiente.entity';

@Entity('seleccion_temporal')
export class SeleccionTemporal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  dia_semana: number;

  @Column({ type: 'time' })
  hora_inicio: string;

  @Column({ type: 'time' })
  hora_fin: string;

  @Column({ type: 'timestamp' })
  expira_at: Date;

  @ManyToOne(() => Docente, { nullable: false })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @ManyToOne(() => Ambiente, { nullable: false })
  @JoinColumn({ name: 'ambiente_id' })
  ambiente: Ambiente;
}
