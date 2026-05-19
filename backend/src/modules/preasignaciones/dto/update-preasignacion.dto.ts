import { PartialType } from "@nestjs/swagger";
import { CreatePreasignacionDto } from "./create-preasignacion.dto";

export class UpdatePreasignacionDto extends PartialType(
  CreatePreasignacionDto,
) {}
