import { PartialType } from "@nestjs/swagger";
import { CreateCursoPlanDto } from "./create-curso-plan.dto";

export class UpdateCursoPlanDto extends PartialType(CreateCursoPlanDto) {}
