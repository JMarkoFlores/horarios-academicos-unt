import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class ConflictoDetalleDto {
  @ApiProperty() id: number;
  @ApiProperty() tipo: string;
  @ApiProperty() descripcion: string;
  @ApiProperty() created_at: Date;
}

export class DashboardAlertsDto {
  @ApiProperty() conflictos_activos: number;
  @ApiProperty({ type: [ConflictoDetalleDto] })
  conflictos_detalle: ConflictoDetalleDto[];
  @ApiProperty() docentes_pendientes: number;
  @ApiProperty() cursos_sin_asignar: number;
  @ApiProperty() timestamp: Date;
}
