import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Matches } from "class-validator";

export class DeseleccionarCeldaDto {
  @ApiProperty()
  @IsString()
  sesionId: string;

  @ApiProperty()
  @IsInt()
  ambienteId: number;

  @ApiProperty()
  @IsInt()
  dia: number;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  horaInicio: string;

  @ApiProperty({ example: "2026-I" })
  @IsString()
  periodo: string;
}
