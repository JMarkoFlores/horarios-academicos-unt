import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateDeclaracionCargaHorariaDto {
  @ApiPropertyOptional({ example: "Sede Central" })
  @IsOptional()
  @IsString({ message: "La sede debe ser texto" })
  sede?: string;

  @ApiPropertyOptional({ example: "Borrador inicial" })
  @IsOptional()
  @IsString({ message: "Las observaciones deben ser texto" })
  observaciones?: string;
}
