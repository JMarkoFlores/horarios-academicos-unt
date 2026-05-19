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
  canal_telegram?: boolean;

  @ApiPropertyOptional({ example: "123456789" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telegram_chat_id?: string;

  @ApiPropertyOptional({ example: "docente@gmail.com" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  correo_alternativo?: string;
}
