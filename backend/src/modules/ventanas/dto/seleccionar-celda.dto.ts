import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Matches } from "class-validator";
import { TipoClase } from "../../../common/enums/tipo-clase.enum";

export class SeleccionarCeldaDto {
  @ApiProperty()
  @IsString()
  ventanaId: string;

  @ApiProperty()
  @IsString()
  sesionId: string;

  @ApiProperty()
  @IsInt()
  docenteId: number;

  @ApiProperty()
  @IsInt()
  cursoId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  grupoId?: number;

  @ApiProperty({ enum: TipoClase })
  @IsString()
  tipoClase: TipoClase;

  @ApiProperty()
  @IsInt()
  ambienteId: number;

  @ApiProperty()
  @IsInt()
  dia: number;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  horaInicio: string;

  @ApiProperty({ example: "10:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  horaFin: string;

  @ApiProperty({ example: "2026-I" })
  @IsString()
  periodo: string;

  @ApiPropertyOptional({ default: false, description: "Permitir superposiciones de horario" })
  @IsOptional()
  permitirSuperposiciones?: boolean;
}
