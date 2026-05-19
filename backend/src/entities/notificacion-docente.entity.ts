import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Docente } from "./docente.entity";

export enum CanalNotificacion {
  CORREO = "correo",
  TELEGRAM = "telegram",
}

export enum EstadoNotificacion {
  PENDIENTE = "PENDIENTE",
  ENVIADO = "ENVIADO",
  ENTREGADO = "ENTREGADO",
  FALLIDO = "FALLIDO",
}

@Entity("notificacion_docente")
export class NotificacionDocente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  tipo: string;

  @Column({ type: "text" })
  mensaje: string;

  @Column({ type: "enum", enum: CanalNotificacion })
  canal: CanalNotificacion;

  @Column({
    type: "enum",
    enum: EstadoNotificacion,
    default: EstadoNotificacion.PENDIENTE,
  })
  estado: EstadoNotificacion;

  @Column({ type: "timestamp", nullable: true })
  enviado_at: Date;

  @Column({ length: 50, nullable: true })
  codigo_error: string;

  @Column({ length: 100, nullable: true })
  job_id: string;

  @Column({ default: 1 })
  intentos: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Docente, { nullable: false })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;
}
