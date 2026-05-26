import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Docente } from "./docente.entity";
import { Curso } from "./curso.entity";
import { PeriodoAcademico } from "./periodo-academico.entity";
import { TipoClase } from "../common/enums/tipo-clase.enum";

@Entity("docente_curso")
@Unique(["docenteId", "cursoId", "tipo_clase", "periodoId"])
export class DocenteCurso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "docente_id" })
  docenteId: number;

  @Column({ name: "curso_id" })
  cursoId: number;

  @Column({
    type: "enum",
    enum: TipoClase,
    name: "tipo_clase",
  })
  tipo_clase: TipoClase;

  @Column({ name: "periodo_id", nullable: true })
  periodoId: number | null;

  @Column({ name: "grupos", default: 1, nullable: true })
  grupos: number;

  @ManyToOne(() => Docente, { onDelete: "CASCADE" })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @ManyToOne(() => Curso, { onDelete: "CASCADE" })
  @JoinColumn({ name: "curso_id" })
  curso: Curso;

  @ManyToOne(() => PeriodoAcademico, { onDelete: "CASCADE" })
  @JoinColumn({ name: "periodo_id" })
  periodo: PeriodoAcademico | null;
}
