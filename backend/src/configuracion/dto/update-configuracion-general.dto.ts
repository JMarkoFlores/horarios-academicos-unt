import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsHexColor,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

export class UpdateConfiguracionGeneralDto {
  @ApiPropertyOptional({ example: "Universidad Nacional de Trujillo" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre_institucional?: string;

  @ApiPropertyOptional({ example: "https://ejemplo.com/logo.png" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional({ example: "#1a237e" })
  @IsOptional()
  @IsHexColor()
  color_primario?: string;

  @ApiPropertyOptional({ example: "#283593" })
  @IsOptional()
  @IsHexColor()
  color_secundario?: string;

  @ApiPropertyOptional({ example: "#e91e63" })
  @IsOptional()
  @IsHexColor()
  color_acento?: string;
}
