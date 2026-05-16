<<<<<<< HEAD
import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";
=======
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
>>>>>>> develop

export class ConfirmarSeleccionDto {
  @ApiProperty({ description: "ID del docente que confirma su selección" })
  @IsInt()
  @Min(1)
  docente_id: number;
}
