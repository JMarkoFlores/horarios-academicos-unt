import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from "class-validator";
import { TipoAmbiente } from "../../common/enums/tipo-ambiente.enum";

export class QueryAmbienteDto {
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

  @ApiPropertyOptional({ enum: TipoAmbiente })
  @IsOptional()
  @IsEnum(TipoAmbiente)
  tipo?: TipoAmbiente;

  @ApiPropertyOptional({ description: "true o false" })
  @IsOptional()
  @IsString()
  activo?: string;
}
