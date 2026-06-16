import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { Docente } from "./docente.entity";
import { CursoPlanEstudios } from "./curso-plan-estudios.entity";
import { PeriodoAcademico } from "./periodo-academico.entity";
import { Grupo } from "./grupo.entity";
import { Usuario } from "./usuario.entity";

@Entity("asignacion_lectiva")
@Unique("uq_asig_lectiva_docente_curso_periodo", [
  "docente_id",
  "curso_plan_id",
  "periodo_id",
  "grupo_id",
  "tipo_clase",
  "seccion",
])
@Index("idx_asig_lectiva_periodo_docente", ["periodo_id", "docente_id"])
@Index("idx_asig_lectiva_periodo_curso", ["periodo_id", "curso_plan_id"])
export class AsignacionLectiva {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "docente_id" })
  docente_id: number;

  @ManyToOne(() => Docente, (docente) => docente.asignaciones_lectivas, {
    eager: true,
  })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @Column({ name: "curso_plan_id" })
  curso_plan_id: number;

  @ManyToOne(() => CursoPlanEstudios, { eager: true })
  @JoinColumn({ name: "curso_plan_id" })
  curso_plan: CursoPlanEstudios;

  @Column({ name: "periodo_id" })
  periodo_id: number;

  @ManyToOne(() => PeriodoAcademico, { eager: false })
  @JoinColumn({ name: "periodo_id" })
  periodo: PeriodoAcademico;

  @Column({ name: "grupo_id", nullable: true })
  grupo_id: number | null;

  @ManyToOne(() => Grupo, { eager: false, nullable: true })
  @JoinColumn({ name: "grupo_id" })
  grupo: Grupo | null;

  @Column({ length: 20 })
  tipo_clase: string;

  @Column({ length: 10 })
  seccion: string;

  @Column({ type: "int", default: 0, name: "nro_alumnos" })
  nro_alumnos: number;

  @Column({ type: "decimal", precision: 4, scale: 1, name: "horas_asignadas" })
  horas_asignadas: number;

  @Column({ length: 20, default: "PENDIENTE" })
  estado: string;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @Column({ name: "asignado_por_id" })
  asignado_por_id: number;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: "asignado_por_id" })
  asignado_por: Usuario;

  @Column({ name: "confirmado_por_id", nullable: true })
  confirmado_por_id: number | null;

  @ManyToOne(() => Usuario, { eager: false, nullable: true })
  @JoinColumn({ name: "confirmado_por_id" })
  confirmado_por: Usuario | null;

  @Column({ type: "timestamp", nullable: true, name: "confirmado_en" })
  confirmado_en: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
