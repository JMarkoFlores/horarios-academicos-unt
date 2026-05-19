import "reflect-metadata";
import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(__dirname, "..", "..", ".env") });

import { Usuario } from "../entities/usuario.entity";
import { Docente } from "../entities/docente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Grupo } from "../entities/grupo.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { VentanaAtencion } from "../entities/ventana-atencion.entity";
import { ColaDocentes } from "../entities/cola-docentes.entity";
import { NotificacionDocente } from "../entities/notificacion-docente.entity";
import { PreferenciasNotificacion } from "../entities/preferencias-notificacion.entity";
import { Preasignacion } from "../entities/preasignacion.entity";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { DiaNoLaborable } from "../entities/dia-no-laborable.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { EstadoPeriodo } from "../common/enums/estado-periodo.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST ?? "localhost",
  port: parseInt(process.env.DATABASE_PORT ?? "5432", 10),
  database: process.env.DATABASE_NAME ?? "horarios_unt",
  username: process.env.DATABASE_USER ?? "unt_user",
  password: process.env.DATABASE_PASSWORD ?? "unt_pass123",
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
    NotificacionDocente,
    PreferenciasNotificacion,
    Preasignacion,
    RestriccionInstitucional,
    DiaNoLaborable,
    DocenteCurso,
  ],
  synchronize: false,
  logging: false,
});

