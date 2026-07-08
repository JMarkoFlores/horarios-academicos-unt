import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from "typeorm";
import { Curso } from "./curso.entity";
import { PlanEstudios } from "./plan-estudios.entity";
import { TipoCursoPlan } from "../common/enums/tipo-curso-plan.enum";
import { EstadoCursoPlan } from "../common/enums/estado-curso-plan.enum";

@Entity("curso_plan_estudios")
@Unique("uq_curso_plan", ["curso_id", "plan_estudios_id"])
@Index("idx_plan_ciclo", ["plan_estudios_id", "ciclo"])
export class CursoPlanEstudios {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "curso_id" })
  curso_id: number;

  @ManyToOne(() => Curso, (curso) => curso.planes_estudio, { eager: true })
  @JoinColumn({ name: "curso_id" })
  curso: Curso;

  @Column({ name: "plan_estudios_id" })
  plan_estudios_id: number;

  @ManyToOne(() => PlanEstudios, (plan) => plan.cursos, { eager: false })
  @JoinColumn({ name: "plan_estudios_id" })
  plan_estudios: PlanEstudios;

  @Column({ type: "smallint" })
  ciclo: number;

  @Column({
    type: "enum",
    enum: TipoCursoPlan,
    default: TipoCursoPlan.OBLIGATORIO_GENERAL,
  })
  tipo_curso: TipoCursoPlan;

  @Column({ type: "smallint", default: 0 })
  horas_teoria: number;

  @Column({ type: "smallint", default: 0 })
  horas_practica: number;

  @Column({ type: "smallint", default: 0 })
  horas_laboratorio: number;

  @Column({ type: "decimal", precision: 3, scale: 1 })
  creditos: number;

  @OneToMany("AsignacionLectiva", "curso_plan")
  asignaciones: import("./asignacion-lectiva.entity").AsignacionLectiva[];

  @Column({ type: "jsonb", nullable: true })
  prerequisitos: number[];

  @Column({
    type: "enum",
    enum: EstadoCursoPlan,
    default: EstadoCursoPlan.ACTIVO,
  })
  estado: EstadoCursoPlan;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
