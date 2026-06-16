import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { ColaDocentes } from "../entities/cola-docentes.entity";
import { VentanaAtencion } from "../entities/ventana-atencion.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Preasignacion } from "../entities/preasignacion.entity";
import { NotificacionDocente } from "../entities/notificacion-docente.entity";
import { PreferenciasNotificacion } from "../entities/preferencias-notificacion.entity";
import { DiaNoLaborable } from "../entities/dia-no-laborable.entity";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { Grupo } from "../entities/grupo.entity";
import { Docente } from "../entities/docente.entity";
import { Departamento } from "../entities/departamento.entity";
import { Escuela } from "../entities/escuela.entity";
import { Facultad } from "../entities/facultad.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { AuditLogService } from "./services/audit-log.service";
import { ValidacionesService } from "./services/validaciones.service";
import { ContextoAcademicoService } from "./services/contexto-academico.service";
import { ValidacionesController } from "./controllers/validaciones.controller";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      HorarioAsignado,
      DisponibilidadDocente,
      ColaDocentes,
      VentanaAtencion,
      ConflictoAsignacion,
      Preasignacion,
      NotificacionDocente,
      PreferenciasNotificacion,
      DiaNoLaborable,
      RestriccionInstitucional,
      Ambiente,
      Curso,
      Grupo,
      Docente,
      Departamento,
      Escuela,
      Facultad,
      ParametrosCarga,
    ]),
  ],
  controllers: [ValidacionesController],
  providers: [ValidacionesService, AuditLogService, ContextoAcademicoService],
  exports: [ValidacionesService, AuditLogService, ContextoAcademicoService],
})
export class CommonModule {}
