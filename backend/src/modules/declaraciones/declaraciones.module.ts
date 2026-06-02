import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Docente } from '../../entities/docente.entity';
import { DeclaracionesController } from './declaraciones.controller';
import { DeclaracionesService } from './declaraciones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Docente])],
  controllers: [DeclaracionesController],
  providers: [DeclaracionesService],
  exports: [DeclaracionesService],
})
export class DeclaracionesModule {}
