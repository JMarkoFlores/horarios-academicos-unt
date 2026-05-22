import { ApiProperty } from "@nestjs/swagger";
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpsertParametrosCargaDto {
  @ApiProperty({ example: "2026-I" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  periodo_academico: string;

  @ApiProperty({
    example: "PRINCIPAL",
    description: "Categoría docente",
    enum: ["PRINCIPAL", "ASOCIADO", "AUXILIAR", "JEFE_PRACTICA"],
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  categoria: string;

  @ApiProperty({
    example: "ORDINARIO",
    description: "Tipo de docente",
    enum: ["ORDINARIO", "CONTRATADO", "JEFE_PRACTICA_CONTRATADO"],
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  tipo_docente: string;

  @ApiProperty({
    example: "DEDICACION_EXCLUSIVA",
    description: "Modalidad del docente",
    enum: [
      "DEDICACION_EXCLUSIVA",
      "TIEMPO_COMPLETO_40",
      "TIEMPO_PARCIAL_20",
      "TIEMPO_PARCIAL_12",
      "TIEMPO_PARCIAL_10",
      "TIEMPO_PARCIAL_8",
    ],
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  modalidad: string;

  @ApiProperty({
    example: 4,
    description: "Horas mínimas semanales por docente",
  })
  @IsInt()
  @Min(1)
  @Max(40)
  horas_min_semanal: number;

  @ApiProperty({
    example: 20,
    description: "Horas máximas semanales por docente",
  })
  @IsInt()
  @Min(1)
  @Max(80)
  horas_max_semanal: number;

  @ApiProperty({ example: 1, description: "Cursos mínimos por docente" })
  @IsInt()
  @Min(0)
  @Max(20)
  cursos_min_docente: number;

  @ApiProperty({ example: 5, description: "Cursos máximos por docente" })
  @IsInt()
  @Min(1)
  @Max(20)
  cursos_max_docente: number;
}
