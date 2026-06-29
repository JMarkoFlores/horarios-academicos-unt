import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEmail,
  IsEnum,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
  Matches,
} from "class-validator";
import { CategoriaDocente } from "../../common/enums/categoria-docente.enum";
import { TipoDocente } from "../../common/enums/tipo-docente.enum";
import { ModalidadDocente } from "../../common/enums/modalidad-docente.enum";

export class CreateDocenteDto {
  @ApiProperty({ example: "DOC001", description: "Código único del docente. Se autogenera si se envía vacío" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigo?: string;

  @ApiProperty({
    example: "12345678",
    description: "DNI del docente (8 dígitos)",
  })
  @IsString()
  @IsNotEmpty({ message: "El DNI es obligatorio" })
  @Matches(/^\d{8}$/, { message: "El DNI debe tener exactamente 8 dígitos" })
  @MaxLength(15)
  dni: string;

  @ApiProperty({
    example: 4247,
    description: "Código IBM único de 4 dígitos",
  })
  @IsNotEmpty({ message: "El IBM es obligatorio" })
  @IsInt({ message: "El IBM debe ser un número entero" })
  @Min(1000, { message: "El IBM debe tener 4 dígitos" })
  @Max(9999, { message: "El IBM debe tener 4 dígitos" })
  ibm: number;

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

  @ApiProperty({ example: "jperez@unt.edu.pe" })
  @IsEmail({}, { message: "Email inválido" })
  @Matches(/@unt\.edu\.pe$/, { message: "El email debe ser del dominio @unt.edu.pe" })
  @IsNotEmpty({ message: "El email no puede estar vacío" })
  @MaxLength(150)
  email: string;

  @ApiPropertyOptional({ example: "944123456" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{9}$/, { message: "El teléfono debe tener exactamente 9 dígitos" })
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

  @ApiPropertyOptional({ example: 12, description: "ID de la facultad" })
  @IsOptional()
  @IsInt({ message: "La facultad debe ser un número entero" })
  @Min(1, { message: "La facultad debe ser mayor a 0" })
  facultad_id?: number;

  @ApiPropertyOptional({ example: 34, description: "ID del departamento" })
  @IsOptional()
  @IsInt({ message: "El departamento debe ser un número entero" })
  @Min(1, { message: "El departamento debe ser mayor a 0" })
  departamento_id?: number;

  @ApiPropertyOptional({ example: 56, description: "ID del usuario asociado" })
  @IsOptional()
  @IsInt({ message: "El usuario debe ser un número entero" })
  @Min(1, { message: "El usuario debe ser mayor a 0" })
  usuario_id?: number;
}
