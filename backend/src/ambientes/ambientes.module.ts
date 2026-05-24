import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Ambiente } from "../entities/ambiente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { AmbientesService } from "./ambientes.service";
import { AmbientesController } from "./ambientes.controller";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Ambiente, HorarioAsignado, PeriodoAcademico]),
  ],
  controllers: [AmbientesController],
  providers: [AmbientesService],
  exports: [AmbientesService],
})
export class AmbientesModule {}