async function seed() {
  console.log("🌱 Iniciando seed de la base de datos con TODOS los cursos...");

  await AppDataSource.initialize();
  console.log("✅ Conexión a la base de datos establecida");

  // ── 0. LIMPIEZA DE BASE DE DATOS (TRUNCATE CASCADE) ──────────────────────
  console.log("🧹 Limpiando base de datos existente...");
  await AppDataSource.query('TRUNCATE TABLE "horario_asignado" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "conflicto_asignacion" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "preasignacion" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "cola_docentes" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "ventana_atencion" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "seleccion_temporal" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "disponibilidad_docente" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "docente_curso" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "curso_ambiente" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "grupo" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "curso" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "docente" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "ambiente" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "periodo_academico" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "usuario" CASCADE');
  await AppDataSource.query(
    'TRUNCATE TABLE "restriccion_institucional" CASCADE',
  );
  await AppDataSource.query('TRUNCATE TABLE "dia_no_laborable" CASCADE');
  console.log("🧹 Base de datos limpia y lista\n");

  const usuarioRepo = AppDataSource.getRepository(Usuario);
  const docenteRepo = AppDataSource.getRepository(Docente);
  const periodoRepo = AppDataSource.getRepository(PeriodoAcademico);
  const cursoRepo = AppDataSource.getRepository(Curso);
  const ambienteRepo = AppDataSource.getRepository(Ambiente);
  const docenteCursoRepo = AppDataSource.getRepository(DocenteCurso);
  const restriccionRepo = AppDataSource.getRepository(RestriccionInstitucional);
  const diaNoLaborableRepo = AppDataSource.getRepository(DiaNoLaborable);
  const disponibilidadRepo = AppDataSource.getRepository(DisponibilidadDocente);

  const passwordHash = await bcrypt.hash("Admin123!", 10);

  // ── 1. USUARIOS POR ROL (ADMINISTRADOR, DIRECTOR, COORDINADOR, OPERADOR) ─
  console.log("👤 Creando usuarios de sistema...");
  const usuariosSistemas = [
    {
      nombre: "Administrador del Sistema",
      email: "admin@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.ADMINISTRADOR_SISTEMA,
      activo: true,
    },
    {
      nombre: "Director de Escuela",
      email: "director@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    },
    {
      nombre: "Coordinador Académico",
      email: "coordinador@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    },
    {
      nombre: "Operador de Horarios",
      email: "operador@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.OPERADOR_HORARIOS,
      activo: true,
    },
  ];

  for (const u of usuariosSistemas) {
    await usuarioRepo.save(usuarioRepo.create(u));
  }
  console.log(
    "✅ Usuarios del sistema creados (Contraseña por defecto: Admin123!)\n",
  );

  // ── 2. PERÍODOS ACADÉMICOS ──────────────────────────────────────────────────
  console.log("📅 Creando periodos académicos...");
  const periodosData = [
    {
      codigo: "2025-I",
      nombre: "Semestre 2025-I",
      fecha_inicio: new Date("2025-03-16"),
      fecha_fin: new Date("2025-07-31"),
      estado: EstadoPeriodo.FINALIZADO,
      activo: false,
    },
    {
      codigo: "2025-II",
      nombre: "Semestre 2025-II",
      fecha_inicio: new Date("2025-08-16"),
      fecha_fin: new Date("2025-12-20"),
      estado: EstadoPeriodo.FINALIZADO,
      activo: false,
    },
    {
      codigo: "2026-I",
      nombre: "Semestre 2026-I",
      fecha_inicio: new Date("2026-03-16"),
      fecha_fin: new Date("2026-07-31"),
      estado: EstadoPeriodo.EN_CURSO,
      activo: true,
    },
  ];

  for (const p of periodosData) {
    await periodoRepo.save(periodoRepo.create(p));
  }
  console.log("✅ Períodos académicos creados (2026-I Activo)\n");

  // ── 3. DOCENTES Y SUS USUARIOS ASOCIADOS ───────────────────────────────
  console.log("👨‍🏫 Creando docentes y sus usuarios asociados...");
  const docentesData = [
    {
      codigo: "DOC001",
      nombres: "Juan Carlos",
      apellidos: "Pérez Rodríguez",
      email: "jperez@unt.edu.pe",
      categoria: CategoriaDocente.PRINCIPAL,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date("2000-03-01"),
      activo: true,
    },
    {
      codigo: "DOC002",
      nombres: "María Elena",
      apellidos: "García Sánchez",
      email: "mgarcia@unt.edu.pe",
      categoria: CategoriaDocente.ASOCIADO,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date("2005-06-15"),
      activo: true,
    },
    {
      codigo: "DOC003",
      nombres: "Carlos Alberto",
      apellidos: "López Flores",
      email: "clopez@unt.edu.pe",
      categoria: CategoriaDocente.AUXILIAR,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date("2010-09-01"),
      activo: true,
    },
    {
      codigo: "DOC004",
      nombres: "Ana Patricia",
      apellidos: "Torres Vega",
      email: "atorres@unt.edu.pe",
      categoria: CategoriaDocente.JEFE_PRACTICA,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date("2015-03-01"),
      activo: true,
    },
    {
      codigo: "DOC005",
      nombres: "Pedro Manuel",
      apellidos: "Ruiz Castillo",
      email: "pruiz@unt.edu.pe",
      categoria: CategoriaDocente.PRINCIPAL,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date("1998-01-10"),
      activo: true,
    },
    {
      codigo: "DOC006",
      nombres: "Luis Fernando",
      apellidos: "Vargas Mendoza",
      email: "lvargas@unt.edu.pe",
      categoria: CategoriaDocente.PRINCIPAL,
      tipo_contrato: TipoContrato.CONTRATADO,
      fecha_ingreso: new Date("2020-03-01"),
      activo: true,
    },
    {
      codigo: "DOC007",
      nombres: "Rosa Amelia",
      apellidos: "Mendoza Torres",
      email: "rmendoza@unt.edu.pe",
      categoria: CategoriaDocente.ASOCIADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      fecha_ingreso: new Date("2021-03-01"),
      activo: true,
    },
    {
      codigo: "DOC008",
      nombres: "Jorge Luis",
      apellidos: "Silva Paredes",
      email: "jsilva@unt.edu.pe",
      categoria: CategoriaDocente.AUXILIAR,
      tipo_contrato: TipoContrato.CONTRATADO,
      fecha_ingreso: new Date("2022-03-01"),
      activo: true,
    },
  ];

  const dbDocentes: Docente[] = [];
  for (const d of docentesData) {
    const docente = await docenteRepo.save(docenteRepo.create(d));
    dbDocentes.push(docente);

    // Crear usuario asociado
    await usuarioRepo.save(
      usuarioRepo.create({
        nombre: `${d.nombres} ${d.apellidos}`,
        email: d.email,
        password_hash: passwordHash,
        rol: RolUsuario.DOCENTE,
        activo: true,
      }),
    );
  }
  console.log(
    "✅ 8 docentes y sus 8 usuarios de acceso creados correctamente\n",
  );

  // ── 4. AMBIENTES (6 AULAS Y 4 LABORATORIOS) ──────────────────────────────
  console.log("🏢 Creando ambientes de estudio (aulas y laboratorios)...");
  const ambientesData = [
    // Aulas
    {
      codigo: "A-101",
      nombre: "Aula Pabellón A - 101",
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      piso: 1,
      pabellon: "A",
      activo: true,
    },
    {
      codigo: "A-102",
      nombre: "Aula Pabellón A - 102",
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      piso: 1,
      pabellon: "A",
      activo: true,
    },
    {
      codigo: "A-201",
      nombre: "Aula Pabellón A - 201",
      tipo: TipoAmbiente.AULA,
      capacidad: 35,
      piso: 2,
      pabellon: "A",
      activo: true,
    },
    {
      codigo: "A-202",
      nombre: "Aula Pabellón A - 202",
      tipo: TipoAmbiente.AULA,
      capacidad: 35,
      piso: 2,
      pabellon: "A",
      activo: true,
    },
    {
      codigo: "A-301",
      nombre: "Aula Pabellón A - 301",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 3,
      pabellon: "A",
      activo: true,
    },
    {
      codigo: "A-302",
      nombre: "Aula Pabellón A - 302",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 3,
      pabellon: "A",
      activo: true,
    },
    // Laboratorios
    {
      codigo: "LAB-1",
      nombre: "Laboratorio de Cómputo 1 (Software)",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
      piso: 1,
      pabellon: "B",
      equipamiento:
        "30 PCs de alto rendimiento, Proyector HD, Aire acondicionado",
      activo: true,
    },
    {
      codigo: "LAB-2",
      nombre: "Laboratorio de Cómputo 2 (Sistemas Inteligentes)",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
      piso: 1,
      pabellon: "B",
      equipamiento: "30 PCs de alto rendimiento con GPUs, Pizarra inteligente",
      activo: true,
    },
    {
      codigo: "LAB-3",
      nombre: "Laboratorio de Redes y Telecomunicaciones",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 25,
      piso: 2,
      pabellon: "B",
      equipamiento:
        "Equipos Cisco (Routers, Switches), Racks, Herramientas de cableado",
      activo: true,
    },
    {
      codigo: "LAB-4",
      nombre: "Laboratorio de Robótica y Arquitectura de Computadoras",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 25,
      piso: 2,
      pabellon: "B",
      equipamiento:
        "Kits Arduino/Raspberry, Multímetros, Osciloscopios, Estaciones de soldadura",
      activo: true,
    },
  ];

  const dbAmbientes: Ambiente[] = [];
  for (const a of ambientesData) {
    const ambiente = await ambienteRepo.save(ambienteRepo.create(a));
    dbAmbientes.push(ambiente);
  }
  console.log("✅ 6 aulas y 4 laboratorios creados exitosamente\n");

  // ── 5. PLAN DE ESTUDIOS COMPLETO INGENIERÍA DE SISTEMAS 2018 (82 CURSOS) ─
  console.log(
    "📚 Creando plan de estudios completo de Ingeniería de Sistemas 2018...",
  );
  const cursosData = [
    // === CICLO I ===
    {
      codigo: "EG-101",
      nombre: "Desarrollo del Pensamiento Lógico Matemático",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 1,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EG-102",
      nombre: "Lectura Crítica y Redacción de Textos Académicos",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 1,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EG-103",
      nombre: "Desarrollo Personal",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 1,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EG-104",
      nombre: "Introducción al Análisis Matemático",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 1,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EG-105",
      nombre: "Estadística General",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 1,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EE-101",
      nombre: "Introducción a la Ingeniería de Sistemas",
      creditos: 2,
      horas_teoria: 1,
      horas_laboratorio: 0,
      ciclo: 1,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EE-102",
      nombre: "Introducción a la Programación",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 1,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-101",
      nombre: "Electivo 1a: Técnicas de comunicación eficaz",
      creditos: 1,
      horas_teoria: 0,
      horas_laboratorio: 0,
      ciclo: 1,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EL-102",
      nombre: "Electivo 1b: Taller de Música",
      creditos: 1,
      horas_teoria: 0,
      horas_laboratorio: 0,
      ciclo: 1,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EL-103",
      nombre: "Electivo 1c: Taller de Liderazgo y trabajo en equipo",
      creditos: 1,
      horas_teoria: 0,
      horas_laboratorio: 0,
      ciclo: 1,
      tiene_laboratorio: false,
      activo: true,
    },

    // === CICLO II ===
    {
      codigo: "EG-201",
      nombre: "Ética, Convivencia Humana y Ciudadanía",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 2,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EG-202",
      nombre: "Sociedad, Cultura y Ecología",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 2,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EG-203",
      nombre: "Cultura Investigativa y Pensamiento Crítico",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 2,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EG-204",
      nombre: "Análisis Matemático",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 2,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EG-205",
      nombre: "Física General",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 2,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-201",
      nombre: "Programación Orientada a Objetos I",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 4,
      ciclo: 2,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-201",
      nombre: "Electivo 2a: Taller de Manejo de TIC",
      credited: 1,
      creditos: 1,
      horas_teoria: 0,
      horas_laboratorio: 2,
      ciclo: 2,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-202",
      nombre: "Electivo 2b: Taller de Danzas Folklóricas",
      creditos: 1,
      horas_teoria: 0,
      horas_laboratorio: 2,
      ciclo: 2,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-203",
      nombre: "Electivo 2c: Taller de Deporte",
      creditos: 1,
      horas_teoria: 0,
      horas_laboratorio: 2,
      ciclo: 2,
      tiene_laboratorio: true,
      activo: true,
    },

    // === CICLO III ===
    {
      codigo: "EP-301",
      nombre: "Administración General",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 3,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EE-301",
      nombre: "Sistémica",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 3,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-302",
      nombre: "Estadística Aplicada",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 3,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-303",
      nombre: "Matemática Aplicada",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 3,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-304",
      nombre: "Física Electrónica",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 3,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-302",
      nombre: "Programación Orientada a Objetos II",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 4,
      ciclo: 3,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-301",
      nombre: "Electivo 3a: Ingeniería Gráfica",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 3,
      ciclo: 3,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-302",
      nombre: "Electivo 3b: Sicología Organizacional",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 3,
      tiene_laboratorio: false,
      activo: true,
    },

    // === CICLO IV ===
    {
      codigo: "EP-401",
      nombre: "Economía General",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 4,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EE-401",
      nombre: "Diseño Web",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 3,
      ciclo: 4,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-402",
      nombre: "Pensamiento de Diseño",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 4,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-403",
      nombre: "Gestión por Procesos",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 4,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-402",
      nombre: "Sistemas Digitales",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 4,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-403",
      nombre: "Estructura de Datos Orientado a Objetos",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 3,
      ciclo: 4,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-401",
      nombre: "Electivo 4a: Computación Gráfica y Visual",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 3,
      ciclo: 4,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-402",
      nombre: "Electivo 4b: Plataformas Tecnológicas",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 4,
      tiene_laboratorio: true,
      activo: true,
    },

    // === CICLO V ===
    {
      codigo: "EP-501",
      nombre: "Contabilidad Gerencial",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-501",
      nombre: "Tecnologías Web",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 3,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-502",
      nombre: "Investigación de Operaciones",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-502",
      nombre: "Ingeniería de Datos I",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 3,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-503",
      nombre: "Arquitectura y Organización de Computadoras",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-504",
      nombre: "Sistemas de Información",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-501",
      nombre: "Electivo 5a: Teleinformática",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-502",
      nombre: "Electivo 5b: Transformación Digital",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },

    // === CICLO VI ===
    {
      codigo: "EP-601",
      nombre: "Finanzas Corporativas",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 6,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-601",
      nombre: "Sistemas Inteligentes",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 6,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-602",
      nombre: "Ingeniería Económica",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 6,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-602",
      nombre: "Ingeniería de Datos II",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 3,
      ciclo: 6,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-603",
      nombre: "Sistemas Operativos",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 6,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-604",
      nombre: "Ingeniería de Requerimientos",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 6,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-601",
      nombre: "Electivo 6a: Ingeniería Ambiental",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 6,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EL-602",
      nombre: "Electivo 6b: Gestión del Talento Humano",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 6,
      tiene_laboratorio: false,
      activo: true,
    },

    // === CICLO VII ===
    {
      codigo: "EP-701",
      nombre: "Cadena de Suministro",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 7,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EE-701",
      nombre: "Gestión de Servicios de TIC",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 7,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EI-701",
      nombre: "Metodología de la Investigación Científica",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 7,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EE-702",
      nombre: "Planeamiento Estratégico de la Información",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 7,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-703",
      nombre: "Redes y Comunicaciones I",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 3,
      ciclo: 7,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-704",
      nombre: "Ingeniería del Software I",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 3,
      ciclo: 7,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-701",
      nombre: "Electivo 7a: Administración de Base de Datos",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 3,
      ciclo: 7,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-702",
      nombre: "Electivo 7b: Negocios Electrónicos",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 7,
      tiene_laboratorio: true,
      activo: true,
    },

    // === CICLO VIII ===
    {
      codigo: "EP-801",
      nombre: "Marketing y Medios Sociales",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 8,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-801",
      nombre: "Seguridad de la Información",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 8,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-802",
      nombre: "Internet de las Cosas",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 3,
      ciclo: 8,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-803",
      nombre: "Inteligencia de Negocios",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 8,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-804",
      nombre: "Redes y Comunicaciones II",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 3,
      ciclo: 8,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-805",
      nombre: "Ingeniería del Software II",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 3,
      ciclo: 8,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-801",
      nombre: "Electivo 8a: Deontología y Derecho Informático",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 8,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EL-802",
      nombre: "Electivo 8b: Arquitectura basada en Microservicios",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 8,
      tiene_laboratorio: true,
      activo: true,
    },

    // === CICLO IX ===
    {
      codigo: "EE-901",
      nombre: "Gestión de Proyectos de TIC",
      creditos: 1,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-902",
      nombre: "Auditoría Informática",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EI-901",
      nombre: "Tesis I",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-903",
      nombre: "Analítica de Negocios",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-904",
      nombre: "Computación en la Nube",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 3,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-905",
      nombre: "Ingeniería Web",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 3,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-901",
      nombre: "Electivo 9a: Emprendedurismo Tecnológico",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EL-902",
      nombre: "Electivo 9b: Hackeo Ético",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },

    // === CICLO X ===
    {
      codigo: "EE-X01",
      nombre: "Sistemas de Información Empresarial",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 3,
      ciclo: 10,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-X02",
      nombre: "Gobierno de TIC",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 10,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EI-X01",
      nombre: "Tesis II",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 10,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-X03",
      nombre: "Arquitectura Empresarial",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 10,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-X01",
      nombre: "Responsabilidad Social Corporativa",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 10,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EE-X04",
      nombre: "Aplicaciones Móviles",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 3,
      ciclo: 10,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-X05",
      nombre: "Prácticas Pre Profesionales",
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 3,
      ciclo: 10,
      tiene_laboratorio: true,
      activo: true,
    },
  ];

  const dbCursos: Curso[] = [];
  for (const c of cursosData) {
    const curso = await cursoRepo.save(cursoRepo.create(c));
    dbCursos.push(curso);
  }
  console.log(
    `✅ ¡Éxito! ${dbCursos.length} cursos reales del Plan de Estudios 2018 creados (100% de la malla curricular)`,
  );

  // ── 6. RELACIÓN CURSO-AMBIENTE (curso_ambiente) ───────────────────────────
  console.log("🔗 Configurando relaciones Curso-Ambiente...");
  const laboratorios = dbAmbientes.filter(
    (a) => a.tipo === TipoAmbiente.LABORATORIO,
  );
  const aulas = dbAmbientes.filter((a) => a.tipo === TipoAmbiente.AULA);

  for (const curso of dbCursos) {
    if (curso.tiene_laboratorio) {
      // Cursos con laboratorio pueden programar teoría en aulas y prácticas en laboratorios
      curso.ambientes = [...aulas, ...laboratorios];
    } else {
      // Cursos teóricos se programan únicamente en aulas
      curso.ambientes = [...aulas];
    }
    await cursoRepo.save(curso);
  }
  console.log(
    "✅ Relaciones Curso-Ambiente mapeadas de forma lógica y consistente\n",
  );

  // ── 7. RELACIÓN DOCENTE-CURSO (DocenteCurso) ─────────────────────────────
  console.log("🔗 Asignando docentes a asignaturas (DocenteCurso)...");
  const asignacionesDocenteCurso = [
    // Juan Carlos Pérez -> Introducción a la Programación y POO I
    { docenteCodigo: "DOC001", cursoCodigo: "EE-102", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC001",
      cursoCodigo: "EE-102",
      tipo: TipoClase.LABORATORIO,
    },
    { docenteCodigo: "DOC001", cursoCodigo: "EE-201", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC001",
      cursoCodigo: "EE-201",
      tipo: TipoClase.LABORATORIO,
    },

    // María Elena García -> POO II y Estructura de Datos
    { docenteCodigo: "DOC002", cursoCodigo: "EE-302", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC002",
      cursoCodigo: "EE-302",
      tipo: TipoClase.LABORATORIO,
    },
    { docenteCodigo: "DOC002", cursoCodigo: "EE-403", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC002",
      cursoCodigo: "EE-403",
      tipo: TipoClase.LABORATORIO,
    },

    // Carlos Alberto López -> Tecnologías Web y Ingeniería de Datos I
    { docenteCodigo: "DOC003", cursoCodigo: "EE-501", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC003",
      cursoCodigo: "EE-501",
      tipo: TipoClase.LABORATORIO,
    },
    { docenteCodigo: "DOC003", cursoCodigo: "EE-502", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC003",
      cursoCodigo: "EE-502",
      tipo: TipoClase.LABORATORIO,
    },

    // Ana Patricia Torres -> Diseño Web y Aplicaciones Móviles
    { docenteCodigo: "DOC004", cursoCodigo: "EE-401", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC004",
      cursoCodigo: "EE-401",
      tipo: TipoClase.LABORATORIO,
    },
    { docenteCodigo: "DOC004", cursoCodigo: "EE-X04", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC004",
      cursoCodigo: "EE-X04",
      tipo: TipoClase.LABORATORIO,
    },

    // Pedro Manuel Ruiz -> Ingeniería de Software I y II
    { docenteCodigo: "DOC005", cursoCodigo: "EE-704", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC005",
      cursoCodigo: "EE-704",
      tipo: TipoClase.LABORATORIO,
    },
    { docenteCodigo: "DOC005", cursoCodigo: "EE-805", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC005",
      cursoCodigo: "EE-805",
      tipo: TipoClase.LABORATORIO,
    },

    // Luis Fernando Vargas -> Redes y Comunicaciones I y II
    { docenteCodigo: "DOC006", cursoCodigo: "EE-703", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC006",
      cursoCodigo: "EE-703",
      tipo: TipoClase.LABORATORIO,
    },
    { docenteCodigo: "DOC006", cursoCodigo: "EE-804", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC006",
      cursoCodigo: "EE-804",
      tipo: TipoClase.LABORATORIO,
    },

    // Rosa Amelia Mendoza -> Sistemas Operativos y Computación en la Nube
    { docenteCodigo: "DOC007", cursoCodigo: "EE-603", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC007",
      cursoCodigo: "EE-603",
      tipo: TipoClase.LABORATORIO,
    },
    { docenteCodigo: "DOC007", cursoCodigo: "EE-904", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC007",
      cursoCodigo: "EE-904",
      tipo: TipoClase.LABORATORIO,
    },

    // Jorge Luis Silva -> Internet de las Cosas y Ingeniería Web
    { docenteCodigo: "DOC008", cursoCodigo: "EE-802", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC008",
      cursoCodigo: "EE-802",
      tipo: TipoClase.LABORATORIO,
    },
    { docenteCodigo: "DOC008", cursoCodigo: "EE-905", tipo: TipoClase.TEORIA },
    {
      docenteCodigo: "DOC008",
      cursoCodigo: "EE-905",
      tipo: TipoClase.LABORATORIO,
    },
  ];

  for (const a of asignacionesDocenteCurso) {
    const doc = dbDocentes.find((d) => d.codigo === a.docenteCodigo);
    const cur = dbCursos.find((c) => c.codigo === a.cursoCodigo);
    if (doc && cur) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: doc.id,
          cursoId: cur.id,
          tipo_clase: a.tipo,
        }),
      );
    }
  }
  console.log("✅ Carga docente asignada coherentemente según especialidad\n");

  // Helper para simular perfiles reales de disponibilidad docente
  const isDocenteDisponible = (
    codigo: string,
    dia: number,
    hora: number,
  ): boolean => {
    switch (codigo) {
      case "DOC001": // Juan Carlos Pérez Rodríguez (Nombrado, Principal)
        // Lunes a Jueves: mañanas y tardes (7:00 a 15:00). Viernes: tardes (14:00 a 22:00)
        if (dia >= 1 && dia <= 4) return hora >= 7 && hora < 15;
        if (dia === 5) return hora >= 14 && hora < 22;
        return false;

      case "DOC002": // María Elena García Sánchez (Nombrado, Asociado)
        // Lunes a Viernes: tarde/noche (14:00 a 22:00)
        return hora >= 14 && hora < 22;

      case "DOC003": // Carlos Alberto López Flores (Nombrado, Auxiliar)
        // Lunes a Jueves: horario partido (8:00 a 12:00 y 15:00 a 19:00). Viernes libre.
        if (dia >= 1 && dia <= 4) {
          return (hora >= 8 && hora < 12) || (hora >= 15 && hora < 19);
        }
        return false;

      case "DOC004": // Ana Patricia Torres Vega (Nombrado, Jefe de Práctica)
        // Lunes, Martes y Miércoles: todo el día (7:00 a 22:00). Jueves y Viernes no disponible.
        return dia >= 1 && dia <= 3;

      case "DOC005": // Pedro Manuel Ruiz Castillo (Nombrado, Principal)
        // Lunes a Viernes: horario partido corporativo (7:00 a 13:00 y 16:00 a 20:00)
        return (hora >= 7 && hora < 13) || (hora >= 16 && hora < 20);

      case "DOC006": // Luis Fernando Vargas Mendoza (Contratado)
        // Solo mañanas (7:00 a 14:00) de lunes a viernes
        return hora >= 7 && hora < 14;

      case "DOC007": // Rosa Amelia Mendoza Torres (Contratado)
        // Solo noches (16:00 a 22:00) de lunes a viernes
        return hora >= 16 && hora < 22;

      case "DOC008": // Jorge Luis Silva Paredes (Contratado)
        // Solo Martes y Jueves todo el día (7:00 a 22:00). Otros días libre.
        return dia === 2 || dia === 4;

      default:
        return true;
    }
  };

  // ── 8. DISPONIBILIDAD DOCENTE (LUNES A VIERNES EN BLOQUES DE 1 HORA CON PERFILES REALES) ─────────────
  console.log(
    "🕐 Registrando disponibilidad horaria en bloques de 1 hora con perfiles reales...",
  );
  const slotsToSave: DisponibilidadDocente[] = [];
  for (const doc of dbDocentes) {
    for (let dia = 1; dia <= 5; dia++) {
      for (let h = 7; h < 22; h++) {
        const hInicio = `${h.toString().padStart(2, "0")}:00:00`;
        const hFin = `${(h + 1).toString().padStart(2, "0")}:00:00`;
        slotsToSave.push(
          disponibilidadRepo.create({
            docente: doc,
            dia_semana: dia,
            hora_inicio: hInicio,
            hora_fin: hFin,
            disponible: isDocenteDisponible(doc.codigo, dia, h),
            periodo_academico: "2026-I",
          }),
        );
      }
    }
  }
  await disponibilidadRepo.save(slotsToSave);
  console.log(
    "✅ Disponibilidad horaria realista (mañanas, tardes, partidos y días libres) registrada exitosamente\n",
  );

  // ── 9. RESTRICCIÓN INSTITUCIONAL Y DÍA NO LABORABLE DE EJEMPLO ──────────
  console.log("⚙️  Configurando parámetros de validación académica...");
  await restriccionRepo.save(
    restriccionRepo.create({
      tipo_restriccion: "MAX_HORAS_DIA",
      valor: { max_horas: 8 },
      periodo_academico: "2026-I",
      activo: true,
    }),
  );
  console.log(
    "✅ Restricción institucional MAX_HORAS_DIA (8 horas) configurada para 2026-I",
  );

  await diaNoLaborableRepo.save(
    diaNoLaborableRepo.create({
      fecha: new Date("2026-05-25"), // Feriado de prueba
      descripcion: "Feriado de Integración Universitaria",
      tipo: "FERIADO",
      periodo_academico: "2026-I",
      afecta_aulas: true,
      afecta_laboratorios: true,
    }),
  );
  console.log(
    "✅ Día no laborable (2026-05-25) creado para pruebas de negocio\n",
  );

  await AppDataSource.destroy();
  console.log("🎉 ¡Seed completado exitosamente con TODOS los 82 cursos!");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("  Cuentas de acceso creadas (todas con clave: Admin123!):");
  console.log("   - admin@unt.edu.pe       (Rol: Administrador)");
  console.log("   - director@unt.edu.pe    (Rol: Director)");
  console.log("   - coordinador@unt.edu.pe (Rol: Coordinador)");
  console.log("   - operador@unt.edu.pe    (Rol: Operador)");
  console.log("   - jperez@unt.edu.pe      (Rol: Docente - Juan Carlos Pérez)");
  console.log("─────────────────────────────────────────────────────────────");
}

seed().catch((error) => {
  console.error("❌ Error durante la ejecución del seed:", error);
  process.exit(1);
});
