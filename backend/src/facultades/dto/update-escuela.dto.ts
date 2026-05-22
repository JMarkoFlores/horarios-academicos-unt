import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateEscuelaDto } from "./create-escuela.dto";

export class UpdateEscuelaDto extends PartialType(CreateEscuelaDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
