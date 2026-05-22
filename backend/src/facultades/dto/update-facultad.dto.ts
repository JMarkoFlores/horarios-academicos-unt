import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateFacultadDto } from "./create-facultad.dto";

export class UpdateFacultadDto extends PartialType(CreateFacultadDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
