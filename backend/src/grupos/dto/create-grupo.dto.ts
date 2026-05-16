import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, Min, MaxLength } from "class-validator";

export class CreateGrupoDto {
  @ApiProperty({ example: "A" })
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: "Grupo A" })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  ciclo: number;

  @ApiProperty({ example: 35 })
  @IsInt()
  @Min(1)
  cupo_maximo: number;

  @ApiProperty({ example: 1, description: "ID del período académico" })
  @IsInt()
  periodo_academico_id: number;

  @ApiProperty({ example: 1, description: "ID del curso" })
  @IsInt()
  curso_id: number;
}
