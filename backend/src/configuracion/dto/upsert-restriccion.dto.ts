import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpsertRestriccionDto {
  @ApiProperty({
    description:
      "Tipo de restricción: FRANJA_HORARIA | MAX_HORAS_DIARIAS | BLOQUE_ALMUERZO | otro",
    example: "FRANJA_HORARIA",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tipo_restriccion: string;

  @ApiProperty({
    description: "Valor de la restricción como objeto JSON libre",
    example: { hora_inicio: "07:00", hora_fin: "22:00" },
  })
  @IsObject()
  valor: Record<string, unknown>;

  @ApiProperty({
    example: "2026-I",
    description: "Período académico al que aplica",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  periodo_academico: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
