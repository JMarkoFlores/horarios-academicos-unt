<<<<<<< HEAD
import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Min, Matches } from "class-validator";
=======
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, Max, Matches } from 'class-validator';
>>>>>>> develop

export class SeleccionarCeldaDto {
  @ApiProperty({ description: "ID del docente seleccionando" })
  @IsInt()
  @Min(1)
  docente_id: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  dia_semana: number;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_inicio: string;

  @ApiProperty({ example: "10:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_fin: string;

  @ApiProperty({ description: "ID del ambiente" })
  @IsInt()
  @Min(1)
  ambiente_id: number;
}
