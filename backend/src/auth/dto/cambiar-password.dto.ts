import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CambiarPasswordDto {
  @ApiProperty({ example: "Admin123!" })
  @IsString()
  password_actual: string;

  @ApiProperty({ example: "NuevaClave456!" })
  @IsString()
  @MinLength(8)
  password_nueva: string;

  @ApiProperty({ example: "NuevaClave456!" })
  @IsString()
  confirmar_password: string;
}
