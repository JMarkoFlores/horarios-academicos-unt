import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString } from "class-validator";

export class QueryPreasignacionDto {
  @ApiPropertyOptional({ example: "2026-I" })
  @IsOptional()
  @IsString()
  periodo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  docente_id?: number;
}
