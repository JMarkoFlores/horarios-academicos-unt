import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateTurnoDto {
  @ApiProperty({ example: "Mañana", description: "Nombre del turno" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombre: string;

  @ApiProperty({ example: "07:00", description: "Hora de inicio (HH:MM)" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "hora_inicio debe tener formato HH:MM" })
  hora_inicio: string;

  @ApiProperty({ example: "13:00", description: "Hora de fin (HH:MM)" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "hora_fin debe tener formato HH:MM" })
  hora_fin: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
