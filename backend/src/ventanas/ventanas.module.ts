import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentanaAtencion } from '../entities/ventana-atencion.entity';
import { ColaDocentes } from '../entities/cola-docentes.entity';
import { SeleccionTemporal } from '../entities/seleccion-temporal.entity';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { Docente } from '../entities/docente.entity';
import { Ambiente } from '../entities/ambiente.entity';
import { VentanasService } from './ventanas.service';
import { VentanasController } from './ventanas.controller';
import { DocentesModule } from '../docentes/docentes.module';
import { HorariosModule } from '../horarios/horarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VentanaAtencion,
      ColaDocentes,
      SeleccionTemporal,
      HorarioAsignado,
      Docente,
      Ambiente,
    ]),
    DocentesModule,
    HorariosModule,
  ],
  controllers: [VentanasController],
  providers: [VentanasService],
  exports: [VentanasService],
})
export class VentanasModule {}
