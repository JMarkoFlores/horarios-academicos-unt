import { ApiProperty } from "@nestjs/swagger";
import {
  IsInt,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
  Min,
  Max,
  Matches,
  IsString,
} from "class-validator";
import { Type } from "class-transformer";

export class GuardarBatchCargaLectivaDto {
  @ApiProperty({ description: "ID de la asignación lectiva" })
  @IsInt()
  @Min(1)
  asignacion_lectiva_id: number;

  @ApiProperty({ description: "Lista completa de bloques horarios" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BloqueHorarioDto)
  bloques: BloqueHorarioDto[];
}

export class BloqueHorarioDto {
  @ApiProperty({ description: "ID del horario en BD (null para nuevos)" })
  @IsInt()
  @IsOptional()
  horario_id?: number;

  @ApiProperty({
    description: "ID del ambiente (requerido para CREATE/UPDATE)",
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  ambiente_id?: number;

  @ApiProperty({ description: "Día 1-7 (requerido para CREATE/UPDATE)" })
  @IsInt()
  @Min(1)
  @Max(7)
  @IsOptional()
  dia?: number;

  @ApiProperty({
    example: "08:00",
    description: "Hora inicio (requerido para CREATE/UPDATE)",
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  @IsOptional()
  hora_inicio?: string;

  @ApiProperty({
    example: "10:00",
    description: "Hora fin (requerido para CREATE/UPDATE)",
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  @IsOptional()
  hora_fin?: string;

  @ApiProperty({ description: "Operación: CREATE, UPDATE, DELETE" })
  @IsEnum(["CREATE", "UPDATE", "DELETE"])
  operacion: "CREATE" | "UPDATE" | "DELETE";
}
