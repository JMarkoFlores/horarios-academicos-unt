import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("restriccion_institucional")
export class RestriccionInstitucional {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  tipo_restriccion: string;

  @Column({ type: "jsonb" })
  valor: object;

  @Column({ length: 20 })
  periodo_academico: string;

  @Column({ default: true })
  activo: boolean;
}
