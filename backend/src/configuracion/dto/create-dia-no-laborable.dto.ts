import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateDiaNoLaborableDto {
  @ApiProperty({
    description: "Fecha del día no laborable (formato ISO: YYYY-MM-DD)",
    example: "2026-04-09",
  })
  @IsDateString()
  fecha: string;

  @ApiProperty({
    description: "Descripción del motivo",
    example: "Semana Santa",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  descripcion: string;

  @ApiProperty({
    description: "Tipo: FERIADO | MANTENIMIENTO | SUSPENSION | EVENTO",
    example: "FERIADO",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  tipo: string;

  @ApiPropertyOptional({
    description: "¿Afecta la disponibilidad de aulas de teoría?",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  afecta_aulas?: boolean;

  @ApiPropertyOptional({
    description: "¿Afecta la disponibilidad de laboratorios?",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  afecta_laboratorios?: boolean;

  @ApiProperty({
    example: "2026-I",
    description: "Período académico al que pertenece",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  periodo_academico: string;
}
