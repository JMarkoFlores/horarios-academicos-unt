import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateDepartamentoDto } from "./create-departamento.dto";

export class UpdateDepartamentoDto extends PartialType(CreateDepartamentoDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
