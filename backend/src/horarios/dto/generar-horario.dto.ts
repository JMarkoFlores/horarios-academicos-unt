import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GenerarHorarioDto {
  @ApiProperty({ example: "2026-I" })
  @IsString()
  @IsNotEmpty()
  periodo: string;
}
