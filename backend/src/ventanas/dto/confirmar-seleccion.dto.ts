import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ConfirmarSeleccionDto {
  @ApiProperty({ description: 'ID del docente que confirma su selección' })
  @IsInt()
  docente_id: number;
}
