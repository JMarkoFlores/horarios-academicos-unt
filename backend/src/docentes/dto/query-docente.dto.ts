import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { CategoriaDocente } from "../../common/enums/categoria-docente.enum";
import { TipoDocente } from "../../common/enums/tipo-docente.enum";
import { ModalidadDocente } from "../../common/enums/modalidad-docente.enum";

export class QueryDocenteDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: CategoriaDocente })
  @IsOptional()
  @IsEnum(CategoriaDocente)
  categoria?: CategoriaDocente;

  @ApiPropertyOptional({ enum: TipoDocente })
  @IsOptional()
  @IsEnum(TipoDocente)
  tipo_docente?: TipoDocente;

  @ApiPropertyOptional({ enum: ModalidadDocente })
  @IsOptional()
  @IsEnum(ModalidadDocente)
  modalidad?: ModalidadDocente;

  @ApiPropertyOptional({
    description: "Buscar por nombres, apellidos, código o email",
  })
  @IsOptional()
  @IsString()
  busqueda?: string;

  @ApiPropertyOptional({
    description: "Campo para ordenar",
    example: "apellidos",
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: "Dirección de orden",
    enum: ["ASC", "DESC"],
  })
  @IsOptional()
  @IsString()
  sortDir?: "ASC" | "DESC";

  @ApiPropertyOptional({
    description: "Filtrar por estado activo. Omitir para ver todos. Use 'true' o 'false'",
  })
  @IsOptional()
  @IsString()
  activo?: string;

  @ApiPropertyOptional({
    description:
      "Filtrar docentes sin facultad o departamento asignado. Use 'true' o 'false'",
  })
  @IsOptional()
  @IsString()
  sin_vinculacion?: string;
}
