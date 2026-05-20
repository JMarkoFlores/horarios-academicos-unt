import { PartialType } from "@nestjs/swagger";
import { CreateCursoAmbienteDto } from "./create-curso-ambiente.dto";

export class UpdateCursoAmbienteDto extends PartialType(CreateCursoAmbienteDto) {}
