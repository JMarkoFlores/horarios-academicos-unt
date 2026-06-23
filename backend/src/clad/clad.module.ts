import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CladController } from './clad.controller';
import { CladService } from './clad.service';
import { DeclaracionClad } from '../entities/declaracion-clad.entity';
import { DetalleClad } from '../entities/detalle-clad.entity';
import { Docente } from '../entities/docente.entity';
import { HorariosModule } from '../horarios/horarios.module';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { DeclaracionCargaHoraria } from '../entities/declaracion-carga-horaria.entity';
import { ConfiguracionGeneral } from '../entities/configuracion-general.entity';
import { AuditoriaModule } from '../modules/auditoria/auditoria.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeclaracionClad, DetalleClad, Docente, HorarioAsignado, DeclaracionCargaHoraria, ConfiguracionGeneral]),
    ConfiguracionModule,
    AuditoriaModule,
    HorariosModule,
  ],
  controllers: [CladController],
  providers: [CladService],
  exports: [CladService],
})
export class CladModule {}
