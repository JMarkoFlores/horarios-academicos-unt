import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, IsObject } from "class-validator";

export class ConfirmarSeleccionesDto {
  @ApiProperty()
  @IsString()
  sesionId: string;

  @ApiProperty()
  @IsInt()
  periodoId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  edicionDto?: {
    modoEdicion?: boolean;
    docenteId?: number;
    originalCursoId?: number;
    originalTipoClase?: string;
    originalGrupoId?: number;
  };
}
