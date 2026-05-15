import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisponibilidadDocente } from '../entities/disponibilidad-docente.entity';
import { RestriccionInstitucional } from '../entities/restriccion-institucional.entity';
import { PeriodoAcademico } from '../entities/periodo-academico.entity';
import { Docente } from '../entities/docente.entity';
import { DisponibilidadService } from './disponibilidad.service';
import { DisponibilidadController } from './disponibilidad.controller';
import { PeriodosController } from './periodos.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DisponibilidadDocente,
      RestriccionInstitucional,
      PeriodoAcademico,
      Docente,
    ]),
  ],
  controllers: [DisponibilidadController, PeriodosController],
  providers: [DisponibilidadService],
  exports: [DisponibilidadService],
})
export class DisponibilidadModule {}
