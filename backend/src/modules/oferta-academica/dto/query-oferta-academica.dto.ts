import { IsInt, IsOptional, IsBooleanString } from "class-validator";

export class QueryOfertaAcademicaDto {
  @IsInt()
  @IsOptional()
  periodo_id?: number;

  @IsInt()
  @IsOptional()
  plan_id?: number;

  @IsInt()
  @IsOptional()
  ciclo?: number;

  @IsBooleanString()
  @IsOptional()
  activo?: string;
}
