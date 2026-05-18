import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { HorarioAsignado } from "./horario-asignado.entity";
import { Usuario } from "./usuario.entity";

@Entity("auditoria_horario")
export class AuditoriaHorario {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  horario_id: number;

  @Column()
  usuario_id: number;

  @Column({ length: 120 })
  accion: string;

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

  @ManyToOne(() => HorarioAsignado, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "horario_id" })
  horario: HorarioAsignado;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: "usuario_id" })
  usuario: Usuario;
}
