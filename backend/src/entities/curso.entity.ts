import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Ambiente } from "./ambiente.entity";
import { Departamento } from "./departamento.entity";
import { CursoPlanEstudios } from "./curso-plan-estudios.entity";
import { Grupo } from "./grupo.entity";

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
  horas_practica: number;

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

  @Column({ nullable: true })
  departamento_id: number;

  @ManyToOne(() => Departamento)
  @JoinColumn({ name: "departamento_id" })
  departamento: Departamento;

  @ManyToMany(() => Ambiente, (ambiente) => ambiente.cursos)
  @JoinTable({
    name: "curso_ambiente",
    joinColumn: { name: "curso_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "ambiente_id", referencedColumnName: "id" },
  })
  ambientes: Ambiente[];

  @OneToMany(() => CursoPlanEstudios, (cpe) => cpe.curso)
  planes_estudio: CursoPlanEstudios[];

  @OneToMany(() => Grupo, (grupo) => grupo.curso)
  grupos: Grupo[];
}
