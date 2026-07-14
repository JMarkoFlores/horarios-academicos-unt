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

  @ApiPropertyOptional({ example: "Ingeniería de Sistemas" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre_facultad?: string;

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

  // Light mode colors
  @ApiPropertyOptional({ example: "#F8FAFC" })
  @IsOptional()
  @IsHexColor()
  light_fondo_base?: string;

  @ApiPropertyOptional({ example: "#FFFFFF" })
  @IsOptional()
  @IsHexColor()
  light_contenedores?: string;

  @ApiPropertyOptional({ example: "#0F172A" })
  @IsOptional()
  @IsHexColor()
  light_texto_principal?: string;

  @ApiPropertyOptional({ example: "#2563EB" })
  @IsOptional()
  @IsHexColor()
  light_dominante?: string;

  @ApiPropertyOptional({ example: "#10B981" })
  @IsOptional()
  @IsHexColor()
  light_exito?: string;

  @ApiPropertyOptional({ example: "#D97706" })
  @IsOptional()
  @IsHexColor()
  light_advertencia?: string;

  @ApiPropertyOptional({ example: "#EF4444" })
  @IsOptional()
  @IsHexColor()
  light_critico?: string;

  // Dark mode colors
  @ApiPropertyOptional({ example: "#0F172A" })
  @IsOptional()
  @IsHexColor()
  dark_fondo_base?: string;

  @ApiPropertyOptional({ example: "#1E293B" })
  @IsOptional()
  @IsHexColor()
  dark_contenedores?: string;

  @ApiPropertyOptional({ example: "#F8FAFC" })
  @IsOptional()
  @IsHexColor()
  dark_texto_principal?: string;

  @ApiPropertyOptional({ example: "#38BDF8" })
  @IsOptional()
  @IsHexColor()
  dark_dominante?: string;

  @ApiPropertyOptional({ example: "#34D399" })
  @IsOptional()
  @IsHexColor()
  dark_exito?: string;

  @ApiPropertyOptional({ example: "#FBBF24" })
  @IsOptional()
  @IsHexColor()
  dark_advertencia?: string;

  @ApiPropertyOptional({ example: "#F87171" })
  @IsOptional()
  @IsHexColor()
  dark_critico?: string;
}
