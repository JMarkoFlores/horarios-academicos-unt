import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("turno_horario")
export class TurnoHorario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  nombre: string;

  @Column({ type: "time" })
  hora_inicio: string;

  @Column({ type: "time" })
  hora_fin: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: "creado_en" })
  creado_en: Date;
}
