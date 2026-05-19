import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import { TipoClase } from "../../../common/enums/tipo-clase.enum";

export class CreatePreasignacionDto {
  @ApiProperty()
  @IsInt()
  docente_id: number;

  @ApiProperty()
  @IsInt()
  curso_id: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  grupo_id?: number;

  @ApiPropertyOptional({ enum: TipoClase })
  @IsOptional()
  @IsEnum(TipoClase)
  tipo_clase?: TipoClase;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  dia?: number;

  @ApiPropertyOptional({ example: "08:00" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_inicio?: string;

  @ApiPropertyOptional({ example: "10:00" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_fin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  ambiente_id?: number;

  @ApiProperty({ example: "2026-I" })
  @IsString()
  periodo: string;

  @ApiProperty()
  @IsString()
  motivo: string;
}
