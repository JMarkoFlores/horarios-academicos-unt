import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  JoinColumn,
} from "typeorm";
import { ColaDocente } from "./cola-docentes.entity";
import { CampañaVentanas } from "./campaña-ventanas.entity";

export enum EstadoVentanaAtencion {
  PROGRAMADA = "PROGRAMADA",
  EN_CURSO = "EN_CURSO",
  COMPLETADA = "COMPLETADA",
  CANCELADA = "CANCELADA",
}

@Entity("ventana_atencion")
@Index("idx_ventana_periodo", ["periodo"])
@Index("idx_ventana_fecha", ["fecha"])
@Index("idx_ventana_proposito", ["proposito"])
export class VentanaAtencion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 20 })
  periodo: string;

  @Column({ type: "date" })
  fecha: Date;

  @Column({ name: "categoria", length: 120 })
  proposito: string;

  @Column({ type: 'jsonb', nullable: true })
  filtro_categorias_docente: string[] | null;

  @Column({ nullable: true, length: 120 })
  modalidad: string | null;

  @Column({ type: "time" })
  hora_inicio: string;

  @Column({ type: "time" })
  hora_fin: string;

  @Column({ default: 30 })
  intervalo_minutos: number;

  @Column({
    type: "enum",
    enum: EstadoVentanaAtencion,
    default: EstadoVentanaAtencion.PROGRAMADA,
  })
  estado: EstadoVentanaAtencion;

  @Column({ nullable: true })
  campaña_id: string;

  @ManyToOne(() => CampañaVentanas, campaña => campaña.ventanas)
  @JoinColumn({ name: 'campaña_id' })
  campaña: CampañaVentanas;

  @CreateDateColumn({ name: "creado_en" })
  creado_en: Date;

  @OneToMany(() => ColaDocente, (cola) => cola.ventana)
  colas: ColaDocente[];

  total_docentes?: number;

  get periodo_academico(): string {
    return this.periodo;
  }

  set periodo_academico(value: string) {
    this.periodo = value;
  }

  get activo(): boolean {
    return ![
      EstadoVentanaAtencion.COMPLETADA,
      EstadoVentanaAtencion.CANCELADA,
    ].includes(this.estado);
  }

  set activo(value: boolean) {
    if (!value) {
      this.estado = EstadoVentanaAtencion.CANCELADA;
      return;
    }

    if (
      this.estado === EstadoVentanaAtencion.CANCELADA ||
      this.estado === EstadoVentanaAtencion.COMPLETADA
    ) {
      this.estado = EstadoVentanaAtencion.PROGRAMADA;
    }
  }

  get cola(): ColaDocente[] {
    return this.colas;
  }

  set cola(value: ColaDocente[]) {
    this.colas = value;
  }
}
