import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { PeriodoAcademico } from './periodo-academico.entity';
import { Usuario } from './usuario.entity';
import { VentanaAtencion } from './ventana-atencion.entity';
import { EstadoCampaña } from '../common/enums/estado-campaña.enum';

@Entity('campaña_ventanas')
export class CampañaVentanas {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column()
  descripcion: string;

  @ManyToOne(() => PeriodoAcademico)
  @JoinColumn({ name: 'periodo_id' })
  periodo: PeriodoAcademico;

  @Column()
  periodo_id: number;

  @Column({ type: 'enum', enum: EstadoCampaña, default: EstadoCampaña.BORRADOR })
  estado: EstadoCampaña;

  // Parámetros de configuración
  @Column({ type: 'date' })
  fecha_inicio: Date;

  @Column({ type: 'date' })
  fecha_fin: Date;

  @Column('text', { array: true })
  dias_habilitados: string[]; // ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']

  @Column('json')
  bloques_horarios: {
    nombre: string;
    hora_inicio: string;
    hora_fin: string;
  }[];

  @Column({ type: 'int', default: 15 })
  duracion_turno_minutos: number;

  @Column({ type: 'int', default: 5 })
  buffer_minutos: number;

  @Column({ type: 'int', default: 20 })
  cupos_maximos_ventana: number;

  @Column({ type: 'int', default: 15 })
  porcentaje_reserva: number; // Porcentaje de ventanas de contingencia (10-20%)

  @Column('json')
  reglas_prioridad: {
    campo: string;
    orden: 'ASC' | 'DESC';
  }[];

  @Column({ type: 'boolean', default: true })
  excluir_feriados: boolean;

  @Column({ type: 'boolean', default: true })
  excluir_eventos: boolean;

  @Column({ type: 'boolean', default: true })
  distribucion_equitativa: boolean;

  // Métricas
  @Column({ type: 'int', default: 0 })
  total_ventanas_generadas: number;

  @Column({ type: 'int', default: 0 })
  total_docentes_asignados: number;

  @Column({ type: 'int', default: 0 })
  total_docentes_atendidos: number;

  @Column({ type: 'int', default: 0 })
  total_ausencias: number;

  @Column({ type: 'float', default: 0 })
  tiempo_promedio_atencion: number;

  // Trazabilidad
  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creado_por_id' })
  creado_por: Usuario;

  @Column({ nullable: true })
  creado_por_id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'actualizado_por_id' })
  actualizado_por: Usuario;

  @Column({ nullable: true })
  actualizado_por_id: number;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  @Column({ type: 'date', nullable: true })
  fecha_publicacion: Date;

  @Column({ type: 'date', nullable: true })
  fecha_cierre: Date;

  @OneToMany(() => VentanaAtencion, ventana => ventana.campaña)
  ventanas: VentanaAtencion[];
}
