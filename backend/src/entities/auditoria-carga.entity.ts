import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { Usuario } from "./usuario.entity";

export enum EntidadAuditoriaCarga {
  ASIGNACION_LECTIVA = "ASIGNACION_LECTIVA",
  DECLARACION_CARGA = "DECLARACION_CARGA",
}

export enum AccionAuditoriaCarga {
  CREAR = "CREAR",
  ACTUALIZAR = "ACTUALIZAR",
  CONFIRMAR = "CONFIRMAR",
  RECHAZAR = "RECHAZAR",
  ELIMINAR = "ELIMINAR",
  OBSERVAR = "OBSERVAR",
  VALIDAR = "VALIDAR",
  APROBAR = "APROBAR",
  SUBSANAR = "SUBSANAR",
  ENVIAR = "ENVIAR",
}

@Entity("auditoria_carga")
@Index("idx_auditoria_carga_entidad", ["entidad"])
@Index("idx_auditoria_carga_entidad_id", ["entidad_id"])
@Index("idx_auditoria_carga_usuario", ["usuario_id"])
@Index("idx_auditoria_carga_accion", ["accion"])
@Index("idx_auditoria_carga_fecha", ["creado_en"])
export class AuditoriaCarga {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: EntidadAuditoriaCarga,
  })
  entidad: EntidadAuditoriaCarga;

  @Column()
  entidad_id: number;

  @Column()
  usuario_id: number;

  @Column({
    type: "enum",
    enum: AccionAuditoriaCarga,
  })
  accion: AccionAuditoriaCarga;

  @Column({ length: 50, nullable: true })
  estado_anterior: string | null;

  @Column({ length: 50, nullable: true })
  estado_nuevo: string | null;

  @Column({ type: "jsonb", nullable: true })
  datos_anteriores: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  datos_nuevos: Record<string, unknown> | null;

  @Column({ length: 100 })
  ip: string;

  @Column({ type: "text", nullable: true })
  motivo: string | null;

  @CreateDateColumn({ name: "creado_en" })
  creado_en: Date;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: "usuario_id" })
  usuario: Usuario;
}
