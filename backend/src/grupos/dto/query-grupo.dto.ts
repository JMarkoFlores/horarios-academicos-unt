import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class QueryGrupoDto {
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
