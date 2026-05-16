import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { DisponibilidadDocente } from "./disponibilidad-docente.entity";
import { HorarioAsignado } from "./horario-asignado.entity";
import { ColaDocentes } from "./cola-docentes.entity";

@Entity("docente")
export class Docente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  codigo: string;

  @Column({ length: 150 })
  nombres: string;

  @Column({ length: 150 })
  apellidos: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ nullable: true, length: 20 })
  telefono: string;

  @Column({ type: "enum", enum: CategoriaDocente })
  categoria: CategoriaDocente;

  @Column({ type: "enum", enum: TipoContrato })
  tipo_contrato: TipoContrato;

  @Column({ type: "date" })
  fecha_ingreso: Date;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(
    () => DisponibilidadDocente,
    (disponibilidad) => disponibilidad.docente,
  )
  disponibilidades: DisponibilidadDocente[];

  @OneToMany(() => HorarioAsignado, (horario) => horario.docente)
  horarios: HorarioAsignado[];

  @OneToMany(() => ColaDocentes, (cola) => cola.docente)
  colas: ColaDocentes[];
}
