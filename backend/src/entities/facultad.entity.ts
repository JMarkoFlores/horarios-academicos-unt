import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Escuela } from "./escuela.entity";
import { Usuario } from "./usuario.entity";

@Entity("facultad")
export class Facultad {
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

  @Column({ nullable: true, name: "coordinador_id" })
  coordinador_id: number;

  @ManyToOne(() => Usuario, { nullable: true, eager: false })
  @JoinColumn({ name: "coordinador_id" })
  coordinador: Usuario;

  @OneToMany(() => Escuela, (escuela) => escuela.facultad)
  escuelas: Escuela[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
