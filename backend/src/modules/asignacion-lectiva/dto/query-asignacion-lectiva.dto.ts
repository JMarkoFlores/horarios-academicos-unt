import { IsOptional, IsInt, IsString } from "class-validator";
import { Type } from "class-transformer";

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
  @IsString()
  estado?: string;
}
