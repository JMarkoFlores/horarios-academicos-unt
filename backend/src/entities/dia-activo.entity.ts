import { Entity, PrimaryGeneratedColumn, Column, Unique } from "typeorm";

@Entity("dia_activo")
@Unique(["dia_semana"])
export class DiaActivo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "smallint" })
  dia_semana: number;

  @Column({ length: 20 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;
}
