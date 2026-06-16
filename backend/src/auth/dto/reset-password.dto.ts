import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ example: "NuevaClave456!" })
  @IsString()
  @MinLength(8)
  password_nueva: string;

  @ApiProperty({ example: "NuevaClave456!" })
  @IsString()
  confirmar_password: string;
}
