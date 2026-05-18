import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  MaxLength,
} from "class-validator";
import { EstadoPeriodo } from "../../common/enums/estado-periodo.enum";

export class CreatePeriodoDto {
  @ApiProperty({ example: "2026-I" })
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: "2026 Primer Semestre" })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: "2026-03-01" })
  @IsDateString()
  fecha_inicio: string;

  @ApiProperty({ example: "2026-07-15" })
  @IsDateString()
  fecha_fin: string;

  @ApiPropertyOptional({
    enum: EstadoPeriodo,
    default: EstadoPeriodo.PLANIFICACION,
  })
  @IsOptional()
  @IsEnum(EstadoPeriodo)
  estado?: EstadoPeriodo;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
