import { IsEnum, IsInt, IsOptional } from "class-validator";
import { TipoClase } from "../../common/enums/tipo-clase.enum";

export class CreateCursoAmbienteDto {
  @IsInt()
  cursoId: number;

  @IsInt()
  ambienteId: number;

  @IsEnum(TipoClase)
  tipo_clase: TipoClase;
}
