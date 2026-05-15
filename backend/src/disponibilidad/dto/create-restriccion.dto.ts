import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateRestriccionDto {
  @ApiProperty({ example: 'MAX_HORAS_DIA', description: 'Tipo de restricción institucional' })
  @IsString()
  @MaxLength(100)
  tipo_restriccion: string;

  @ApiProperty({ example: { max_horas: 8 }, description: 'Valor de la restricción (JSONB)' })
  @IsObject()
  valor: Record<string, unknown>;

  @ApiProperty({ example: '2026-I' })
  @IsString()
  @MaxLength(20)
  periodo_academico: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean = true;
}
