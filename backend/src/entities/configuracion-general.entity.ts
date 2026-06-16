import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from "typeorm";

@Entity("configuracion_general")
export class ConfiguracionGeneral {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200, default: "Universidad Nacional de Trujillo" })
  nombre_institucional: string;

  @Column({
    length: 500,
    nullable: true,
    default:
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png",
  })
  logo_url: string;

  @Column({ length: 20, default: "#1a237e" })
  color_primario: string;

  @Column({ length: 20, default: "#283593" })
  color_secundario: string;

  @Column({ length: 20, default: "#e91e63" })
  color_acento: string;

  @UpdateDateColumn({ name: "actualizado_en" })
  actualizado_en: Date;
}
