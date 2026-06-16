import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { Curso } from "./curso.entity";
import { Ambiente } from "./ambiente.entity";

@Entity("curso_ambiente")
export class CursoAmbiente {
  @PrimaryColumn({ name: "curso_id" })
  cursoId: number;

  @PrimaryColumn({ name: "ambiente_id" })
  ambienteId: number;

  @ManyToOne(() => Curso, { onDelete: "CASCADE" })
  @JoinColumn({ name: "curso_id" })
  curso: Curso;

  @ManyToOne(() => Ambiente, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ambiente_id" })
  ambiente: Ambiente;
}
