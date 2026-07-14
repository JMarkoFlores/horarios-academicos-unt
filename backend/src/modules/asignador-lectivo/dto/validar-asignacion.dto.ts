import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  Min,
} from "class-validator";
import { TipoClase } from "../../../common/enums/tipo-clase.enum";

export class ValidarAsignacionDto {
  @IsInt()
  @IsNotEmpty()
  docente_id: number;

  @IsInt()
  @IsNotEmpty()
  curso_id: number;

  @IsInt()
  @IsOptional()
  curso_plan_id?: number;

  @IsInt()
  @IsNotEmpty()
  ambiente_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  periodo: string;

  @IsInt()
  dia: number;

  @IsString()
  @IsNotEmpty()
  hora_inicio: string;

  @IsString()
  @IsNotEmpty()
  hora_fin: string;

  @IsEnum(TipoClase)
  @IsNotEmpty()
  tipo_clase: TipoClase;

  @IsInt()
  @IsOptional()
  grupo_id?: number;

  @IsInt()
  @IsOptional()
  horario_id?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  nro_alumnos?: number;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  seccion?: string;
}

export interface ValidacionResultado {
  valido: boolean;
  errores: string[];
  advertencias: string[];
}
