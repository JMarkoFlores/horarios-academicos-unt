import { PartialType } from "@nestjs/mapped-types";
import { CreateAsignacionLectivaDto } from "./create-asignacion-lectiva.dto";

export class UpdateAsignacionLectivaDto extends PartialType(
  CreateAsignacionLectivaDto,
) {}
