import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FindDisponiblesDto {
  @ApiProperty({
    description: 'Tipo de ambiente a buscar (e.g., "Laboratorio", "Aula")',
    example: 'Laboratorio',
  })
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @ApiProperty({
    description: 'Día de la semana en español (e.g., "lunes", "martes")',
    example: 'martes',
  })
  @IsString()
  @IsNotEmpty()
  dia: string;

  @ApiProperty({
    description: 'Hora de inicio en formato HH:mm',
    example: '15:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'La hora de inicio debe tener el formato HH:mm',
  })
  horaInicio: string;

  @ApiProperty({
    description: 'Hora de fin en formato HH:mm',
    example: '18:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'La hora de fin debe tener el formato HH:mm',
  })
  horaFin: string;

  @ApiProperty({
    description: 'ID del periodo académico actual (opcional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  periodoId?: string;
}
