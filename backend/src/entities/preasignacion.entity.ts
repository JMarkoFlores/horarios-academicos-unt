import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { Docente } from "./docente.entity";
import { Curso } from "./curso.entity";
import { Ambiente } from "./ambiente.entity";

@Entity("preasignacion")
export class Preasignacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: TipoClase })
  tipo_clase: TipoClase;

  @Column()
  dia_semana: number;

  @Column({ type: "time" })
  hora_inicio: string;

  @Column({ type: "time" })
  hora_fin: string;

  @Column({ length: 20 })
  periodo_academico: string;

  @ManyToOne(() => Docente, { nullable: false })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @ManyToOne(() => Curso, { nullable: false })
  @JoinColumn({ name: "curso_id" })
  curso: Curso;

  @ManyToOne(() => Ambiente, { nullable: true })
  @JoinColumn({ name: "ambiente_id" })
  ambiente: Ambiente;
}
