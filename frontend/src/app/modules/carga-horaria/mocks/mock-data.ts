import { Docente, FormatoItem, Semestre, EstadoDeclaracion } from '../models/carga-horaria.models';

export const MOCK_DOCENTE: Docente = {
  id: 1,
  nombre: 'Dra. María Fernanda Rojas',
  dni: '42158796',
  ibm: 'IBM-20201',
  facultad: 'Ingeniería',
  departamento: 'Sistemas y Computación',
  condicion: 'Ordinaria',
  categoria: 'Principal',
  dedicacion: 'Tiempo Completo',
};

export const MOCK_SEMESTRES: Semestre[] = [
  {
    id: 1,
    nombre: '2024-I',
    fechaInicio: '2024-03-01',
    fechaFin: '2024-07-31',
  },
  {
    id: 2,
    nombre: '2024-II',
    fechaInicio: '2024-08-15',
    fechaFin: '2024-12-20',
  },
];

export const MOCK_FORMATOS: Record<number, FormatoItem[]> = {
  1: [
    {
      id: 101,
      numero: 1,
      formato: 'Declaración Carga Horaria 2024-I',
      sede: 'Trujillo',
      estado: EstadoDeclaracion.VALIDADO_DPTO,
      ultimaActualizacion: '2024-04-12T10:45:00Z',
    },
    {
      id: 102,
      numero: 2,
      formato: 'Formato de Sustentación 2024-I',
      sede: 'Valle Jequetepeque',
      estado: EstadoDeclaracion.OBSERVADO_FACULTAD,
      ultimaActualizacion: '2024-05-02T15:30:00Z',
    },
  ],
  2: [
    {
      id: 201,
      numero: 1,
      formato: 'Declaración Carga Horaria 2024-II',
      sede: 'Trujillo',
      estado: EstadoDeclaracion.NO_INICIADO,
      ultimaActualizacion: '2024-08-10T08:00:00Z',
    },
    {
      id: 202,
      numero: 2,
      formato: 'Formato de Sustentación 2024-II',
      sede: 'Valle Chicama',
      estado: EstadoDeclaracion.BORRADOR,
      ultimaActualizacion: '2024-08-18T09:15:00Z',
    },
  ],
};
