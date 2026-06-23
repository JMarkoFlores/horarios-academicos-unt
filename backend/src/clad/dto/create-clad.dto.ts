import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsNumber, IsDateString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoDependenciaClad } from '../../common/enums/tipo-dependencia-clad.enum';

export class CreateHorarioDto {
  @IsNumber()
  @Type(() => Number)
  dia: number;

  @IsString()
  hora_inicio: string;

  @IsString()
  hora_fin: string;

  @IsString()
  @IsOptional()
  lugar?: string;
}

export class CreateDetalleCladDto {
  @IsString()
  nombre_curso: string;

  @IsString()
  @IsOptional()
  codigo_curso?: string;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHorarioDto)
  horario: CreateHorarioDto[];

  @IsNumber()
  @Type(() => Number)
  horas_semanales: number;
}

export class CreateCladDto {
  @IsNumber()
  @Type(() => Number)
  periodo_academico_id: number;

  @IsEnum(TipoDependenciaClad)
  tipo_dependencia: TipoDependenciaClad;

  @IsString()
  @IsOptional()
  nombre_dependencia?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleCladDto)
  detalles: CreateDetalleCladDto[];

  @IsString()
  @IsOptional()
  observaciones?: string;
}
