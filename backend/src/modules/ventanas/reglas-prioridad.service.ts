import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReglasPrioridadGlobales } from '../../entities/reglas-prioridad.entity';
import { Logger } from '@nestjs/common';

@Injectable()
export class ReglasPrioridadGlobalesService {
  private readonly logger = new Logger(ReglasPrioridadGlobalesService.name);

  constructor(
    @InjectRepository(ReglasPrioridadGlobales)
    private readonly reglasRepo: Repository<ReglasPrioridadGlobales>,
  ) {}

  async obtenerReglasActivas(): Promise<ReglasPrioridadGlobales> {
    const reglas = await this.reglasRepo.findOne({
      where: { activo: true },
      order: { creado_en: 'DESC' },
    });

    if (!reglas) {
      throw new NotFoundException('No hay reglas de prioridad activas');
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
