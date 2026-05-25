import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { AuditoriaHorario } from "../entities/auditoria-horario.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Docente } from "../entities/docente.entity";
import { Curso } from "../entities/curso.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { Grupo } from "../entities/grupo.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Preasignacion } from "../entities/preasignacion.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { CursoAmbiente } from "../entities/curso-ambiente.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { AsignacionService } from "./asignacion.service";
import { HorariosService } from "./horarios.service";
import { HorariosGateway } from "./horarios.gateway";
import { HorariosController } from "./horarios.controller";
import { ValidadorHorarioService } from "./validador-horario.service";
import { GeneracionAutomaticaService } from "./generacion-automatica.service";
import { DeteccionConflictosService } from "./deteccion-conflictos.service";
import { ICalendarService } from "./icalendar.service";
import { DocentesModule } from "../docentes/docentes.module";
import { CommonModule } from "../common/common.module";
import { AuditoriaModule } from "../modules/auditoria/auditoria.module";
import { ValidacionesModule } from "../validaciones/validaciones.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HorarioAsignado,
      AuditoriaHorario,
      ConflictoAsignacion,
      Ambiente,
      Docente,
      Curso,
      Grupo,
      PeriodoAcademico,
      DisponibilidadDocente,
      Preasignacion,
      DocenteCurso,
      CursoAmbiente,
      ParametrosCarga,
    ]),
    DocentesModule,
    CommonModule,
    AuditoriaModule,
    ValidacionesModule,
  ],
  controllers: [HorariosController],
  providers: [
    AsignacionService,
    HorariosService,
    HorariosGateway,
    ValidadorHorarioService,
    GeneracionAutomaticaService,
    DeteccionConflictosService,
    ICalendarService,
  ],
  exports: [
    AsignacionService,
    HorariosService,
    HorariosGateway,
    ValidadorHorarioService,
    GeneracionAutomaticaService,
    DeteccionConflictosService,
    ICalendarService,
  ],
})
export class HorariosModule {}
