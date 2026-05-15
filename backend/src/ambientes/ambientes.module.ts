import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ambiente } from '../entities/ambiente.entity';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { AmbientesService } from './ambientes.service';
import { AmbientesController } from './ambientes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ambiente, HorarioAsignado])],
  controllers: [AmbientesController],
  providers: [AmbientesService],
  exports: [AmbientesService],
})
export class AmbientesModule {}
