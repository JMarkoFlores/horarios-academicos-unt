import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VentanaAtencion } from './ventana-atencion.entity';
import { Docente } from './docente.entity';
import { Curso } from './curso.entity';
import { Grupo } from './grupo.entity';
import { Ambiente } from './ambiente.entity';
import { TipoClase } from '../common/enums/tipo-clase.enum';

export enum EstadoSeleccion {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADA = 'CONFIRMADA',
  RECHAZADA = 'RECHAZADA',
  EXPIRADA = 'EXPIRADA',
}

@Entity('selecciones_temporales')
@Index(['sesion_id', 'estado'])
@Index(['expira_en'])
@Index(['sesion_id', 'ambiente_id', 'dia', 'hora_inicio', 'periodo'], {
  unique: true,
})
export class SeleccionTemporal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('uuid')
  sesion_id: string;

  @Column({ nullable: true })
  ventana_atencion_id: string;

  @Column()
  docente_id: number;

  @Column()
  curso_id: number;

  @Column()
  grupo_id: number;

  @Column()
  ambiente_id: number;

  @Column()
  dia: number;

  @Column('time')
  hora_inicio: string;

  @Column('time')
  hora_fin: string;

  @Column('enum', { enum: TipoClase })
  tipo_clase: TipoClase;

  @Column()
  periodo: string;

  @Column('enum', {
    enum: EstadoSeleccion,
    default: EstadoSeleccion.PENDIENTE,
  })
  estado: EstadoSeleccion;

  @Column('jsonb', { nullable: true })
  contexto_validacion: Record<string, unknown>;

  @CreateDateColumn()
  creada_en: Date;

  @UpdateDateColumn()
  actualizada_en: Date;

  @Column('timestamp', {
    default: () => "CURRENT_TIMESTAMP + INTERVAL '30 minutes'",
  })
  expira_en: Date;

  @Column({ nullable: true })
  razon_rechazo: string;

  @Column({ default: false })
  sincronizada_desde_redis: boolean;

  @ManyToOne(() => VentanaAtencion, { nullable: true })
  @JoinColumn({ name: 'ventana_atencion_id' })
  ventana_atencion: VentanaAtencion;

  @ManyToOne(() => Docente, { nullable: true })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @ManyToOne(() => Curso, { nullable: true })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @ManyToOne(() => Grupo, { nullable: true })
  @JoinColumn({ name: 'grupo_id' })
  grupo: Grupo;

  @ManyToOne(() => Ambiente, { nullable: true })
  @JoinColumn({ name: 'ambiente_id' })
  ambiente: Ambiente;
}

