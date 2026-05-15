import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResolverConflictoDto {
  @ApiPropertyOptional({ description: 'Observación de la resolución' })
  @IsOptional()
  @IsString()
  observacion?: string;
}
