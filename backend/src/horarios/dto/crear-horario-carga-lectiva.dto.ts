import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, IsEnum, Min, Max, Matches } from "class-validator";
import { TipoClase } from "../../common/enums/tipo-clase.enum";

export class CrearHorarioCargaLectivaDto {
  @ApiProperty({ description: "ID de la asignación lectiva" })
  @IsInt()
  @Min(1)
  asignacion_lectiva_id: number;

  @ApiProperty({ description: "ID del ambiente" })
  @IsInt()
  @Min(1)
  ambiente_id: number;

  @ApiProperty({ description: "Día semana 1=Lun…7=Dom" })
  @IsInt()
  @Min(1)
  @Max(7)
  dia: number;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_inicio: string;

  @ApiProperty({ example: "10:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora_fin: string;
}
