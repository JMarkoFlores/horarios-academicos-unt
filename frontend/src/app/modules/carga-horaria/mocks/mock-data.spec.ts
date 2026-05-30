import { MOCK_DOCENTE, MOCK_SEMESTRES, MOCK_FORMATOS } from './mock-data';
import { EstadoDeclaracion } from '../models/carga-horaria.models';

describe('mock-data', () => {
  it('el docente mock no debe tener campos undefined ni null', () => {
    const docenteValores = Object.values(MOCK_DOCENTE);
    docenteValores.forEach((valor) => {
      expect(valor).not.toBeNull();
      expect(valor).not.toBeUndefined();
    });
  });

  it('cada semestre mock debe tener id y nombre definidos', () => {
    MOCK_SEMESTRES.forEach((semestre) => {
      expect(semestre.id).toBeDefined();
      expect(semestre.nombre).toBeDefined();
    });
  });

  it('cada formato mock debe tener un estado válido del enum EstadoDeclaracion', () => {
    const enumValores = Object.values(EstadoDeclaracion);

    Object.values(MOCK_FORMATOS).forEach((formatos) => {
      formatos.forEach((formato) => {
        expect(enumValores).toContain(formato.estado);
      });
    });
  });
});
