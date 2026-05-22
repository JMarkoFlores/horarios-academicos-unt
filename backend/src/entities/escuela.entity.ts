import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Facultad } from "./facultad.entity";
import { Departamento } from "./departamento.entity";
import { Usuario } from "./usuario.entity";

@Entity("escuela")
export class Escuela {
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

  @Column({ name: "facultad_id" })
  facultad_id: number;

  @ManyToOne(() => Facultad, (facultad) => facultad.escuelas, { eager: false })
  @JoinColumn({ name: "facultad_id" })
  facultad: Facultad;

  @Column({ nullable: true, name: "coordinador_id" })
  coordinador_id: number;

  @ManyToOne(() => Usuario, { nullable: true, eager: false })
  @JoinColumn({ name: "coordinador_id" })
  coordinador: Usuario;

  @OneToMany(() => Departamento, (dep) => dep.escuela)
  departamentos: Departamento[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
