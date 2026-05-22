import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsInt } from "class-validator";

export class CreateFacultadDto {
  @ApiProperty({ example: "FIC" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: "Facultad de Ingeniería de Computación" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiPropertyOptional({ description: "ID del usuario coordinador" })
  @IsOptional()
  @IsInt()
  coordinador_id?: number;
}
