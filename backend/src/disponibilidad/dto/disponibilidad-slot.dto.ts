import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsBoolean, IsString, Min, Max, Matches } from "class-validator";

export class DisponibilidadSlotDto {
  @ApiProperty({
    description: "Día de la semana: 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie",
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  dia_semana: number;

  @ApiProperty({ example: "08:00", description: "Hora inicio HH:mm" })
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, {
    message: "hora_inicio debe tener formato HH:mm o HH:mm:ss",
  })
  hora_inicio: string;

  @ApiProperty({ example: "10:00", description: "Hora fin HH:mm" })
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, {
    message: "hora_fin debe tener formato HH:mm o HH:mm:ss",
  })
  hora_fin: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  disponible: boolean;
}
