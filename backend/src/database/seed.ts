import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '..', '..', '.env') });

import { Usuario } from '../entities/usuario.entity';
import { Docente } from '../entities/docente.entity';
import { PeriodoAcademico } from '../entities/periodo-academico.entity';
import { Curso } from '../entities/curso.entity';
import { Ambiente } from '../entities/ambiente.entity';
import { Grupo } from '../entities/grupo.entity';
import { DisponibilidadDocente } from '../entities/disponibilidad-docente.entity';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { ConflictoAsignacion } from '../entities/conflicto-asignacion.entity';
import { VentanaAtencion } from '../entities/ventana-atencion.entity';
import { ColaDocentes } from '../entities/cola-docentes.entity';
import { SeleccionTemporal } from '../entities/seleccion-temporal.entity';
import { NotificacionDocente } from '../entities/notificacion-docente.entity';
import { PreferenciasNotificacion } from '../entities/preferencias-notificacion.entity';
import { Preasignacion } from '../entities/preasignacion.entity';
import { RestriccionInstitucional } from '../entities/restriccion-institucional.entity';
import { DiaNoLaborable } from '../entities/dia-no-laborable.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { CategoriaDocente } from '../common/enums/categoria-docente.enum';
import { TipoContrato } from '../common/enums/tipo-contrato.enum';
import { TipoAmbiente } from '../common/enums/tipo-ambiente.enum';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  database: process.env.DATABASE_NAME ?? 'horarios_unt',
  username: process.env.DATABASE_USER ?? 'unt_user',
  password: process.env.DATABASE_PASSWORD ?? 'unt_pass123',
  entities: [
    Usuario,
    Docente,
    PeriodoAcademico,
    Curso,
    Ambiente,
    Grupo,
    DisponibilidadDocente,
    HorarioAsignado,
    ConflictoAsignacion,
    VentanaAtencion,
    ColaDocentes,
    SeleccionTemporal,
    NotificacionDocente,
    PreferenciasNotificacion,
    Preasignacion,
    RestriccionInstitucional,
    DiaNoLaborable,
  ],
  synchronize: false,
  logging: false,
});

