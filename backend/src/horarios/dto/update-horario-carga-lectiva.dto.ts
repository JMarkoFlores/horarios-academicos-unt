import { PartialType, OmitType } from "@nestjs/swagger";
import { CrearHorarioCargaLectivaDto } from "./crear-horario-carga-lectiva.dto";

export class UpdateHorarioCargaLectivaDto extends PartialType(
  OmitType(CrearHorarioCargaLectivaDto, ["asignacion_lectiva_id"] as const),
) {}
