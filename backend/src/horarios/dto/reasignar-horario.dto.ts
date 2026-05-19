import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsString, IsOptional, Min, Matches, Max } from "class-validator";

export class ReasignarHorarioDto {
  @ApiPropertyOptional({
    description: "Día semana 1=Lun…5=Vie",
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  dia_semana: number;

  @ApiPropertyOptional({ example: "08:00" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_inicio: string;

  @ApiPropertyOptional({ example: "10:00" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_fin: string;

  @ApiPropertyOptional({ description: "ID del nuevo ambiente" })
  @IsOptional()
  @IsInt()
  ambiente_id?: number;

  @ApiPropertyOptional({ description: "Motivo de reasignación" })
  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsInt()
  usuario_id?: number;

  @IsOptional()
  @IsString()
  ip?: string;
}
