import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaHorario } from '../../entities/auditoria-horario.entity';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditoriaHorario])],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
