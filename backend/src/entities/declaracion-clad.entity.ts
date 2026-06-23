import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { Docente } from './docente.entity';
import { PeriodoAcademico } from './periodo-academico.entity';
import { DetalleClad } from './detalle-clad.entity';
import { EstadoClad } from '../common/enums/estado-clad.enum';
import { TipoDependenciaClad } from '../common/enums/tipo-dependencia-clad.enum';

@Entity('declaraciones_clad')
@Index('idx_clad_docente', ['docente_id'])
@Index('idx_clad_periodo', ['periodo_academico_id'])
@Index('idx_clad_estado', ['estado'])
export class DeclaracionClad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  docente_id: number;

  @ManyToOne(() => Docente, (d) => d.declaraciones_clad)
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @Column()
  periodo_academico_id: number;

  @ManyToOne(() => PeriodoAcademico)
  @JoinColumn({ name: 'periodo_academico_id' })
  periodo_academico: PeriodoAcademico;

  @Column({ type: 'enum', enum: TipoDependenciaClad })
  tipo_dependencia: TipoDependenciaClad;

  @Column({ nullable: true })
  nombre_dependencia: string;

  @Column({ type: 'jsonb', nullable: true })
  firma_docente: object;

  @Column({ type: 'jsonb', nullable: true })
  firma_director_dpto: object;

  @Column({ type: 'jsonb', nullable: true })
  firma_director_dependencia: object;

  @Column({ type: 'jsonb', nullable: true })
  firma_decano: object;

  @Column({ type: 'enum', enum: EstadoClad, default: EstadoClad.BORRADOR })
  estado: EstadoClad;

  @Column({ nullable: true })
  observaciones: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  total_horas: number;

  @OneToMany(() => DetalleClad, (detalle) => detalle.declaracion, { cascade: true })
  detalles: DetalleClad[];

  @Column({ nullable: true })
  fecha_envio: Date;

  @Column({ nullable: true })
  fecha_validacion_dpto: Date;

  @Column({ nullable: true })
  fecha_validacion_dependencia: Date;

  @Column({ nullable: true })
  fecha_aprobacion_final: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
