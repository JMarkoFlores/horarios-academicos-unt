import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { TipoClase } from "../../../common/enums/tipo-clase.enum";

export class CrearHorarioLectivoDto {
  @IsInt()
  @IsNotEmpty()
  docente_id: number;

  @IsInt()
  @IsNotEmpty()
  curso_id: number;

  @IsInt()
  @IsOptional()
  grupo_id?: number;

  @IsInt()
  @IsNotEmpty()
  ambiente_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  periodo: string;

  @IsInt()
  @Min(1)
  @Max(6)
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
  curso_plan_id?: number;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  seccion?: string;

  @IsInt()
  @IsOptional()
  nro_alumnos?: number;
}
