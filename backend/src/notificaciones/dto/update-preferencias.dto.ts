import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsBoolean, IsString, MaxLength } from "class-validator";

export class UpdatePreferenciasDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canal_correo?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canal_whatsapp?: boolean;

  @ApiPropertyOptional({ example: "944123456" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;
}
