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
import { Docente } from "./docente.entity";

@Entity("suspension_docente")
@Index("idx_suspension_docente", ["docente_id"])
@Index("idx_suspension_fechas", ["fecha_inicio", "fecha_fin"])
@Index("idx_suspension_activa", ["activa"])
export class SuspensionDocente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "docente_id" })
  docente_id: number;

  @ManyToOne(() => Docente, (docente) => docente.id, { nullable: false })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @Column({ type: "date" })
  fecha_inicio: Date;

  @Column({ type: "date" })
  fecha_fin: Date;

  @Column({ type: "text" })
  motivo: string;

  @Column({ default: true })
  activa: boolean;

  @Column({ nullable: true, length: 150, name: "resuelta_por" })
  resuelta_por: string | null;

  @Column({ nullable: true, type: "date", name: "fecha_resolucion" })
  fecha_resolucion: Date | null;

  @Column({ nullable: true, type: "text" })
  observaciones: string | null;

  @CreateDateColumn({ name: "creado_en", type: "timestamptz" })
  creado_en: Date;

  @UpdateDateColumn({ name: "actualizado_en", type: "timestamptz" })
  actualizado_en: Date;
}
