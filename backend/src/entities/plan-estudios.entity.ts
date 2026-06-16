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
import { Escuela } from "./escuela.entity";
import { CursoPlanEstudios } from "./curso-plan-estudios.entity";

@Entity("plan_estudios")
export class PlanEstudios {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  codigo: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: "text", nullable: true })
  descripcion: string;

  @Column({ length: 100, nullable: true })
  resolucion: string;

  @Column({ type: "smallint" })
  anio: number;

  @Column({ default: false })
  activo: boolean;

  @Column({ name: "escuela_id" })
  escuela_id: number;

  @ManyToOne(() => Escuela, { eager: false })
  @JoinColumn({ name: "escuela_id" })
  escuela: Escuela;

  @OneToMany(() => CursoPlanEstudios, (cpe) => cpe.plan_estudios, {
    cascade: true,
  })
  cursos: CursoPlanEstudios[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
