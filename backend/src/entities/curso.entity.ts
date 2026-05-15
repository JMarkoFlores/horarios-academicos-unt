import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Ambiente } from "./ambiente.entity";

@Entity("curso")
export class Curso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  codigo: string;

  @Column({ length: 150 })
  nombre: string;

  @Column()
  creditos: number;

  @Column()
  horas_teoria: number;

  @Column({ default: 0 })
  horas_laboratorio: number;

  @Column()
  ciclo: number;

  @Column({ default: false })
  tiene_laboratorio: boolean;

  @Column({ type: "text", nullable: true })
  prerequisitos: string;

  @Column({ default: true })
  activo: boolean;

  @ManyToMany(() => Ambiente, (ambiente) => ambiente.cursos)
  @JoinTable({
    name: "curso_ambiente",
    joinColumn: { name: "curso_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "ambiente_id", referencedColumnName: "id" },
  })
  ambientes: Ambiente[];
}
