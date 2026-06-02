import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  IsBoolean,
} from "class-validator";
import { Transform } from "class-transformer";
import { CategoriaVentana } from "../../../common/enums/categoria-ventana.enum";
import { TipoContrato } from "../../../common/enums/tipo-contrato.enum";

export class CreateVentanaDto {
  @ApiProperty({ example: "2026-I" })
  @IsString()
  periodo: string;

  @ApiProperty({ example: "2026-05-20" })
  @IsDateString()
  fecha: string;

  @ApiProperty({ enum: CategoriaVentana })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, '_');
    }
    return value;
  })
  @IsEnum(CategoriaVentana)
  proposito: CategoriaVentana;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  filtro_categorias_docente?: string[];

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

  @ApiPropertyOptional({ default: false, description: 'Saltar validación de capacidad (para creación automática de múltiples ventanas)' })
  @IsOptional()
  @IsBoolean()
  saltarValidacionCapacidad?: boolean;

  @ApiPropertyOptional({ default: false, description: 'No asignar docentes automáticamente (para ventanas que se crean en serie)' })
  @IsOptional()
  @IsBoolean()
  sinAsignarDocentes?: boolean;
}
