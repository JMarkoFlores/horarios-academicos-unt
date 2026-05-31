import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Docente } from "./docente.entity";
import { Departamento } from "./departamento.entity";
import { Facultad } from "./facultad.entity";
import { PeriodoAcademico } from "./periodo-academico.entity";
import { Usuario } from "./usuario.entity";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";

@Entity("declaracion_carga_horaria")
@Unique("UQ_declaracion_carga_docente_periodo", [
  "docente_id",
  "periodo_academico_id",
])
export class DeclaracionCargaHoraria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "docente_id" })
  docente_id: number;

  @ManyToOne(() => Docente, { nullable: false, eager: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @Column({ name: "departamento_id" })
  departamento_id: number;

  @ManyToOne(() => Departamento, { nullable: false, eager: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "departamento_id" })
  departamento: Departamento;

  @Column({ name: "facultad_id" })
  facultad_id: number;

  @ManyToOne(() => Facultad, { nullable: false, eager: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "facultad_id" })
  facultad: Facultad;

  @Column({ name: "periodo_academico_id" })
  periodo_academico_id: number;

  @ManyToOne(() => PeriodoAcademico, { nullable: false, eager: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "periodo_academico_id" })
  periodo_academico: PeriodoAcademico;

  @Column({ nullable: true, length: 120 })
  sede: string | null;

  @Column({
    type: "enum",
    enum: EstadoDeclaracionCarga,
    default: EstadoDeclaracionCarga.NO_INICIADO,
  })
  estado: EstadoDeclaracionCarga;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @Column({ type: "jsonb", nullable: true, name: "carga_no_lectiva" })
  carga_no_lectiva: Record<string, unknown> | null;

  @Column({ type: "timestamp", nullable: true, name: "fecha_firma_docente" })
  fecha_firma_docente: Date | null;

  @Column({ type: "timestamp", nullable: true, name: "fecha_firma_director" })
  fecha_firma_director: Date | null;

  @Column({ type: "timestamp", nullable: true, name: "fecha_firma_decano" })
  fecha_firma_decano: Date | null;

  @Column({ nullable: true, name: "usuario_firmante_id" })
  usuario_firmante_id: number | null;

  @ManyToOne(() => Usuario, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "usuario_firmante_id" })
  usuario_firmante: Usuario | null;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at: Date;
}
