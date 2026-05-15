import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Curso } from '../entities/curso.entity';
import { Ambiente } from '../entities/ambiente.entity';
import { CursosService } from './cursos.service';
import { CursosController } from './cursos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Curso, Ambiente])],
  controllers: [CursosController],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule {}
