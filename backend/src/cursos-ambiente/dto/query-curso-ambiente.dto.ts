import { IsEnum, IsInt, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { TipoClase } from "../../common/enums/tipo-clase.enum";

export class QueryCursoAmbienteDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cursoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ambienteId?: number;

  @IsOptional()
  @IsEnum(TipoClase)
  tipo_clase?: TipoClase;
}
