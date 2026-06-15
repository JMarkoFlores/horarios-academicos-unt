import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class SubsanarDeclaracionDto {
  @ApiPropertyOptional({
    example: "Se corrigió el detalle de las actividades de investigación.",
  })
  @IsOptional()
  @IsString({ message: "El comentario de subsanación debe ser texto" })
  observaciones?: string;
}
