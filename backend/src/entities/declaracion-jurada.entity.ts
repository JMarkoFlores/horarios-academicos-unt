import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { DeclaracionCargaHoraria } from "./declaracion-carga-horaria.entity";
import { Docente } from "./docente.entity";
import { PeriodoAcademico } from "./periodo-academico.entity";

@Entity("declaracion_jurada")
export class DeclaracionJurada {
  @PrimaryGeneratedColumn()
  id: number;

  @Index("idx_declaracion_jurada_declaracion")
  @Column({ name: "declaracion_id" })
  declaracion_id: number;

  @ManyToOne(
    () => DeclaracionCargaHoraria,
    (declaracion) => declaracion.declaraciones_juradas,
    { nullable: false, eager: false, onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "declaracion_id" })
  declaracion: DeclaracionCargaHoraria;

  @Index("idx_declaracion_jurada_docente")
  @Column({ name: "docente_id" })
  docente_id: number;

  @ManyToOne(
    () => Docente,
    (docente) => docente.declaraciones_juradas,
    { nullable: false, eager: false, onDelete: "RESTRICT" },
  )
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @Column({ name: "periodo_id" })
  periodo_id: number;

  @ManyToOne(
    () => PeriodoAcademico,
    (periodo) => periodo.declaraciones_juradas,
    { nullable: false, eager: false, onDelete: "RESTRICT" },
  )
  @JoinColumn({ name: "periodo_id" })
  periodo: PeriodoAcademico;

  @Column({ length: 30, name: "tipo_declaracion" })
  tipo_declaracion: string;

  @Column({ type: "jsonb" })
  contenido: Record<string, unknown>;

  @CreateDateColumn({ name: "generada_en" })
  generada_en: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at: Date;

  @Column({ type: "timestamp", nullable: true, name: "fecha_firma" })
  fecha_firma: Date | null;

  @Column({ length: 500, nullable: true, name: "firma_url" })
  firma_url: string | null;

  @Index("idx_declaracion_jurada_estado")
  @Column({ length: 20, default: "PENDIENTE" })
  estado: string;
}
