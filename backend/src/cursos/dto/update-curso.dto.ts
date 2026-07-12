import { PartialType } from "@nestjs/swagger";
import { CreateCursoDto } from "./create-curso.dto";
import { IsOptional, IsInt, Min, IsString } from "class-validator";
import { TipoCursoPlan } from "../../common/enums/tipo-curso-plan.enum";

export class UpdateCursoDto extends PartialType(CreateCursoDto) {
  @IsOptional()
  @IsInt()
  @Min(1)
  departamento_id?: number;

  @IsOptional()
  @IsString()
  tipo_curso?: TipoCursoPlan;
}
