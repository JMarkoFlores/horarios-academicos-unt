import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { DeclaracionCargaHoraria } from "./declaracion-carga-horaria.entity";
import { Usuario } from "./usuario.entity";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";

@Entity("declaracion_observacion")
@Index("idx_observacion_declaracion", ["declaracion_id"])
export class DeclaracionObservacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "declaracion_id" })
  declaracion_id: number;

  @ManyToOne(() => DeclaracionCargaHoraria, {
    nullable: false,
    eager: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "declaracion_id" })
  declaracion: DeclaracionCargaHoraria;

  @Column({ name: "usuario_id" })
  usuario_id: number;

  @ManyToOne(() => Usuario, {
    nullable: false,
    eager: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "usuario_id" })
  usuario: Usuario;

  @Column({ type: "text", nullable: false })
  observacion: string;

  @Column({ length: 30, name: "estado_origen" })
  estado_origen: string;

  @Column({ length: 30, name: "estado_destino" })
  estado_destino: string;

  @Column({ length: 20 })
  tipo: string;

  @Column({ default: false })
  subsanada: boolean;

  @Column({ type: "timestamp", nullable: true, name: "subsanada_en" })
  subsanada_en: Date | null;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;
}
