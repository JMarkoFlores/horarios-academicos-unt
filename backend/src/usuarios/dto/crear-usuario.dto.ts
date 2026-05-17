import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RolUsuario } from '../../common/enums/rol-usuario.enum';

export class CrearUsuarioDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'juan@unt.edu.pe' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Clave123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: RolUsuario })
  @IsEnum(RolUsuario)
  rol: RolUsuario;
}
