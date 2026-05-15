import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, Min, Matches } from 'class-validator';

export class ReasignarHorarioDto {
  @ApiProperty({ description: 'Día semana 1=Lun…5=Vie', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  dia_semana: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_inicio: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_fin: string;

  @ApiPropertyOptional({ description: 'ID del nuevo ambiente' })
  @IsOptional()
  @IsInt()
  ambiente_id?: number;
}
