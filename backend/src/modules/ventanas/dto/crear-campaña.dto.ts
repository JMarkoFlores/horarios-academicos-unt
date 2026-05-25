import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsString,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";

export class BloqueHorarioDto {
  @ApiProperty({ example: "Mañana" })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/)
  hora_inicio: string;

  @ApiProperty({ example: "12:00" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/)
  hora_fin: string;
}

export class ReglaPrioridadDto {
  @ApiProperty({ example: "categoria" })
  @IsString()
  @IsNotEmpty()
  campo: string;

  @ApiProperty({ example: "ASC", enum: ["ASC", "DESC"] })
  @IsEnum(["ASC", "DESC"])
  orden: "ASC" | "DESC";
}

export class CrearCampañaDto {
  @ApiProperty({ example: "Campaña 2026-I - Principal" })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: "Ventanas de atención para el período 2026-I" })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  idPeriodo: number;

  @ApiProperty({ example: "2026-05-20" })
  @IsDateString()
  @IsNotEmpty()
  fecha_inicio: string;

  @ApiProperty({ example: "2026-07-30" })
  @IsDateString()
  @IsNotEmpty()
  fecha_fin: string;

  @ApiProperty({
    example: ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"],
    enum: ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsEnum(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"], { each: true })
  dias_habilitados: string[];

  @ApiProperty({ type: [BloqueHorarioDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BloqueHorarioDto)
  @ArrayMinSize(1)
  bloques_horarios: BloqueHorarioDto[];

  @ApiProperty({ example: 15, default: 15 })
  @IsInt()
  @Min(5)
  @IsOptional()
  duracion_turno_minutos?: number;

  @ApiProperty({ example: 5, default: 5 })
  @IsInt()
  @Min(0)
  @IsOptional()
  buffer_minutos?: number;

  @ApiProperty({ example: 20, default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  cupos_maximos_ventana?: number;

  @ApiProperty({ example: 15, default: 15, description: 'Porcentaje de ventanas de contingencia para reprogramaciones (10-20%)' })
  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  porcentaje_reserva?: number;

  @ApiProperty({ type: [ReglaPrioridadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReglaPrioridadDto)
  @IsOptional()
  reglas_prioridad?: ReglaPrioridadDto[];

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  excluir_feriados?: boolean;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  excluir_eventos?: boolean;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  distribucion_equitativa?: boolean;
}
