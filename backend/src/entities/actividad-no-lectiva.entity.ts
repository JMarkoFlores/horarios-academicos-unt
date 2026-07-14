import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { DeclaracionCargaHoraria } from "./declaracion-carga-horaria.entity";
import { TipoActividadNoLectiva } from "../common/enums/tipo-actividad-no-lectiva.enum";
import { HorarioNoLectivo } from "./horario-no-lectivo.entity";

@Entity("actividades_no_lectivas")
@Index("idx_actividad_nl_declaracion", ["declaracion_id"])
@Index("idx_actividad_nl_tipo", ["tipo"])
export class ActividadNoLectiva {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "declaracion_id" })
  declaracion_id: number;

  @ManyToOne(() => DeclaracionCargaHoraria, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "declaracion_id" })
  declaracion: DeclaracionCargaHoraria;

  @Column({
    type: "enum",
    enum: TipoActividadNoLectiva,
  })
  tipo: TipoActividadNoLectiva;

  @Column({ length: 200 })
  descripcion: string;

  @Column({ length: 500, nullable: true })
  detalle: string | null;

  @Column({ type: "smallint", name: "horas_totales" })
  horas_totales: number;

  @Column({ type: "smallint", name: "horas_distribuidas", default: 0 })
  horas_distribuidas: number;

  @Column({ type: "smallint", name: "horas_pendientes", default: 0 })
  horas_pendientes: number;

  @Column({ type: "boolean", name: "horas_manual", default: false })
  horas_manual: boolean;

  @Column({ type: "smallint", name: "orden", default: 0 })
  orden: number;

  @OneToMany(() => HorarioNoLectivo, (horario) => horario.actividad, {
    cascade: true,
    onDelete: "CASCADE",
  })
  horarios: HorarioNoLectivo[];

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at: Date;
}
