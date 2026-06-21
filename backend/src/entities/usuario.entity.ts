import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { Departamento } from "./departamento.entity";
import { Escuela } from "./escuela.entity";
import { Facultad } from "./facultad.entity";

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
    default: RolUsuario.SECRETARIA,
  })
  rol: RolUsuario;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: "boolean", default: false, name: "debe_cambiar_password" })
  debe_cambiar_password: boolean;

  @Column({ type: "varchar", length: 5, default: "es" })
  idioma: string;

  @Column({ type: "varchar", length: 255, nullable: true, default: null })
  reset_token: string | null;

  @Column({ type: "timestamp", nullable: true, default: null })
  reset_token_expira: Date | null;

  @Column({ nullable: true, name: "departamento_id" })
  departamento_id: number | null;

  @ManyToOne(() => Departamento, { nullable: true, eager: false })
  @JoinColumn({ name: "departamento_id" })
  departamento: Departamento | null;

  @Column({ nullable: true, name: "escuela_id" })
  escuela_id: number | null;

  @ManyToOne(() => Escuela, { nullable: true, eager: false })
  @JoinColumn({ name: "escuela_id" })
  escuela: Escuela | null;

  @Column({ nullable: true, name: "facultad_id" })
  facultad_id: number | null;

  @ManyToOne(() => Facultad, { nullable: true, eager: false })
  @JoinColumn({ name: "facultad_id" })
  facultad: Facultad | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
