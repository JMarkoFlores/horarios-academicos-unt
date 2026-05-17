import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { Docente } from "./docente.entity";

@Entity('disponibilidad_docente')
@Unique(['docente', 'dia_semana', 'hora_inicio', 'periodo_academico'])
@Index('idx_disponibilidad_periodo', ['periodo_academico'])
@Index('idx_disponibilidad_docente_periodo', ['docente', 'periodo_academico'])
@Index('idx_disponibilidad_dia_hora', ['dia_semana', 'hora_inicio'])
export class DisponibilidadDocente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  dia_semana: number;

  @Column({ type: "time" })
  hora_inicio: string;

  @Column({ type: "time" })
  hora_fin: string;

  @Column({ default: true })
  disponible: boolean;

  @Column({ length: 20 })
  periodo_academico: string;

  @ManyToOne(() => Docente, (docente) => docente.disponibilidades, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;
}
