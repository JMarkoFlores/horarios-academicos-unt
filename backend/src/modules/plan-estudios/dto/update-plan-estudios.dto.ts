import { PartialType } from "@nestjs/swagger";
import { CreatePlanEstudiosDto } from "./create-plan-estudios.dto";

export class UpdatePlanEstudiosDto extends PartialType(CreatePlanEstudiosDto) {}
