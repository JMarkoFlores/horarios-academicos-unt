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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canal_telegram?: boolean;

  @ApiPropertyOptional({ example: "123456789" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telegram_chat_id?: string;
}
