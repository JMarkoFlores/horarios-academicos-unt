import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class GenerarAutomaticoDto {
  @ApiProperty({
    example: "2026-I",
    description: "Código del período académico",
  })
  @IsString()
  @IsNotEmpty()
  periodo: string;
}
