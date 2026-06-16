import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { TipoClase } from "../../common/enums/tipo-clase.enum";

export class AsignarCursoItemDto {
  @ApiProperty({ example: 1, description: "ID del curso" })
  @IsInt({ message: "El ID del curso debe ser un número entero" })
  cursoId: number;

  @ApiProperty({
    example: TipoClase.TEORIA,
    enum: TipoClase,
    description: "Tipo de clase (TEORIA o LABORATORIO)",
  })
  @IsEnum(TipoClase, { message: "tipo_clase inválido" })
  tipo_clase: TipoClase;
}

export class AsignarCursosDto {
  @ApiProperty({
    type: [AsignarCursoItemDto],
    description: "Lista de cursos a asignar con su tipo de clase",
  })
  @IsArray({ message: "cursos debe ser un arreglo" })
  @ValidateNested({ each: true })
  @Type(() => AsignarCursoItemDto)
  cursos: AsignarCursoItemDto[];

  @ApiProperty({
    example: "2026-I",
    required: false,
    description: "Código del período académico",
  })
  @IsOptional()
  @IsString()
  periodo?: string;
}
