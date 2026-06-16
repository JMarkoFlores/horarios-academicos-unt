import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBooleanString, IsInt, IsOptional, IsString } from "class-validator";

export class QueryPlanEstudiosDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  escuela?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  activo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
