import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { DeclaracionCargaHoraria } from "./declaracion-carga-horaria.entity";
import { Docente } from "./docente.entity";

@Entity("carga_adicional")
@Index("idx_carga_adicional_declaracion", ["declaracion_id"])
@Index("idx_carga_adicional_docente", ["docente_id"])
export class CargaAdicional {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "declaracion_id" })
  declaracion_id: number;

  @ManyToOne(() => DeclaracionCargaHoraria, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "declaracion_id" })
  declaracion: DeclaracionCargaHoraria;

  @Column({ name: "docente_id" })
  docente_id: number;

  @ManyToOne(() => Docente, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @Column({ length: 200 })
  dependencia: string;

  @Column({ length: 200 })
  actividad: string;

  @Column({ type: "date", name: "fecha_inicio" })
  fecha_inicio: Date;

  @Column({ type: "date", name: "fecha_fin" })
  fecha_fin: Date;

  @Column({ type: "jsonb", name: "horario_semanal", nullable: true })
  horario_semanal: Array<{ dia: string; hora_inicio: string; hora_fin: string }> | null;

  @Column({ type: "smallint", name: "total_horas" })
  total_horas: number;

  @Column({ length: 200, name: "unidad_academica" })
  unidad_academica: string;

  @Column({ length: 100, nullable: true })
  resolucion: string | null;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;
}
