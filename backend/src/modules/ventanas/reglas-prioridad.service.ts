import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReglasPrioridadGlobales, ReglaPrioridad } from '../../entities/reglas-prioridad.entity';
import { Logger } from '@nestjs/common';

@Injectable()
export class ReglasPrioridadGlobalesService {
  private readonly logger = new Logger(ReglasPrioridadGlobalesService.name);

  constructor(
    @InjectRepository(ReglasPrioridadGlobales)
    private readonly reglasRepo: Repository<ReglasPrioridadGlobales>,
  ) {}

  async obtenerReglasActivas(): Promise<ReglasPrioridadGlobales> {
    let reglas = await this.reglasRepo.findOne({
      where: { activo: true },
      order: { creado_en: 'DESC' },
    });

    if (!reglas) {
      this.logger.log('No hay reglas de prioridad activas, creando reglas por defecto');
      const reglasPorDefecto: ReglaPrioridad[] = [
        { campo: 'tipo_docente', orden: 'DESC' },
        { campo: 'categoria', orden: 'DESC' },
        { campo: 'modalidad', orden: 'DESC' },
        { campo: 'fecha_ingreso', orden: 'ASC' },
        { campo: 'horas_asignadas', orden: 'ASC' },
        { campo: 'codigo', orden: 'ASC' },
        { campo: 'apellidos', orden: 'ASC' },
      ];
      reglas = this.reglasRepo.create({
        reglas: reglasPorDefecto,
        descripcion: 'Reglas de prioridad por defecto creadas automáticamente',
        activo: true,
      });
      await this.reglasRepo.save(reglas);
      this.logger.log('Reglas por defecto creadas');
    }

    return reglas;
  }

  async actualizarReglas(reglas: any[], descripcion?: string): Promise<ReglasPrioridadGlobales> {
    this.logger.log(`[actualizarReglas] Actualizando reglas de prioridad:`, reglas);

    // Desactivar todas las reglas existentes
    await this.reglasRepo.update({ activo: true }, { activo: false });

    // Crear nuevas reglas
    const nuevasReglas = this.reglasRepo.create({
      reglas,
      descripcion: descripcion || 'Reglas de prioridad actualizadas',
      activo: true,
    });

    const guardadas = await this.reglasRepo.save(nuevasReglas);
    this.logger.log(`[actualizarReglas] Reglas guardadas con ID: ${guardadas.id}`);

    return guardadas;
  }
}
