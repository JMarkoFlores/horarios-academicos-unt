import { IsString, IsEmail, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ActualizarPerfilDto {
  @ApiPropertyOptional({ example: "Juan Pérez" })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: "juan@unt.edu.pe" })
  @IsEmail()
  @IsOptional()
  email?: string;
}
