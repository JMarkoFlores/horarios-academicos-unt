import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ResolverConflictoDto {
  @ApiProperty({ description: "Motivo de resolución del conflicto" })
  @IsString()
  motivo: string;
}
