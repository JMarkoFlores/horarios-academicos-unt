import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNumber, IsNotEmpty } from "class-validator";

export class PreAsignarDocentesDto {
  @ApiProperty({
    description: "Array de IDs de docentes a pre-asignar a la cola",
    example: [123, 456, 789],
    isArray: true,
    type: Number,
  })
  @IsArray()
  @IsNotEmpty()
  docentes_ids: number[];
}
