import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";
import { CategoriaDocente } from "../../../common/enums/categoria-docente.enum";
import { TipoContrato } from "../../../common/enums/tipo-contrato.enum";

export class CreateVentanaDto {
  @ApiProperty({ example: "2026-I" })
  @IsString()
  periodo: string;

  @ApiProperty({ example: "2026-05-20" })
  @IsDateString()
  fecha: string;

  @ApiProperty({ enum: CategoriaDocente })
  @Transform(({ value }) => {
    // Normalizar formato: "Jefe Práctica" -> "JEFE_PRACTICA"
    if (typeof value === 'string') {
      return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // quitar acentos
        .toUpperCase()
        .replace(/\s+/g, '_'); // espacios -> guiones bajos
    }
    return value;
  })
  @IsEnum(CategoriaDocente)
  categoria: CategoriaDocente;

  @ApiPropertyOptional({ enum: TipoContrato })
  @IsOptional()
  @IsEnum(TipoContrato)
  modalidad?: TipoContrato;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_inicio: string;

  @ApiProperty({ example: "10:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_fin: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  intervalo_minutos?: number;
}
