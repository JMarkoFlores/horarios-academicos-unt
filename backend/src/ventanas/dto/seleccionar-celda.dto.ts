import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, Matches } from 'class-validator';

export class SeleccionarCeldaDto {
  @ApiProperty({ description: 'ID del docente seleccionando' })
  @IsInt()
  docente_id: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
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

  @ApiProperty({ description: 'ID del ambiente' })
  @IsInt()
  ambiente_id: number;
}
