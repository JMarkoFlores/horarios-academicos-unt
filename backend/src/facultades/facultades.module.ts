import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Facultad } from "../entities/facultad.entity";
import { Escuela } from "../entities/escuela.entity";
import { Departamento } from "../entities/departamento.entity";
import { Usuario } from "../entities/usuario.entity";
import { FacultadesService } from "./facultades.service";
import { FacultadesController } from "./facultades.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Facultad, Escuela, Departamento, Usuario])],
  controllers: [FacultadesController],
  providers: [FacultadesService],
  exports: [FacultadesService],
})
export class FacultadesModule {}
