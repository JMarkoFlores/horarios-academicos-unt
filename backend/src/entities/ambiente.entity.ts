import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, BeforeInsert, BeforeUpdate } from "typeorm";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { EstadoAmbiente } from "../common/enums/estado-ambiente.enum";
import { Curso } from "./curso.entity";

@Entity("ambiente")
export class Ambiente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: "enum", enum: TipoAmbiente })
  tipo: TipoAmbiente;

  @Column()
  capacidad: number;

  @Column({ nullable: true })
  piso: number;

  @Column({ nullable: true, length: 50 })
  pabellon: string;

  @Column({ nullable: true, length: 100 })
  edificio: string;

  @Column({ type: "float", nullable: true, name: "coord_x" })
  coordX: number;

  @Column({ type: "float", nullable: true, name: "coord_y" })
  coordY: number;

  @Column({ nullable: true, length: 100 })
  sede: string;

  @Column({ type: "text", nullable: true })
  equipamiento: string;

  @Column({ type: "enum", enum: EstadoAmbiente, default: EstadoAmbiente.ACTIVO })
  estado: EstadoAmbiente;

  @Column({ default: true })
  activo: boolean;

  @ManyToMany(() => Curso, (curso) => curso.ambientes)
  cursos: Curso[];

  @BeforeInsert()
  @BeforeUpdate()
  syncActivo(): void {
    if (this.estado) {
      this.activo = this.estado === EstadoAmbiente.ACTIVO || this.estado === EstadoAmbiente.RESERVADO;
    }
  }
}
