import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Curso } from "./curso.entity";
import { Ambiente } from "./ambiente.entity";
import { TipoClase } from "../common/enums/tipo-clase.enum";

@Entity("curso_ambiente")
export class CursoAmbiente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "curso_id" })
  cursoId: number;

  @Column({ name: "ambiente_id" })
  ambienteId: number;

  @Column({
    type: "enum",
    enum: TipoClase,
    name: "tipo_clase",
    default: TipoClase.TEORIA,
  })
  tipo_clase: TipoClase;

  @ManyToOne(() => Curso, { onDelete: "CASCADE" })
  @JoinColumn({ name: "curso_id" })
  curso: Curso;

  @ManyToOne(() => Ambiente, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ambiente_id" })
  ambiente: Ambiente;
}
