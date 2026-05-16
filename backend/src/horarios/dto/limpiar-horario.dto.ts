import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class LimpiarHorarioDto {
  @ApiProperty({ example: "2026-I" })
  @IsString()
  @MaxLength(20)
  periodo: string;
}
