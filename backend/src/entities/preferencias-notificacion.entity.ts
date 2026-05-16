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

  @Column({ nullable: true, length: 20 })
  telefono: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => Docente, { nullable: false })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;
}
