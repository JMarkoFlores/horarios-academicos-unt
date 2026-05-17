import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from "class-validator";
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
    description: "Buscar por nombres, apellidos o código",
  })
  @IsOptional()
  @IsString()
  busqueda?: string;
}
