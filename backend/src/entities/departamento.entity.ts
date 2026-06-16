import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Escuela } from "./escuela.entity";
import { Usuario } from "./usuario.entity";

@Entity("departamento")
export class Departamento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  codigo: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 500, nullable: true })
  descripcion: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ name: "escuela_id" })
  escuela_id: number;

  @ManyToOne(() => Escuela, (escuela) => escuela.departamentos, {
    eager: false,
  })
  @JoinColumn({ name: "escuela_id" })
  escuela: Escuela;

  @Column({ nullable: true, name: "coordinador_id" })
  coordinador_id: number;

  @ManyToOne(() => Usuario, { nullable: true, eager: false })
  @JoinColumn({ name: "coordinador_id" })
  coordinador: Usuario;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
