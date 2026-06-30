import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsOptional, IsArray } from "class-validator";

export class ChatRequestDto {
  @ApiProperty({ description: "Mensaje del usuario" })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ description: "Historial de la conversación", required: false })
  @IsOptional()
  @IsArray()
  history?: { role: "user" | "model"; parts: { text: string }[] }[];

  @ApiProperty({ description: "Rol del usuario para personalizar respuestas", required: false })
  @IsOptional()
  @IsString()
  userRole?: string;
}
