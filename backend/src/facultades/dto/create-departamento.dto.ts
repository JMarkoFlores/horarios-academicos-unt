import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsInt,
} from "class-validator";

export class CreateDepartamentoDto {
  @ApiProperty({ example: "DIS" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: "Departamento de Ingeniería de Software" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiProperty({ description: "ID de la escuela a la que pertenece" })
  @IsInt()
  escuela_id: number;

  @ApiPropertyOptional({ description: "ID del usuario coordinador" })
  @IsOptional()
  @IsInt()
  coordinador_id?: number;
}
