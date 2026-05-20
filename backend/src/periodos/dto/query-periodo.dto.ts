import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsBoolean,
  IsInt,
  IsString,
  Min,
} from "class-validator";

export class QueryPeriodoDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Filtrar activos/inactivos" })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ description: "Filtrar por código de período" })
  @IsOptional()
  @IsString()
  codigo?: string;
}
