import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { DiaActivo } from "../entities/dia-activo.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { ValidacionesService } from "./validaciones.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      HorarioAsignado,
      DisponibilidadDocente,
      TurnoHorario,
      DiaActivo,
      PeriodoAcademico,
      RestriccionInstitucional,
    ]),
  ],
  providers: [ValidacionesService],
  exports: [ValidacionesService],
})
export class ValidacionesModule {}
