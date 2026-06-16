import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { Docente } from "./docente.entity";
import { Ambiente } from "./ambiente.entity";

@Entity("conflicto_asignacion")
@Index("idx_conflicto_periodo", ["periodo_academico"])
@Index("idx_conflicto_docente_periodo", ["docente", "periodo_academico"])
@Index("idx_conflicto_ambiente_periodo", ["ambiente", "periodo_academico"])
export class ConflictoAsignacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  descripcion: string;

  @Column({ length: 100 })
  tipo_conflicto: string;

  @Column({ length: 20 })
  periodo_academico: string;

  @Column({ default: false })
  resuelto: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Docente, { nullable: true })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @ManyToOne(() => Ambiente, { nullable: true })
  @JoinColumn({ name: "ambiente_id" })
  ambiente: Ambiente;
}
