import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, IsBoolean, Min, Max } from "class-validator";

export class QueryCursoDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Filtrar por ciclo (1-10)",
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  ciclo?: number;

  @ApiPropertyOptional({ description: "Filtrar por cursos con laboratorio" })
  @IsOptional()
  @IsBoolean()
  tiene_laboratorio?: boolean;
}
