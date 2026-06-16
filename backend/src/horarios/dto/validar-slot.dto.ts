import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import { TipoClase } from "../../common/enums/tipo-clase.enum";

export class ValidarSlotDto {
  @ApiProperty({ description: "ID del docente" })
  @IsInt()
  docente_id: number;

  @ApiPropertyOptional({ description: "ID del curso" })
  @IsOptional()
  @IsInt()
  curso_id?: number;

  @ApiProperty({ description: "ID del grupo" })
  @IsInt()
  grupo_id: number;

  @ApiProperty({ description: "ID del ambiente principal" })
  @IsInt()
  ambiente_id: number;

  @ApiPropertyOptional({ description: "ID del ambiente de laboratorio" })
  @IsOptional()
  @IsInt()
  laboratorio_ambiente_id?: number;

  @ApiProperty({ description: "Período académico", example: "2026-I" })
  @IsString()
  periodo: string;

  @ApiProperty({ description: "Día de semana 1-5", minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  dia: number;

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

  @ApiProperty({ description: "Fecha exacta del slot", example: "2026-06-08" })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({
    description:
      "Indica si es una operación de edición de asignación existente",
  })
  @IsOptional()
  @IsBoolean()
  modoEdicion?: boolean;

  @ApiPropertyOptional({ description: "ID del curso original para exclusión" })
  @IsOptional()
  @IsInt()
  ignorarCursoId?: number;

  @ApiPropertyOptional({ description: "Tipo de clase original para exclusión" })
  @IsOptional()
  @IsEnum(TipoClase)
  ignorarTipoClase?: TipoClase;

  @ApiPropertyOptional({ description: "ID del grupo original para exclusión" })
  @IsOptional()
  @IsInt()
  ignorarGrupoId?: number;
}
