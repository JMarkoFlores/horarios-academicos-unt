import {
  IsInt,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
} from "class-validator";

export class ConsultarDisponibilidadDto {
  @IsInt()
  @IsOptional()
  docente_id?: number;

  @IsInt()
  @IsOptional()
  ambiente_id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  periodo: string;
}
