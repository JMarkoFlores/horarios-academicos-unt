import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

class HorarioInput {
  @IsString()
  dia: string;

  @IsString()
  hora_inicio: string;

  @IsString()
  hora_fin: string;
}

class ActividadNoLectivaInput {
  @IsInt()
  id: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  detalle?: string;

  @IsOptional()
  horas?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => HorarioInput)
  horarios?: HorarioInput[];

  @IsOptional()
  @IsBoolean()
  horasManual?: boolean;
}

class CargaNoLectivaInput {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ActividadNoLectivaInput)
  actividades?: ActividadNoLectivaInput[];
}

export class GuardarDeclaracionDto {
  @ApiProperty({ description: "ID del docente" })
  @IsInt()
  @IsNotEmpty()
  docente_id: number;

  @ApiProperty({ description: "Código del período académico (ej: 2026-I)" })
  @IsString()
  @IsNotEmpty()
  periodo: string;

  @ApiPropertyOptional({ description: "Estado de la declaración" })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ description: "Carga no lectiva (actividades con horarios)" })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CargaNoLectivaInput)
  carga_no_lectiva?: CargaNoLectivaInput;

  @ApiPropertyOptional({ description: "Sede" })
  @IsOptional()
  @IsString()
  sede?: string;

  @ApiPropertyOptional({ description: "Observaciones" })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
