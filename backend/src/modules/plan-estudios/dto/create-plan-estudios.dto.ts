import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from "class-validator";

export class CreatePlanEstudiosDto {
  @ApiProperty({ example: "2018" })
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: "Plan de Estudios 2018" })
  @IsString()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: "R.N° 123-2018-UNT" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  resolucion?: string;

  @ApiProperty({ example: 2018 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  anio: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiProperty()
  @IsInt()
  escuela_id: number;
}
