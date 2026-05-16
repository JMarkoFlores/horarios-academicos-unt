import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class GenerarHorarioDto {
  @ApiProperty({ example: "2026-I" })
  @IsString()
  @MaxLength(20)
  periodo: string;
}
