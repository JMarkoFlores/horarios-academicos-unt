import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsInt,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateCursoDto {
  @ApiProperty({ example: "CS101" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }) =>
    typeof value === "string" ? value.toUpperCase().trim() : value,
  )
  codigo: string;

  @ApiProperty({ example: "Programación I" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
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
  horas_practica?: number = 0;

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
