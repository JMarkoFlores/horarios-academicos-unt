import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEmail,
  IsEnum,
  IsDateString,
  IsOptional,
  MaxLength,
  IsNotEmpty,
  Matches,
} from "class-validator";
import { CategoriaDocente } from "../../common/enums/categoria-docente.enum";
import { TipoContrato } from "../../common/enums/tipo-contrato.enum";

export class CreateDocenteDto {
  @ApiProperty({ example: "DOC001" })
  @IsString()
  @IsNotEmpty({ message: "El código no puede estar vacío" })
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: "Juan Carlos" })
  @IsString()
  @IsNotEmpty({ message: "Los nombres no pueden estar vacíos" })
  @MaxLength(150)
  nombres: string;

  @ApiProperty({ example: "Pérez Rodríguez" })
  @IsString()
  @IsNotEmpty({ message: "Los apellidos no pueden estar vacíos" })
  @MaxLength(150)
  apellidos: string;

  @ApiProperty({ example: "jperez@unitru.edu.pe" })
  @IsEmail({}, { message: "Email inválido" })
  @IsNotEmpty({ message: "El email no puede estar vacío" })
  @MaxLength(150)
  email: string;

  @ApiPropertyOptional({ example: "944123456" })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-]{7,20}$/, { message: "Formato de teléfono inválido" })
  telefono?: string;

  @ApiProperty({ enum: CategoriaDocente, example: CategoriaDocente.PRINCIPAL })
  @IsEnum(CategoriaDocente, { message: "Categoría inválida" })
  categoria: CategoriaDocente;

  @ApiProperty({ enum: TipoContrato, example: TipoContrato.NOMBRADO })
  @IsEnum(TipoContrato, { message: "Tipo de contrato inválido" })
  tipo_contrato: TipoContrato;

  @ApiProperty({ example: "2000-03-01" })
  @IsDateString({}, { message: "Fecha de ingreso inválida (YYYY-MM-DD)" })
  fecha_ingreso: string;
}
