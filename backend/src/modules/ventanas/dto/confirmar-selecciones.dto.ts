import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString } from "class-validator";

export class ConfirmarSeleccionesDto {
  @ApiProperty()
  @IsString()
  sesionId: string;

  @ApiProperty()
  @IsInt()
  periodoId: number;
}
