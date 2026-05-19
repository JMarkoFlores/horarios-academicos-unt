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
  const grupoRepo = AppDataSource.getRepository(Grupo);
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

  const dbPeriodos: PeriodoAcademico[] = [];
  for (const p of periodosData) {
    dbPeriodos.push(await periodoRepo.save(periodoRepo.create(p)));
  }
  const periodoActivo = dbPeriodos.find((p) => p.codigo === "2026-I");
  if (!periodoActivo) {
    throw new Error("No se pudo crear el período académico activo 2026-I");
  }
  console.log("✅ Períodos académicos creados (2026-I Activo)\n");

  // ── 3. DOCENTES Y SUS USUARIOS ASOCIADOS (POOL AMPLIADO A 25) ───────────
  console.log("👨‍🏫 Creando pool ampliado de 25 docentes...");
  const apellidosPool = ["Pérez", "García", "López", "Torres", "Ruiz", "Vargas", "Mendoza", "Silva", "Ramos", "Sánchez", "Díaz", "Espinoza", "Castro", "Rojas", "Morales", "Quispe", "Gutiérrez", "Chávez", "Flores", "Campos", "Valdez", "Salazar", "Ríos", "Aguilar", "Bermúdez"];
  const nombresPool = ["Juan", "María", "Carlos", "Ana", "Pedro", "Luis", "Rosa", "Jorge", "Miguel", "Elena", "Roberto", "Lucía", "Fernando", "Sofía", "Víctor", "Carmen", "Raúl", "Isabel", "Hugo", "Patricia", "Daniel", "Beatriz", "Andrés", "Mónica", "Javier"];
  
  const dbDocentes: Docente[] = [];
  for (let i = 1; i <= 25; i++) {
    const d = await docenteRepo.save(docenteRepo.create({
      codigo: `DOC${i.toString().padStart(3, "0")}`,
      nombres: nombresPool[i-1],
      apellidos: apellidosPool[i-1],
      email: `${nombresPool[i-1].toLowerCase()}.${apellidosPool[i-1].toLowerCase()}@unt.edu.pe`,
      categoria: i <= 5 ? CategoriaDocente.PRINCIPAL : i <= 15 ? CategoriaDocente.ASOCIADO : CategoriaDocente.AUXILIAR,
      tipo_contrato: i <= 20 ? TipoContrato.NOMBRADO : TipoContrato.CONTRATADO,
      fecha_ingreso: new Date(2000 + (i % 20), 0, 1),
      activo: true,
    }));
    dbDocentes.push(d);

    await usuarioRepo.save(usuarioRepo.create({
      nombre: `${d.nombres} ${d.apellidos}`,
      email: d.email,
      password_hash: passwordHash,
      rol: RolUsuario.DOCENTE,
      activo: true,
    }));
  }
  console.log("✅ 25 docentes y sus usuarios de acceso creados correctamente\n");

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
    { codigo: "EG-101", nombre: "Desarrollo del Pensamiento Lógico Matemático", creditos: 3, horas_teoria: 2, horas_laboratorio: 0, ciclo: 1, tiene_laboratorio: false, activo: true },
    { codigo: "EG-102", nombre: "Lectura Crítica y Redacción de Textos Académicos", creditos: 3, horas_teoria: 2, horas_laboratorio: 0, ciclo: 1, tiene_laboratorio: false, activo: true },
    { codigo: "EG-103", nombre: "Desarrollo Personal", creditos: 3, horas_teoria: 2, horas_laboratorio: 0, ciclo: 1, tiene_laboratorio: false, activo: true },
    { codigo: "EG-104", nombre: "Introducción al Análisis Matemático", creditos: 4, horas_teoria: 2, horas_laboratorio: 0, ciclo: 1, tiene_laboratorio: false, activo: true },
    { codigo: "EG-105", nombre: "Estadística General", creditos: 4, horas_teoria: 2, horas_laboratorio: 0, ciclo: 1, tiene_laboratorio: false, activo: true },
    { codigo: "EE-101", nombre: "Introducción a la Ingeniería de Sistemas", creditos: 2, horas_teoria: 1, horas_laboratorio: 0, ciclo: 1, tiene_laboratorio: false, activo: true },
    { codigo: "EE-102", nombre: "Introducción a la Programación", creditos: 3, horas_teoria: 2, horas_laboratorio: 2, ciclo: 1, tiene_laboratorio: true, activo: true },
    { codigo: "EL-101", nombre: "Electivo 1a: Técnicas de comunicación eficaz", creditos: 1, horas_teoria: 1, horas_laboratorio: 0, ciclo: 1, tiene_laboratorio: false, activo: true },

    // === CICLO II ===
    { codigo: "EG-201", nombre: "Ética, Convivencia Humana y Ciudadanía", creditos: 3, horas_teoria: 2, horas_laboratorio: 0, ciclo: 2, tiene_laboratorio: false, activo: true },
    { codigo: "EG-202", nombre: "Sociedad, Cultura y Ecología", creditos: 3, horas_teoria: 2, horas_laboratorio: 0, ciclo: 2, tiene_laboratorio: false, activo: true },
    { codigo: "EG-203", nombre: "Cultura Investigativa y Pensamiento Crítico", creditos: 3, horas_teoria: 2, horas_laboratorio: 0, ciclo: 2, tiene_laboratorio: false, activo: true },
    { codigo: "EG-204", nombre: "Análisis Matemático", creditos: 4, horas_teoria: 2, horas_laboratorio: 0, ciclo: 2, tiene_laboratorio: false, activo: true },
    { codigo: "EG-205", nombre: "Física General", creditos: 4, horas_teoria: 2, horas_laboratorio: 2, ciclo: 2, tiene_laboratorio: true, activo: true },
    { codigo: "EE-201", nombre: "Programación Orientada a Objetos I", creditos: 4, horas_teoria: 2, horas_laboratorio: 4, ciclo: 2, tiene_laboratorio: true, activo: true },
    { codigo: "EL-201", nombre: "Electivo 2a: Taller de Manejo de TIC", creditos: 1, horas_teoria: 0, horas_laboratorio: 2, ciclo: 2, tiene_laboratorio: true, activo: true },

    // === CICLO III ===
    { codigo: "EP-301", nombre: "Administración General", creditos: 3, horas_teoria: 2, horas_laboratorio: 0, ciclo: 3, tiene_laboratorio: false, activo: true },
    { codigo: "EE-301", nombre: "Sistémica", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 3, tiene_laboratorio: true, activo: true },
    { codigo: "EP-302", nombre: "Estadística Aplicada", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 3, tiene_laboratorio: true, activo: true },
    { codigo: "EP-303", nombre: "Matemática Aplicada", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 3, tiene_laboratorio: true, activo: true },
    { codigo: "EP-304", nombre: "Física Electrónica", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 3, tiene_laboratorio: true, activo: true },
    { codigo: "EE-302", nombre: "Programación Orientada a Objetos II", creditos: 4, horas_teoria: 2, horas_laboratorio: 4, ciclo: 3, tiene_laboratorio: true, activo: true },
    { codigo: "EL-301", nombre: "Electivo 3a: Ingeniería Gráfica", creditos: 3, horas_teoria: 1, horas_laboratorio: 3, ciclo: 3, tiene_laboratorio: true, activo: true },

    // === CICLO IV ===
    { codigo: "EP-401", nombre: "Economía General", creditos: 3, horas_teoria: 2, horas_laboratorio: 0, ciclo: 4, tiene_laboratorio: false, activo: true },
    { codigo: "EE-401", nombre: "Diseño Web", creditos: 3, horas_teoria: 1, horas_laboratorio: 3, ciclo: 4, tiene_laboratorio: true, activo: true },
    { codigo: "EP-402", nombre: "Pensamiento de Diseño", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 4, tiene_laboratorio: true, activo: true },
    { codigo: "EP-403", nombre: "Gestión por Procesos", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 4, tiene_laboratorio: true, activo: true },
    { codigo: "EE-402", nombre: "Sistemas Digitales", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 4, tiene_laboratorio: true, activo: true },
    { codigo: "EE-403", nombre: "Estructura de Datos Orientado a Objetos", creditos: 4, horas_teoria: 2, horas_laboratorio: 3, ciclo: 4, tiene_laboratorio: true, activo: true },
    { codigo: "EL-401", nombre: "Electivo 4a: Computación Gráfica y Visual", creditos: 3, horas_teoria: 1, horas_laboratorio: 3, ciclo: 4, tiene_laboratorio: true, activo: true },

    // === CICLO V ===
    { codigo: "EP-501", nombre: "Contabilidad Gerencial", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 5, tiene_laboratorio: true, activo: true },
    { codigo: "EE-501", nombre: "Tecnologías Web", creditos: 3, horas_teoria: 1, horas_laboratorio: 3, ciclo: 5, tiene_laboratorio: true, activo: true },
    { codigo: "EP-502", nombre: "Investigación de Operaciones", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 5, tiene_laboratorio: true, activo: true },
    { codigo: "EE-502", nombre: "Ingeniería de Datos I", creditos: 4, horas_teoria: 2, horas_laboratorio: 3, ciclo: 5, tiene_laboratorio: true, activo: true },
    { codigo: "EE-503", nombre: "Arquitectura y Organización de Computadoras", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 5, tiene_laboratorio: true, activo: true },
    { codigo: "EE-504", nombre: "Sistemas de Información", creditos: 4, horas_teoria: 2, horas_laboratorio: 2, ciclo: 5, tiene_laboratorio: true, activo: true },

    // === CICLO VI ===
    { codigo: "EP-601", nombre: "Finanzas Corporativas", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 6, tiene_laboratorio: true, activo: true },
    { codigo: "EE-601", nombre: "Sistemas Inteligentes", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 6, tiene_laboratorio: true, activo: true },
    { codigo: "EP-602", nombre: "Ingeniería Económica", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 6, tiene_laboratorio: true, activo: true },
    { codigo: "EE-602", nombre: "Ingeniería de Datos II", creditos: 4, horas_teoria: 2, horas_laboratorio: 3, ciclo: 6, tiene_laboratorio: true, activo: true },
    { codigo: "EE-603", nombre: "Sistemas Operativos", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 6, tiene_laboratorio: true, activo: true },
    { codigo: "EE-604", nombre: "Ingeniería de Requerimientos", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 6, tiene_laboratorio: true, activo: true },

    // === CICLO VII ===
    { codigo: "EP-701", nombre: "Cadena de Suministro", creditos: 3, horas_teoria: 2, horas_laboratorio: 0, ciclo: 7, tiene_laboratorio: false, activo: true },
    { codigo: "EE-701", nombre: "Gestión de Servicios de TIC", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 7, tiene_laboratorio: true, activo: true },
    { codigo: "EI-701", nombre: "Metodología de la Investigación Científica", creditos: 3, horas_teoria: 2, horas_laboratorio: 0, ciclo: 7, tiene_laboratorio: false, activo: true },
    { codigo: "EE-702", nombre: "Planeamiento Estratégico de la Información", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 7, tiene_laboratorio: true, activo: true },
    { codigo: "EE-703", nombre: "Redes y Comunicaciones I", creditos: 3, horas_teoria: 1, horas_laboratorio: 3, ciclo: 7, tiene_laboratorio: true, activo: true },
    { codigo: "EE-704", nombre: "Ingeniería del Software I", creditos: 4, horas_teoria: 2, horas_laboratorio: 3, ciclo: 7, tiene_laboratorio: true, activo: true },

    // === CICLO VIII ===
    { codigo: "EP-801", nombre: "Marketing y Medios Sociales", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 8, tiene_laboratorio: true, activo: true },
    { codigo: "EE-801", nombre: "Seguridad de la Información", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 8, tiene_laboratorio: true, activo: true },
    { codigo: "EE-802", nombre: "Internet de las Cosas", creditos: 3, horas_teoria: 1, horas_laboratorio: 3, ciclo: 8, tiene_laboratorio: true, activo: true },
    { codigo: "EE-803", nombre: "Inteligencia de Negocios", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 8, tiene_laboratorio: true, activo: true },
    { codigo: "EE-804", nombre: "Redes y Comunicaciones II", creditos: 3, horas_teoria: 1, horas_laboratorio: 3, ciclo: 8, tiene_laboratorio: true, activo: true },
    { codigo: "EE-805", nombre: "Ingeniería del Software II", creditos: 4, horas_teoria: 2, horas_laboratorio: 3, ciclo: 8, tiene_laboratorio: true, activo: true },

    // === CICLO IX ===
    { codigo: "EE-901", nombre: "Gestión de Proyectos de TIC", creditos: 1, horas_teoria: 1, horas_laboratorio: 2, ciclo: 9, tiene_laboratorio: true, activo: true },
    { codigo: "EE-902", nombre: "Auditoría Informática", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 9, tiene_laboratorio: true, activo: true },
    { codigo: "EI-901", nombre: "Tesis I", creditos: 4, horas_teoria: 2, horas_laboratorio: 2, ciclo: 9, tiene_laboratorio: true, activo: true },
    { codigo: "EE-904", nombre: "Computación en la Nube", creditos: 3, horas_teoria: 1, horas_laboratorio: 3, ciclo: 9, tiene_laboratorio: true, activo: true },
    { codigo: "EE-905", nombre: "Ingeniería Web", creditos: 3, horas_teoria: 1, horas_laboratorio: 3, ciclo: 9, tiene_laboratorio: true, activo: true },

    // === CICLO X ===
    { codigo: "EE-X01", nombre: "Sistemas de Información Empresarial", creditos: 4, horas_teoria: 2, horas_laboratorio: 3, ciclo: 10, tiene_laboratorio: true, activo: true },
    { codigo: "EE-X02", nombre: "Gobierno de TIC", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 10, tiene_laboratorio: true, activo: true },
    { codigo: "EI-X01", nombre: "Tesis II", creditos: 4, horas_teoria: 2, horas_laboratorio: 2, ciclo: 10, tiene_laboratorio: true, activo: true },
    { codigo: "EE-X03", nombre: "Arquitectura Empresarial", creditos: 3, horas_teoria: 1, horas_laboratorio: 2, ciclo: 10, tiene_laboratorio: true, activo: true },
    { codigo: "EE-X04", nombre: "Aplicaciones Móviles", creditos: 3, horas_teoria: 1, horas_laboratorio: 3, ciclo: 10, tiene_laboratorio: true, activo: true },
  ];

  const dbCursos: Curso[] = [];
  for (const c of cursosData) {
    const curso = await cursoRepo.save(cursoRepo.create(c));
    dbCursos.push(curso);
  }
  console.log(`✅ ¡Éxito! ${dbCursos.length} cursos reales creados.`);

  console.log("👥 Creando grupos académicos para 2026-I...");
  for (const curso of dbCursos) {
    await grupoRepo.save(
      grupoRepo.create({
        codigo: `${curso.codigo}-G1`,
        nombre: `${curso.nombre} - Grupo 1`,
        ciclo: curso.ciclo,
        cupo_maximo: 40,
        curso,
        periodo_academico: periodoActivo,
      }),
    );
  }
  console.log("✅ Grupos académicos creados\n");

  // ── 6. RELACIÓN CURSO-AMBIENTE ───────────────────────────────────────────
  console.log("🔗 Configurando relaciones Curso-Ambiente...");
  const laboratorios = dbAmbientes.filter((a) => a.tipo === TipoAmbiente.LABORATORIO);
  const aulas = dbAmbientes.filter((a) => a.tipo === TipoAmbiente.AULA);

  for (const curso of dbCursos) {
    curso.ambientes = curso.tiene_laboratorio ? [...aulas, ...laboratorios] : [...aulas];
    await cursoRepo.save(curso);
  }
  console.log("✅ Relaciones Curso-Ambiente mapeadas\n");

  // ── 7. HABILITACIONES DOCENTE-CURSO (ESPECIALIZACIÓN POR DEPARTAMENTOS) ──
  console.log("🎓 Distribuyendo 82 cursos entre 25 docentes por especialidad...");

  const depts = [
    { nombre: "CIENCIAS_BASICAS", docenteIds: [1, 2, 3, 4, 5], prefix: ["EG", "EP-302", "EP-303"] },
    { nombre: "SOFTWARE_ING", docenteIds: [6, 7, 8, 9, 10], prefix: ["EE-102", "EE-201", "EE-302", "EE-401", "EE-403", "EE-501", "EE-704", "EE-804", "EE-X04", "EE-905", "EL-401", "EL-802"] },
    { nombre: "SISTEMAS_INF", docenteIds: [11, 12, 13, 14, 15], prefix: ["EE-101", "EE-301", "EE-504", "EE-601", "EE-901", "EE-902", "EE-502", "EE-602", "EL-701", "EE-X01", "EE-X03"] },
    { nombre: "GESTION_TIC", docenteIds: [16, 17, 18, 19, 20], prefix: ["EP-301", "EP-401", "EP-403", "EP-501", "EP-601", "EP-602", "EP-701", "EP-801", "EP-X01", "EL-302", "EL-602", "EL-901"] },
    { nombre: "HARDWARE_REDES", docenteIds: [21, 22, 23, 24, 25], prefix: ["EP-304", "EE-402", "EE-503", "EE-603", "EE-703", "EE-803", "EE-804", "EE-904", "EE-802", "EL-501", "EL-902"] },
  ];

  const habilitacionesRegistradas = new Set<string>();

  for (const dept of depts) {
    const docentesDelDept = dbDocentes.filter((_, idx) => dept.docenteIds.includes(idx + 1));
    const cursosDelDept = dbCursos.filter(c => dept.prefix.some(p => c.codigo.startsWith(p)));

    for (let i = 0; i < cursosDelDept.length; i++) {
      const curso = cursosDelDept[i];
      const docente = docentesDelDept[i % docentesDelDept.length];

      habilitacionesRegistradas.add(`${docente.id}_${curso.id}_${TipoClase.TEORIA}`);
      await docenteCursoRepo.save(docenteCursoRepo.create({
        docenteId: docente.id,
        cursoId: curso.id,
        tipo_clase: TipoClase.TEORIA
      }));

      if (curso.tiene_laboratorio) {
        const docenteLab = docentesDelDept[(i + 1) % docentesDelDept.length];
        habilitacionesRegistradas.add(`${docenteLab.id}_${curso.id}_${TipoClase.LABORATORIO}`);
        await docenteCursoRepo.save(docenteCursoRepo.create({
          docenteId: docenteLab.id,
          cursoId: curso.id,
          tipo_clase: TipoClase.LABORATORIO
        }));
      }
    }
  }

  console.log("🔗 Verificando cobertura total de cursos...");
  for (const cur of dbCursos) {
    const hasAnyHabilitacion = Array.from(habilitacionesRegistradas).some(h => h.includes(`_${cur.id}_`));
    if (!hasAnyHabilitacion) {
      const doc = dbDocentes[cur.id % dbDocentes.length];
      await docenteCursoRepo.save(docenteCursoRepo.create({
        docenteId: doc.id,
        cursoId: cur.id,
        tipo_clase: TipoClase.TEORIA
      }));
      if (cur.tiene_laboratorio) {
        await docenteCursoRepo.save(docenteCursoRepo.create({
          docenteId: doc.id,
          cursoId: cur.id,
          tipo_clase: TipoClase.LABORATORIO
        }));
      }
    }
  }
  console.log("✅ Distribución académica realista completada\n");

  // ── 7.5. ASIGNACIÓN DE AMBIENTES PREFERENTES A DOCENTES ──────────────────
  console.log("🏢 Asignando aulas y laboratorios preferentes a docentes por departamento...");
  
  const aulasA = dbAmbientes.filter(a => a.pabellon === "A");
  const labsB = dbAmbientes.filter(a => a.pabellon === "B");

  for (const dept of depts) {
    const docentesDelDept = dbDocentes.filter((_, idx) => dept.docenteIds.includes(idx + 1));
    
    // Asignar ambientes según el nombre del departamento
    let ambientesParaAsignar: Ambiente[] = [];
    
    if (dept.nombre === "CIENCIAS_BASICAS") {
      ambientesParaAsignar = aulasA.filter(a => ["A-101", "A-102"].includes(a.codigo));
    } else if (dept.nombre === "SOFTWARE_ING") {
      ambientesParaAsignar = [aulasA.find(a => a.codigo === "A-201")!, labsB.find(a => a.codigo === "LAB-1")!].filter(Boolean);
    } else if (dept.nombre === "SISTEMAS_INF") {
      ambientesParaAsignar = [aulasA.find(a => a.codigo === "A-202")!, labsB.find(a => a.codigo === "LAB-2")!].filter(Boolean);
    } else if (dept.nombre === "GESTION_TIC") {
      ambientesParaAsignar = aulasA.filter(a => ["A-301"].includes(a.codigo));
    } else if (dept.nombre === "HARDWARE_REDES") {
      ambientesParaAsignar = [aulasA.find(a => a.codigo === "A-302")!, labsB.find(a => a.codigo === "LAB-3")!, labsB.find(a => a.codigo === "LAB-4")!].filter(Boolean);
    }

    for (const doc of docentesDelDept) {
      doc.ambientes = ambientesParaAsignar;
      await docenteRepo.save(doc);
    }
  }
  console.log("✅ Ambientes físicos vinculados a docentes correctamente\n");

  // ── 8. DISPONIBILIDAD DOCENTE (SIMULADA REALISTA) ───────────────────────
  console.log("🕐 Registrando disponibilidad horaria realista...");
  const slotsToSave: DisponibilidadDocente[] = [];
  for (const [idx, doc] of dbDocentes.entries()) {
    for (let dia = 1; dia <= 5; dia++) {
      for (let h = 7; h < 22; h++) {
        // Simular turnos: algunos mañana, algunos tarde, algunos partido
        let disponible = false;
        if (idx % 3 === 0) disponible = h < 14; // Turno mañana
        else if (idx % 3 === 1) disponible = h >= 14; // Turno tarde/noche
        else disponible = (h < 13) || (h >= 16 && h < 21); // Turno partido

        slotsToSave.push(disponibilidadRepo.create({
          docente: doc,
          dia_semana: dia,
          hora_inicio: `${h.toString().padStart(2, "0")}:00:00`,
          hora_fin: `${(h + 1).toString().padStart(2, "0")}:00:00`,
          disponible,
          periodo_academico: "2026-I",
        }));
      }
    }
  }
  await disponibilidadRepo.save(slotsToSave);
  console.log("✅ Disponibilidad horaria registrada\n");

  // ── 9. RESTRICCIÓN INSTITUCIONAL ──────────────────────────────────────────
  await restriccionRepo.save(restriccionRepo.create({
    tipo_restriccion: "MAX_HORAS_DIA",
    valor: { max_horas: 8 },
    periodo_academico: "2026-I",
    activo: true,
  }));
  console.log("✅ Restricción institucional configurada\n");

  await AppDataSource.destroy();
  console.log("🎉 ¡Seed completado con 25 docentes y 82 cursos!");
}

seed().catch((error) => {
  console.error("❌ Error durante la ejecución del seed:", error);
  process.exit(1);
});
