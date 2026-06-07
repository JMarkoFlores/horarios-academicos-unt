import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from "typeorm";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { TipoDocente } from "../common/enums/tipo-docente.enum";
import { ModalidadDocente } from "../common/enums/modalidad-docente.enum";
import { Departamento } from "./departamento.entity";
import { Facultad } from "./facultad.entity";
import { Usuario } from "./usuario.entity";
import { DisponibilidadDocente } from "./disponibilidad-docente.entity";
import { HorarioAsignado } from "./horario-asignado.entity";
import { ColaDocentes } from "./cola-docentes.entity";
import { Ambiente } from "./ambiente.entity";

@Entity("docente")
export class Docente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  codigo: string;

  @Column({ unique: true, nullable: true })
  ibm: number;

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

  @Column({ type: "enum", enum: TipoDocente, nullable: true })
  tipo_docente: TipoDocente;

  @Column({ type: "enum", enum: ModalidadDocente, nullable: true })
  modalidad: ModalidadDocente;

  @Column({ type: "date" })
  fecha_ingreso: Date;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: "smallint", default: 0, name: "horas_asignadas" })
  horas_asignadas: number;

  @Column({ nullable: true, type: "text" })
  firebase_token: string | null;

  @Column({ nullable: true, type: "text" })
  firma_url: string | null;

  @Column({ nullable: true, unique: true, name: "usuario_id" })
  usuario_id: number | null;

  @ManyToOne(() => Usuario, { nullable: true, eager: false })
  @JoinColumn({ name: "usuario_id" })
  usuario: Usuario | null;

  @Column({ nullable: true, name: "departamento_id" })
  departamento_id: number | null;

  @ManyToOne(() => Departamento, { nullable: true, eager: false })
  @JoinColumn({ name: "departamento_id" })
  departamento: Departamento | null;

  @Column({ nullable: true, name: "facultad_id" })
  facultad_id: number | null;

  @ManyToOne(() => Facultad, { nullable: true, eager: false })
  @JoinColumn({ name: "facultad_id" })
  facultad: Facultad | null;

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

  @ManyToMany(() => Ambiente)
  @JoinTable({
    name: "docente_ambiente",
    joinColumn: { name: "docente_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "ambiente_id", referencedColumnName: "id" },
  })
  ambientes: Ambiente[];
}
