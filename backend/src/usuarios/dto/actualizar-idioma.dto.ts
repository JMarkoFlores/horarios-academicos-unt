import { IsString, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

const supportedLanguages = ["es", "en", "pt"];

export class ActualizarIdiomaDto {
  @ApiProperty({ example: "es", enum: supportedLanguages })
  @IsString()
  @IsIn(supportedLanguages, { message: "Idioma no soportado" })
  idioma: string;
}
