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

  @Column({ length: 200, default: "Ingeniería de Sistemas" })
  nombre_facultad: string;

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

  // Light mode colors
  @Column({ length: 20, default: "#F8FAFC", nullable: true })
  light_fondo_base: string;

  @Column({ length: 20, default: "#FFFFFF", nullable: true })
  light_contenedores: string;

  @Column({ length: 20, default: "#0F172A", nullable: true })
  light_texto_principal: string;

  @Column({ length: 20, default: "#2563EB", nullable: true })
  light_dominante: string;

  @Column({ length: 20, default: "#10B981", nullable: true })
  light_exito: string;

  @Column({ length: 20, default: "#D97706", nullable: true })
  light_advertencia: string;

  @Column({ length: 20, default: "#EF4444", nullable: true })
  light_critico: string;

  // Dark mode colors
  @Column({ length: 20, default: "#0F172A", nullable: true })
  dark_fondo_base: string;

  @Column({ length: 20, default: "#1E293B", nullable: true })
  dark_contenedores: string;

  @Column({ length: 20, default: "#F8FAFC", nullable: true })
  dark_texto_principal: string;

  @Column({ length: 20, default: "#38BDF8", nullable: true })
  dark_dominante: string;

  @Column({ length: 20, default: "#34D399", nullable: true })
  dark_exito: string;

  @Column({ length: 20, default: "#FBBF24", nullable: true })
  dark_advertencia: string;

  @Column({ length: 20, default: "#F87171", nullable: true })
  dark_critico: string;

  @UpdateDateColumn({ name: "actualizado_en" })
  actualizado_en: Date;
}
