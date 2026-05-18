import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { RolUsuario } from "../common/enums/rol-usuario.enum";

@Entity("usuario")
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ length: 255 })
  password_hash: string;

  @Column({
    type: "enum",
    enum: RolUsuario,
    default: RolUsuario.OPERADOR_HORARIOS,
  })
  rol: RolUsuario;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: "varchar", length: 255, nullable: true, default: null })
  reset_token: string | null;

  @Column({ type: "timestamp", nullable: true, default: null })
  reset_token_expira: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
