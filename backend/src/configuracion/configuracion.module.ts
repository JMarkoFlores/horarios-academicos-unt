import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { DiaNoLaborable } from "../entities/dia-no-laborable.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { DiaActivo } from "../entities/dia-activo.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { ConfiguracionGeneral } from "../entities/configuracion-general.entity";
import { ConfiguracionService } from "./configuracion.service";
import { ConfiguracionController } from "./configuracion.controller";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RestriccionInstitucional,
      DiaNoLaborable,
      TurnoHorario,
      DiaActivo,
      ParametrosCarga,
      ConfiguracionGeneral,
    ]),
    CommonModule,
  ],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
