import { IsInt, IsNotEmpty, IsEnum, IsOptional, IsString, Min } from "class-validator";
import { TipoClase } from "../../../common/enums/tipo-clase.enum";

export class CreateOfertaAcademicaDto {
  @IsInt()
  @IsNotEmpty()
  periodo_id: number;

  @IsInt()
  @IsNotEmpty()
  curso_plan_id: number;

  @IsEnum(TipoClase)
  @IsNotEmpty()
  tipo_clase: TipoClase;

  @IsInt()
  @Min(1)
  @IsOptional()
  secciones?: number;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
