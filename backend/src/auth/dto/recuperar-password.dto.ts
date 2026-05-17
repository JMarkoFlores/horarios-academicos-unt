import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecuperarPasswordDto {
  @ApiProperty({ example: 'admin@unt.edu.pe' })
  @IsEmail()
  email: string;
}
