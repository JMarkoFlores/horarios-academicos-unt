import { PartialType } from "@nestjs/swagger";
import { CreateVentanaDto } from "./create-ventana.dto";

export class UpdateVentanaDto extends PartialType(CreateVentanaDto) {}