async function seed() {
  console.log('🌱 Iniciando seed de la base de datos...');

  await AppDataSource.initialize();
  console.log('✅ Conexión a la base de datos establecida\n');

  const usuarioRepo = AppDataSource.getRepository(Usuario);
  const docenteRepo = AppDataSource.getRepository(Docente);
  const periodoRepo = AppDataSource.getRepository(PeriodoAcademico);
  const cursoRepo = AppDataSource.getRepository(Curso);
  const ambienteRepo = AppDataSource.getRepository(Ambiente);

  // ── 1. USUARIO ADMIN ─────────────────────────────────────────────────────
  const adminExistente = await usuarioRepo.findOne({
    where: { email: 'admin@unitru.edu.pe' },
  });

  if (!adminExistente) {
    const admin = usuarioRepo.create({
      nombre: 'Administrador del Sistema',
      email: 'admin@unitru.edu.pe',
      password_hash: await bcrypt.hash('Admin123!', 10),
      rol: RolUsuario.ADMIN,
      activo: true,
    });
    await usuarioRepo.save(admin);
    console.log('✅ Usuario admin creado: admin@unitru.edu.pe / Admin123!');
  } else {
    console.log('⏭️  Usuario admin ya existe, omitiendo...');
  }

  // ── 2. PERÍODO ACADÉMICO ──────────────────────────────────────────────────
  const periodoExistente = await periodoRepo.findOne({
    where: { codigo: '2026-I' },
  });

  if (!periodoExistente) {
    const periodo = periodoRepo.create({
      codigo: '2026-I',
      nombre: 'Semestre 2026-I',
      fecha_inicio: new Date('2026-03-16'),
      fecha_fin: new Date('2026-07-31'),
      activo: true,
    });
    await periodoRepo.save(periodo);
    console.log('✅ Período académico creado: 2026-I');
  } else {
    console.log('⏭️  Período 2026-I ya existe, omitiendo...');
  }

  // ── 3. DOCENTES ───────────────────────────────────────────────────────────
  const docentesData = [
    {
      codigo: 'DOC001',
      nombres: 'Juan Carlos',
      apellidos: 'Pérez Rodríguez',
      email: 'jperez@unitru.edu.pe',
      categoria: CategoriaDocente.PRINCIPAL,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date('2000-03-01'),
    },
    {
      codigo: 'DOC002',
      nombres: 'María Elena',
      apellidos: 'García Sánchez',
      email: 'mgarcia@unitru.edu.pe',
      categoria: CategoriaDocente.ASOCIADO,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date('2005-06-15'),
    },
    {
      codigo: 'DOC003',
      nombres: 'Carlos Alberto',
      apellidos: 'López Flores',
      email: 'clopez@unitru.edu.pe',
      categoria: CategoriaDocente.AUXILIAR,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date('2010-09-01'),
    },
    {
      codigo: 'DOC004',
      nombres: 'Ana Patricia',
      apellidos: 'Torres Vega',
      email: 'atorres@unitru.edu.pe',
      categoria: CategoriaDocente.JEFE_PRACTICA,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date('2015-03-01'),
    },
    {
      codigo: 'DOC005',
      nombres: 'Pedro Manuel',
      apellidos: 'Ruiz Castillo',
      email: 'pruiz@unitru.edu.pe',
      categoria: CategoriaDocente.PRINCIPAL,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date('1998-01-10'),
    },
    {
      codigo: 'DOC006',
      nombres: 'Luis Fernando',
      apellidos: 'Vargas Mendoza',
      email: 'lvargas@unitru.edu.pe',
      categoria: CategoriaDocente.PRINCIPAL,
      tipo_contrato: TipoContrato.CONTRATADO,
      fecha_ingreso: new Date('2020-03-01'),
    },
    {
      codigo: 'DOC007',
      nombres: 'Rosa Amelia',
      apellidos: 'Mendoza Torres',
      email: 'rmendoza@unitru.edu.pe',
      categoria: CategoriaDocente.ASOCIADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      fecha_ingreso: new Date('2021-03-01'),
    },
    {
      codigo: 'DOC008',
      nombres: 'Jorge Luis',
      apellidos: 'Silva Paredes',
      email: 'jsilva@unitru.edu.pe',
      categoria: CategoriaDocente.AUXILIAR,
      tipo_contrato: TipoContrato.CONTRATADO,
      fecha_ingreso: new Date('2022-03-01'),
    },
  ];

  let docentesCreados = 0;
  for (const d of docentesData) {
    const existe = await docenteRepo.findOne({ where: { codigo: d.codigo } });
    if (!existe) {
      await docenteRepo.save(docenteRepo.create({ ...d, activo: true }));
      docentesCreados++;
    }
  }
  console.log(
    docentesCreados > 0
      ? `✅ ${docentesCreados} docente(s) creado(s)`
      : '⏭️  Docentes ya existen, omitiendo...',
  );

  // ── 4. CURSOS ─────────────────────────────────────────────────────────────
  const cursosData = [
    {
      codigo: 'CS101',
      nombre: 'Programación I',
      creditos: 4,
      horas_teoria: 4,
      horas_laboratorio: 2,
      ciclo: 1,
      tiene_laboratorio: true,
    },
    {
      codigo: 'CS102',
      nombre: 'Programación II',
      creditos: 4,
      horas_teoria: 4,
      horas_laboratorio: 2,
      ciclo: 2,
      tiene_laboratorio: true,
    },
    {
      codigo: 'CS201',
      nombre: 'Estructuras de Datos',
      creditos: 4,
      horas_teoria: 3,
      horas_laboratorio: 2,
      ciclo: 3,
      tiene_laboratorio: true,
    },
    {
      codigo: 'CS301',
      nombre: 'Base de Datos I',
      creditos: 4,
      horas_teoria: 3,
      horas_laboratorio: 2,
      ciclo: 4,
      tiene_laboratorio: true,
    },
    {
      codigo: 'CS202',
      nombre: 'Algoritmos',
      creditos: 4,
      horas_teoria: 4,
      horas_laboratorio: 0,
      ciclo: 3,
      tiene_laboratorio: false,
    },
    {
      codigo: 'CS401',
      nombre: 'Redes',
      creditos: 4,
      horas_teoria: 3,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
    },
    {
      codigo: 'CS302',
      nombre: 'Sistemas Operativos',
      creditos: 4,
      horas_teoria: 4,
      horas_laboratorio: 2,
      ciclo: 4,
      tiene_laboratorio: true,
    },
    {
      codigo: 'CS501',
      nombre: 'Ingeniería de Software',
      creditos: 4,
      horas_teoria: 4,
      horas_laboratorio: 0,
      ciclo: 6,
      tiene_laboratorio: false,
    },
  ];

  let cursosCreados = 0;
  for (const c of cursosData) {
    const existe = await cursoRepo.findOne({ where: { codigo: c.codigo } });
    if (!existe) {
      await cursoRepo.save(cursoRepo.create({ ...c, activo: true }));
      cursosCreados++;
    }
  }
  console.log(
    cursosCreados > 0
      ? `✅ ${cursosCreados} curso(s) creado(s)`
      : '⏭️  Cursos ya existen, omitiendo...',
  );

  // ── 5. AMBIENTES ──────────────────────────────────────────────────────────
  const ambientesData = [
    {
      codigo: 'A-101',
      nombre: 'Aula A-101',
      tipo: TipoAmbiente.AULA,
      capacidad: 35,
      piso: 1,
      pabellon: 'A',
    },
    {
      codigo: 'A-102',
      nombre: 'Aula A-102',
      tipo: TipoAmbiente.AULA,
      capacidad: 35,
      piso: 1,
      pabellon: 'A',
    },
    {
      codigo: 'A-201',
      nombre: 'Aula A-201',
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      piso: 2,
      pabellon: 'A',
    },
    {
      codigo: 'A-202',
      nombre: 'Aula A-202',
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      piso: 2,
      pabellon: 'A',
    },
    {
      codigo: 'LAB-1',
      nombre: 'Laboratorio 1',
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
      piso: 1,
      pabellon: 'B',
      equipamiento: '30 PCs',
    },
    {
      codigo: 'LAB-2',
      nombre: 'Laboratorio 2',
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
      piso: 1,
      pabellon: 'B',
      equipamiento: '30 PCs',
    },
  ];

  let ambientesCreados = 0;
  for (const a of ambientesData) {
    const existe = await ambienteRepo.findOne({ where: { codigo: a.codigo } });
    if (!existe) {
      await ambienteRepo.save(ambienteRepo.create({ ...a, activo: true }));
      ambientesCreados++;
    }
  }
  console.log(
    ambientesCreados > 0
      ? `✅ ${ambientesCreados} ambiente(s) creado(s)`
      : '⏭️  Ambientes ya existen, omitiendo...',
  );

  await AppDataSource.destroy();
  console.log('\n🎉 Seed completado exitosamente!');
  console.log('─────────────────────────────────────────');
  console.log('  Admin: admin@unitru.edu.pe / Admin123!');
  console.log('─────────────────────────────────────────');
}

seed().catch((error) => {
  console.error('❌ Error durante el seed:', error);
  process.exit(1);
});
