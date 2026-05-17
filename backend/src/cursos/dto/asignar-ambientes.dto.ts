import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsArray, IsInt, ArrayNotEmpty } from "class-validator";
import { TipoClase } from "../../common/enums/tipo-clase.enum";

export class AsignarAmbientesDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ambiente_ids: number[];

  @ApiProperty({ enum: TipoClase, example: TipoClase.TEORIA })
  @IsEnum(TipoClase, { message: "tipo_clase inválido" })
  tipo_clase: TipoClase;
}
