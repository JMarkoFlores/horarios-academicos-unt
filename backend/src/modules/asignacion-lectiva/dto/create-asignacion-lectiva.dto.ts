import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  MaxLength,
} from "class-validator";

export class CreateAsignacionLectivaDto {
  @IsInt()
  @IsNotEmpty()
  docente_id: number;

  @IsInt()
  @IsNotEmpty()
  curso_plan_id: number;

  @IsInt()
  @IsNotEmpty()
  periodo_id: number;

  @IsInt()
  @IsOptional()
  grupo_id?: number;

  @IsString()
  @IsNotEmpty()
  tipo_clase: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  seccion: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  nro_alumnos?: number;

  @IsNumber()
  @Min(0)
  horas_asignadas: number;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
