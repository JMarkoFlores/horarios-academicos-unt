import {
  IsInt,
  IsOptional,
  IsArray,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class CeldaDto {
  @IsInt()
  dia_semana: number;

  @IsString()
  hora_inicio: string;

  @IsString()
  hora_fin: string;
}

export class UpdateAsignacionDto {
  @IsOptional()
  @IsInt()
  ambienteId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CeldaDto)
  celdasParaAgregar?: CeldaDto[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  celdasParaEliminar?: number[];
}
