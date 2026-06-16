import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpsertDiaActivoDto {
  @ApiProperty({
    example: 1,
    description: "Día de la semana: 1=Lunes … 7=Domingo",
  })
  @IsInt()
  @Min(1)
  @Max(7)
  dia_semana: number;

  @ApiProperty({ example: "Lunes" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  nombre: string;

  @ApiProperty({ example: true, description: "true = día con clases activo" })
  @IsBoolean()
  activo: boolean;
}
