import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface ReglaPrioridad {
  campo: string;
  orden: 'ASC' | 'DESC';
}

@Entity('reglas_prioridad_globales')
export class ReglasPrioridadGlobales {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('json')
  reglas: ReglaPrioridad[];

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;
}
