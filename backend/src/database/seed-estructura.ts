
import * as bcrypt from 'bcrypt';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { CategoriaDocente } from '../common/enums/categoria-docente.enum';
import { TipoContrato } from '../common/enums/tipo-contrato.enum';
import { TipoDocente } from '../common/enums/tipo-docente.enum';
import { ModalidadDocente } from '../common/enums/modalidad-docente.enum';
import { TipoAmbiente } from '../common/enums/tipo-ambiente.enum';
import { EstadoPeriodo } from '../common/enums/estado-periodo.enum';
import { ModoAsignacion } from '../common/enums/modo-asignacion.enum';

import { Usuario } from '../entities/usuario.entity';
import { Docente } from '../entities/docente.entity';
import { PeriodoAcademico } from '../entities/periodo-academico.entity';
import { Facultad } from '../entities/facultad.entity';
import { Escuela } from '../entities/escuela.entity';
import { Departamento } from '../entities/departamento.entity';
import { Ambiente } from '../entities/ambiente.entity';
import { TurnoHorario } from '../entities/turno-horario.entity';
import { DiaActivo } from '../entities/dia-activo.entity';
import { TipoClase } from '../common/enums/tipo-clase.enum';

export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const diaANumero = (dia: string): number => {
  const map: { [key: string]: number } = {
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Miercoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
    Sabado: 6,
    Domingo: 7,
  };
  return map[dia] ?? 1;
};

export const parsearRangoHoras = (rango: string) => {
  const parts = rango.split('-');
  const h1 = parseInt(parts[0].split(':')[0]);
  const h2 = parseInt(parts[1].split(':')[0]);
  const horaInicio = h1 <= 6 ? h1 + 12 : h1;
  let horaFin = h2 <= 6 || h2 < h1 ? h2 + 12 : h2;
  if (h1 >= 7 && h1 <= 12 && h2 < 7) horaFin = h2 + 12;
  return {
    inicio: `${String(horaInicio).padStart(2, '0')}:00:00`,
    fin: `${String(horaFin).padStart(2, '0')}:00:00`,
    diff: horaFin - horaInicio,
  };
};

export const mapTipoClase = (tipo: string): TipoClase => {
  const t = tipo.toLowerCase();
  if (t.includes('laboratorio')) return TipoClase.LABORATORIO;
  if (t.includes('teoria') || t.includes('teoría')) return TipoClase.TEORIA;
  if (t.includes('practica') || t.includes('práctica'))
    return TipoClase.PRACTICA;
  return TipoClase.TEORIA;
};

export interface SeedEstructuraResult {
  passwordHash: string;
  admin: Usuario;
  decano: Usuario;
  directorEscuela: Usuario;
  directorDpto: Usuario;
  coordinadorAcademico: Usuario;
  secretaria: Usuario;
  operador: Usuario;
  facultad: Facultad;
  escuela: Escuela;
  departamento: Departamento;
  periodos: PeriodoAcademico[];
  periodoActivo: PeriodoAcademico;
  ambientesByCodigo: Record<string, Ambiente>;
  ambientesById: Record<number, Ambiente>;
  docentes: Docente[];
}

