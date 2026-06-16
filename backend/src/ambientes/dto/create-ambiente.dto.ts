import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
  MaxLength,
  MinLength,
} from "class-validator";
import { TipoAmbiente } from "../../common/enums/tipo-ambiente.enum";
import { EstadoAmbiente } from "../../common/enums/estado-ambiente.enum";

export class CreateAmbienteDto {
  @ApiProperty({ example: "A-101" })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: "Aula A-101" })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ enum: TipoAmbiente, example: TipoAmbiente.AULA })
  @IsEnum(TipoAmbiente, { message: "Tipo de ambiente inválido" })
  tipo: TipoAmbiente;

  @ApiProperty({ example: 35 })
  @IsInt()
  @Min(1)
  @Max(500)
  capacidad: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(-2)
  @Max(20)
  piso?: number;

  @ApiPropertyOptional({ example: "Pabellón A" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  pabellon?: string;

  @ApiPropertyOptional({ example: "Campus Central" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sede?: string;

  @ApiPropertyOptional({ example: "Proyector, 30 PCs, Aire acondicionado" })
  @IsOptional()
  @IsString()
  equipamiento?: string;

  @ApiPropertyOptional({ enum: EstadoAmbiente, example: EstadoAmbiente.ACTIVO })
  @IsOptional()
  @IsEnum(EstadoAmbiente, { message: "Estado de ambiente inválido" })
  estado?: EstadoAmbiente;

  @ApiPropertyOptional({
    description: "Estado activo/inactivo (deprecated, usar estado)",
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ example: "Edificio de Ingeniería" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  edificio?: string;

  @ApiPropertyOptional({ example: -8.1116 })
  @IsOptional()
  @IsNumber()
  coordX?: number;

  @ApiPropertyOptional({ example: -79.0287 })
  @IsOptional()
  @IsNumber()
  coordY?: number;
}
