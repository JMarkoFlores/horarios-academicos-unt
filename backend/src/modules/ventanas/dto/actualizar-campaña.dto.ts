import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsString,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { BloqueHorarioDto, ReglaPrioridadDto } from "./crear-campaña.dto";

export class ActualizarCampañaDto {
  @ApiPropertyOptional({ example: "Campaña 2026-I - Principal" })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: "Ventanas de atención para el período 2026-I" })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ example: "2026-05-20" })
  @IsDateString()
  @IsOptional()
  fecha_inicio?: string;

  @ApiPropertyOptional({ example: "2026-07-30" })
  @IsDateString()
  @IsOptional()
  fecha_fin?: string;

  @ApiPropertyOptional({
    example: ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"],
    enum: ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsEnum(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"], { each: true })
  @IsOptional()
  dias_habilitados?: string[];

  @ApiPropertyOptional({ type: [BloqueHorarioDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BloqueHorarioDto)
  @ArrayMinSize(1)
  @IsOptional()
  bloques_horarios?: BloqueHorarioDto[];

  @ApiPropertyOptional({ example: 15, default: 15 })
  @IsInt()
  @Min(5)
  @IsOptional()
  duracion_turno_minutos?: number;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsInt()
  @Min(0)
  @IsOptional()
  buffer_minutos?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  cupos_maximos_ventana?: number;

  @ApiPropertyOptional({ example: 15, default: 15, description: 'Porcentaje de ventanas de contingencia para reprogramaciones (10-20%)' })
  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  porcentaje_reserva?: number;

  @ApiPropertyOptional({ type: [ReglaPrioridadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReglaPrioridadDto)
  @IsOptional()
  reglas_prioridad?: ReglaPrioridadDto[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  excluir_feriados?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  excluir_eventos?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  distribucion_equitativa?: boolean;
}
