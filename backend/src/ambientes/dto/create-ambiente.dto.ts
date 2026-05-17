import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  MaxLength,
} from "class-validator";
import { TipoAmbiente } from "../../common/enums/tipo-ambiente.enum";

export class CreateAmbienteDto {
  @ApiProperty({ example: "A-101" })
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: "Aula A-101" })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ enum: TipoAmbiente, example: TipoAmbiente.AULA })
  @IsEnum(TipoAmbiente, { message: "Tipo de ambiente inválido" })
  tipo: TipoAmbiente;

  @ApiProperty({ example: 35 })
  @IsInt()
  @Min(1)
  capacidad: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  piso?: number;

  @ApiPropertyOptional({ example: "Pabellón A" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  pabellon?: string;

  @ApiPropertyOptional({ example: "30 PCs, proyector" })
  @IsOptional()
  @IsString()
  equipamiento?: string;
}
