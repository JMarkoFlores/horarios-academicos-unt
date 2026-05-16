import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({
    example: "admin@unitru.edu.pe",
    description: "Correo institucional",
  })
  @IsEmail({}, { message: "El email debe ser una dirección válida" })
  email: string;

  @ApiProperty({
    example: "Admin123!",
    description: "Contraseña (mínimo 6 caracteres)",
  })
  @IsString()
  @MinLength(6, { message: "La contraseña debe tener al menos 6 caracteres" })
  password: string;
}
