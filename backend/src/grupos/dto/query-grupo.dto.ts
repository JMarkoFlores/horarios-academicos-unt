import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class QueryGrupoDto {
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

  @ApiPropertyOptional({ example: '2026-I', description: 'Código del período académico' })
  @IsOptional()
  @IsString()
  periodo?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID del curso' })
  @IsOptional()
  @IsInt()
  @Min(1)
  curso_id?: number;
}
