import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

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
  horarios?: any[];

  @IsOptional()
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
