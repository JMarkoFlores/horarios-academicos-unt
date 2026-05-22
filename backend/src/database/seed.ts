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
import { TurnoHorario } from "../entities/turno-horario.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { Facultad } from "../entities/facultad.entity";
import { Escuela } from "../entities/escuela.entity";
import { Departamento } from "../entities/departamento.entity";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { ModalidadDocente } from "../common/enums/modalidad-docente.enum";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { EstadoPeriodo } from "../common/enums/estado-periodo.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { ModoAsignacion } from "../common/enums/modo-asignacion.enum";

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
    TurnoHorario,
    DocenteCurso,
    ParametrosCarga,
    Facultad,
    Escuela,
    Departamento,
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
  const tables = [
    "horario_asignado",
    "conflicto_asignacion",
    "preasignacion",
    "cola_docentes",
    "ventana_atencion",
    "seleccion_temporal",
    "disponibilidad_docente",
    "notificacion_docente",
    "preferencias_notificacion",
    "docente_curso",
    "curso_ambiente",
    "grupo",
    "curso",
    "docente",
    "ambiente",
    "periodo_academico",
    "usuario",
    "restriccion_institucional",
    "dia_no_laborable",
    "turno_horario",
    "parametros_carga",
    "departamento",
    "escuela",
    "facultad",
  ];
  for (const table of tables) {
    await AppDataSource.query(
      `DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}') THEN TRUNCATE TABLE "${table}" CASCADE; END IF; END $$`,
    );
  }
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
  const turnoRepo = AppDataSource.getRepository(TurnoHorario);
  const parametrosCargaRepo = AppDataSource.getRepository(ParametrosCarga);

  const passwordHash = await bcrypt.hash("Admin123!", 10);

  // ── TURNOS HORARIOS ────────────────────────────────────────────────────────
  console.log("🕐 Creando turnos horarios...");
  await turnoRepo.save([
    turnoRepo.create({
      nombre: "Mañana",
      hora_inicio: "07:00",
      hora_fin: "13:00",
      activo: true,
    }),
    turnoRepo.create({
      nombre: "Tarde",
      hora_inicio: "14:00",
      hora_fin: "20:00",
      activo: true,
    }),
  ]);
  console.log("✅ Turnos horarios creados\n");

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

  // ── 2. PERÍODOS ACADÉMICOS (CON MODOS DE ASIGNACIÓN PARA PRUEBA) ──────────
  console.log("📅 Creando periodos académicos con modos de asignación...");
  const periodosData = [
    {
      codigo: "2025-I",
      nombre: "Semestre 2025-I",
      fecha_inicio: new Date("2025-03-16"),
      fecha_fin: new Date("2025-07-31"),
      estado: EstadoPeriodo.FINALIZADO,
      activo: false,
      modo_asignacion: ModoAsignacion.VENTANAS,
    },
    {
      codigo: "2025-II",
      nombre: "Semestre 2025-II",
      fecha_inicio: new Date("2025-08-16"),
      fecha_fin: new Date("2025-12-20"),
      estado: EstadoPeriodo.FINALIZADO,
      activo: false,
      modo_asignacion: ModoAsignacion.AUTOMATICA,
    },
    {
      codigo: "2026-I",
      nombre: "Semestre 2026-I",
      fecha_inicio: new Date("2026-03-16"),
      fecha_fin: new Date("2026-07-31"),
      estado: EstadoPeriodo.EN_CURSO,
      activo: true,
      modo_asignacion: ModoAsignacion.MIXTA, // Período activo en modo MIXTA para probar
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
  const apellidosPool = [
    "Pérez",
    "García",
    "López",
    "Torres",
    "Ruiz",
    "Vargas",
    "Mendoza",
    "Silva",
    "Ramos",
    "Sánchez",
    "Díaz",
    "Espinoza",
    "Castro",
    "Rojas",
    "Morales",
    "Quispe",
    "Gutiérrez",
    "Chávez",
    "Flores",
    "Campos",
    "Valdez",
    "Salazar",
    "Ríos",
    "Aguilar",
    "Bermúdez",
  ];
  const nombresPool = [
    "Juan",
    "María",
    "Carlos",
    "Ana",
    "Pedro",
    "Luis",
    "Rosa",
    "Jorge",
    "Miguel",
    "Elena",
    "Roberto",
    "Lucía",
    "Fernando",
    "Sofía",
    "Víctor",
    "Carmen",
    "Raúl",
    "Isabel",
    "Hugo",
    "Patricia",
    "Daniel",
    "Beatriz",
    "Andrés",
    "Mónica",
    "Javier",
  ];

  const dbDocentes: Docente[] = [];
  const modalidadesPool = [
    ModalidadDocente.DEDICACION_EXCLUSIVA,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_20,
    ModalidadDocente.TIEMPO_PARCIAL_12,
    ModalidadDocente.TIEMPO_PARCIAL_10,
    ModalidadDocente.TIEMPO_PARCIAL_8,
  ];

  for (let i = 1; i <= 25; i++) {
    const d = await docenteRepo.save(
      docenteRepo.create({
        codigo: `DOC${i.toString().padStart(3, "0")}`,
        nombres: nombresPool[i - 1],
        apellidos: apellidosPool[i - 1],
        email: `${nombresPool[i - 1].toLowerCase()}.${apellidosPool[i - 1].toLowerCase()}@unt.edu.pe`,
        categoria:
          i <= 5
            ? CategoriaDocente.PRINCIPAL
            : i <= 15
              ? CategoriaDocente.ASOCIADO
              : CategoriaDocente.AUXILIAR,
        tipo_contrato:
          i <= 20 ? TipoContrato.NOMBRADO : TipoContrato.CONTRATADO,
        modalidad: modalidadesPool[(i - 1) % modalidadesPool.length],
        fecha_ingreso: new Date(2000 + (i % 20), 0, 1),
        activo: true,
      }),
    );
    dbDocentes.push(d);

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
    "✅ 25 docentes y sus usuarios de acceso creados correctamente\n",
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
      horas_teoria: 1,
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
      codigo: "EE-X04",
      nombre: "Aplicaciones Móviles",
      creditos: 3,
      horas_teoria: 1,
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
  const laboratorios = dbAmbientes.filter(
    (a) => a.tipo === TipoAmbiente.LABORATORIO,
  );
  const aulas = dbAmbientes.filter((a) => a.tipo === TipoAmbiente.AULA);

  for (const curso of dbCursos) {
    curso.ambientes = curso.tiene_laboratorio
      ? [...aulas, ...laboratorios]
      : [...aulas];
    await cursoRepo.save(curso);
  }
  console.log("✅ Relaciones Curso-Ambiente mapeadas\n");

  // ── 7. HABILITACIONES DOCENTE-CURSO (ESPECIALIZACIÓN POR DEPARTAMENTOS) ──
  console.log(
    "🎓 Distribuyendo 82 cursos entre 25 docentes por especialidad...",
  );

  const depts = [
    {
      nombre: "CIENCIAS_BASICAS",
      docenteIds: [1, 2, 3, 4, 5],
      prefix: ["EG", "EP-302", "EP-303"],
    },
    {
      nombre: "SOFTWARE_ING",
      docenteIds: [6, 7, 8, 9, 10],
      prefix: [
        "EE-102",
        "EE-201",
        "EE-302",
        "EE-401",
        "EE-403",
        "EE-501",
        "EE-704",
        "EE-804",
        "EE-X04",
        "EE-905",
        "EL-401",
        "EL-802",
      ],
    },
    {
      nombre: "SISTEMAS_INF",
      docenteIds: [11, 12, 13, 14, 15],
      prefix: [
        "EE-101",
        "EE-301",
        "EE-504",
        "EE-601",
        "EE-901",
        "EE-902",
        "EE-502",
        "EE-602",
        "EL-701",
        "EE-X01",
        "EE-X03",
      ],
    },
    {
      nombre: "GESTION_TIC",
      docenteIds: [16, 17, 18, 19, 20],
      prefix: [
        "EP-301",
        "EP-401",
        "EP-403",
        "EP-501",
        "EP-601",
        "EP-602",
        "EP-701",
        "EP-801",
        "EP-X01",
        "EL-302",
        "EL-602",
        "EL-901",
      ],
    },
    {
      nombre: "HARDWARE_REDES",
      docenteIds: [21, 22, 23, 24, 25],
      prefix: [
        "EP-304",
        "EE-402",
        "EE-503",
        "EE-603",
        "EE-703",
        "EE-803",
        "EE-804",
        "EE-904",
        "EE-802",
        "EL-501",
        "EL-902",
      ],
    },
  ];

  const habilitacionesRegistradas = new Set<string>();

  // Usar el período activo ya definido anteriormente
  const periodoId = periodoActivo?.id ?? dbPeriodos[0]?.id;

  for (const dept of depts) {
    const docentesDelDept = dbDocentes.filter((_, idx) =>
      dept.docenteIds.includes(idx + 1),
    );
    const cursosDelDept = dbCursos.filter((c) =>
      dept.prefix.some((p) => c.codigo.startsWith(p)),
    );

    for (let i = 0; i < cursosDelDept.length; i++) {
      const curso = cursosDelDept[i];
      const docente = docentesDelDept[i % docentesDelDept.length];

      habilitacionesRegistradas.add(
        `${docente.id}_${curso.id}_${TipoClase.TEORIA}`,
      );
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: docente.id,
          cursoId: curso.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId,
        }),
      );

      if (curso.tiene_laboratorio) {
        const docenteLab = docentesDelDept[(i + 1) % docentesDelDept.length];
        habilitacionesRegistradas.add(
          `${docenteLab.id}_${curso.id}_${TipoClase.LABORATORIO}`,
        );
        await docenteCursoRepo.save(
          docenteCursoRepo.create({
            docenteId: docenteLab.id,
            cursoId: curso.id,
            tipo_clase: TipoClase.LABORATORIO,
            periodoId,
          }),
        );
      }
    }
  }

  console.log("🔗 Verificando cobertura total de cursos...");
  for (const cur of dbCursos) {
    const hasAnyHabilitacion = Array.from(habilitacionesRegistradas).some((h) =>
      h.includes(`_${cur.id}_`),
    );
    if (!hasAnyHabilitacion) {
      const doc = dbDocentes[cur.id % dbDocentes.length];
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: doc.id,
          cursoId: cur.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId,
        }),
      );
      if (cur.tiene_laboratorio) {
        await docenteCursoRepo.save(
          docenteCursoRepo.create({
            docenteId: doc.id,
            cursoId: cur.id,
            tipo_clase: TipoClase.LABORATORIO,
            periodoId,
          }),
        );
      }
    }
  }
  console.log("✅ Distribución académica realista completada\n");

  // ── 7.5. ASIGNACIÓN DE AMBIENTES PREFERENTES A DOCENTES ──────────────────
  console.log(
    "🏢 Asignando aulas y laboratorios preferentes a docentes por departamento...",
  );

  const aulasA = dbAmbientes.filter((a) => a.pabellon === "A");
  const labsB = dbAmbientes.filter((a) => a.pabellon === "B");

  for (const dept of depts) {
    const docentesDelDept = dbDocentes.filter((_, idx) =>
      dept.docenteIds.includes(idx + 1),
    );

    // Asignar ambientes según el nombre del departamento
    let ambientesParaAsignar: Ambiente[] = [];

    if (dept.nombre === "CIENCIAS_BASICAS") {
      ambientesParaAsignar = aulasA.filter((a) =>
        ["A-101", "A-102"].includes(a.codigo),
      );
    } else if (dept.nombre === "SOFTWARE_ING") {
      ambientesParaAsignar = [
        aulasA.find((a) => a.codigo === "A-201")!,
        labsB.find((a) => a.codigo === "LAB-1")!,
      ].filter(Boolean);
    } else if (dept.nombre === "SISTEMAS_INF") {
      ambientesParaAsignar = [
        aulasA.find((a) => a.codigo === "A-202")!,
        labsB.find((a) => a.codigo === "LAB-2")!,
      ].filter(Boolean);
    } else if (dept.nombre === "GESTION_TIC") {
      ambientesParaAsignar = aulasA.filter((a) => ["A-301"].includes(a.codigo));
    } else if (dept.nombre === "HARDWARE_REDES") {
      ambientesParaAsignar = [
        aulasA.find((a) => a.codigo === "A-302")!,
        labsB.find((a) => a.codigo === "LAB-3")!,
        labsB.find((a) => a.codigo === "LAB-4")!,
      ].filter(Boolean);
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
      // Horas válidas: Turno Mañana 07-13 y Turno Tarde 14-20
      const horasValidas = [7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19];
      for (const h of horasValidas) {
        let disponible = false;
        if (idx % 3 === 0)
          disponible = h < 14; // Solo turno mañana
        else if (idx % 3 === 1)
          disponible = h >= 14; // Solo turno tarde
        else disponible = true; // Ambos turnos

        slotsToSave.push(
          disponibilidadRepo.create({
            docente: doc,
            dia_semana: dia,
            hora_inicio: `${h.toString().padStart(2, "0")}:00:00`,
            hora_fin: `${(h + 1).toString().padStart(2, "0")}:00:00`,
            disponible,
            periodo_academico: "2026-I",
          }),
        );
      }
    }
  }
  await disponibilidadRepo.save(slotsToSave);
  console.log("✅ Disponibilidad horaria registrada\n");

  // ── 9. RESTRICCIÓN INSTITUCIONAL ──────────────────────────────────────────
  await restriccionRepo.save(
    restriccionRepo.create({
      tipo_restriccion: "MAX_HORAS_DIA",
      valor: { max_horas: 8 },
      periodo_academico: "2026-I",
      activo: true,
    }),
  );
  console.log("✅ Restricción institucional configurada\n");

  // ── 10. PARÁMETROS DE CARGA DOCENTE ────────────────────────────────────
  console.log("📋 Creando parámetros de carga docente...");
  const parametrosCargaData = [
    // PRINCIPAL NOMBRADO
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "NOMBRADO",
      modalidad: "DEDICACION_EXCLUSIVA",
      horas_min_semanal: 24,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "NOMBRADO",
      modalidad: "TIEMPO_COMPLETO_40",
      horas_min_semanal: 24,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "NOMBRADO",
      modalidad: "TIEMPO_PARCIAL_20",
      horas_min_semanal: 16,
      horas_max_semanal: 20,
      cursos_min_docente: 1,
      cursos_max_docente: 4,
    },
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "NOMBRADO",
      modalidad: "TIEMPO_PARCIAL_12",
      horas_min_semanal: 10,
      horas_max_semanal: 12,
      cursos_min_docente: 1,
      cursos_max_docente: 3,
    },
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "NOMBRADO",
      modalidad: "TIEMPO_PARCIAL_10",
      horas_min_semanal: 8,
      horas_max_semanal: 10,
      cursos_min_docente: 1,
      cursos_max_docente: 2,
    },
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "NOMBRADO",
      modalidad: "TIEMPO_PARCIAL_8",
      horas_min_semanal: 6,
      horas_max_semanal: 8,
      cursos_min_docente: 1,
      cursos_max_docente: 2,
    },
    // PRINCIPAL CONTRATADO
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "CONTRATADO",
      modalidad: "DEDICACION_EXCLUSIVA",
      horas_min_semanal: 30,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "CONTRATADO",
      modalidad: "TIEMPO_COMPLETO_40",
      horas_min_semanal: 30,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "CONTRATADO",
      modalidad: "TIEMPO_PARCIAL_20",
      horas_min_semanal: 16,
      horas_max_semanal: 20,
      cursos_min_docente: 1,
      cursos_max_docente: 4,
    },
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "CONTRATADO",
      modalidad: "TIEMPO_PARCIAL_12",
      horas_min_semanal: 10,
      horas_max_semanal: 12,
      cursos_min_docente: 1,
      cursos_max_docente: 3,
    },
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "CONTRATADO",
      modalidad: "TIEMPO_PARCIAL_10",
      horas_min_semanal: 8,
      horas_max_semanal: 10,
      cursos_min_docente: 1,
      cursos_max_docente: 2,
    },
    {
      periodo_academico: "2026-I",
      categoria: "PRINCIPAL",
      tipo_contrato: "CONTRATADO",
      modalidad: "TIEMPO_PARCIAL_8",
      horas_min_semanal: 6,
      horas_max_semanal: 8,
      cursos_min_docente: 1,
      cursos_max_docente: 2,
    },
    // JEFE_PRACTICA CONTRATADO
    {
      periodo_academico: "2026-I",
      categoria: "JEFE_PRACTICA",
      tipo_contrato: "CONTRATADO",
      modalidad: "TIEMPO_COMPLETO_40",
      horas_min_semanal: 36,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      categoria: "JEFE_PRACTICA",
      tipo_contrato: "CONTRATADO",
      modalidad: "TIEMPO_PARCIAL_20",
      horas_min_semanal: 20,
      horas_max_semanal: 20,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      categoria: "JEFE_PRACTICA",
      tipo_contrato: "CONTRATADO",
      modalidad: "TIEMPO_PARCIAL_12",
      horas_min_semanal: 12,
      horas_max_semanal: 12,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      categoria: "JEFE_PRACTICA",
      tipo_contrato: "CONTRATADO",
      modalidad: "TIEMPO_PARCIAL_10",
      horas_min_semanal: 10,
      horas_max_semanal: 10,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      categoria: "JEFE_PRACTICA",
      tipo_contrato: "CONTRATADO",
      modalidad: "TIEMPO_PARCIAL_8",
      horas_min_semanal: 8,
      horas_max_semanal: 8,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
  ];
  for (const p of parametrosCargaData) {
    await parametrosCargaRepo.save(parametrosCargaRepo.create(p));
  }
  console.log("✅ Parámetros de carga docente registrados\n");

  // ── FACULTADES, ESCUELAS Y DEPARTAMENTOS ────────────────────────────────────
  console.log("🏛️  Creando facultades, escuelas y departamentos...");
  const facultadRepo = AppDataSource.getRepository(Facultad);
  const escuelaRepo = AppDataSource.getRepository(Escuela);
  const departamentoRepo = AppDataSource.getRepository(Departamento);

  // Un coordinador por facultad (rol COORDINADOR_ACADEMICO)
  const coordFacs = await usuarioRepo.save([
    usuarioRepo.create({
      nombre: "Dr. Carlos Sánchez Vásquez",
      email: "coord.fca@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Rosa Mendoza Herrera",
      email: "coord.fcb@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Luis Torres Paredes",
      email: "coord.fce@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. José Espinoza Cruz",
      email: "coord.fcfm@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. María Rodríguez León",
      email: "coord.fcs@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Roberto Flores García",
      email: "coord.fdcp@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Ana Gutiérrez Pérez",
      email: "coord.fecc@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Carmen Vega Ortiz",
      email: "coord.fenf@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Ricardo Castro Morales",
      email: "coord.fest@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Patricia Lozano Díaz",
      email: "coord.ffb@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Miguel Reyes Campos",
      email: "coord.fing@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Fernando Alvarado Ruiz",
      email: "coord.fiq@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Elena Vargas Suárez",
      email: "coord.fm@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
  ]);
  const [
    cFCA,
    cFCB,
    cFCE,
    cFCFM,
    cFCS,
    cFDCP,
    cFECC,
    cFENF,
    cFEST,
    cFFB,
    cFING,
    cFIQ,
    cFM,
  ] = coordFacs;

  // Facultades
  const fca = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FCA",
      nombre: "Facultad de Ciencias Agropecuarias",
      descripcion: "Formación en ciencias del agro y producción animal",
      activo: true,
      coordinador_id: cFCA.id,
    }),
  );
  const fcb = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FCB",
      nombre: "Facultad de Ciencias Biológicas",
      descripcion: "Formación en biología, biología pesquera y microbiología",
      activo: true,
      coordinador_id: cFCB.id,
    }),
  );
  const fce = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FCE",
      nombre: "Facultad de Ciencias Económicas",
      descripcion: "Formación en administración, contabilidad y economía",
      activo: true,
      coordinador_id: cFCE.id,
    }),
  );
  const fcfm = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FCFM",
      nombre: "Facultad de Ciencias Físicas y Matemáticas",
      descripcion:
        "Formación en física, matemáticas, estadística e informática",
      activo: true,
      coordinador_id: cFCFM.id,
    }),
  );
  const fcs = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FCS",
      nombre: "Facultad de Ciencias Sociales",
      descripcion:
        "Formación en antropología, arqueología, historia, trabajo social y turismo",
      activo: true,
      coordinador_id: cFCS.id,
    }),
  );
  const fdcp = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FDCP",
      nombre: "Facultad de Derecho y Ciencias Políticas",
      descripcion: "Formación jurídica y en ciencias políticas",
      activo: true,
      coordinador_id: cFDCP.id,
    }),
  );
  const fecc = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FECC",
      nombre: "Facultad de Educación y Ciencias de la Comunicación",
      descripcion: "Formación docente y en comunicación social",
      activo: true,
      coordinador_id: cFECC.id,
    }),
  );
  const fenf = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FENF",
      nombre: "Facultad de Enfermería",
      descripcion: "Formación en ciencias de la enfermería y salud pública",
      activo: true,
      coordinador_id: cFENF.id,
    }),
  );
  const fest = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FEST",
      nombre: "Facultad de Estomatología",
      descripcion: "Formación en salud bucodental y odontología",
      activo: true,
      coordinador_id: cFEST.id,
    }),
  );
  const ffb = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FFB",
      nombre: "Facultad de Farmacia y Bioquímica",
      descripcion: "Formación en farmacia, bioquímica y ciencias farmacéuticas",
      activo: true,
      coordinador_id: cFFB.id,
    }),
  );
  const fing = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FING",
      nombre: "Facultad de Ingeniería",
      descripcion:
        "Formación en ingenierías civil, de sistemas, industrial, mecánica y más",
      activo: true,
      coordinador_id: cFING.id,
    }),
  );
  const fiq = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FIQ",
      nombre: "Facultad de Ingeniería Química",
      descripcion:
        "Formación en ingeniería química, ambiental, metalúrgica y de minas",
      activo: true,
      coordinador_id: cFIQ.id,
    }),
  );
  const fm = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FM",
      nombre: "Facultad de Medicina",
      descripcion: "Formación en medicina humana y ciencias de la salud",
      activo: true,
      coordinador_id: cFM.id,
    }),
  );

  // Directores de escuela — el mismo usuario coordina la escuela y su departamento (índice 1:1 con escDep)
  const dirEscuelas = await usuarioRepo.save([
    // FCA
    usuarioRepo.create({
      nombre: "Dr. Alejandro Guerrero Paredes",
      email: "dir.eagro@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Mónica Cabrera Ríos",
      email: "dir.eiagri@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Sergio Palomino Vega",
      email: "dir.eiaind@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Lucía Castillo Fuentes",
      email: "dir.ezoot@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FCB
    usuarioRepo.create({
      nombre: "Dr. Hernán Montoya Salinas",
      email: "dir.ecbiol@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Valentina Quispe Arroyo",
      email: "dir.ebpesk@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Óscar Palacios Medina",
      email: "dir.emipar@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FCE
    usuarioRepo.create({
      nombre: "Dra. Claudia Benites Aguilar",
      email: "dir.eadmin@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Raúl Jiménez Contreras",
      email: "dir.ecyfin@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Norma Alcántara Paz",
      email: "dir.eecono@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FCFM
    usuarioRepo.create({
      nombre: "Dr. Arturo Delgado Núñez",
      email: "dir.efisic@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Pilar Cornejo Salazar",
      email: "dir.emates@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Iván Solís Bazán",
      email: "dir.estad@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Fabiola Vilela Tello",
      email: "dir.einfor@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FCS
    usuarioRepo.create({
      nombre: "Dr. Gonzalo Leyva Adrianzén",
      email: "dir.eantro@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Susana Portal Huanca",
      email: "dir.earque@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Hugo Saavedra Orbegoso",
      email: "dir.ehisto@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Natalia Trujillo Burgos",
      email: "dir.etraso@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. César Moncada Valverde",
      email: "dir.eturis@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FDCP
    usuarioRepo.create({
      nombre: "Dr. Enrique Minaya Rodas",
      email: "dir.ederec@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Roxana Bacilio Villena",
      email: "dir.ecpoli@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FECC
    usuarioRepo.create({
      nombre: "Dr. Ernesto Guevara Cisneros",
      email: "dir.ecomun@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Graciela Ocampo Huertas",
      email: "dir.eedini@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Alfredo Zevallos Urteaga",
      email: "dir.eedpri@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Miriam Abanto Quiroz",
      email: "dir.esidio@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Néstor Quispe Vera",
      email: "dir.esicm@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Silvia Anticona Valverde",
      email: "dir.esill@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Jaime Noriega Chomba",
      email: "dir.esicn@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Blanca Vidal Polo",
      email: "dir.esifp@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Rolando Arteaga Briceño",
      email: "dir.esihg@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FENF
    usuarioRepo.create({
      nombre: "Dra. Hilda Morillo Salcedo",
      email: "dir.eenfer@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FEST
    usuarioRepo.create({
      nombre: "Dr. Augusto Pretell Gamboa",
      email: "dir.eestom@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FFB
    usuarioRepo.create({
      nombre: "Dra. Consuelo Alayo Rebaza",
      email: "dir.efybio@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FING
    usuarioRepo.create({
      nombre: "Dr. Damián Florián Julca",
      email: "dir.earqur@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Inés Otiniano Pereda",
      email: "dir.ecivil@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Bruno Domínguez Aguilar",
      email: "dir.eisist@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Lorena Morán Rodríguez",
      email: "dir.einind@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Gilberto Robles Chávez",
      email: "dir.einmec@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Marisol Bueno Terrones",
      email: "dir.einmct@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Dante Polo Chacón",
      email: "dir.einmat@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FIQ
    usuarioRepo.create({
      nombre: "Dra. Yolanda Mostacero Zavaleta",
      email: "dir.eiquim@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Humberto Marín Aguilar",
      email: "dir.eambnt@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dra. Estela Castañeda Azabache",
      email: "dir.emetlu@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    usuarioRepo.create({
      nombre: "Dr. Wilfredo Asmat Abanto",
      email: "dir.eminas@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
    // FM
    usuarioRepo.create({
      nombre: "Dra. Isabel Rebaza Linares",
      email: "dir.emedc@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
  ]);

  // Escuelas + Departamentos — un par por fila
  // { esc: datos de escuela (sin escuela_id), dep: datos del departamento (sin escuela_id) }
  const escDep: Array<{
    esc: Partial<Escuela>;
    dep: { codigo: string; nombre: string };
  }> = [
    // FCA
    {
      esc: { codigo: "EAGRO", nombre: "Agronomía", facultad_id: fca.id },
      dep: { codigo: "DAGRO", nombre: "Departamento de Agronomía" },
    },
    {
      esc: {
        codigo: "EIAGRI",
        nombre: "Ingeniería Agrícola",
        facultad_id: fca.id,
      },
      dep: { codigo: "DIAGRI", nombre: "Departamento de Ingeniería Agrícola" },
    },
    {
      esc: {
        codigo: "EIAIND",
        nombre: "Ingeniería Agroindustrial",
        facultad_id: fca.id,
      },
      dep: {
        codigo: "DIAIND",
        nombre: "Departamento de Ingeniería Agroindustrial",
      },
    },
    {
      esc: { codigo: "EZOOT", nombre: "Zootecnia", facultad_id: fca.id },
      dep: { codigo: "DZOOT", nombre: "Departamento de Zootecnia" },
    },
    // FCB
    {
      esc: {
        codigo: "ECBIOL",
        nombre: "Ciencias Biológicas",
        facultad_id: fcb.id,
      },
      dep: { codigo: "DCBIOL", nombre: "Departamento de Biología" },
    },
    {
      esc: {
        codigo: "EBPESK",
        nombre: "Biología Pesquera",
        facultad_id: fcb.id,
      },
      dep: { codigo: "DBPESK", nombre: "Departamento de Biología Pesquera" },
    },
    {
      esc: {
        codigo: "EMIPAR",
        nombre: "Microbiología y Parasitología",
        facultad_id: fcb.id,
      },
      dep: {
        codigo: "DMIPAR",
        nombre: "Departamento de Microbiología y Parasitología",
      },
    },
    // FCE
    {
      esc: { codigo: "EADMIN", nombre: "Administración", facultad_id: fce.id },
      dep: { codigo: "DADMIN", nombre: "Departamento de Administración" },
    },
    {
      esc: {
        codigo: "ECYFIN",
        nombre: "Contabilidad y Finanzas",
        facultad_id: fce.id,
      },
      dep: {
        codigo: "DCYFIN",
        nombre: "Departamento de Contabilidad y Finanzas",
      },
    },
    {
      esc: { codigo: "EECONO", nombre: "Economía", facultad_id: fce.id },
      dep: { codigo: "DECONO", nombre: "Departamento de Economía" },
    },
    // FCFM
    {
      esc: { codigo: "EFISIC", nombre: "Física", facultad_id: fcfm.id },
      dep: { codigo: "DFISIC", nombre: "Departamento de Física" },
    },
    {
      esc: { codigo: "EMATES", nombre: "Matemáticas", facultad_id: fcfm.id },
      dep: { codigo: "DMATES", nombre: "Departamento de Matemáticas" },
    },
    {
      esc: { codigo: "ESTAD", nombre: "Estadística", facultad_id: fcfm.id },
      dep: { codigo: "DSTAD", nombre: "Departamento de Estadística" },
    },
    {
      esc: { codigo: "EINFOR", nombre: "Informática", facultad_id: fcfm.id },
      dep: { codigo: "DINFOR", nombre: "Departamento de Informática" },
    },
    // FCS
    {
      esc: { codigo: "EANTRO", nombre: "Antropología", facultad_id: fcs.id },
      dep: { codigo: "DANTRO", nombre: "Departamento de Antropología" },
    },
    {
      esc: { codigo: "EARQUE", nombre: "Arqueología", facultad_id: fcs.id },
      dep: { codigo: "DARQUE", nombre: "Departamento de Arqueología" },
    },
    {
      esc: { codigo: "EHISTO", nombre: "Historia", facultad_id: fcs.id },
      dep: { codigo: "DHISTO", nombre: "Departamento de Historia" },
    },
    {
      esc: { codigo: "ETRASO", nombre: "Trabajo Social", facultad_id: fcs.id },
      dep: { codigo: "DTRASO", nombre: "Departamento de Trabajo Social" },
    },
    {
      esc: { codigo: "ETURIS", nombre: "Turismo", facultad_id: fcs.id },
      dep: { codigo: "DTURIS", nombre: "Departamento de Turismo" },
    },
    // FDCP
    {
      esc: { codigo: "EDEREC", nombre: "Derecho", facultad_id: fdcp.id },
      dep: { codigo: "DDEREC", nombre: "Departamento de Derecho" },
    },
    {
      esc: {
        codigo: "ECPOLI",
        nombre: "Ciencias Políticas y Gobernabilidad",
        facultad_id: fdcp.id,
      },
      dep: { codigo: "DCPOLI", nombre: "Departamento de Ciencias Políticas" },
    },
    // FECC
    {
      esc: {
        codigo: "ECOMUN",
        nombre: "Ciencias de la Comunicación",
        facultad_id: fecc.id,
      },
      dep: {
        codigo: "DCOMUN",
        nombre: "Departamento de Ciencias de la Comunicación",
      },
    },
    {
      esc: {
        codigo: "EEDINI",
        nombre: "Educación Inicial",
        facultad_id: fecc.id,
      },
      dep: { codigo: "DEDINI", nombre: "Departamento de Educación" },
    },
    {
      esc: {
        codigo: "EEDPRI",
        nombre: "Educación Primaria",
        facultad_id: fecc.id,
      },
      dep: { codigo: "DEDPRI", nombre: "Departamento de Educación" },
    },
    {
      esc: {
        codigo: "ESIDIO",
        nombre: "Educación Secundaria - Idiomas",
        facultad_id: fecc.id,
      },
      dep: { codigo: "DEDSID", nombre: "Departamento de Educación" },
    },
    {
      esc: {
        codigo: "ESICM",
        nombre: "Educación Secundaria - Ciencias Matemáticas",
        facultad_id: fecc.id,
      },
      dep: { codigo: "DEDSCM", nombre: "Departamento de Educación" },
    },
    {
      esc: {
        codigo: "ESILL",
        nombre: "Educación Secundaria - Lengua y Literatura",
        facultad_id: fecc.id,
      },
      dep: { codigo: "DEDSLL", nombre: "Departamento de Educación" },
    },
    {
      esc: {
        codigo: "ESICN",
        nombre: "Educación Secundaria - Ciencias Naturales",
        facultad_id: fecc.id,
      },
      dep: { codigo: "DEDSCN", nombre: "Departamento de Educación" },
    },
    {
      esc: {
        codigo: "ESIFP",
        nombre:
          "Educación Secundaria - Filosofía, Psicología y Ciencias Sociales",
        facultad_id: fecc.id,
      },
      dep: { codigo: "DEDSFP", nombre: "Departamento de Educación" },
    },
    {
      esc: {
        codigo: "ESIHG",
        nombre: "Educación Secundaria - Historia y Geografía",
        facultad_id: fecc.id,
      },
      dep: { codigo: "DEDSHG", nombre: "Departamento de Educación" },
    },
    // FENF
    {
      esc: { codigo: "EENFER", nombre: "Enfermería", facultad_id: fenf.id },
      dep: { codigo: "DENFER", nombre: "Departamento de Enfermería" },
    },
    // FEST
    {
      esc: { codigo: "EESTOM", nombre: "Estomatología", facultad_id: fest.id },
      dep: { codigo: "DESTOM", nombre: "Departamento de Estomatología" },
    },
    // FFB
    {
      esc: {
        codigo: "EFYBIO",
        nombre: "Farmacia y Bioquímica",
        facultad_id: ffb.id,
      },
      dep: {
        codigo: "DFYBIO",
        nombre: "Departamento de Farmacia y Bioquímica",
      },
    },
    // FING
    {
      esc: {
        codigo: "EARQUR",
        nombre: "Arquitectura y Urbanismo",
        facultad_id: fing.id,
      },
      dep: { codigo: "DARQUR", nombre: "Departamento de Arquitectura" },
    },
    {
      esc: {
        codigo: "ECIVIL",
        nombre: "Ingeniería Civil",
        facultad_id: fing.id,
      },
      dep: { codigo: "DCIVIL", nombre: "Departamento de Ingeniería Civil" },
    },
    {
      esc: {
        codigo: "EISIST",
        nombre: "Ingeniería de Sistemas",
        facultad_id: fing.id,
      },
      dep: {
        codigo: "DISIST",
        nombre: "Departamento de Ingeniería de Sistemas",
      },
    },
    {
      esc: {
        codigo: "EININD",
        nombre: "Ingeniería Industrial",
        facultad_id: fing.id,
      },
      dep: {
        codigo: "DININD",
        nombre: "Departamento de Ingeniería Industrial",
      },
    },
    {
      esc: {
        codigo: "EINMEC",
        nombre: "Ingeniería Mecánica",
        facultad_id: fing.id,
      },
      dep: { codigo: "DINMEC", nombre: "Departamento de Ingeniería Mecánica" },
    },
    {
      esc: {
        codigo: "EINMCT",
        nombre: "Ingeniería Mecatrónica",
        facultad_id: fing.id,
      },
      dep: {
        codigo: "DINMCT",
        nombre: "Departamento de Ingeniería Mecatrónica",
      },
    },
    {
      esc: {
        codigo: "EINMAT",
        nombre: "Ingeniería de Materiales",
        facultad_id: fing.id,
      },
      dep: {
        codigo: "DINMAT",
        nombre: "Departamento de Ingeniería de Materiales",
      },
    },
    // FIQ
    {
      esc: {
        codigo: "EIQUIM",
        nombre: "Ingeniería Química",
        facultad_id: fiq.id,
      },
      dep: { codigo: "DIQUIM", nombre: "Departamento de Ingeniería Química" },
    },
    {
      esc: {
        codigo: "EAMBNT",
        nombre: "Ingeniería Ambiental",
        facultad_id: fiq.id,
      },
      dep: { codigo: "DAMBNT", nombre: "Departamento de Ingeniería Ambiental" },
    },
    {
      esc: {
        codigo: "EMETLU",
        nombre: "Ingeniería Metalúrgica",
        facultad_id: fiq.id,
      },
      dep: {
        codigo: "DMETLU",
        nombre: "Departamento de Ingeniería Metalúrgica",
      },
    },
    {
      esc: {
        codigo: "EMINAS",
        nombre: "Ingeniería de Minas",
        facultad_id: fiq.id,
      },
      dep: { codigo: "DMINAS", nombre: "Departamento de Ingeniería de Minas" },
    },
    // FM
    {
      esc: { codigo: "EMEDC", nombre: "Medicina", facultad_id: fm.id },
      dep: { codigo: "DMEDC", nombre: "Departamento de Medicina" },
    },
  ];

  for (let i = 0; i < escDep.length; i++) {
    const { esc, dep } = escDep[i];
    const coordId = dirEscuelas[i].id;
    const escuela = await escuelaRepo.save(
      escuelaRepo.create({ ...esc, activo: true, coordinador_id: coordId }),
    );
    await departamentoRepo.save(
      departamentoRepo.create({
        ...dep,
        escuela_id: escuela.id,
        activo: true,
        coordinador_id: coordId,
      }),
    );
  }
  console.log(
    `✅ 13 facultades, ${escDep.length} escuelas y ${escDep.length} departamentos creados (con coordinadores)\n`,
  );

  await AppDataSource.destroy();
  console.log(
    "🎉 ¡Seed completado con 25 docentes, 82 cursos, 13 facultades, 45 escuelas y 45 departamentos!",
  );
}

seed().catch((error) => {
  console.error("❌ Error durante la ejecución del seed:", error);
  process.exit(1);
});
