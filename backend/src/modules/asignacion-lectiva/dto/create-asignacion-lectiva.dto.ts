import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  MaxLength,
} from "class-validator";
import { TipoClase } from "../../../common/enums/tipo-clase.enum";

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

  @IsEnum(TipoClase)
  @IsNotEmpty()
  tipo_clase: TipoClase;

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
