import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { EstadoPeriodo } from "../common/enums/estado-periodo.enum";
import { ModoAsignacion } from "../common/enums/modo-asignacion.enum";
import { DeclaracionJurada } from "./declaracion-jurada.entity";

@Entity("periodo_academico")
export class PeriodoAcademico {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: "date" })
  fecha_inicio: Date;

  @Column({ type: "date" })
  fecha_fin: Date;

  @Column({
    type: "enum",
    enum: EstadoPeriodo,
    default: EstadoPeriodo.PLANIFICACION,
  })
  estado: EstadoPeriodo;

  @Column({ default: false })
  activo: boolean;

  @Column({
    type: "enum",
    enum: ModoAsignacion,
    default: ModoAsignacion.VENTANAS,
  })
  modo_asignacion: ModoAsignacion;

  @OneToMany("AsignacionLectiva", "periodo")
  asignaciones_lectivas: import("./asignacion-lectiva.entity").AsignacionLectiva[];

  @OneToMany(() => DeclaracionJurada, (jurada) => jurada.periodo)
  declaraciones_juradas: DeclaracionJurada[];
}