export async function seedEstructura(queryRunner: any): Promise<SeedEstructuraResult> {
  const usuarioRepo = queryRunner.manager.getRepository(Usuario);
  const docenteRepo = queryRunner.manager.getRepository(Docente);
  const facultadRepo = queryRunner.manager.getRepository(Facultad);
  const escuelaRepo = queryRunner.manager.getRepository(Escuela);
  const departamentoRepo = queryRunner.manager.getRepository(Departamento);
  const periodoRepo = queryRunner.manager.getRepository(PeriodoAcademico);
  const ambienteRepo = queryRunner.manager.getRepository(Ambiente);
  const turnoRepo = queryRunner.manager.getRepository(TurnoHorario);
  const diaActivoRepo = queryRunner.manager.getRepository(DiaActivo);

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  console.log('🔑 Creando usuarios administrativos...');
  const admin = await usuarioRepo.save(
    usuarioRepo.create({
      nombre: 'Administrador del Sistema',
      email: 'admin@unt.edu.pe',
      password_hash: passwordHash,
      rol: RolUsuario.ADMINISTRADOR_SISTEMA,
      activo: true,
      debe_cambiar_password: true,
    }),
  );

  const decano = await usuarioRepo.save(
    usuarioRepo.create({
      nombre: 'Decano de Ingeniería',
      email: 'decano@unt.edu.pe',
      password_hash: passwordHash,
      rol: RolUsuario.DECANO,
      activo: true,
      debe_cambiar_password: true,
    }),
  );

  const directorEscuela = await usuarioRepo.save(
    usuarioRepo.create({
      nombre: 'Director de Escuela de Sistemas',
      email: 'director.escuela@unt.edu.pe',
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
      debe_cambiar_password: true,
    }),
  );

  const directorDpto = await usuarioRepo.save(
    usuarioRepo.create({
      nombre: 'Director de Departamento de Sistemas',
      email: 'director.departamento@unt.edu.pe',
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_DEPARTAMENTO,
      activo: true,
      debe_cambiar_password: true,
    }),
  );

  const coordinadorAcademico = await usuarioRepo.save(
    usuarioRepo.create({
      nombre: 'Coordinador Académico',
      email: 'coordinador@unt.edu.pe',
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
      debe_cambiar_password: true,
    }),
  );

  const secretaria = await usuarioRepo.save(
    usuarioRepo.create({
      nombre: 'Secretaria de Sistemas',
      email: 'secretaria@unt.edu.pe',
      password_hash: passwordHash,
      rol: RolUsuario.SECRETARIA,
      activo: true,
      debe_cambiar_password: true,
    }),
  );

  const operador = await usuarioRepo.save(
    usuarioRepo.create({
      nombre: 'Operador de Horarios',
      email: 'operador@unt.edu.pe',
      password_hash: passwordHash,
      rol: RolUsuario.OPERADOR_HORARIOS,
      activo: true,
      debe_cambiar_password: true,
    }),
  );

  console.log('🏗️ Creando infraestructura base...');
  await turnoRepo.save([
    {
      nombre: 'Mañana',
      hora_inicio: '07:00',
      hora_fin: '14:00',
      activo: true,
    },
    {
      nombre: 'Tarde',
      hora_inicio: '14:00',
      hora_fin: '23:00',
      activo: true,
    },
  ]);

  await diaActivoRepo.save([
    { dia_semana: 1, nombre: 'Lunes', activo: true },
    { dia_semana: 2, nombre: 'Martes', activo: true },
    { dia_semana: 3, nombre: 'Miércoles', activo: true },
    { dia_semana: 4, nombre: 'Jueves', activo: true },
    { dia_semana: 5, nombre: 'Viernes', activo: true },
    { dia_semana: 6, nombre: 'Sábado', activo: false },
    { dia_semana: 7, nombre: 'Domingo', activo: false },
  ]);

  const periodos = await periodoRepo.save([
    {
      codigo: '2025-II',
      nombre: 'Semestre 2025-II',
      fecha_inicio: new Date('2025-08-01'),
      fecha_fin: new Date('2025-12-31'),
      estado: EstadoPeriodo.FINALIZADO,
      activo: false,
      modo_asignacion: ModoAsignacion.AUTOMATICA,
    },
    {
      codigo: '2026-I',
      nombre: 'Semestre 2026-I',
      fecha_inicio: new Date('2026-03-01'),
      fecha_fin: new Date('2026-07-31'),
      estado: EstadoPeriodo.EN_CURSO,
      activo: true,
      modo_asignacion: ModoAsignacion.MIXTA,
    },
  ]);
  const periodoActivo = periodos.find((p) => p.codigo === '2026-I')!;

  console.log('🏢 Creando facultades, escuelas y departamentos...');
  const facultad = await facultadRepo.save(
    facultadRepo.create({
      nombre: 'Facultad de Ingeniería',
      codigo: 'FI',
      coordinador_id: decano.id,
    }),
  );
  const escuela = await escuelaRepo.save(
    escuelaRepo.create({
      nombre: 'Ingeniería de Sistemas',
      codigo: 'IS',
      facultad_id: facultad.id,
      coordinador_id: directorEscuela.id,
    }),
  );
  const departamentosData = [
    {
      nombre: 'Departamento de Ingeniería de Sistemas',
      codigo: 'DING',
      departamento_nombre: 'INGENIERÍA DE SISTEMAS',
    },
    {
      nombre: 'Departamento de Ciencias Psicológicas, Filosofía y Arte',
      codigo: 'DCPFA',
      departamento_nombre: 'CIENCIAS PSICOLÓGICAS FILOSOFÍA Y ARTE',
    },
    {
      nombre: 'Departamento de Matemáticas',
      codigo: 'DMAT',
      departamento_nombre: 'MATEMÁTICAS',
    },
    {
      nombre: 'Departamento de Lengua Nacional y Literatura',
      codigo: 'DLNL',
      departamento_nombre: 'LENGUA NACIONAL Y LITERATURA',
    },
    {
      nombre: 'Departamento de Estadística',
      codigo: 'DEST',
      departamento_nombre: 'ESTADÍSTICA',
    },
    {
      nombre: 'Departamento de Comunicación Social',
      codigo: 'DCS',
      departamento_nombre: 'COMUNICACIÓN SOCIAL',
    },
    {
      nombre: 'Departamento de Filosofía y Arte',
      codigo: 'DFA',
      departamento_nombre: 'FILOSOFÍA Y ARTE',
    },
    {
      nombre: 'Departamento de Ciencias de la Educación',
      codigo: 'DCE',
      departamento_nombre: 'CIENCIAS DE LA EDUCACIÓN',
    },
    {
      nombre: 'Departamento de Ciencias Sociales',
      codigo: 'DCSO',
      departamento_nombre: 'CIENCIAS SOCIALES',
    },
    {
      nombre: 'Departamento de Física',
      codigo: 'DFIS',
      departamento_nombre: 'FÍSICA',
    },
    {
      nombre: 'Departamento de Administración',
      codigo: 'DADM',
      departamento_nombre: 'ADMINISTRACIÓN',
    },
    {
      nombre: 'Departamento de Economía',
      codigo: 'DECO',
      departamento_nombre: 'ECONOMÍA',
    },
    {
      nombre: 'Departamento de Contabilidad y Finanzas',
      codigo: 'DCF',
      departamento_nombre: 'CONTABILIDAD Y FINANZAS',
    },
    {
      nombre: 'Departamento de Ingeniería de Sistemas y Industrial',
      codigo: 'DISI',
      departamento_nombre: 'INGENIERÍA DE SISTEMAS INGENIERÍA INDUSTRIAL',
    },
    {
      nombre: 'Departamento de Ingeniería Industrial',
      codigo: 'DII',
      departamento_nombre: 'INGENIERÍA INDUSTRIAL',
    },
    {
      nombre: 'Departamento de Ingeniería Química y Ambiental',
      codigo: 'DIQA',
      departamento_nombre: 'INGENIERÍA QUÍMICA INGENIERÍA AMBIENTAL',
    },
    {
      nombre: 'Departamento de Derecho',
      codigo: 'DDER',
      departamento_nombre: 'DERECHO',
    },
  ];
  const createdDepartamentos: { [nombre: string]: any } = {};
  for (const d of departamentosData) {
    const dep = await departamentoRepo.save(
      departamentoRepo.create({
        nombre: d.nombre,
        codigo: d.codigo,
        escuela_id: escuela.id,
        coordinador_id:
          d.departamento_nombre === 'INGENIERÍA DE SISTEMAS'
            ? directorDpto.id
            : null,
      }),
    );
    createdDepartamentos[d.departamento_nombre] = dep;
  }
  const departamento = createdDepartamentos['INGENIERÍA DE SISTEMAS'];

  await usuarioRepo.update(secretaria.id, {
    departamento_id: departamento.id,
    escuela_id: escuela.id,
    facultad_id: facultad.id,
  });
  await usuarioRepo.update(coordinadorAcademico.id, {
    escuela_id: escuela.id,
    facultad_id: facultad.id,
  });
  await usuarioRepo.update(directorDpto.id, {
    departamento_id: departamento.id,
    escuela_id: escuela.id,
    facultad_id: facultad.id,
  });
  await usuarioRepo.update(decano.id, { facultad_id: facultad.id });
  await usuarioRepo.update(directorEscuela.id, {
    escuela_id: escuela.id,
    facultad_id: facultad.id,
  });

  console.log('🏠 Creando ambientes...');
  const ambientesData = [
    {
      codigo: 'A-307',
      nombre: 'Aula 307',
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
    },
    {
      codigo: 'A-303',
      nombre: 'Aula 303',
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
    },
    {
      codigo: 'A-311',
      nombre: 'Aula 311',
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
    },
    {
      codigo: 'LAB-1',
      nombre: 'Laboratorio 1',
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
    },
    {
      codigo: 'LAB-2',
      nombre: 'Laboratorio 2',
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
    },
    {
      codigo: 'LAB-3',
      nombre: 'Laboratorio 3',
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
    },
    {
      codigo: 'LAB-4',
      nombre: 'Laboratorio 4',
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
    },
    {
      codigo: 'LAB-FIS',
      nombre: 'Laboratorio de Física',
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
    },
    {
      codigo: 'TALLER-CONFECCIONES',
      nombre: 'Taller de Confecciones',
      tipo: TipoAmbiente.TALLER,
      capacidad: 40,
    },
    {
      codigo: 'II-2',
      nombre: 'Pabellón Industrial II-2',
      tipo: TipoAmbiente.AULA,
      capacidad: 50,
    },
    {
      codigo: 'I-4',
      nombre: 'Aula I-4',
      tipo: TipoAmbiente.AULA,
      capacidad: 45,
    },
    {
      codigo: 'Audiovisuales',
      nombre: 'Sala de Audiovisuales',
      tipo: TipoAmbiente.AULA,
      capacidad: 60,
    },
  ];
  const createdAmbientes = await ambienteRepo.save(
    ambientesData.map((a) => ambienteRepo.create({ ...a, activo: true })),
  );
  const ambientesByCodigo: Record<string, Ambiente> = {};
  const ambientesById: Record<number, Ambiente> = {};
  for (const amb of createdAmbientes) {
    ambientesByCodigo[amb.codigo] = amb;
    ambientesById[amb.id] = amb;
  }

  console.log('👨‍🏫 Creando docentes...');
  const docentesData = [
    {
      nombres: 'Marcelino',
      apellidos: 'Torres Villanueva',
      email: 'torres.villanueva@unt.edu.pe',
      ibm: 1001,
      dni: '12345678',
    },
    {
      nombres: 'Alberto',
      apellidos: 'Mendoza de los Santos',
      email: 'mendoza.santos@unt.edu.pe',
      ibm: 1002,
      dni: '23456789',
    },
    {
      nombres: 'Paul',
      apellidos: 'Cotrina Castellanos',
      email: 'cotrina.castellanos@unt.edu.pe',
      ibm: 1003,
      dni: '34567890',
    },
    {
      nombres: 'Bertha',
      apellidos: 'Urtecho Zavaleta',
      email: 'urtecho.zavaleta@unt.edu.pe',
      ibm: 1004,
      dni: '45678901',
    },
    {
      nombres: 'Jose Luis',
      apellidos: 'Ponte Bejarano',
      email: 'ponte.bejarano@unt.edu.pe',
      ibm: 1005,
      dni: '56789012',
    },
    {
      nombres: 'Jorge Luis',
      apellidos: 'Rios Gonzales',
      email: 'rios.gonzales@unt.edu.pe',
      ibm: 1006,
      dni: '67890123',
    },
    {
      nombres: 'Segundo',
      apellidos: 'Guibar Obeso',
      email: 'guibar.obeso@unt.edu.pe',
      ibm: 1007,
      dni: '78901234',
    },
    {
      nombres: 'Miguel',
      apellidos: 'Ipanaque Zapata',
      email: 'ipanaque.zapata@unt.edu.pe',
      ibm: 1008,
      dni: '89012345',
    },
    {
      nombres: 'Martha',
      apellidos: 'Cardoso',
      email: 'cardoso@unt.edu.pe',
      ibm: 1009,
      dni: '90123456',
    },
    {
      nombres: 'Zoraida',
      apellidos: 'Vidal Melgarejo',
      email: 'zvidal@unt.edu.pe',
      ibm: 1010,
      dni: '01234567',
    },
    {
      nombres: 'Everson David',
      apellidos: 'Agreda Gamboa',
      email: 'eagreda@unt.edu.pe',
      ibm: 1011,
      dni: '11223344',
    },
    {
      nombres: 'Juan Carlos',
      apellidos: 'Obando Roldan',
      email: 'jobando@unt.edu.pe',
      ibm: 1012,
      dni: '22334455',
    },
    {
      nombres: 'Marcos',
      apellidos: 'Ferrer Reyna',
      email: 'mferrer@unt.edu.pe',
      ibm: 1013,
      dni: '33445566',
    },
    {
      nombres: 'Teresita',
      apellidos: 'Rojas Garcia',
      email: 'trojas@unt.edu.pe',
      ibm: 1014,
      dni: '44556677',
    },
    {
      nombres: 'Juan',
      apellidos: 'Carrascal Cabanillas',
      email: 'jcarrascal@unt.edu.pe',
      ibm: 1015,
      dni: '55667788',
    },
    {
      nombres: 'Vilma',
      apellidos: 'Mendez Gil',
      email: 'vmendez@unt.edu.pe',
      ibm: 1016,
      dni: '66778899',
    },
    {
      nombres: 'Sheyla Laura',
      apellidos: 'Escobedo Rodriguez',
      email: 'sescobedo@unt.edu.pe',
      ibm: 1017,
      dni: '77889900',
    },
    {
      nombres: 'Luis',
      apellidos: 'Boy Chavil',
      email: 'lboy@unt.edu.pe',
      ibm: 1018,
      dni: '88990011',
    },
    {
      nombres: 'Robert Jerry',
      apellidos: 'Sanchez Ticona',
      email: 'rsanchez@unt.edu.pe',
      ibm: 1019,
      dni: '99001122',
    },
    {
      nombres: 'Cesar',
      apellidos: 'Arellano Salazar',
      email: 'carellano@unt.edu.pe',
      ibm: 1020,
      dni: '00112233',
    },
    {
      nombres: 'Camilo',
      apellidos: 'Suarez Rebaza',
      email: 'csuarez@unt.edu.pe',
      ibm: 1021,
      dni: '00223344',
    },
    {
      nombres: 'Marcos',
      apellidos: 'Baca Lopez',
      email: 'mbaca@unt.edu.pe',
      ibm: 1022,
      dni: '00334455',
    },
    {
      nombres: 'Ana',
      apellidos: 'Cuadra Mitzugaray',
      email: 'acuadra@unt.edu.pe',
      ibm: 1023,
      dni: '00445566',
    },
    {
      nombres: 'Juan Pedro',
      apellidos: 'Santos Fernandez',
      email: 'jsantos@unt.edu.pe',
      ibm: 4247,
      dni: '00556677',
    },
    {
      nombres: 'Ricardo',
      apellidos: 'Mendoza Rivera',
      email: 'rmendoza@unt.edu.pe',
      ibm: 1025,
      dni: '00667788',
    },
    {
      nombres: 'Oscar Romel',
      apellidos: 'Alcantara Moreno',
      email: 'oalcantara@unt.edu.pe',
      ibm: 1026,
      dni: '00778899',
    },
    {
      nombres: 'Jhoe',
      apellidos: 'Gonzalez Vasquez',
      email: 'jgonzalez@unt.edu.pe',
      ibm: 1027,
      dni: '00889900',
    },
    {
      nombres: 'Jose',
      apellidos: 'Gomez Avila',
      email: 'jgomez@unt.edu.pe',
      ibm: 1028,
      dni: '00990011',
    },
  ];

  const fechasIngreso = [
    '2005-03-01',
    '2008-04-15',
    '2010-01-10',
    '2012-06-20',
    '2014-03-01',
    '2015-08-15',
    '2006-11-30',
    '2009-02-28',
    '2011-09-01',
    '2013-07-15',
    '2016-04-01',
    '2018-10-10',
    '2007-12-01',
    '2017-05-20',
    '2019-01-15',
    '2020-03-01',
    '2021-08-15',
    '2013-11-01',
    '2022-02-20',
    '2019-07-01',
    '2016-09-15',
    '2020-06-01',
    '2018-03-10',
    '2015-04-01',
    '2017-11-20',
    '2021-01-15',
    '2023-03-01',
    '2022-09-10',
  ];

  const condiciones = [
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.PRINCIPAL,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.PRINCIPAL,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.PRINCIPAL,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.ASOCIADO,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.ASOCIADO,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.ASOCIADO,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.ASOCIADO,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.ASOCIADO,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.AUXILIAR,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.AUXILIAR,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.AUXILIAR,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.AUXILIAR,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.AUXILIAR,
    },
    {
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      categoria: CategoriaDocente.AUXILIAR,
    },
    {
      tipo_docente: TipoDocente.CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.SIN_CATEGORIA,
    },
    {
      tipo_docente: TipoDocente.CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.SIN_CATEGORIA,
    },
    {
      tipo_docente: TipoDocente.CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.SIN_CATEGORIA,
    },
    {
      tipo_docente: TipoDocente.CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.SIN_CATEGORIA,
    },
    {
      tipo_docente: TipoDocente.CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.SIN_CATEGORIA,
    },
    {
      tipo_docente: TipoDocente.CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.SIN_CATEGORIA,
    },
    {
      tipo_docente: TipoDocente.CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.SIN_CATEGORIA,
    },
    {
      tipo_docente: TipoDocente.CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.SIN_CATEGORIA,
    },
    {
      tipo_docente: TipoDocente.JEFE_PRACTICA_CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.JEFE_PRACTICA,
    },
    {
      tipo_docente: TipoDocente.JEFE_PRACTICA_CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.JEFE_PRACTICA,
    },
    {
      tipo_docente: TipoDocente.JEFE_PRACTICA_CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.JEFE_PRACTICA,
    },
    {
      tipo_docente: TipoDocente.JEFE_PRACTICA_CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.JEFE_PRACTICA,
    },
    {
      tipo_docente: TipoDocente.JEFE_PRACTICA_CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      categoria: CategoriaDocente.JEFE_PRACTICA,
    },
  ];

  const modalidadesAsignadas = [
    ModalidadDocente.DEDICACION_EXCLUSIVA,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_20,
    ModalidadDocente.TIEMPO_PARCIAL_20,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.DEDICACION_EXCLUSIVA,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_12,
    ModalidadDocente.TIEMPO_PARCIAL_10,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_8,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_20,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_20,
    ModalidadDocente.TIEMPO_PARCIAL_12,
    ModalidadDocente.TIEMPO_PARCIAL_10,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_8,
    ModalidadDocente.TIEMPO_PARCIAL_20,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_10,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_20,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_12,
  ];

  const docentes: Docente[] = [];
  for (const [i, d] of docentesData.entries()) {
    const condIdx = i % condiciones.length;
    const modalidadIdx = i % modalidadesAsignadas.length;
    const fechaIdx = i % fechasIngreso.length;
    const cond = condiciones[condIdx];
    const usuario = await usuarioRepo.save(
      usuarioRepo.create({
        nombre: `${d.nombres} ${d.apellidos}`,
        email: d.email,
        password_hash: passwordHash,
        rol: RolUsuario.DOCENTE,
        activo: true,
        debe_cambiar_password: true,
      }),
    );
    const docente = await docenteRepo.save(
      docenteRepo.create({
        ...d,
        ibm: d.ibm,
        codigo: `DOC-${d.ibm}`,
        dni: d.dni,
        usuario,
        departamento_id: departamento.id,
        facultad_id: facultad.id,
        tipo_docente: cond.tipo_docente,
        categoria: cond.categoria,
        tipo_contrato: cond.tipo_contrato,
        modalidad: modalidadesAsignadas[modalidadIdx],
        fecha_ingreso: new Date(fechasIngreso[fechaIdx]),
        activo: true,
      }),
    );
    docentes.push(docente);
  }

  return {
    passwordHash,
    admin,
    decano,
    directorEscuela,
    directorDpto,
    coordinadorAcademico,
    secretaria,
    operador,
    facultad,
    escuela,
    departamento,
    periodos,
    periodoActivo,
    ambientesByCodigo,
    ambientesById,
    docentes,
  };
}

export const mapAmbienteCode = (nombre: string): string => {
  const map: { [key: string]: string } = {
    'Lab. 1': 'LAB-1',
    Lab1: 'LAB-1',
    'Lab. 2': 'LAB-2',
    Lab2: 'LAB-2',
    'Lab. 3': 'LAB-3',
    Lab3: 'LAB-3',
    'Lab. 4': 'LAB-4',
    Lab4: 'LAB-4',
    'posgrado A-307': 'A-307',
    'posgrado A-303': 'A-303',
    'posgrado A-311': 'A-311',
    'I-4': 'I-4',
    'Lab. Física': 'LAB-FIS',
    'Taller Confecciones - Ing. Industrial': 'TALLER-CONFECCIONES',
    'Taller Confecciones (Ing. Industrial)': 'TALLER-CONFECCIONES',
    'Taller de Confecciones - Ing. Industrial': 'TALLER-CONFECCIONES',
    'Taller Confecciones - Ing. Indust.': 'TALLER-CONFECCIONES',
    'I I - 2 (Pabellon Ing. Industrial)': 'II-2',
  };
  return map[nombre] ?? nombre;
};
