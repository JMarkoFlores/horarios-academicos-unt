import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { Docente } from "../entities/docente.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { Departamento } from "../entities/departamento.entity";
import { Facultad } from "../entities/facultad.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { AsignacionLectiva } from "../entities/asignacion-lectiva.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { DeclaracionObservacion } from "../entities/declaracion-observacion.entity";
import { DeclaracionJurada } from "../entities/declaracion-jurada.entity";
import { CargaAdicional } from "../entities/carga-adicional.entity";
import { Usuario } from "../entities/usuario.entity";
import { DeclaracionCargaHorariaService } from "./declaracion-carga-horaria.service";
import { DeclaracionCargaHorariaController } from "./declaracion-carga-horaria.controller";
import { CargaAdicionalService } from "./carga-adicional.service";
import { CargaAdicionalController } from "./carga-adicional.controller";
import { AuditoriaModule } from "../modules/auditoria/auditoria.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeclaracionCargaHoraria,
      Docente,
      DocenteCurso,
      Departamento,
      Facultad,
      PeriodoAcademico,
      HorarioAsignado,
      AsignacionLectiva,
      ParametrosCarga,
      DeclaracionObservacion,
      DeclaracionJurada,
      CargaAdicional,
      Usuario,
    ]),
    AuditoriaModule,
  ],
  controllers: [DeclaracionCargaHorariaController, CargaAdicionalController],
  providers: [DeclaracionCargaHorariaService, CargaAdicionalService],
  exports: [DeclaracionCargaHorariaService, CargaAdicionalService],
})
export class DeclaracionCargaHorariaModule {}
