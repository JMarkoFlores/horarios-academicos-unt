import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { PeriodoAcademico } from "./periodo-academico.entity";
import { Curso } from "./curso.entity";

@Entity("grupo")
export class Grupo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column()
  ciclo: number;

  @Column()
  cupo_maximo: number;

  @ManyToOne(() => PeriodoAcademico, { nullable: false, eager: false })
  @JoinColumn({ name: "periodo_academico_id" })
  periodo_academico: PeriodoAcademico;

  @ManyToOne(() => Curso, { nullable: false, eager: false })
  @JoinColumn({ name: "curso_id" })
  curso: Curso;
}
