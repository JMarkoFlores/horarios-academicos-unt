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
import { TipoClase } from "../common/enums/tipo-clase.enum";

@Entity("docente_curso")
@Unique(["docenteId", "cursoId", "tipo_clase"])
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

  @ManyToOne(() => Docente, { onDelete: "CASCADE" })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @ManyToOne(() => Curso, { onDelete: "CASCADE" })
  @JoinColumn({ name: "curso_id" })
  curso: Curso;
}
