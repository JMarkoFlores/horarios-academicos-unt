import { IsString, IsDate, IsInt, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class HorarioSemanalDto {
  @IsString()
  dia: string;

  @IsString()
  hora_inicio: string;

  @IsString()
  hora_fin: string;
}

export class CreateCargaAdicionalDto {
  @IsInt()
  declaracion_id: number;

  @IsInt()
  docente_id: number;

  @IsString()
  dependencia: string;

  @IsString()
  actividad: string;

  @IsDate()
  @Type(() => Date)
  fecha_inicio: Date;

  @IsDate()
  @Type(() => Date)
  fecha_fin: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioSemanalDto)
  @IsOptional()
  horario_semanal?: HorarioSemanalDto[];

  @IsInt()
  @Min(0)
  total_horas: number;

  @IsString()
  unidad_academica: string;

  @IsString()
  @IsOptional()
  resolucion?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
