import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { CursoPlanEstudios } from "./curso-plan-estudios.entity";
import { TipoClase } from "../common/enums/tipo-clase.enum";

@Entity("catedra_compartida")
@Index("idx_catedra_curso_plan", ["curso_plan_id"])
@Index("idx_catedra_tipo", ["tipo_clase"])
@Index("idx_catedra_activa", ["activa"])
export class CatedraCompartida {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "curso_plan_id" })
  curso_plan_id: number;

  @ManyToOne(() => CursoPlanEstudios, (cursoPlan) => cursoPlan.id, {
    nullable: false,
  })
  @JoinColumn({ name: "curso_plan_id" })
  curso_plan: CursoPlanEstudios;

  @Column({ type: "enum", enum: TipoClase })
  tipo_clase: TipoClase;

  @Column({ type: "text" })
  motivo_excepcion: string;

  @Column({ length: 150 })
  autorizado_por: string;

  @Column({ type: "date" })
  fecha_autorizacion: Date;

  @Column({ default: true })
  activa: boolean;

  @Column({ nullable: true, type: "text" })
  observaciones: string | null;

  @Column({ nullable: true, length: 150, name: "referencia_rcu" })
  referencia_rcu: string | null;

  @CreateDateColumn({ name: "creado_en", type: "timestamptz" })
  creado_en: Date;

  @UpdateDateColumn({ name: "actualizado_en", type: "timestamptz" })
  actualizado_en: Date;
}
