import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from "class-validator";

export class CreateCursoDto {
  @ApiProperty({ example: "CS101" })
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: "Programación I" })
  @IsString()
  @MaxLength(150)
  nombre: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  creditos: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(0)
  horas_teoria: number;

  @ApiPropertyOptional({ example: 2, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  horas_laboratorio?: number = 0;

  @ApiProperty({ example: 1, minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  ciclo: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  tiene_laboratorio: boolean;

  @ApiPropertyOptional({ example: "CS100" })
  @IsOptional()
  @IsString()
  prerequisitos?: string;
}
