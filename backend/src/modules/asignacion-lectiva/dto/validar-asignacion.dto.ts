import { ApiProperty } from "@nestjs/swagger";
import {
  IsInt,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { TipoClase } from "../../../common/enums/tipo-clase.enum";

export class ValidarAsignacionDto {
  @ApiProperty({ description: "ID del docente" })
  @IsInt()
  docente_id: number;

  @ApiProperty({ description: "ID del curso plan" })
  @IsInt()
  curso_plan_id: number;

  @ApiProperty({ description: "ID del grupo", required: false })
  @IsOptional()
  @IsInt()
  grupo_id?: number;

  @ApiProperty({ description: "ID del ambiente" })
  @IsInt()
  ambiente_id: number;

  @ApiProperty({ description: "ID del periodo académico" })
  @IsInt()
  periodo_id: number;

  @ApiProperty({ description: "Día de la semana (1-6)" })
  @IsNumber()
  @Min(1)
  @Max(6)
  dia: number;

  @ApiProperty({ description: "Hora de inicio (HH:MM)" })
  @IsString()
  hora_inicio: string;

  @ApiProperty({ description: "Hora de fin (HH:MM)" })
  @IsString()
  hora_fin: string;

  @ApiProperty({ enum: TipoClase, description: "Tipo de clase" })
  @IsEnum(TipoClase)
  tipo_clase: TipoClase;

  @ApiProperty({ description: "Sección" })
  @IsString()
  seccion: string;

  @ApiProperty({ description: "Número de alumnos" })
  @IsInt()
  @Min(1)
  nro_alumnos: number;
}
