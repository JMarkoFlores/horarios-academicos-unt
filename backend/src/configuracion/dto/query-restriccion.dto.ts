import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class QueryRestriccionDto {
  @ApiPropertyOptional({ example: "2026-I", description: "Período académico" })
  @IsOptional()
  @IsString()
  periodo?: string;
}
