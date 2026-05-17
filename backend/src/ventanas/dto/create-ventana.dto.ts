import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsDateString, Matches, MaxLength } from "class-validator";

export class CreateVentanaDto {
  @ApiProperty({ example: "2026-I" })
  @IsString()
  @MaxLength(20)
  periodo: string;

  @ApiProperty({ example: "2026-04-10" })
  @IsDateString()
  fecha: string;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_inicio: string;

  @ApiProperty({ example: "12:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_fin: string;
}
