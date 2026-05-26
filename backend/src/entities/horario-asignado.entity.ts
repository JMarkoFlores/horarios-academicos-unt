import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TipoClase } from '../common/enums/tipo-clase.enum';
import { EstadoHorario } from '../common/enums/estado-horario.enum';
import { OrigenHorario } from '../common/enums/origen-horario.enum';
import { Docente } from './docente.entity';
import { Curso } from './curso.entity';
import { Grupo } from './grupo.entity';
import { Ambiente } from './ambiente.entity';

@Entity('horario_asignado')
@Index('idx_horario_periodo', ['periodo'])
@Index('idx_horario_docente_id', ['docente_id'])
@Index('idx_horario_ambiente_id', ['ambiente_id'])
@Index('idx_horario_dia', ['dia'])
export class HorarioAsignado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  docente_id: number;

  @Column()
  curso_id: number;

  @Column()
  grupo_id: number;

  @Column()
  ambiente_id: number;

  @Column({ length: 20 })
  periodo: string;

  @Column()
  dia: number;

  @Column({ type: "time" })
  hora_inicio: string;

  @Column({ type: "time" })
  hora_fin: string;

  @Column({ type: "enum", enum: TipoClase })
  tipo_clase: TipoClase;

  @Column({
    type: "enum",
    enum: EstadoHorario,
    default: EstadoHorario.BORRADOR,
  })
  estado: EstadoHorario;

  @Column({
    type: "enum",
    enum: OrigenHorario,
    default: OrigenHorario.AJUSTE_MANUAL,
  })
  origen: OrigenHorario;

  @Column({ nullable: true, length: 36 })
  ventana_atencion_id?: string;

  @Column({ nullable: true, length: 36 })
  sesion_operador_id?: string;

  @Column({ type: 'jsonb', nullable: true })
  validaciones_ejecutadas?: any;

  @Column({ nullable: true, type: 'text' })
  razon_rechazo?: string;

  @Column({ type: 'jsonb', nullable: true })
  contexto_validacion?: any;

  @CreateDateColumn({ name: "creado_en" })
  creado_en: Date;

  @UpdateDateColumn({ name: "actualizado_en" })
  actualizado_en: Date;

  @ManyToOne(() => Docente, (docente) => docente.horarios, { nullable: false })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @ManyToOne(() => Curso, { nullable: false })
  @JoinColumn({ name: "curso_id" })
  curso: Curso;

  @ManyToOne(() => Grupo, { nullable: false })
  @JoinColumn({ name: "grupo_id" })
  grupo: Grupo;

  @ManyToOne(() => Ambiente, { nullable: false })
  @JoinColumn({ name: "ambiente_id" })
  ambiente: Ambiente;

  get periodo_academico(): string {
    return this.periodo;
  }

  set periodo_academico(value: string) {
    this.periodo = value;
  }

  get dia_semana(): number {
    return this.dia;
  }

  set dia_semana(value: number) {
    this.dia = value;
  }

  get created_at(): Date {
    return this.creado_en;
  }

  get updated_at(): Date {
    return this.actualizado_en;
  }
}
