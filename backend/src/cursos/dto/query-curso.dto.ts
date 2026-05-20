import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, IsBoolean, IsString, Min, Max } from "class-validator";
import { Transform, Type } from "class-transformer";

export class QueryCursoDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Filtrar por ciclo (1-10)", minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  ciclo?: number;

  @ApiPropertyOptional({ description: "Filtrar por cursos con laboratorio" })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  tiene_laboratorio?: boolean;

  @ApiPropertyOptional({ description: "Búsqueda por nombre o código" })
  @IsOptional()
  @IsString()
  busqueda?: string;

  @ApiPropertyOptional({ enum: ['codigo','nombre','creditos','ciclo','horas_teoria'], default: 'ciclo' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'ciclo';

  @ApiPropertyOptional({ enum: ['ASC','DESC'], default: 'ASC' })
  @IsOptional()
  @IsString()
  sortDir?: 'ASC' | 'DESC' = 'ASC';

  @ApiPropertyOptional({ description: "Filtrar activos (true), inactivos (false) o todos (omitir)" })
  @IsOptional()
  @Transform(({ value }) => { if (value === undefined || value === '') return undefined; return value === 'true' || value === true; })
  @IsBoolean()
  activo?: boolean;
}
