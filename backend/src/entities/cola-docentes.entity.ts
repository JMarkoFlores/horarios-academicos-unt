import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VentanaAtencion } from './ventana-atencion.entity';
import { Docente } from './docente.entity';

export enum EstadoCola {
  ESPERANDO = 'ESPERANDO',
  EN_ATENCION = 'EN_ATENCION',
  COMPLETADO = 'COMPLETADO',
  AUSENTE = 'AUSENTE',
}

@Entity('cola_docentes')
@Index('idx_cola_docente', ['docente'])
export class ColaDocentes {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orden: number;

  @Column({ type: 'enum', enum: EstadoCola, default: EstadoCola.ESPERANDO })
  estado: EstadoCola;

  @Column({ type: 'timestamp', nullable: true })
  turno_llamado_at: Date;

  @ManyToOne(() => VentanaAtencion, (ventana) => ventana.cola, {
    nullable: false,
  })
  @JoinColumn({ name: 'ventana_id' })
  ventana: VentanaAtencion;

  @ManyToOne(() => Docente, (docente) => docente.colas, { nullable: false })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;
}
