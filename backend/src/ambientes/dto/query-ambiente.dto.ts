import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from "class-validator";
import { Transform, Type } from "class-transformer";
import { TipoAmbiente } from "../../common/enums/tipo-ambiente.enum";
import { EstadoAmbiente } from "../../common/enums/estado-ambiente.enum";

export class QueryAmbienteDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TipoAmbiente })
  @IsOptional()
  @IsEnum(TipoAmbiente)
  tipo?: TipoAmbiente;

  @ApiPropertyOptional({ enum: EstadoAmbiente })
  @IsOptional()
  @IsEnum(EstadoAmbiente)
  estado?: EstadoAmbiente;

  @ApiPropertyOptional({ description: "Búsqueda por código, nombre, pabellón o equipamiento" })
  @IsOptional()
  @IsString()
  busqueda?: string;

  @ApiPropertyOptional({ description: "Filtrar por pabellón exacto" })
  @IsOptional()
  @IsString()
  pabellon?: string;

  @ApiPropertyOptional({ description: "Filtrar por sede exacta" })
  @IsOptional()
  @IsString()
  sede?: string;

  @ApiPropertyOptional({ description: "Capacidad mínima" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacidadMin?: number;

  @ApiPropertyOptional({ description: "Capacidad máxima" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacidadMax?: number;

  @ApiPropertyOptional({ description: "true o false (deprecated, usar estado)" })
  @IsOptional()
  @IsString()
  activo?: string;
}
