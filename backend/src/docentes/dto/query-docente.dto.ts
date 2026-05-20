import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";
import { CategoriaDocente } from "../../common/enums/categoria-docente.enum";
import { TipoContrato } from "../../common/enums/tipo-contrato.enum";

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

  @ApiPropertyOptional({ enum: TipoContrato })
  @IsOptional()
  @IsEnum(TipoContrato)
  tipo_contrato?: TipoContrato;

  @ApiPropertyOptional({
    description: "Buscar por nombres, apellidos, código o email",
  })
  @IsOptional()
  @IsString()
  busqueda?: string;

  @ApiPropertyOptional({ description: "Campo para ordenar", example: "apellidos" })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: "Dirección de orden", enum: ["ASC", "DESC"] })
  @IsOptional()
  @IsString()
  sortDir?: "ASC" | "DESC";

  @ApiPropertyOptional({ description: "Filtrar por estado activo. Omitir para ver solo activos" })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  activo?: boolean;
}
