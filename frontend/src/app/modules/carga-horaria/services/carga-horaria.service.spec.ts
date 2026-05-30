import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { CargaHorariaService } from './carga-horaria.service';
import {
  Docente,
  EstadoDeclaracion,
  FormatoItem,
  Semestre,
} from '../models/carga-horaria.models';

describe('CargaHorariaService', () => {
  let service: CargaHorariaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CargaHorariaService);
  });

  describe('getSemestres', () => {
    it('debe retornar un array con al menos 1 semestre', async () => {
      const semestres = await firstValueFrom(service.getSemestres());

      expect(Array.isArray(semestres)).toBeTrue();
      expect(semestres.length).toBeGreaterThan(0);
    });

    it('cada semestre debe tener id y nombre definidos', async () => {
      const semestres = await firstValueFrom(service.getSemestres());

      semestres.forEach((semestre: Semestre) => {
        expect(semestre.id).toBeDefined();
        expect(semestre.nombre).toBeDefined();
      });
    });
  });

  describe('getDocenteActual', () => {
    const propiedadesDocente: Array<keyof Docente> = [
      'id',
      'nombre',
      'ibm',
      'facultad',
      'departamento',
      'condicion',
      'categoria',
      'dedicacion',
    ];

    it('debe retornar un objeto con las 8 propiedades definidas', async () => {
      const docente = await firstValueFrom(service.getDocenteActual());

      propiedadesDocente.forEach((prop) => {
        expect(docente[prop])
          .withContext(`Propiedad ${String(prop)}`)
          .toBeDefined();
      });
    });
  });

  describe('getFormatos', () => {
    it('con semestreId válido debe retornar al menos un formato', async () => {
      const formatos = await firstValueFrom(service.getFormatos(1));

      expect(formatos.length).toBeGreaterThan(0);
    });

    it('con semestreId inexistente debe retornar array vacío', async () => {
      const formatos = await firstValueFrom(service.getFormatos(9999));

      expect(formatos).toEqual([]);
    });

    it('cada formato retornado debe tener un estado válido', async () => {
      const formatos = await firstValueFrom(service.getFormatos(1));
      const estadosValidos = Object.values(EstadoDeclaracion);

      formatos.forEach((formato: FormatoItem) => {
        expect(estadosValidos).toContain(formato.estado);
      });
    });
  });
});
