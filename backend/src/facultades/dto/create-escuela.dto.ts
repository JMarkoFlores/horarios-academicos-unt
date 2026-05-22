import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsInt } from "class-validator";

export class CreateEscuelaDto {
  @ApiProperty({ example: "EIS" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: "Escuela de Ingeniería de Sistemas" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiProperty({ description: "ID de la facultad a la que pertenece" })
  @IsInt()
  facultad_id: number;

  @ApiPropertyOptional({ description: "ID del usuario coordinador" })
  @IsOptional()
  @IsInt()
  coordinador_id?: number;
}
