import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ObservarDeclaracionDto {
  @ApiProperty({
    example: "Falta detalle en las actividades de investigación.",
    description: "Texto de la observación (obligatorio)",
  })
  @IsNotEmpty({ message: "La observación no puede estar vacía" })
  @IsString({ message: "La observación debe ser texto" })
  @MinLength(10, {
    message: "La observación debe tener al menos 10 caracteres",
  })
  observacion: string;
}
