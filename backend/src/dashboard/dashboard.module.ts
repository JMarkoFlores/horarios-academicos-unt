import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { ConflictoAsignacion } from '../entities/conflicto-asignacion.entity';
import { Docente } from '../entities/docente.entity';
import { Ambiente } from '../entities/ambiente.entity';
import { Curso } from '../entities/curso.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DashboardGateway } from './dashboard.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HorarioAsignado,
      ConflictoAsignacion,
      Docente,
      Ambiente,
      Curso,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardGateway],
  exports: [DashboardService, DashboardGateway],
})
export class DashboardModule {}
