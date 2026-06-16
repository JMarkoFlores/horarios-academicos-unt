import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditoriaHorario } from "../../entities/auditoria-horario.entity";
import { AuditoriaCarga } from "../../entities/auditoria-carga.entity";
import { AuditoriaController } from "./auditoria.controller";
import { AuditoriaService } from "./auditoria.service";

@Module({
  imports: [TypeOrmModule.forFeature([AuditoriaHorario, AuditoriaCarga])],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
