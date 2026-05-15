import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grupo } from '../entities/grupo.entity';
import { PeriodoAcademico } from '../entities/periodo-academico.entity';
import { Curso } from '../entities/curso.entity';
import { GruposService } from './grupos.service';
import { GruposController } from './grupos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Grupo, PeriodoAcademico, Curso])],
  controllers: [GruposController],
  providers: [GruposService],
  exports: [GruposService],
})
export class GruposModule {}
