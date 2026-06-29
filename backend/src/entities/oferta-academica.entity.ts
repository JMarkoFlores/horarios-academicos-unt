import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique, Index,
} from "typeorm";
import { PeriodoAcademico } from "./periodo-academico.entity";
import { CursoPlanEstudios } from "./curso-plan-estudios.entity";
import { TipoClase } from "../common/enums/tipo-clase.enum";

@Entity("oferta_academica")
@Unique("uq_oferta_periodo_curso_tipo", ["periodo_id", "curso_plan_id", "tipo_clase"])
@Index("idx_oferta_periodo", ["periodo_id"])
@Index("idx_oferta_curso_plan", ["curso_plan_id"])
export class OfertaAcademica {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "periodo_id" })
  periodo_id: number;

  @ManyToOne(() => PeriodoAcademico, { eager: false })
  @JoinColumn({ name: "periodo_id" })
  periodo: PeriodoAcademico;

  @Column({ name: "curso_plan_id" })
  curso_plan_id: number;

  @ManyToOne(() => CursoPlanEstudios, { eager: true })
  @JoinColumn({ name: "curso_plan_id" })
  curso_plan: CursoPlanEstudios;

  @Column({ type: "enum", enum: TipoClase })
  tipo_clase: TipoClase;

  @Column({ type: "smallint", default: 1 })
  secciones: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
