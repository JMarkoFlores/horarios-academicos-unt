import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";

@Entity("parametros_carga")
@Unique("UQ_parametros_carga_td_cat_mod", [
  "periodo_academico",
  "tipo_docente",
  "categoria",
  "modalidad",
])
export class ParametrosCarga {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  periodo_academico: string;

  @Column({ length: 30 })
  categoria: string;

  @Column({ length: 30 })
  tipo_docente: string;

  @Column({ length: 30 })
  modalidad: string;

  @Column({ type: "smallint", default: 0 })
  horas_min_semanal: number;

  @Column({ type: "smallint" })
  horas_max_semanal: number;

  @Column({ type: "smallint" })
  cursos_max_docente: number;

  @CreateDateColumn({ name: "creado_en" })
  creado_en: Date;

  @UpdateDateColumn({ name: "actualizado_en" })
  actualizado_en: Date;
}
