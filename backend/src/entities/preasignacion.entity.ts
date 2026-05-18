import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { Docente } from "./docente.entity";
import { Curso } from "./curso.entity";
import { Grupo } from "./grupo.entity";
import { Ambiente } from "./ambiente.entity";

@Entity("preasignacion")
@Index("idx_preasignacion_periodo", ["periodo"])
@Index("idx_preasignacion_docente_periodo", ["docente_id", "periodo"])
@Index("idx_preasignacion_ambiente_periodo", ["ambiente_id", "periodo"])
@Index("idx_preasignacion_dia_hora", ["dia", "hora_inicio"])
export class Preasignacion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  docente_id: number;

  @Column()
  curso_id: number;

  @Column({ nullable: true })
  grupo_id: number | null;

  @Column({ type: "enum", enum: TipoClase, nullable: true })
  tipo_clase: TipoClase | null;

  @Column({ nullable: true })
  dia: number | null;

  @Column({ type: "time", nullable: true })
  hora_inicio: string | null;

  @Column({ type: "time", nullable: true })
  hora_fin: string | null;

  @Column({ nullable: true })
  ambiente_id: number | null;

  @Column({ length: 20 })
  periodo: string;

  @Column({ length: 255 })
  motivo: string;

  @CreateDateColumn({ name: "creado_en" })
  creado_en: Date;

  @ManyToOne(() => Docente, { nullable: false })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @ManyToOne(() => Curso, { nullable: false })
  @JoinColumn({ name: "curso_id" })
  curso: Curso;

  @ManyToOne(() => Grupo, { nullable: true })
  @JoinColumn({ name: "grupo_id" })
  grupo: Grupo | null;

  @ManyToOne(() => Ambiente, { nullable: true })
  @JoinColumn({ name: "ambiente_id" })
  ambiente: Ambiente | null;
}
