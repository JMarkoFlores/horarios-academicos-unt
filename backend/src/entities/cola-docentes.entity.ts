import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { VentanaAtencion } from "./ventana-atencion.entity";
import { Docente } from "./docente.entity";

export enum EstadoCola {
  ESPERANDO = "ESPERANDO",
  EN_ATENCION = "EN_ATENCION",
  COMPLETADO = "COMPLETADO",
  AUSENTE = "AUSENTE",
}

export enum RazonAusencia {
  INASISTENCIA = "INASISTENCIA",
  REPROGRAMACION = "REPROGRAMACION",
  CANCELACION = "CANCELACION",
  OTRO = "OTRO",
}

@Entity("cola_docentes")
@Index("idx_cola_docente_ventana", ["ventana_id", "orden"])
@Index("idx_cola_docente_docente", ["docente_id"])
export class ColaDocente {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  ventana_id: string;

  @Column()
  docente_id: number;

  @Column()
  orden: number;

  @Column({ type: "enum", enum: EstadoCola, default: EstadoCola.ESPERANDO })
  estado: EstadoCola;

  @Column({ type: "enum", enum: RazonAusencia, nullable: true })
  razon_ausencia?: RazonAusencia;

  @Column({ type: "timestamp", nullable: true })
  hora_llamada: Date | null;

  @Column({ type: "timestamp", nullable: true })
  hora_fin_atencion: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  eventos_sesion?: Array<{
    timestamp: Date;
    evento: 'LLAMADO' | 'ATENCION_INICIADA' | 'SELECCION' | 'VALIDACION' | 'CONFIRMACION' | 'CANCELACION';
    detalles: string;
    usuario?: string;
  }>;

  @Column({ type: 'integer', default: 0 })
  validaciones_ejecutadas: number = 0;

  @ManyToOne(() => VentanaAtencion, (ventana) => ventana.cola, {
    nullable: false,
  })
  @JoinColumn({ name: "ventana_id" })
  ventana: VentanaAtencion;

  @ManyToOne(() => Docente, (docente) => docente.colas, { nullable: false })
  @JoinColumn({ name: "docente_id" })
  docente: Docente;

  get turno_llamado_at(): Date | null {
    return this.hora_llamada;
  }

  set turno_llamado_at(value: Date | null) {
    this.hora_llamada = value;
  }

  agregarEvento(evento: string, detalles: string, usuario?: string): void {
    if (!this.eventos_sesion) {
      this.eventos_sesion = [];
    }
    this.eventos_sesion.push({
      timestamp: new Date(),
      evento: evento as any,
      detalles,
      usuario,
    });
  }
}

export { ColaDocente as ColaDocentes };
