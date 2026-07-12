import { IsString, IsEmail, IsOptional, ValidateIf } from "class-validator";
import { Transform } from "class-transformer";
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

  @ApiPropertyOptional({ example: "juan.personal@gmail.com", nullable: true })
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @ValidateIf((o) => o.email_alternativo !== null && o.email_alternativo !== "")
  email_alternativo?: string | null;
}
