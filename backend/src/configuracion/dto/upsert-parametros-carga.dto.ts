import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { CategoriaDocente } from "../../common/enums/categoria-docente.enum";
import { ModalidadDocente } from "../../common/enums/modalidad-docente.enum";
import { TipoDocente } from "../../common/enums/tipo-docente.enum";

export class UpsertParametrosCargaDto {
  @ApiProperty({ example: "2026-I" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  periodo_academico: string;

  @ApiProperty({
    example: "PRINCIPAL",
    description: "Categoría docente",
    enum: CategoriaDocente,
  })
  @IsEnum(CategoriaDocente)
  categoria: CategoriaDocente;

  @ApiProperty({
    example: "ORDINARIO",
    description: "Tipo de docente",
    enum: TipoDocente,
  })
  @IsEnum(TipoDocente)
  tipo_docente: TipoDocente;

  @ApiProperty({
    example: "DEDICACION_EXCLUSIVA",
    description: "Modalidad del docente",
    enum: ModalidadDocente,
  })
  @IsEnum(ModalidadDocente)
  modalidad: ModalidadDocente;

  @ApiProperty({
    example: 4,
    description: "Mínimo de horas lectivas semanales para el perfil en el período",
  })
  @IsInt()
  @Min(0)
  @Max(40)
  horas_min_semanal: number;

  @ApiProperty({
    example: 20,
    description: "Máximo de horas lectivas semanales para el perfil en el período",
  })
  @IsInt()
  @Min(1)
  @Max(80)
  horas_max_semanal: number;

  @ApiProperty({ example: 5, description: "Máximo de cursos por docente en el período" })
  @IsInt()
  @Min(1)
  @Max(20)
  cursos_max_docente: number;
}
