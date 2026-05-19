import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class QueryEstadisticasDto {
  @ApiPropertyOptional({ example: "2026-I" })
  @IsOptional()
  @IsString()
  periodo?: string;
}
