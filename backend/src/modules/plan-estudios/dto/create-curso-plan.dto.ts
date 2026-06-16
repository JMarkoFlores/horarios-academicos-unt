import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { TipoCursoPlan } from "../../../common/enums/tipo-curso-plan.enum";

export class CreateCursoPlanDto {
  @ApiProperty()
  @IsInt()
  curso_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(10)
  ciclo: number;

  @ApiProperty({ enum: TipoCursoPlan, default: TipoCursoPlan.ESPECIALIDAD })
  @IsEnum(TipoCursoPlan)
  tipo_curso: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  horas_teoria?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  horas_practica?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  horas_laboratorio?: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(0)
  creditos: number;

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  prerequisitos?: number[];
}
