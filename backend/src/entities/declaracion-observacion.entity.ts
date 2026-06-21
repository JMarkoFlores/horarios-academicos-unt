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
import { TipoObservacion } from "../common/enums/tipo-observacion.enum";

@Entity("declaracion_observacion")
@Index("idx_observacion_declaracion", ["declaracion_id"])
@Index("idx_observacion_usuario", ["usuario_id"])
export class DeclaracionObservacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "declaracion_id" })
  declaracion_id: number;

  @ManyToOne(() => DeclaracionCargaHoraria, (declaracion) => declaracion.observacion_items, {
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

  @Column({ type: "enum", enum: EstadoDeclaracionCarga, name: "estado_origen" })
  estado_origen: EstadoDeclaracionCarga;

  @Column({ type: "enum", enum: EstadoDeclaracionCarga, name: "estado_destino" })
  estado_destino: EstadoDeclaracionCarga;

  @Column({ type: "enum", enum: TipoObservacion })
  tipo: TipoObservacion;

  @Column({ default: false })
  subsanada: boolean;

  @Column({ type: "timestamp", nullable: true, name: "subsanada_en" })
  subsanada_en: Date | null;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;
}
