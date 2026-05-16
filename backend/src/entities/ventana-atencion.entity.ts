import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { ColaDocentes } from "./cola-docentes.entity";

@Entity("ventana_atencion")
export class VentanaAtencion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  periodo_academico: string;

  @Column({ type: "date" })
  fecha: Date;

  @Column({ type: "time" })
  hora_inicio: string;

  @Column({ type: "time" })
  hora_fin: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => ColaDocentes, (cola) => cola.ventana)
  cola: ColaDocentes[];
}
