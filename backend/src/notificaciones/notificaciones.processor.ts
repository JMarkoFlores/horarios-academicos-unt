import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';

@Processor('notificaciones')
export class NotificacionesProcessor {
  private readonly logger = new Logger(NotificacionesProcessor.name);

  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Process('recordatorio-24h')
  async handleRecordatorio24h(job: Job<{ docenteId: number; ventanaId: number }>) {
    this.logger.log(`Procesando recordatorio-24h: docente ${job.data.docenteId}`);
    await this.notificacionesService.procesarRecordatorio(job.data.docenteId, job.data.ventanaId, '24h');
  }

  @Process('recordatorio-15min')
  async handleRecordatorio15min(job: Job<{ docenteId: number; ventanaId: number }>) {
    this.logger.log(`Procesando recordatorio-15min: docente ${job.data.docenteId}`);
    await this.notificacionesService.procesarRecordatorio(job.data.docenteId, job.data.ventanaId, '15min');
  }

  @Process('horario-confirmado')
  async handleHorarioConfirmado(job: Job<{ docenteId: number; periodo: string }>) {
    this.logger.log(`Procesando horario-confirmado: docente ${job.data.docenteId}`);
    await this.notificacionesService.procesarHorarioConfirmado(job.data.docenteId, job.data.periodo);
  }
}
