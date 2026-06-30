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
} from "typeorm";
import { Docente } from "./docente.entity";
import { Departamento } from "./departamento.entity";
import { Facultad } from "./facultad.entity";
import { PeriodoAcademico } from "./periodo-academico.entity";
import { Usuario } from "./usuario.entity";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";
import { DeclaracionJurada } from "./declaracion-jurada.entity";
import { CargaAdicional } from "./carga-adicional.entity";

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

  @ManyToOne(() => Docente, {
    nullable: false,
    eager: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  @Column({ name: "departamento_id" })
  departamento_id: number;

  @ManyToOne(() => Departamento, {
    nullable: false,
    eager: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "departamento_id" })
  departamento: Departamento;

  @Column({ name: "facultad_id" })
  facultad_id: number;

  @ManyToOne(() => Facultad, {
    nullable: false,
    eager: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "facultad_id" })
  facultad: Facultad;

  @Column({ name: "periodo_academico_id" })
  periodo_academico_id: number;

  @ManyToOne(() => PeriodoAcademico, {
    nullable: false,
    eager: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "periodo_academico_id" })
  periodo_academico: PeriodoAcademico;

  @Column({ nullable: true, length: 120 })
  sede: string | null;

  @Column({
    type: "enum",
    enum: EstadoDeclaracionCarga,
    default: EstadoDeclaracionCarga.BORRADOR,
  })
  estado: EstadoDeclaracionCarga;

  @OneToMany("DeclaracionObservacion", "declaracion")
  observacion_items: import("./declaracion-observacion.entity").DeclaracionObservacion[];

  @OneToMany(() => DeclaracionJurada, (jurada) => jurada.declaracion)
  declaraciones_juradas: DeclaracionJurada[];

  @OneToMany(() => CargaAdicional, (ca) => ca.declaracion)
  carga_adicional: CargaAdicional[];

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @Column({ type: "text", nullable: true, name: "motivo_observacion" })
  motivo_observacion: string | null;

  @Column({ type: "jsonb", nullable: true, name: "carga_no_lectiva" })
  carga_no_lectiva: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true, name: "carga_lectiva_json" })
  carga_lectiva_json: Record<string, unknown> | null;

  @Column({ type: "smallint", default: 0, name: "total_horas_lectivas" })
  total_horas_lectivas: number;

  @Column({ type: "smallint", default: 0, name: "total_horas_no_lectivas" })
  total_horas_no_lectivas: number;

  @Column({ type: "smallint", default: 0, name: "total_horas_general" })
  total_horas_general: number;

  @Column({ type: "smallint", default: 1, name: "version" })
  version: number;

  @Column({ type: "timestamp", nullable: true, name: "fecha_firma_docente" })
  fecha_firma_docente: Date | null;

  @Column({ length: 500, nullable: true, name: "firma_docente_url" })
  firma_docente_url: string | null;

  @Column({ nullable: true, name: "firma_docente_user_id" })
  firma_docente_user_id: number | null;

  @ManyToOne(() => Usuario, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "firma_docente_user_id" })
  firma_docente_user: Usuario | null;

  @Column({ type: "timestamp", nullable: true, name: "fecha_firma_director" })
  fecha_firma_director: Date | null;

  @Column({ length: 500, nullable: true, name: "firma_director_url" })
  firma_director_url: string | null;

  @Column({ nullable: true, name: "firma_director_user_id" })
  firma_director_user_id: number | null;

  @ManyToOne(() => Usuario, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "firma_director_user_id" })
  firma_director_user: Usuario | null;

  @Column({ type: "timestamp", nullable: true, name: "fecha_firma_decano" })
  fecha_firma_decano: Date | null;

  @Column({ length: 500, nullable: true, name: "firma_decano_url" })
  firma_decano_url: string | null;

  @Column({ nullable: true, name: "firma_decano_user_id" })
  firma_decano_user_id: number | null;

  @ManyToOne(() => Usuario, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "firma_decano_user_id" })
  firma_decano_user: Usuario | null;

  @Column({ nullable: true, name: "usuario_firmante_id" })
  usuario_firmante_id: number | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "usuario_firmante_id" })
  usuario_firmante: Usuario | null;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at: Date;
}
