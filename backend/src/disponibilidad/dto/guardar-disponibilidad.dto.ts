import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested, ArrayNotEmpty, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { DisponibilidadSlotDto } from './disponibilidad-slot.dto';

export class GuardarDisponibilidadDto {
  @ApiProperty({ example: '2026-I' })
  @IsString()
  @MaxLength(20)
  periodo: string;

  @ApiProperty({ type: [DisponibilidadSlotDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DisponibilidadSlotDto)
  slots: DisponibilidadSlotDto[];
}
