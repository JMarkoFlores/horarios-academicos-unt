import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { PeriodoAcademico } from "./periodo-academico.entity";
import { Curso } from "./curso.entity";
import { TipoClase } from "../common/enums/tipo-clase.enum";

@Entity("grupo")
@Index("idx_grupo_periodo", ["periodo_academico_id"])
@Index(
  "uq_grupo_curso_periodo_tipo_nombre",
  ["curso_id", "periodo_academico_id", "tipo", "nombre"],
  { unique: true },
)
export class Grupo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({
    type: "enum",
    enum: TipoClase,
    default: TipoClase.TEORIA,
  })
  tipo: TipoClase;

  @Column()
  ciclo: number;

  @Column()
  cupo_maximo: number;

  @Column()
  periodo_academico_id: number;

  @ManyToOne(() => PeriodoAcademico, { nullable: false, eager: false })
  @JoinColumn({ name: "periodo_academico_id" })
  periodo_academico: PeriodoAcademico;

  @Column()
  curso_id: number;

  @ManyToOne(() => Curso, { nullable: false, eager: false })
  @JoinColumn({ name: "curso_id" })
  curso: Curso;
}
