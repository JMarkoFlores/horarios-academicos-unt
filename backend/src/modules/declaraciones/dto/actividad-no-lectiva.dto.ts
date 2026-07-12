import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from "class-validator";
import { TipoActividadNoLectiva } from "../../../common/enums/tipo-actividad-no-lectiva.enum";

export class CreateActividadNoLectivaDto {
  @IsEnum(TipoActividadNoLectiva)
  tipo: TipoActividadNoLectiva;

  @IsString()
  descripcion: string;

  @IsOptional()
  @IsString()
  detalle?: string;

  @IsInt()
  @Min(0)
  @Max(40)
  horas_totales: number;

  @IsOptional()
  @IsBoolean()
  horas_manual?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

export class UpdateActividadNoLectivaDto {
  @IsOptional()
  @IsEnum(TipoActividadNoLectiva)
  tipo?: TipoActividadNoLectiva;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  detalle?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40)
  horas_totales?: number;

  @IsOptional()
  horas_manual?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

export class CreateHorarioNoLectivoDto {
  @IsInt()
  @Min(1)
  @Max(7)
  dia: number;

  hora_inicio: string;

  hora_fin: string;

  @IsOptional()
  @IsString()
  lugar?: string;
}

export class UpdateHorarioNoLectivoDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  dia?: number;

  @IsOptional()
  hora_inicio?: string;

  @IsOptional()
  hora_fin?: string;

  @IsOptional()
  @IsString()
  lugar?: string;
}
