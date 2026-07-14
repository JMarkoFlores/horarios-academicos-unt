import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum TipoTurno {
  MANANA = "MANANA",
  TARDE = "TARDE",
  NOCHE = "NOCHE",
  SABADO_MANANA = "SABADO_MANANA",
  SABADO_TARDE = "SABADO_TARDE",
}

@Entity("turno_config")
@Index(["facultad_id", "activo"])
export class TurnoConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 50 })
  nombre: string; // ej. "Mañana", "Tarde", "Noche"

  @Column({
    type: "enum",
    enum: TipoTurno,
    default: TipoTurno.MANANA,
  })
  tipo: TipoTurno;

  @Column({ type: "time" })
  hora_inicio: string; // ej: "07:00"

  @Column({ type: "time" })
  hora_fin: string; // ej: "13:00"

  @Column({ type: "int", default: 60 })
  intervalo_minutos: number; // ej: 60 para bloques de 1 hora

  @Column({ type: "json", nullable: true })
  dias_habilitados: number[]; // [1,2,3,4,5] para lunes-viernes, [6] para sábado

  @Column({ type: "int", nullable: true })
  facultad_id: number | null; // null para configuración global

  @Column({ type: "boolean", default: true })
  activo: boolean;

  @Column({ type: "text", nullable: true })
  descripcion: string | null;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;
}
