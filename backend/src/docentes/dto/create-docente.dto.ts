import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEmail,
  IsEnum,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsNotEmpty,
  Matches,
} from "class-validator";
import { CategoriaDocente } from "../../common/enums/categoria-docente.enum";
import { TipoDocente } from "../../common/enums/tipo-docente.enum";
import { ModalidadDocente } from "../../common/enums/modalidad-docente.enum";

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

  @ApiProperty({ enum: TipoDocente, example: TipoDocente.ORDINARIO })
  @IsEnum(TipoDocente, { message: "Tipo de docente inválido" })
  tipo_docente: TipoDocente;

  @ApiProperty({ enum: CategoriaDocente, example: CategoriaDocente.PRINCIPAL })
  @IsEnum(CategoriaDocente, { message: "Categoría inválida" })
  categoria: CategoriaDocente;

  @ApiProperty({
    enum: ModalidadDocente,
    example: ModalidadDocente.TIEMPO_COMPLETO_40,
  })
  @IsEnum(ModalidadDocente, { message: "Modalidad inválida" })
  modalidad: ModalidadDocente;

  @ApiProperty({ example: "2000-03-01" })
  @IsDateString({}, { message: "Fecha de ingreso inválida (YYYY-MM-DD)" })
  fecha_ingreso: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt({ message: "Las horas asignadas deben ser un número entero" })
  @Min(0, { message: "Las horas asignadas no pueden ser negativas" })
  horas_asignadas?: number;
}
