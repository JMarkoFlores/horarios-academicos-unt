import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ConfiguracionVentanaCategoriaDto {
  @ApiProperty({ example: "PRINCIPAL" })
  @IsString()
  categoria: string;

  @ApiPropertyOptional({ example: "NOMBRADO" })
  @IsOptional()
  @IsString()
  modalidad?: string;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_inicio: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  intervalo_minutos?: number;
}

export class ConfigurarVentanasPeriodoDto {
  @ApiProperty()
  @IsInt()
  idPeriodo: number;

  @ApiProperty({ example: "2026-05-20" })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ type: [ConfiguracionVentanaCategoriaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfiguracionVentanaCategoriaDto)
  config: ConfiguracionVentanaCategoriaDto[];
}
