import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  Min,
  MaxLength,
} from "class-validator";
import { TipoClase } from "../../common/enums/tipo-clase.enum";

export class CreateGrupoDto {
  @ApiProperty({ example: "A" })
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: "Grupo A" })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ enum: TipoClase, default: TipoClase.TEORIA })
  @IsOptional()
  @IsEnum(TipoClase)
  tipo?: TipoClase = TipoClase.TEORIA;

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
  @Min(1)
  periodo_academico_id: number;

  @ApiProperty({ example: 1, description: "ID del curso" })
  @IsInt()
  @Min(1)
  curso_id: number;
}
