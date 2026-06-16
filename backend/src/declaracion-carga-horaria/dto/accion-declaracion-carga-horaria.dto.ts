import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class AccionDeclaracionCargaHorariaDto {
  @ApiPropertyOptional({
    example: "Se corrige la parte no lectiva solicitada.",
  })
  @IsOptional()
  @IsString({ message: "Las observaciones deben ser texto" })
  observaciones?: string;
}
