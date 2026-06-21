import { IsOptional, IsInt, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { EstadoAsignacionLectiva } from "../../../common/enums/estado-asignacion-lectiva.enum";

export class QueryAsignacionLectivaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodo_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  plan_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ciclo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  docente_id?: number;

  @IsOptional()
  @IsEnum(EstadoAsignacionLectiva)
  estado?: EstadoAsignacionLectiva;
}
