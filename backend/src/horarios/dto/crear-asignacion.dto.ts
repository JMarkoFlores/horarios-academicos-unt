import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsString,
  IsEnum,
  IsOptional,
  Min,
  Max,
  Matches,
} from "class-validator";
import { TipoClase } from "../../common/enums/tipo-clase.enum";

export class CrearAsignacionDto {
  @ApiProperty({ description: "ID del docente" })
  @IsInt()
  docente_id: number;

  @ApiProperty({ description: "ID del curso" })
  @IsInt()
  curso_id: number;

  @ApiProperty({ description: "ID del ambiente" })
  @IsInt()
  ambiente_id: number;

  @ApiPropertyOptional({ description: "ID del grupo (opcional)" })
  @IsOptional()
  @IsInt()
  grupo_id?: number;

  @ApiProperty({
    description: "Día semana 1=Lun…5=Vie",
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  dia_semana: number;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_inicio: string;

  @ApiProperty({ example: "10:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_fin: string;

  @ApiProperty({ enum: TipoClase })
  @IsEnum(TipoClase)
  tipo_clase: TipoClase;

  @ApiProperty({ example: "2026-I" })
  @IsString()
  periodo_academico: string;
}
