import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Docente } from "./docente.entity";

@Entity("preferencias_notificacion")
export class PreferenciasNotificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: true })
  canal_correo: boolean;

  @Column({ default: false })
  canal_whatsapp: boolean;

  @Column({ default: false })
  canal_telegram: boolean;

  @Column({ nullable: true, length: 20 })
  telefono: string;

  @Column({ nullable: true, length: 50 })
  telegram_chat_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => Docente, { nullable: false })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;
}
