import { PartialType } from "@nestjs/swagger";
import { CreateDeclaracionCargaHorariaDto } from "./create-declaracion-carga-horaria.dto";

export class UpdateDeclaracionCargaHorariaDto extends PartialType(
  CreateDeclaracionCargaHorariaDto,
) {}
