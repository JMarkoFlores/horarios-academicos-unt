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
import { CampañaVentanas } from "../entities/campaña-ventanas.entity";
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
import { TipoDocente } from "../common/enums/tipo-docente.enum";
import { ModalidadDocente } from "../common/enums/modalidad-docente.enum";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { EstadoPeriodo } from "../common/enums/estado-periodo.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
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
    CampañaVentanas,
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

  // ── 0. VERIFICAR Y AGREGAR COLUMNA grupos SI NO EXISTE ─────────────────────
  console.log("🔍 Verificando columna grupos en tabla docente_curso...");
  try {
    await AppDataSource.query(`
      ALTER TABLE docente_curso 
      ADD COLUMN IF NOT EXISTS grupos INTEGER DEFAULT 1
    `);
    console.log("✅ Columna grupos verificada/creada");
  } catch (error) {
    console.log("⚠️  Error al verificar columna grupos (puede que ya exista):", error);
  }

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
      hora_fin: "14:00",
      activo: true,
    }),
    turnoRepo.create({
      nombre: "Tarde",
      hora_inicio: "14:00",
      hora_fin: "23:00",
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

  // ── 3. DOCENTES Y SUS USUARIOS ASOCIADOS (DE LOS DATOS DEL PDF) ───────────
  console.log("👨‍🏫 Creando docentes de los datos del PDF...");
  const docentesData = [
    { nombres: "Marcelino", apellidos: "Torres Villanueva", codigo: "DOC001" },
    {
      nombres: "Alberto",
      apellidos: "Mendoza de los Santos",
      codigo: "DOC002",
    },
    { nombres: "Paul", apellidos: "Cotrina Castellanos", codigo: "DOC003" },
    { nombres: "Bertha", apellidos: "Urtecho Zavaleta", codigo: "DOC004" },
    { nombres: "Jose Luis", apellidos: "Ponte Bejarano", codigo: "DOC005" },
    { nombres: "Jorge Luis", apellidos: "Rios Gonzales", codigo: "DOC006" },
    { nombres: "Segundo", apellidos: "Guibar Obeso", codigo: "DOC007" },
    { nombres: "Miguel", apellidos: "Ipanaque Zapata", codigo: "DOC008" },
    { nombres: "Martha", apellidos: "Cardoso", codigo: "DOC009" },
    { nombres: "Zoraida", apellidos: "Vidal Melgarejo", codigo: "DOC010" },
    { nombres: "Everson David", apellidos: "Agreda Gamboa", codigo: "DOC011" },
    { nombres: "Juan Carlos", apellidos: "Obando Roldán", codigo: "DOC012" },
    { nombres: "Marcos", apellidos: "Ferrer Reyna", codigo: "DOC013" },
    { nombres: "Teresita", apellidos: "Rojas Garcia", codigo: "DOC014" },
    { nombres: "Juan", apellidos: "Carrascal Cabanillas", codigo: "DOC015" },
    { nombres: "Vilma", apellidos: "Mendez Gil", codigo: "DOC016" },
    {
      nombres: "Sheyla Laura",
      apellidos: "Escobedo Rodriguez",
      codigo: "DOC017",
    },
    { nombres: "Luis", apellidos: "Boy Chavil", codigo: "DOC018" },
    { nombres: "Robert Jerry", apellidos: "Sánchez Ticona", codigo: "DOC019" },
    { nombres: "Cesar", apellidos: "Arellano Salazar", codigo: "DOC020" },
    { nombres: "Camilo", apellidos: "Suárez Rebaza", codigo: "DOC021" },
    { nombres: "Marcos", apellidos: "Baca Lopez", codigo: "DOC022" },
    { nombres: "Ana", apellidos: "Cuadra Mitzugaray", codigo: "DOC023" },
    { nombres: "Juan Pedro", apellidos: "Santos Fernández", codigo: "DOC024" },
    { nombres: "Ricardo", apellidos: "Mendoza Rivera", codigo: "DOC025" },
    { nombres: "Oscar Romel", apellidos: "Alcántara Moreno", codigo: "DOC026" },
    { nombres: "José", apellidos: "Gómez Ávila", codigo: "DOC027" },
    { nombres: "Jhoe", apellidos: "Gonzalez Vasquez", codigo: "DOC028" },
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

  for (let i = 0; i < docentesData.length; i++) {
    const docData = docentesData[i];
    let tipoDocente: TipoDocente;
    let categoria: CategoriaDocente;
    if (i < 5) {
      tipoDocente = TipoDocente.ORDINARIO;
      categoria = CategoriaDocente.PRINCIPAL;
    } else if (i < 10) {
      tipoDocente = TipoDocente.ORDINARIO;
      categoria = CategoriaDocente.ASOCIADO;
    } else if (i < 18) {
      tipoDocente = TipoDocente.ORDINARIO;
      categoria = CategoriaDocente.AUXILIAR;
    } else if (i < 23) {
      tipoDocente = TipoDocente.CONTRATADO;
      categoria = CategoriaDocente.SIN_CATEGORIA;
    } else {
      tipoDocente = TipoDocente.JEFE_PRACTICA_CONTRATADO;
      categoria = CategoriaDocente.SIN_CATEGORIA;
    }
    const tipoContrato =
      tipoDocente === TipoDocente.ORDINARIO
        ? TipoContrato.NOMBRADO
        : TipoContrato.CONTRATADO;

    const d = await docenteRepo.save(
      docenteRepo.create({
        codigo: docData.codigo,
        nombres: docData.nombres,
        apellidos: docData.apellidos,
        email: `${docData.nombres.toLowerCase().replace(/\s+/g, ".")}.${docData.apellidos.toLowerCase().replace(/\s+/g, ".")}@unt.edu.pe`,
        categoria,
        tipo_docente: tipoDocente,
        tipo_contrato: tipoContrato,
        modalidad: modalidadesPool[i % modalidadesPool.length],
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
    `✅ ${dbDocentes.length} docentes y sus usuarios de acceso creados correctamente\n`,
  );

  // ── 4. AMBIENTES (Aulas de Posgrado y Laboratorios) ──────────────────────────────
  console.log(
    "🏢 Creando ambientes de estudio (posgrado aulas y laboratorios)...",
  );
  const ambientesData = [
    // Aulas de Posgrado
    {
      codigo: "A-301",
      nombre: "Posgrado A-301",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 3,
      pabellon: "A",
      activo: true,
    },
    {
      codigo: "A-303",
      nombre: "Posgrado A-303",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 3,
      pabellon: "A",
      activo: true,
    },
    {
      codigo: "A-307",
      nombre: "Posgrado A-307",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 3,
      pabellon: "A",
      activo: true,
    },
    {
      codigo: "A-311",
      nombre: "Posgrado A-311",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 3,
      pabellon: "A",
      activo: true,
    },
    // Laboratorios
    {
      codigo: "LAB-1",
      nombre: "Lab. 1",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
      piso: 1,
      pabellon: "B",
      activo: true,
    },
    {
      codigo: "LAB-2",
      nombre: "Lab. 2",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
      piso: 1,
      pabellon: "B",
      activo: true,
    },
    {
      codigo: "LAB-3",
      nombre: "Lab. 3",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 25,
      piso: 2,
      pabellon: "B",
      activo: true,
    },
    {
      codigo: "LAB-4",
      nombre: "Lab. 4",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 25,
      piso: 2,
      pabellon: "B",
      activo: true,
    },
    {
      codigo: "LAB-FIS",
      nombre: "Lab. Física",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 25,
      piso: 1,
      pabellon: "B",
      activo: true,
    },
    {
      codigo: "TALLER-CONFECCIONES",
      nombre: "Taller de Confecciones - Ing. Industrial",
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      piso: 2,
      pabellon: "C",
      activo: true,
    },
    {
      codigo: "I-4",
      nombre: "I-4",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 1,
      pabellon: "A",
      activo: true,
    },
    {
      codigo: "II-2",
      nombre: "II-2 (Pabellon Ing. Industrial)",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 2,
      pabellon: "Industrial",
      activo: true,
    },
    {
      codigo: "AUDIOVISUALES",
      nombre: "Audiovisuales",
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      piso: 1,
      pabellon: "A",
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
      horas_teoria: 1,
      horas_practica: 4,
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
      horas_practica: 2,
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
      horas_practica: 2,
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
      horas_practica: 4,
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
      horas_practica: 2,
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
      horas_practica: 2,
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
      horas_practica: 0,
      horas_laboratorio: 2,
      ciclo: 1,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EG-106",
      nombre: "Lengua Nacional y Literatura",
      creditos: 2,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 1,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EG-107",
      nombre: "Matemáticas",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 1,
      tiene_laboratorio: false,
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
      codigo: "EP-305",
      nombre: "Psicología Organizacional",
      creditos: 2,
      horas_teoria: 2,
      horas_practica: 2,
      horas_laboratorio: 0,
      ciclo: 3,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EP-301",
      nombre: "Administración General",
      creditos: 3,
      horas_teoria: 2,
      horas_practica: 2,
      horas_laboratorio: 0,
      ciclo: 3,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EE-301",
      nombre: "Sistémica",
      creditos: 3,
      horas_teoria: 2,
      horas_practica: 1,
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
      horas_practica: 2,
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
      horas_practica: 2,
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
      horas_practica: 2,
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
      nombre: "Ingeniería Gráfica",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 1,
      horas_laboratorio: 2,
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
      codigo: "EE-505",
      nombre: "Transformación Digital",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-506",
      nombre: "Teleinformática",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
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
      nombre: "Tecnología Web",
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
      nombre: "Arquitectura de Computadoras",
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
      nombre: "Cadena de Suministros",
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
      nombre: "Planeamiento Estratégico de TI",
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
      nombre: "Ingeniería de Software I",
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
      codigo: "EE-906",
      nombre: "Analítica de Negocios",
      creditos: 3,
      horas_teoria: 2,
      horas_laboratorio: 0,
      ciclo: 9,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EE-907",
      nombre: "Emprendimiento Tecnológico",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-908",
      nombre: "Hackeo Ético",
      creditos: 3,
      horas_teoria: 1,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
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
  // Mapeo de cursos que necesitan múltiples grupos (según valor G)
  const cursosConGruposMultiples: { [key: string]: number } = {
    // CICLO I
    "EE-102": 2, // Introducción a la Programación

    // CICLO II
    "EE-302": 3, // Programación Orientada a Objetos II
    "EE-301": 3, // Sistémica
    "EL-301": 3, // Ingeniería Gráfica
    "EP-303": 1, // Matemática Aplicada
    "EP-302": 3, // Estadística Aplicada
    "EP-304": 1, // Física Electrónica

    // CICLO III
    "EE-502": 3, // Ingeniería de Datos I
    "EE-504": 3, // Sistemas de Información
    "EE-505": 2, // Transformación digital
    "EE-501": 3, // Tecnología web
    "EE-503": 3, // Arquitectura de computadoras
    "EE-506": 2, // Teleinformática
    "EP-502": 1, // Investigación de Operaciones
    "EP-501": 1, // Contabilidad Gerencial

    // CICLO IV
    "EE-401": 1, // Ingeniería de Software I
    "EE-402": 3, // Redes y Comunicaciones I
    "EE-403": 2, // Gestión de Servicios de TI
    "EE-404": 2, // Administración de Base de Datos
    "EE-405": 4, // Planeamiento Estratégico de TI
    "EE-406": 2, // Negocios Electrónicos

    // CICLO V
    "EE-507": 1, // Tesis I
    "EE-508": 1, // Analítica de Negocios
    "EE-509": 2, // Auditoría Informática
    "EE-510": 3, // Gestión de Proyectos de TI
    "EE-511": 2, // Emprendimiento Tecnológico
    "EE-512": 3, // Ingeniería Web
    "EE-513": 3, // Computación en la Nube
    "EE-514": 2, // Hackeo Ético
  };

  for (const curso of dbCursos) {
    const numGrupos = cursosConGruposMultiples[curso.codigo] || 1;
    for (let g = 1; g <= numGrupos; g++) {
      await grupoRepo.save(
        grupoRepo.create({
          codigo: `${curso.codigo}-G${g}`,
          nombre: `${curso.nombre} - Grupo ${g}`,
          ciclo: curso.ciclo,
          cupo_maximo: 30,
          curso,
          periodo_academico: periodoActivo,
        }),
      );
    }
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
  console.log("🎓 Distribuyendo cursos entre 28 docentes por especialidad...");

  const depts = [
    {
      nombre: "CIENCIAS_BASICAS",
      docenteIds: [4, 5, 6, 7, 8, 16],
      prefix: ["EG", "EP-302", "EP-303"],
    },
    {
      nombre: "SISTEMAS",
      docenteIds: [1, 2, 3, 10, 11, 12, 18, 19, 20, 21, 24, 25, 26, 27],
      prefix: [
        "EE-101",
        "EE-102",
        "EE-201",
        "EE-301",
        "EE-302",
        "EE-401",
        "EE-403",
        "EE-501",
        "EE-502",
        "EE-504",
        "EE-601",
        "EE-602",
        "EE-703",
        "EE-704",
        "EE-802",
        "EE-803",
        "EE-804",
        "EE-901",
        "EE-902",
        "EE-904",
        "EE-905",
        "EE-X01",
        "EE-X03",
        "EE-X04",
        "EL-401",
        "EL-701",
        "EL-802",
      ],
    },
    {
      nombre: "ESTADISTICA",
      docenteIds: [8, 9, 14],
      prefix: [
        "EE-103",
        "EE-203",
        "EE-303",
        "EE-403",
        "EE-503",
        "EE-603",
        "EE-703",
        "EE-803",
        "EE-903",
      ],
    },
    {
      nombre: "ADMINISTRACION",
      docenteIds: [15],
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
      ],
    },
    {
      nombre: "FISICA",
      docenteIds: [16],
      prefix: ["EL-501", "EL-902"],
    },
    {
      nombre: "PSICOLOGIA",
      docenteIds: [4, 17],
      prefix: ["EP-304"],
    },
    {
      nombre: "INDUSTRIAL",
      docenteIds: [22, 28],
      prefix: ["EP-402", "EP-502"],
    },
    {
      nombre: "CONTABILIDAD",
      docenteIds: [23],
      prefix: ["EP-503"],
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

  // ── 8. DISPONIBILIDAD DOCENTE (COMPLETA PARA ASIGNACIONES) ───────────────────────
  console.log(
    "🕐 Registrando disponibilidad horaria completa para asignaciones...",
  );
  const slotsToSave: DisponibilidadDocente[] = [];
  for (const doc of dbDocentes) {
    for (let dia = 1; dia <= 5; dia++) {
      // Horas completas: Turno Mañana 07-14 y Turno Tarde 14-23
      const horasValidas = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
      for (const h of horasValidas) {
        // Todos los docentes tienen disponibilidad completa
        slotsToSave.push(
          disponibilidadRepo.create({
            docente: doc,
            dia_semana: dia,
            hora_inicio: `${h.toString().padStart(2, "0")}:00:00`,
            hora_fin: `${(h + 1).toString().padStart(2, "0")}:00:00`,
            disponible: true,
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
    // ── ORDINARIO | PRINCIPAL ──────────────────────────────────────────────
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "PRINCIPAL",
      modalidad: "DEDICACION_EXCLUSIVA",
      horas_min_semanal: 24,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "PRINCIPAL",
      modalidad: "TIEMPO_COMPLETO_40",
      horas_min_semanal: 24,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "PRINCIPAL",
      modalidad: "TIEMPO_PARCIAL_20",
      horas_min_semanal: 16,
      horas_max_semanal: 20,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "PRINCIPAL",
      modalidad: "TIEMPO_PARCIAL_12",
      horas_min_semanal: 12,
      horas_max_semanal: 12,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "PRINCIPAL",
      modalidad: "TIEMPO_PARCIAL_10",
      horas_min_semanal: 10,
      horas_max_semanal: 10,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "PRINCIPAL",
      modalidad: "TIEMPO_PARCIAL_8",
      horas_min_semanal: 8,
      horas_max_semanal: 8,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    // ── ORDINARIO | ASOCIADO ───────────────────────────────────────────────
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "ASOCIADO",
      modalidad: "DEDICACION_EXCLUSIVA",
      horas_min_semanal: 24,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "ASOCIADO",
      modalidad: "TIEMPO_COMPLETO_40",
      horas_min_semanal: 24,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "ASOCIADO",
      modalidad: "TIEMPO_PARCIAL_20",
      horas_min_semanal: 16,
      horas_max_semanal: 20,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "ASOCIADO",
      modalidad: "TIEMPO_PARCIAL_12",
      horas_min_semanal: 12,
      horas_max_semanal: 12,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "ASOCIADO",
      modalidad: "TIEMPO_PARCIAL_10",
      horas_min_semanal: 10,
      horas_max_semanal: 10,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "ASOCIADO",
      modalidad: "TIEMPO_PARCIAL_8",
      horas_min_semanal: 8,
      horas_max_semanal: 8,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    // ── ORDINARIO | AUXILIAR ───────────────────────────────────────────────
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "AUXILIAR",
      modalidad: "DEDICACION_EXCLUSIVA",
      horas_min_semanal: 24,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "AUXILIAR",
      modalidad: "TIEMPO_COMPLETO_40",
      horas_min_semanal: 24,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "AUXILIAR",
      modalidad: "TIEMPO_PARCIAL_20",
      horas_min_semanal: 16,
      horas_max_semanal: 20,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "AUXILIAR",
      modalidad: "TIEMPO_PARCIAL_12",
      horas_min_semanal: 12,
      horas_max_semanal: 12,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "AUXILIAR",
      modalidad: "TIEMPO_PARCIAL_10",
      horas_min_semanal: 10,
      horas_max_semanal: 10,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "ORDINARIO",
      categoria: "AUXILIAR",
      modalidad: "TIEMPO_PARCIAL_8",
      horas_min_semanal: 8,
      horas_max_semanal: 8,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    // ── CONTRATADO | SIN_CATEGORIA ─────────────────────────────────────────
    {
      periodo_academico: "2026-I",
      tipo_docente: "CONTRATADO",
      categoria: "SIN_CATEGORIA",
      modalidad: "DEDICACION_EXCLUSIVA",
      horas_min_semanal: 30,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "CONTRATADO",
      categoria: "SIN_CATEGORIA",
      modalidad: "TIEMPO_COMPLETO_40",
      horas_min_semanal: 30,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "CONTRATADO",
      categoria: "SIN_CATEGORIA",
      modalidad: "TIEMPO_PARCIAL_20",
      horas_min_semanal: 18,
      horas_max_semanal: 20,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "CONTRATADO",
      categoria: "SIN_CATEGORIA",
      modalidad: "TIEMPO_PARCIAL_12",
      horas_min_semanal: 12,
      horas_max_semanal: 12,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "CONTRATADO",
      categoria: "SIN_CATEGORIA",
      modalidad: "TIEMPO_PARCIAL_10",
      horas_min_semanal: 10,
      horas_max_semanal: 10,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "CONTRATADO",
      categoria: "SIN_CATEGORIA",
      modalidad: "TIEMPO_PARCIAL_8",
      horas_min_semanal: 8,
      horas_max_semanal: 8,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    // ── JEFE_PRACTICA_CONTRATADO | SIN_CATEGORIA (sin Dedicación exclusiva) ─
    {
      periodo_academico: "2026-I",
      tipo_docente: "JEFE_PRACTICA_CONTRATADO",
      categoria: "SIN_CATEGORIA",
      modalidad: "TIEMPO_COMPLETO_40",
      horas_min_semanal: 36,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "JEFE_PRACTICA_CONTRATADO",
      categoria: "SIN_CATEGORIA",
      modalidad: "TIEMPO_PARCIAL_20",
      horas_min_semanal: 20,
      horas_max_semanal: 20,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "JEFE_PRACTICA_CONTRATADO",
      categoria: "SIN_CATEGORIA",
      modalidad: "TIEMPO_PARCIAL_12",
      horas_min_semanal: 12,
      horas_max_semanal: 12,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "JEFE_PRACTICA_CONTRATADO",
      categoria: "SIN_CATEGORIA",
      modalidad: "TIEMPO_PARCIAL_10",
      horas_min_semanal: 10,
      horas_max_semanal: 10,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    },
    {
      periodo_academico: "2026-I",
      tipo_docente: "JEFE_PRACTICA_CONTRATADO",
      categoria: "SIN_CATEGORIA",
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

  // Helper functions
  const getDocente = (nombreCompleto: string) => {
    return (
      dbDocentes.find(
        (d) => `${d.nombres} ${d.apellidos}` === nombreCompleto,
      ) || dbDocentes[0]
    );
  };
  const getCurso = (nombre: string) => {
    return dbCursos.find((c) => c.nombre === nombre) || dbCursos[0];
  };
  const getAmbiente = (nombre: string) => {
    const key = nombre.toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
    return (
      dbAmbientes.find((a) =>
        a.nombre
          .toLowerCase()
          .replace(/\./g, "")
          .replace(/\s+/g, "")
          .includes(key),
      ) || dbAmbientes[0]
    );
  };
  const diaToNumber = (dia: string) => {
    const map: Record<string, number> = {
      lunes: 1,
      martes: 2,
      miércoles: 3,
      jueves: 4,
      viernes: 5,
      sábado: 6,
    };
    return map[dia.toLowerCase()];
  };
  const horaToStr = (h: string) => {
    const [h1, h2] = h.split("-").map((x) => parseInt(x.trim()));
    return [
      `${String(h1).padStart(2, "0")}:00`,
      `${String(h2).padStart(2, "0")}:00`,
    ];
  };

  // Lista de asignaciones del PDF
  const horariosData = [
    // CICLO I
    {
      curso: "Introducción a la Programación",
      docente: "Marcelino Torres Villanueva",
      dia: "Lunes",
      hora: "7-8",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Introducción a la Programación",
      docente: "Marcelino Torres Villanueva",
      dia: "Lunes",
      hora: "8-9",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Introducción a la Programación",
      docente: "Marcelino Torres Villanueva",
      dia: "Lunes",
      hora: "2-3",
      ambiente: "Lab. 3",
    },
    {
      curso: "Introducción a la Programación",
      docente: "Marcelino Torres Villanueva",
      dia: "Lunes",
      hora: "3-4",
      ambiente: "Lab. 3",
    },
    {
      curso: "Introducción a la Programación",
      docente: "Marcelino Torres Villanueva",
      dia: "Lunes",
      hora: "4-5",
      ambiente: "Lab. 3",
    },
    {
      curso: "Introducción a la Programación",
      docente: "Marcelino Torres Villanueva",
      dia: "Lunes",
      hora: "5-6",
      ambiente: "Lab. 3",
    },
    {
      curso: "Introducción a la Ingeniería de Sistemas",
      docente: "Alberto Mendoza de los Santos",
      dia: "Martes",
      hora: "7-8",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Introducción a la Ingeniería de Sistemas",
      docente: "Alberto Mendoza de los Santos",
      dia: "Martes",
      hora: "8-9",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Introducción a la Ingeniería de Sistemas",
      docente: "Alberto Mendoza de los Santos",
      dia: "Martes",
      hora: "9-10",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Desarrollo del Pensamiento Lógico Matemático",
      docente: "Jose Luis Ponte Bejarano",
      dia: "Martes",
      hora: "10-11",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Desarrollo del Pensamiento Lógico Matemático",
      docente: "Jose Luis Ponte Bejarano",
      dia: "Martes",
      hora: "11-12",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Introducción al Análisis Matemático",
      docente: "Segundo Guibar Obeso",
      dia: "Martes",
      hora: "4-5",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Introducción al Análisis Matemático",
      docente: "Segundo Guibar Obeso",
      dia: "Martes",
      hora: "5-6",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Introducción a la Programación",
      docente: "Paul Cotrina Castellanos",
      dia: "Jueves",
      hora: "9-10",
      ambiente: "Lab. 4",
    },
    {
      curso: "Introducción a la Programación",
      docente: "Paul Cotrina Castellanos",
      dia: "Jueves",
      hora: "10-11",
      ambiente: "Lab. 4",
    },
    {
      curso: "Introducción a la Programación",
      docente: "Paul Cotrina Castellanos",
      dia: "Jueves",
      hora: "11-12",
      ambiente: "Lab. 4",
    },
    {
      curso: "Lectura Crítica y Redacción de Textos Académicos",
      docente: "Jorge Luis Rios Gonzales",
      dia: "Jueves",
      hora: "2-3",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Lectura Crítica y Redacción de Textos Académicos",
      docente: "Jorge Luis Rios Gonzales",
      dia: "Jueves",
      hora: "3-4",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Lectura Crítica y Redacción de Textos Académicos",
      docente: "Jorge Luis Rios Gonzales",
      dia: "Jueves",
      hora: "4-5",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Lectura Crítica y Redacción de Textos Académicos",
      docente: "Jorge Luis Rios Gonzales",
      dia: "Jueves",
      hora: "5-6",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Estadística General",
      docente: "Miguel Ipanaque Zapata",
      dia: "Jueves",
      hora: "7-8",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Estadística General",
      docente: "Miguel Ipanaque Zapata",
      dia: "Jueves",
      hora: "8-9",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Desarrollo Personal",
      docente: "Bertha Urtecho Zavaleta",
      dia: "Viernes",
      hora: "9-10",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Desarrollo Personal",
      docente: "Bertha Urtecho Zavaleta",
      dia: "Viernes",
      hora: "10-11",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Desarrollo Personal",
      docente: "Bertha Urtecho Zavaleta",
      dia: "Viernes",
      hora: "11-12",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Desarrollo del Pensamiento Lógico Matemático",
      docente: "Jose Luis Ponte Bejarano",
      dia: "Viernes",
      hora: "7-8",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Desarrollo del Pensamiento Lógico Matemático",
      docente: "Jose Luis Ponte Bejarano",
      dia: "Viernes",
      hora: "8-9",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Introducción al Análisis Matemático",
      docente: "Segundo Guibar Obeso",
      dia: "Lunes",
      hora: "9-10",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Introducción al Análisis Matemático",
      docente: "Segundo Guibar Obeso",
      dia: "Lunes",
      hora: "10-11",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Introducción al Análisis Matemático",
      docente: "Segundo Guibar Obeso",
      dia: "Lunes",
      hora: "11-12",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Estadística General",
      docente: "Martha Cardoso",
      dia: "Viernes",
      hora: "2-3",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Estadística General",
      docente: "Martha Cardoso",
      dia: "Viernes",
      hora: "3-4",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Estadística General",
      docente: "Martha Cardoso",
      dia: "Viernes",
      hora: "4-5",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Estadística General",
      docente: "Martha Cardoso",
      dia: "Viernes",
      hora: "5-6",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },

    // CICLO III
    {
      curso: "Programación Orientada a Objetos II",
      docente: "Zoraida Vidal Melgarejo",
      dia: "Lunes",
      hora: "9-10",
      ambiente: "Lab. 2",
    },
    {
      curso: "Programación Orientada a Objetos II",
      docente: "Zoraida Vidal Melgarejo",
      dia: "Lunes",
      hora: "10-11",
      ambiente: "Lab. 2",
    },
    {
      curso: "Programación Orientada a Objetos II",
      docente: "Zoraida Vidal Melgarejo",
      dia: "Lunes",
      hora: "11-12",
      ambiente: "Lab. 2",
    },
    {
      curso: "Programación Orientada a Objetos II",
      docente: "Zoraida Vidal Melgarejo",
      dia: "Martes",
      hora: "9-10",
      ambiente: "Lab. 2",
    },
    {
      curso: "Programación Orientada a Objetos II",
      docente: "Zoraida Vidal Melgarejo",
      dia: "Martes",
      hora: "10-11",
      ambiente: "Lab. 2",
    },
    {
      curso: "Programación Orientada a Objetos II",
      docente: "Zoraida Vidal Melgarejo",
      dia: "Martes",
      hora: "11-12",
      ambiente: "Lab. 2",
    },
    {
      curso: "Programación Orientada a Objetos II",
      docente: "Zoraida Vidal Melgarejo",
      dia: "Martes",
      hora: "2-3",
      ambiente: "I-4",
    },
    {
      curso: "Programación Orientada a Objetos II",
      docente: "Zoraida Vidal Melgarejo",
      dia: "Viernes",
      hora: "9-10",
      ambiente: "Lab. 4",
    },
    {
      curso: "Programación Orientada a Objetos II",
      docente: "Zoraida Vidal Melgarejo",
      dia: "Viernes",
      hora: "10-11",
      ambiente: "Lab. 4",
    },
    {
      curso: "Programación Orientada a Objetos II",
      docente: "Zoraida Vidal Melgarejo",
      dia: "Viernes",
      hora: "11-12",
      ambiente: "Lab. 4",
    },
    {
      curso: "Sistémica",
      docente: "Everson David Agreda Gamboa",
      dia: "Miércoles",
      hora: "9-10",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Sistémica",
      docente: "Everson David Agreda Gamboa",
      dia: "Miércoles",
      hora: "10-11",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Sistémica",
      docente: "Everson David Agreda Gamboa",
      dia: "Miércoles",
      hora: "11-12",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Sistémica",
      docente: "Everson David Agreda Gamboa",
      dia: "Miércoles",
      hora: "2-3",
      ambiente: "Lab. 3",
    },
    {
      curso: "Sistémica",
      docente: "Everson David Agreda Gamboa",
      dia: "Miércoles",
      hora: "3-4",
      ambiente: "Lab. 3",
    },
    {
      curso: "Sistémica",
      docente: "Everson David Agreda Gamboa",
      dia: "Miércoles",
      hora: "4-5",
      ambiente: "Lab. 3",
    },
    {
      curso: "Sistémica",
      docente: "Everson David Agreda Gamboa",
      dia: "Jueves",
      hora: "4-5",
      ambiente: "Lab. 3",
    },
    {
      curso: "Sistémica",
      docente: "Everson David Agreda Gamboa",
      dia: "Jueves",
      hora: "5-6",
      ambiente: "Lab. 3",
    },
    {
      curso: "Ingeniería Gráfica",
      docente: "Juan Carlos Obando Roldán",
      dia: "Miércoles",
      hora: "7-8",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Ingeniería Gráfica",
      docente: "Juan Carlos Obando Roldán",
      dia: "Miércoles",
      hora: "8-9",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Ingeniería Gráfica",
      docente: "Juan Carlos Obando Roldán",
      dia: "Jueves",
      hora: "8-9",
      ambiente: "Lab. 1",
    },
    {
      curso: "Ingeniería Gráfica",
      docente: "Juan Carlos Obando Roldán",
      dia: "Jueves",
      hora: "9-10",
      ambiente: "Lab. 1",
    },
    {
      curso: "Ingeniería Gráfica",
      docente: "Juan Carlos Obando Roldán",
      dia: "Jueves",
      hora: "10-11",
      ambiente: "Lab. 1",
    },
    {
      curso: "Ingeniería Gráfica",
      docente: "Juan Carlos Obando Roldán",
      dia: "Jueves",
      hora: "11-12",
      ambiente: "Lab. 1",
    },
    {
      curso: "Matemática Aplicada",
      docente: "Marcos Ferrer Reyna",
      dia: "Jueves",
      hora: "2-3",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Matemática Aplicada",
      docente: "Marcos Ferrer Reyna",
      dia: "Jueves",
      hora: "3-4",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Matemática Aplicada",
      docente: "Marcos Ferrer Reyna",
      dia: "Miércoles",
      hora: "6-7",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Matemática Aplicada",
      docente: "Marcos Ferrer Reyna",
      dia: "Miércoles",
      hora: "7-8",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Matemática Aplicada",
      docente: "Marcos Ferrer Reyna",
      dia: "Miércoles",
      hora: "8-9",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Estadística Aplicada",
      docente: "Teresita Rojas García",
      dia: "Martes",
      hora: "4-5",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Estadística Aplicada",
      docente: "Teresita Rojas García",
      dia: "Martes",
      hora: "5-6",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Estadística Aplicada",
      docente: "Teresita Rojas García",
      dia: "Jueves",
      hora: "6-7",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Estadística Aplicada",
      docente: "Teresita Rojas García",
      dia: "Jueves",
      hora: "7-8",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Estadística Aplicada",
      docente: "Teresita Rojas García",
      dia: "Jueves",
      hora: "8-9",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Estadística Aplicada",
      docente: "Teresita Rojas García",
      dia: "Viernes",
      hora: "7-8",
      ambiente: "Taller de Confecciones (Ing. Industrial)",
    },
    {
      curso: "Estadística Aplicada",
      docente: "Teresita Rojas García",
      dia: "Viernes",
      hora: "8-9",
      ambiente: "Taller de Confecciones (Ing. Industrial)",
    },
    {
      curso: "Estadística Aplicada",
      docente: "Teresita Rojas García",
      dia: "Viernes",
      hora: "4-5",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Estadística Aplicada",
      docente: "Teresita Rojas García",
      dia: "Viernes",
      hora: "5-6",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Administración General",
      docente: "Juan Carrascal Cabanillas",
      dia: "Lunes",
      hora: "7-8",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Administración General",
      docente: "Juan Carrascal Cabanillas",
      dia: "Lunes",
      hora: "8-9",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Administración General",
      docente: "Juan Carrascal Cabanillas",
      dia: "Martes",
      hora: "7-8",
      ambiente: "II-2 (Pabellon Ing. Industrial)",
    },
    {
      curso: "Administración General",
      docente: "Juan Carrascal Cabanillas",
      dia: "Martes",
      hora: "8-9",
      ambiente: "II-2 (Pabellon Ing. Industrial)",
    },
    {
      curso: "Física Electrónica",
      docente: "Vilma Méndez Gil",
      dia: "Lunes",
      hora: "3-4",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Física Electrónica",
      docente: "Vilma Méndez Gil",
      dia: "Lunes",
      hora: "4-5",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Física Electrónica",
      docente: "Vilma Méndez Gil",
      dia: "Lunes",
      hora: "5-6",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Física Electrónica",
      docente: "Vilma Méndez Gil",
      dia: "Miércoles",
      hora: "2-3",
      ambiente: "Lab. Física",
    },
    {
      curso: "Física Electrónica",
      docente: "Vilma Méndez Gil",
      dia: "Miércoles",
      hora: "3-4",
      ambiente: "Lab. Física",
    },
    {
      curso: "Física Electrónica",
      docente: "Vilma Méndez Gil",
      dia: "Miércoles",
      hora: "4-5",
      ambiente: "Lab. Física",
    },
    {
      curso: "Física Electrónica",
      docente: "Vilma Méndez Gil",
      dia: "Jueves",
      hora: "7-8",
      ambiente: "Lab. Física",
    },
    {
      curso: "Física Electrónica",
      docente: "Vilma Méndez Gil",
      dia: "Jueves",
      hora: "8-9",
      ambiente: "Lab. Física",
    },
    {
      curso: "Física Electrónica",
      docente: "Vilma Méndez Gil",
      dia: "Jueves",
      hora: "9-10",
      ambiente: "Lab. Física",
    },
    {
      curso: "Física Electrónica",
      docente: "Vilma Méndez Gil",
      dia: "Jueves",
      hora: "10-11",
      ambiente: "Lab. Física",
    },
    {
      curso: "Psicología Organizacional",
      docente: "Sheyla Laura Escobedo Rodríguez",
      dia: "Martes",
      hora: "6-7",
      ambiente: "posgrado A-311",
    },
    {
      curso: "Psicología Organizacional",
      docente: "Sheyla Laura Escobedo Rodríguez",
      dia: "Martes",
      hora: "7-8",
      ambiente: "posgrado A-311",
    },
    {
      curso: "Psicología Organizacional",
      docente: "Sheyla Laura Escobedo Rodríguez",
      dia: "Viernes",
      hora: "6-7",
      ambiente: "posgrado A-311",
    },
    {
      curso: "Psicología Organizacional",
      docente: "Sheyla Laura Escobedo Rodríguez",
      dia: "Viernes",
      hora: "7-8",
      ambiente: "posgrado A-311",
    },

    // CICLO V
    {
      curso: "Ingeniería de Datos I",
      docente: "Luis Boy Chavil",
      dia: "Lunes",
      hora: "7-8",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Ingeniería de Datos I",
      docente: "Luis Boy Chavil",
      dia: "Lunes",
      hora: "8-9",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Ingeniería de Datos I",
      docente: "Luis Boy Chavil",
      dia: "Lunes",
      hora: "9-10",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Ingeniería de Datos I",
      docente: "Luis Boy Chavil",
      dia: "Lunes",
      hora: "10-11",
      ambiente: "Lab. 4",
    },
    {
      curso: "Ingeniería de Datos I",
      docente: "Luis Boy Chavil",
      dia: "Lunes",
      hora: "11-12",
      ambiente: "Lab. 4",
    },
    {
      curso: "Ingeniería de Datos I",
      docente: "Luis Boy Chavil",
      dia: "Martes",
      hora: "7-8",
      ambiente: "Lab. 4",
    },
    {
      curso: "Ingeniería de Datos I",
      docente: "Luis Boy Chavil",
      dia: "Martes",
      hora: "8-9",
      ambiente: "Lab. 4",
    },
    {
      curso: "Ingeniería de Datos I",
      docente: "Luis Boy Chavil",
      dia: "Martes",
      hora: "9-10",
      ambiente: "Lab. 4",
    },
    {
      curso: "Ingeniería de Datos I",
      docente: "Luis Boy Chavil",
      dia: "Martes",
      hora: "10-11",
      ambiente: "Lab. 4",
    },
    {
      curso: "Ingeniería de Datos I",
      docente: "Luis Boy Chavil",
      dia: "Martes",
      hora: "11-12",
      ambiente: "Lab. 4",
    },
    {
      curso: "Sistemas de Información",
      docente: "Juan Carlos Obando Roldán",
      dia: "Miércoles",
      hora: "9-10",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Sistemas de Información",
      docente: "Juan Carlos Obando Roldán",
      dia: "Miércoles",
      hora: "10-11",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Sistemas de Información",
      docente: "Juan Carlos Obando Roldán",
      dia: "Miércoles",
      hora: "11-12",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Sistemas de Información",
      docente: "Juan Carlos Obando Roldán",
      dia: "Miércoles",
      hora: "2-3",
      ambiente: "Lab. 1",
    },
    {
      curso: "Sistemas de Información",
      docente: "Juan Carlos Obando Roldán",
      dia: "Miércoles",
      hora: "3-4",
      ambiente: "Lab. 1",
    },
    {
      curso: "Sistemas de Información",
      docente: "Juan Carlos Obando Roldán",
      dia: "Miércoles",
      hora: "4-5",
      ambiente: "Lab. 1",
    },
    {
      curso: "Sistemas de Información",
      docente: "Juan Carlos Obando Roldán",
      dia: "Miércoles",
      hora: "5-6",
      ambiente: "Lab. 1",
    },
    {
      curso: "Transformación Digital",
      docente: "Everson David Agreda Gamboa",
      dia: "Jueves",
      hora: "7-8",
      ambiente: "Lab. 3",
    },
    {
      curso: "Transformación Digital",
      docente: "Everson David Agreda Gamboa",
      dia: "Jueves",
      hora: "8-9",
      ambiente: "Lab. 3",
    },
    {
      curso: "Transformación Digital",
      docente: "Everson David Agreda Gamboa",
      dia: "Jueves",
      hora: "9-10",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Transformación Digital",
      docente: "Everson David Agreda Gamboa",
      dia: "Jueves",
      hora: "10-11",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Transformación Digital",
      docente: "Everson David Agreda Gamboa",
      dia: "Jueves",
      hora: "11-12",
      ambiente: "Lab. 3",
    },
    {
      curso: "Tecnología Web",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Lunes",
      hora: "3-4",
      ambiente: "Lab. 1",
    },
    {
      curso: "Tecnología Web",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Lunes",
      hora: "4-5",
      ambiente: "Lab. 1",
    },
    {
      curso: "Tecnología Web",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Lunes",
      hora: "5-6",
      ambiente: "Lab. 1",
    },
    {
      curso: "Tecnología Web",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Martes",
      hora: "3-4",
      ambiente: "Lab. 1",
    },
    {
      curso: "Tecnología Web",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Martes",
      hora: "4-5",
      ambiente: "Lab. 1",
    },
    {
      curso: "Tecnología Web",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Martes",
      hora: "5-6",
      ambiente: "Lab. 1",
    },
    {
      curso: "Tecnología Web",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Miércoles",
      hora: "7-8",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Tecnología Web",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Jueves",
      hora: "3-4",
      ambiente: "Lab. 4",
    },
    {
      curso: "Tecnología Web",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Jueves",
      hora: "4-5",
      ambiente: "Lab. 4",
    },
    {
      curso: "Tecnología Web",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Jueves",
      hora: "5-6",
      ambiente: "Lab. 4",
    },
    {
      curso: "Arquitectura de Computadoras",
      docente: "Cesar Arellano Salazar",
      dia: "Viernes",
      hora: "9-10",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Arquitectura de Computadoras",
      docente: "Cesar Arellano Salazar",
      dia: "Viernes",
      hora: "10-11",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Arquitectura de Computadoras",
      docente: "Cesar Arellano Salazar",
      dia: "Viernes",
      hora: "11-12",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Arquitectura de Computadoras",
      docente: "Cesar Arellano Salazar",
      dia: "Miércoles",
      hora: "2-3",
      ambiente: "Lab. 2",
    },
    {
      curso: "Arquitectura de Computadoras",
      docente: "Cesar Arellano Salazar",
      dia: "Miércoles",
      hora: "3-4",
      ambiente: "Lab. 2",
    },
    {
      curso: "Arquitectura de Computadoras",
      docente: "Cesar Arellano Salazar",
      dia: "Miércoles",
      hora: "4-5",
      ambiente: "Lab. 2",
    },
    {
      curso: "Arquitectura de Computadoras",
      docente: "Cesar Arellano Salazar",
      dia: "Miércoles",
      hora: "5-6",
      ambiente: "Lab. 2",
    },
    {
      curso: "Arquitectura de Computadoras",
      docente: "Cesar Arellano Salazar",
      dia: "Miércoles",
      hora: "6-7",
      ambiente: "Lab. 2",
    },
    {
      curso: "Arquitectura de Computadoras",
      docente: "Cesar Arellano Salazar",
      dia: "Miércoles",
      hora: "7-8",
      ambiente: "Lab. 2",
    },
    {
      curso: "Teleinformática",
      docente: "Camilo Suárez Rebaza",
      dia: "Martes",
      hora: "1-2",
      ambiente: "Lab. 2",
    },
    {
      curso: "Teleinformática",
      docente: "Camilo Suárez Rebaza",
      dia: "Martes",
      hora: "2-3",
      ambiente: "Lab. 2",
    },
    {
      curso: "Teleinformática",
      docente: "Camilo Suárez Rebaza",
      dia: "Martes",
      hora: "7-8",
      ambiente: "Lab. 2",
    },
    {
      curso: "Teleinformática",
      docente: "Camilo Suárez Rebaza",
      dia: "Martes",
      hora: "8-9",
      ambiente: "Lab. 2",
    },
    {
      curso: "Teleinformática",
      docente: "Camilo Suárez Rebaza",
      dia: "Viernes",
      hora: "5-6",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Teleinformática",
      docente: "Camilo Suárez Rebaza",
      dia: "Viernes",
      hora: "6-7",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Teleinformática",
      docente: "Camilo Suárez Rebaza",
      dia: "Viernes",
      hora: "7-8",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Investigación de Operaciones",
      docente: "Marcos Baca Lopez",
      dia: "Jueves",
      hora: "7-8",
      ambiente: "Lab. 2",
    },
    {
      curso: "Investigación de Operaciones",
      docente: "Marcos Baca Lopez",
      dia: "Jueves",
      hora: "8-9",
      ambiente: "Lab. 2",
    },
    {
      curso: "Investigación de Operaciones",
      docente: "Marcos Baca Lopez",
      dia: "Jueves",
      hora: "9-10",
      ambiente: "Lab. 2",
    },
    {
      curso: "Investigación de Operaciones",
      docente: "Marcos Baca Lopez",
      dia: "Jueves",
      hora: "10-11",
      ambiente: "Lab. 2",
    },
    {
      curso: "Investigación de Operaciones",
      docente: "Marcos Baca Lopez",
      dia: "Jueves",
      hora: "11-12",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Investigación de Operaciones",
      docente: "Marcos Baca Lopez",
      dia: "Viernes",
      hora: "7-8",
      ambiente: "Lab. 2",
    },
    {
      curso: "Contabilidad Gerencial",
      docente: "Ana Cuadra Mitzugaray",
      dia: "Jueves",
      hora: "6-7",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Contabilidad Gerencial",
      docente: "Ana Cuadra Mitzugaray",
      dia: "Jueves",
      hora: "7-8",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Contabilidad Gerencial",
      docente: "Ana Cuadra Mitzugaray",
      dia: "Viernes",
      hora: "2-3",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Contabilidad Gerencial",
      docente: "Ana Cuadra Mitzugaray",
      dia: "Viernes",
      hora: "3-4",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Contabilidad Gerencial",
      docente: "Ana Cuadra Mitzugaray",
      dia: "Viernes",
      hora: "4-5",
      ambiente: "posgrado A-307",
    },

    // CICLO VII
    {
      curso: "Ingeniería de Software I",
      docente: "Juan Pedro Santos Fernández",
      dia: "Martes",
      hora: "7-8",
      ambiente: "Lab. 1",
    },
    {
      curso: "Ingeniería de Software I",
      docente: "Juan Pedro Santos Fernández",
      dia: "Martes",
      hora: "8-9",
      ambiente: "Lab. 1",
    },
    {
      curso: "Ingeniería de Software I",
      docente: "Juan Pedro Santos Fernández",
      dia: "Martes",
      hora: "9-10",
      ambiente: "Lab. 1",
    },
    {
      curso: "Ingeniería de Software I",
      docente: "Juan Pedro Santos Fernández",
      dia: "Martes",
      hora: "10-11",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Ingeniería de Software I",
      docente: "Juan Pedro Santos Fernández",
      dia: "Martes",
      hora: "11-12",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Redes y Comunicaciones I",
      docente: "Cesar Arellano Salazar",
      dia: "Lunes",
      hora: "10-11",
      ambiente: "Lab. 3",
    },
    {
      curso: "Redes y Comunicaciones I",
      docente: "Cesar Arellano Salazar",
      dia: "Lunes",
      hora: "11-12",
      ambiente: "Lab. 3",
    },
    {
      curso: "Redes y Comunicaciones I",
      docente: "Cesar Arellano Salazar",
      dia: "Lunes",
      hora: "12-1",
      ambiente: "Lab. 2",
    },
    {
      curso: "Redes y Comunicaciones I",
      docente: "Cesar Arellano Salazar",
      dia: "Lunes",
      hora: "1-2",
      ambiente: "Lab. 2",
    },
    {
      curso: "Redes y Comunicaciones I",
      docente: "Cesar Arellano Salazar",
      dia: "Lunes",
      hora: "2-3",
      ambiente: "Lab. 2",
    },
    {
      curso: "Redes y Comunicaciones I",
      docente: "Cesar Arellano Salazar",
      dia: "Lunes",
      hora: "4-5",
      ambiente: "Lab. 2",
    },
    {
      curso: "Redes y Comunicaciones I",
      docente: "Cesar Arellano Salazar",
      dia: "Lunes",
      hora: "5-6",
      ambiente: "Lab. 2",
    },
    {
      curso: "Redes y Comunicaciones I",
      docente: "Cesar Arellano Salazar",
      dia: "Lunes",
      hora: "6-7",
      ambiente: "Lab. 2",
    },
    {
      curso: "Redes y Comunicaciones I",
      docente: "Cesar Arellano Salazar",
      dia: "Viernes",
      hora: "4-5",
      ambiente: "posgrado A-311",
    },
    {
      curso: "Redes y Comunicaciones I",
      docente: "Cesar Arellano Salazar",
      dia: "Viernes",
      hora: "5-6",
      ambiente: "posgrado A-311",
    },
    {
      curso: "Ingeniería de Software I",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Lunes",
      hora: "7-8",
      ambiente: "Lab. 1",
    },
    {
      curso: "Ingeniería de Software I",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Lunes",
      hora: "8-9",
      ambiente: "Lab. 1",
    },
    {
      curso: "Ingeniería de Software I",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Lunes",
      hora: "9-10",
      ambiente: "Lab. 1",
    },
    {
      curso: "Ingeniería de Software I",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Lunes",
      hora: "10-11",
      ambiente: "Lab. 1",
    },
    {
      curso: "Ingeniería de Software I",
      docente: "Robert Jerry Sánchez Ticona",
      dia: "Lunes",
      hora: "11-12",
      ambiente: "Lab. 1",
    },
    {
      curso: "Negocios Electrónicos",
      docente: "Everson David Agreda Gamboa",
      dia: "Martes",
      hora: "4-5",
      ambiente: "posgrado A-311",
    },
    {
      curso: "Negocios Electrónicos",
      docente: "Everson David Agreda Gamboa",
      dia: "Martes",
      hora: "5-6",
      ambiente: "posgrado A-311",
    },
    {
      curso: "Gestión de Servicios de TI",
      docente: "Alberto Mendoza de los Santos",
      dia: "Viernes",
      hora: "7-8",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Gestión de Servicios de TI",
      docente: "Alberto Mendoza de los Santos",
      dia: "Viernes",
      hora: "8-9",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Gestión de Servicios de TI",
      docente: "Alberto Mendoza de los Santos",
      dia: "Viernes",
      hora: "9-10",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Gestión de Servicios de TI",
      docente: "Alberto Mendoza de los Santos",
      dia: "Viernes",
      hora: "10-11",
      ambiente: "Lab. 1",
    },
    {
      curso: "Gestión de Servicios de TI",
      docente: "Alberto Mendoza de los Santos",
      dia: "Viernes",
      hora: "11-12",
      ambiente: "Lab. 1",
    },
    {
      curso: "Gestión de Servicios de TI",
      docente: "Alberto Mendoza de los Santos",
      dia: "Viernes",
      hora: "12-1",
      ambiente: "Lab. 1",
    },
    {
      curso: "Metodología de la Investigación Científica",
      docente: "Paul Cotrina Castellanos",
      dia: "Jueves",
      hora: "2-3",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Metodología de la Investigación Científica",
      docente: "Paul Cotrina Castellanos",
      dia: "Jueves",
      hora: "3-4",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Metodología de la Investigación Científica",
      docente: "Paul Cotrina Castellanos",
      dia: "Jueves",
      hora: "4-5",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Metodología de la Investigación Científica",
      docente: "Paul Cotrina Castellanos",
      dia: "Jueves",
      hora: "5-6",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Administración de Base de Datos",
      docente: "Ricardo Mendoza Rivera",
      dia: "Jueves",
      hora: "7-8",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Administración de Base de Datos",
      docente: "Ricardo Mendoza Rivera",
      dia: "Jueves",
      hora: "6-7",
      ambiente: "Lab. 4",
    },
    {
      curso: "Administración de Base de Datos",
      docente: "Ricardo Mendoza Rivera",
      dia: "Viernes",
      hora: "6-7",
      ambiente: "Lab. 2",
    },
    {
      curso: "Administración de Base de Datos",
      docente: "Ricardo Mendoza Rivera",
      dia: "Viernes",
      hora: "7-8",
      ambiente: "Lab. 2",
    },
    {
      curso: "Planeamiento Estratégico de TI",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Martes",
      hora: "1-2",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Planeamiento Estratégico de TI",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Martes",
      hora: "2-3",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Planeamiento Estratégico de TI",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Martes",
      hora: "3-4",
      ambiente: "posgrado A-307",
    },
    {
      curso: "Planeamiento Estratégico de TI",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Miércoles",
      hora: "1-2",
      ambiente: "Lab. 4",
    },
    {
      curso: "Planeamiento Estratégico de TI",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Miércoles",
      hora: "2-3",
      ambiente: "Lab. 4",
    },
    {
      curso: "Planeamiento Estratégico de TI",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Miércoles",
      hora: "3-4",
      ambiente: "Lab. 4",
    },
    {
      curso: "Planeamiento Estratégico de TI",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Miércoles",
      hora: "4-5",
      ambiente: "Lab. 4",
    },
    {
      curso: "Planeamiento Estratégico de TI",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Miércoles",
      hora: "5-6",
      ambiente: "Audiovisuales",
    },
    {
      curso: "Planeamiento Estratégico de TI",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Jueves",
      hora: "9-10",
      ambiente: "Lab. 3",
    },
    {
      curso: "Planeamiento Estratégico de TI",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Jueves",
      hora: "10-11",
      ambiente: "Lab. 3",
    },
    {
      curso: "Negocios Electrónicos",
      docente: "Paul Cotrina Castellanos",
      dia: "Lunes",
      hora: "1-2",
      ambiente: "Lab. 4",
    },
    {
      curso: "Negocios Electrónicos",
      docente: "Paul Cotrina Castellanos",
      dia: "Lunes",
      hora: "2-3",
      ambiente: "Lab. 4",
    },
    {
      curso: "Negocios Electrónicos",
      docente: "Paul Cotrina Castellanos",
      dia: "Lunes",
      hora: "3-4",
      ambiente: "Lab. 4",
    },
    {
      curso: "Negocios Electrónicos",
      docente: "Paul Cotrina Castellanos",
      dia: "Lunes",
      hora: "4-5",
      ambiente: "Lab. 4",
    },
    {
      curso: "Cadena de Suministros",
      docente: "Jhoe Gonzalez Vasquez",
      dia: "Miércoles",
      hora: "7-8",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Cadena de Suministros",
      docente: "Jhoe Gonzalez Vasquez",
      dia: "Miércoles",
      hora: "8-9",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Cadena de Suministros",
      docente: "Jhoe Gonzalez Vasquez",
      dia: "Miércoles",
      hora: "9-10",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },
    {
      curso: "Cadena de Suministros",
      docente: "Jhoe Gonzalez Vasquez",
      dia: "Miércoles",
      hora: "10-11",
      ambiente: "Taller de Confecciones - Ing. Industrial",
    },

    // CICLO IX
    {
      curso: "Tesis I",
      docente: "Juan Pedro Santos Fernández",
      dia: "Jueves",
      hora: "7-8",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Tesis I",
      docente: "Juan Pedro Santos Fernández",
      dia: "Jueves",
      hora: "8-9",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Tesis I",
      docente: "Juan Pedro Santos Fernández",
      dia: "Jueves",
      hora: "9-10",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Tesis I",
      docente: "Juan Pedro Santos Fernández",
      dia: "Jueves",
      hora: "10-11",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Tesis I",
      docente: "Juan Pedro Santos Fernández",
      dia: "Jueves",
      hora: "11-12",
      ambiente: "Lab. 2",
    },
    {
      curso: "Tesis I",
      docente: "Ricardo Mendoza Rivera",
      dia: "Jueves",
      hora: "2-3",
      ambiente: "posgrado A-311",
    },
    {
      curso: "Tesis I",
      docente: "Ricardo Mendoza Rivera",
      dia: "Jueves",
      hora: "3-4",
      ambiente: "posgrado A-311",
    },
    {
      curso: "Tesis I",
      docente: "Ricardo Mendoza Rivera",
      dia: "Jueves",
      hora: "4-5",
      ambiente: "posgrado A-311",
    },
    {
      curso: "Tesis I",
      docente: "Ricardo Mendoza Rivera",
      dia: "Jueves",
      hora: "5-6",
      ambiente: "posgrado A-311",
    },
    {
      curso: "Tesis I",
      docente: "Ricardo Mendoza Rivera",
      dia: "Viernes",
      hora: "4-5",
      ambiente: "Lab. 4",
    },
    {
      curso: "Tesis I",
      docente: "Ricardo Mendoza Rivera",
      dia: "Viernes",
      hora: "5-6",
      ambiente: "Lab. 4",
    },
    {
      curso: "Analítica de Negocios",
      docente: "Ricardo Mendoza Rivera",
      dia: "Viernes",
      hora: "10-11",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Analítica de Negocios",
      docente: "Ricardo Mendoza Rivera",
      dia: "Viernes",
      hora: "11-12",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Analítica de Negocios",
      docente: "Ricardo Mendoza Rivera",
      dia: "Viernes",
      hora: "12-1",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Analítica de Negocios",
      docente: "Ricardo Mendoza Rivera",
      dia: "Viernes",
      hora: "2-3",
      ambiente: "Lab. 4",
    },
    {
      curso: "Analítica de Negocios",
      docente: "Ricardo Mendoza Rivera",
      dia: "Viernes",
      hora: "3-4",
      ambiente: "Lab. 4",
    },
    {
      curso: "Auditoría Informática",
      docente: "Alberto Mendoza de los Santos",
      dia: "Lunes",
      hora: "9-10",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Auditoría Informática",
      docente: "Alberto Mendoza de los Santos",
      dia: "Lunes",
      hora: "10-11",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Auditoría Informática",
      docente: "Alberto Mendoza de los Santos",
      dia: "Lunes",
      hora: "11-12",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Auditoría Informática",
      docente: "Alberto Mendoza de los Santos",
      dia: "Martes",
      hora: "10-11",
      ambiente: "Lab. 3",
    },
    {
      curso: "Auditoría Informática",
      docente: "Alberto Mendoza de los Santos",
      dia: "Martes",
      hora: "11-12",
      ambiente: "Lab. 3",
    },
    {
      curso: "Gestión de Proyectos de TIC",
      docente: "José Gómez Ávila",
      dia: "Lunes",
      hora: "1-2",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Gestión de Proyectos de TIC",
      docente: "José Gómez Ávila",
      dia: "Lunes",
      hora: "2-3",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Gestión de Proyectos de TIC",
      docente: "José Gómez Ávila",
      dia: "Lunes",
      hora: "3-4",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Gestión de Proyectos de TIC",
      docente: "José Gómez Ávila",
      dia: "Lunes",
      hora: "4-5",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Gestión de Proyectos de TIC",
      docente: "José Gómez Ávila",
      dia: "Martes",
      hora: "10-11",
      ambiente: "Audiovisuales",
    },
    {
      curso: "Gestión de Proyectos de TIC",
      docente: "José Gómez Ávila",
      dia: "Martes",
      hora: "11-12",
      ambiente: "Audiovisuales",
    },
    {
      curso: "Gestión de Proyectos de TIC",
      docente: "José Gómez Ávila",
      dia: "Martes",
      hora: "1-2",
      ambiente: "Lab. 1",
    },
    {
      curso: "Gestión de Proyectos de TIC",
      docente: "José Gómez Ávila",
      dia: "Martes",
      hora: "2-3",
      ambiente: "Lab. 1",
    },
    {
      curso: "Gestión de Proyectos de TIC",
      docente: "José Gómez Ávila",
      dia: "Martes",
      hora: "7-8",
      ambiente: "Lab. 1",
    },
    {
      curso: "Gestión de Proyectos de TIC",
      docente: "José Gómez Ávila",
      dia: "Martes",
      hora: "8-9",
      ambiente: "Lab. 1",
    },
    {
      curso: "Emprendimiento Tecnológico",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Viernes",
      hora: "2-3",
      ambiente: "Lab. 2",
    },
    {
      curso: "Emprendimiento Tecnológico",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Viernes",
      hora: "3-4",
      ambiente: "Lab. 2",
    },
    {
      curso: "Emprendimiento Tecnológico",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Viernes",
      hora: "4-5",
      ambiente: "Lab. 2",
    },
    {
      curso: "Emprendimiento Tecnológico",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Viernes",
      hora: "5-6",
      ambiente: "Lab. 2",
    },
    {
      curso: "Emprendimiento Tecnológico",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Viernes",
      hora: "6-7",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Emprendimiento Tecnológico",
      docente: "Oscar Romel Alcántara Moreno",
      dia: "Viernes",
      hora: "7-8",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Ingeniería Web",
      docente: "Marcelino Torres Villanueva",
      dia: "Lunes",
      hora: "5-6",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Ingeniería Web",
      docente: "Marcelino Torres Villanueva",
      dia: "Lunes",
      hora: "6-7",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Ingeniería Web",
      docente: "Marcelino Torres Villanueva",
      dia: "Lunes",
      hora: "7-8",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Ingeniería Web",
      docente: "Marcelino Torres Villanueva",
      dia: "Martes",
      hora: "2-3",
      ambiente: "Lab. 4",
    },
    {
      curso: "Ingeniería Web",
      docente: "Marcelino Torres Villanueva",
      dia: "Martes",
      hora: "3-4",
      ambiente: "Lab. 4",
    },
    {
      curso: "Ingeniería Web",
      docente: "Marcelino Torres Villanueva",
      dia: "Martes",
      hora: "5-6",
      ambiente: "Lab. 4",
    },
    {
      curso: "Ingeniería Web",
      docente: "Marcelino Torres Villanueva",
      dia: "Martes",
      hora: "6-7",
      ambiente: "Lab. 4",
    },
    {
      curso: "Ingeniería Web",
      docente: "Marcelino Torres Villanueva",
      dia: "Miércoles",
      hora: "10-11",
      ambiente: "Lab. 4",
    },
    {
      curso: "Ingeniería Web",
      docente: "Marcelino Torres Villanueva",
      dia: "Miércoles",
      hora: "11-12",
      ambiente: "Lab. 4",
    },
    {
      curso: "Computación en la Nube",
      docente: "José Gómez Ávila",
      dia: "Lunes",
      hora: "7-8",
      ambiente: "Lab. 3",
    },
    {
      curso: "Computación en la Nube",
      docente: "José Gómez Ávila",
      dia: "Lunes",
      hora: "8-9",
      ambiente: "Lab. 3",
    },
    {
      curso: "Computación en la Nube",
      docente: "José Gómez Ávila",
      dia: "Miércoles",
      hora: "7-8",
      ambiente: "Lab. 3",
    },
    {
      curso: "Computación en la Nube",
      docente: "José Gómez Ávila",
      dia: "Miércoles",
      hora: "8-9",
      ambiente: "Lab. 3",
    },
    {
      curso: "Computación en la Nube",
      docente: "José Gómez Ávila",
      dia: "Miércoles",
      hora: "9-10",
      ambiente: "Lab. 3",
    },
    {
      curso: "Computación en la Nube",
      docente: "José Gómez Ávila",
      dia: "Miércoles",
      hora: "4-5",
      ambiente: "Lab. 4",
    },
    {
      curso: "Computación en la Nube",
      docente: "José Gómez Ávila",
      dia: "Miércoles",
      hora: "5-6",
      ambiente: "Lab. 4",
    },
    {
      curso: "Computación en la Nube",
      docente: "José Gómez Ávila",
      dia: "Miércoles",
      hora: "6-7",
      ambiente: "Lab. 4",
    },
    {
      curso: "Computación en la Nube",
      docente: "José Gómez Ávila",
      dia: "Jueves",
      hora: "6-7",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Computación en la Nube",
      docente: "José Gómez Ávila",
      dia: "Jueves",
      hora: "7-8",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Hackeo Ético",
      docente: "Camilo Suárez Rebaza",
      dia: "Martes",
      hora: "8-9",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Hackeo Ético",
      docente: "Camilo Suárez Rebaza",
      dia: "Martes",
      hora: "9-10",
      ambiente: "posgrado A-303",
    },
    {
      curso: "Hackeo Ético",
      docente: "Camilo Suárez Rebaza",
      dia: "Martes",
      hora: "3-4",
      ambiente: "Lab. 2",
    },
    {
      curso: "Hackeo Ético",
      docente: "Camilo Suárez Rebaza",
      dia: "Martes",
      hora: "4-5",
      ambiente: "Lab. 2",
    },
    {
      curso: "Hackeo Ético",
      docente: "Camilo Suárez Rebaza",
      dia: "Martes",
      hora: "5-6",
      ambiente: "Lab. 2",
    },
    {
      curso: "Hackeo Ético",
      docente: "Camilo Suárez Rebaza",
      dia: "Martes",
      hora: "6-7",
      ambiente: "Lab. 2",
    },
  ];

  // First create docente-curso habilitaciones
  console.log("🔗 Creando habilitaciones docente-curso...");
  const habilitadas = new Set<string>();
  const horarioRepo = AppDataSource.getRepository(HorarioAsignado);

  // ── BORRAR HORARIOS DE LABORATORIO EXISTENTES ──────────────────────────
  console.log("🗑️ Borrando horarios de laboratorio existentes...");
  const horariosLaboratorio = await horarioRepo.find({
    where: { tipo_clase: "LABORATORIO" as any },
  });
  await horarioRepo.remove(horariosLaboratorio);
  console.log(
    `✅ ${horariosLaboratorio.length} horarios de laboratorio borrados`,
  );

  // ── BORRAR HORARIOS CON grupo_id INCORRECTO ───────────────────────────
  console.log("🔧 Borrando horarios con grupo_id incorrecto...");
  const allHorarios = await horarioRepo.find();
  const cursos = await AppDataSource.getRepository(Curso).find();
  const cursoIds = new Set(cursos.map((c) => c.id));

  let horariosConGrupoIncorrecto = 0;
  for (const horario of allHorarios) {
    if (horario.grupo_id && cursoIds.has(horario.grupo_id)) {
      // grupo_id coincide con un curso_id, es incorrecto
      await horarioRepo.remove(horario);
      horariosConGrupoIncorrecto++;
    }
  }
  console.log(
    `✅ ${horariosConGrupoIncorrecto} horarios con grupo_id incorrecto borrados\n`,
  );

  for (const h of horariosData) {
    if (!h.docente) continue;
    const docente = getDocente(h.docente);
    const curso = getCurso(h.curso);
    const key = `${docente.id}_${curso.id}`;
    if (!habilitadas.has(key)) {
      habilitadas.add(key);
      const existing = await docenteCursoRepo.findOne({
        where: {
          docenteId: docente.id,
          cursoId: curso.id,
          periodoId: periodoActivo.id,
        },
      });
      if (!existing) {
        await docenteCursoRepo.save(
          docenteCursoRepo.create({
            docenteId: docente.id,
            cursoId: curso.id,
            tipo_clase: TipoClase.TEORIA,
            periodoId: periodoActivo.id,
          }),
        );
      }
    }
  }
  console.log("✅ Habilitaciones creadas\n");

  // Asignaciones específicas para Estadística General
  const estadisticaGeneral = await cursoRepo.findOne({
    where: { nombre: "Estadística General" },
  });
  const miguelIpanaque = await docenteRepo.findOne({
    where: { nombres: "Miguel", apellidos: "Ipanaque Zapata" },
  });
  const marthaCardoso = await docenteRepo.findOne({
    where: { nombres: "Martha", apellidos: "Cardoso" },
  });

  // Miguel Ipanaque: solo PRACTICA (2 horas), LABORATORIO: 0 (G: 0)
  if (estadisticaGeneral && miguelIpanaque) {
    const existing = await docenteCursoRepo.findOne({
      where: {
        docenteId: miguelIpanaque.id,
        cursoId: estadisticaGeneral.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existing) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: miguelIpanaque.id,
          cursoId: estadisticaGeneral.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Martha Cardoso: TEORIA (2 horas) y PRACTICA (2 horas), LABORATORIO: 0 (G: 0)
  if (estadisticaGeneral && marthaCardoso) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: marthaCardoso.id,
        cursoId: estadisticaGeneral.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marthaCardoso.id,
          cursoId: estadisticaGeneral.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: marthaCardoso.id,
        cursoId: estadisticaGeneral.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marthaCardoso.id,
          cursoId: estadisticaGeneral.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Asignaciones específicas para Introducción a la Programación
  const introProgramacion = await cursoRepo.findOne({
    where: { nombre: "Introducción a la Programación" },
  });
  const marcelinoTorres = await docenteRepo.findOne({
    where: { nombres: "Marcelino", apellidos: "Torres Villanueva" },
  });
  const paulCotrina = await docenteRepo.findOne({
    where: { nombres: "Paul", apellidos: "Cotrina Castellanos" },
  });

  // Marcelino Torres: TEORIA (2 horas), LABORATORIO (2 horas, G: 2 grupos paralelos), PRACTICA: 0
  if (introProgramacion && marcelinoTorres) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: marcelinoTorres.id,
        cursoId: introProgramacion.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marcelinoTorres.id,
          cursoId: introProgramacion.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: marcelinoTorres.id,
        cursoId: introProgramacion.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marcelinoTorres.id,
          cursoId: introProgramacion.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 2,
        }),
      );
    }
  }

  // Paul Cotrina: LABORATORIO (2 horas, G: 2 grupos paralelos), TEORIA: 0, PRACTICA: 0
  if (introProgramacion && paulCotrina) {
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: paulCotrina.id,
        cursoId: introProgramacion.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: paulCotrina.id,
          cursoId: introProgramacion.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 2,
        }),
      );
    } else {
      // Actualizar el valor de grupos si ya existe
      existingLab.grupos = 2;
      await docenteCursoRepo.save(existingLab);
    }
  }

  // Asignaciones específicas para Introducción a la Ingeniería de Sistemas
  const introIngSistemas = await cursoRepo.findOne({
    where: { nombre: "Introducción a la Ingeniería de Sistemas" },
  });
  const albertoMendoza = await docenteRepo.findOne({
    where: { nombres: "Alberto", apellidos: "Mendoza de los Santos" },
  });

  // Alberto Mendoza: TEORIA (1 hora), PRACTICA (2 horas), LABORATORIO: 0 (G: 0)
  if (introIngSistemas && albertoMendoza) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: albertoMendoza.id,
        cursoId: introIngSistemas.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: albertoMendoza.id,
          cursoId: introIngSistemas.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: albertoMendoza.id,
        cursoId: introIngSistemas.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: albertoMendoza.id,
          cursoId: introIngSistemas.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Asignaciones específicas para Desarrollo Personal
  const desarrolloPersonal = await cursoRepo.findOne({
    where: { nombre: "Desarrollo Personal" },
  });
  const berthaUrtecho = await docenteRepo.findOne({
    where: { nombres: "Bertha", apellidos: "Urtecho Zavaleta" },
  });

  // Bertha Urtecho: TEORIA (2 horas), PRACTICA (2 horas), LABORATORIO: 0 (G: 0)
  if (desarrolloPersonal && berthaUrtecho) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: berthaUrtecho.id,
        cursoId: desarrolloPersonal.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: berthaUrtecho.id,
          cursoId: desarrolloPersonal.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: berthaUrtecho.id,
        cursoId: desarrolloPersonal.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: berthaUrtecho.id,
          cursoId: desarrolloPersonal.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Asignaciones específicas para Desarrollo del Pensamiento Lógico Matemático
  const pensamientoLogico = await cursoRepo.findOne({
    where: { nombre: "Desarrollo del Pensamiento Lógico Matemático" },
  });
  const joseLuisPonte = await docenteRepo.findOne({
    where: { nombres: "Jose Luis", apellidos: "Ponte Bejarano" },
  });

  // Jose Luis Ponte: TEORIA (1 hora), PRACTICA (4 horas), LABORATORIO: 0 (G: 0)
  if (pensamientoLogico && joseLuisPonte) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: joseLuisPonte.id,
        cursoId: pensamientoLogico.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: joseLuisPonte.id,
          cursoId: pensamientoLogico.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: joseLuisPonte.id,
        cursoId: pensamientoLogico.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: joseLuisPonte.id,
          cursoId: pensamientoLogico.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Asignaciones específicas para Lectura Crítica y Redacción de Textos Académicos
  const lecturaCritica = await cursoRepo.findOne({
    where: { nombre: "Lectura Crítica y Redacción de Textos Académicos" },
  });
  const jorgeLuisRios = await docenteRepo.findOne({
    where: { nombres: "Jorge Luis", apellidos: "Rios Gonzales" },
  });

  // Jorge Luis Rios: TEORIA (2 horas), PRACTICA (2 horas), LABORATORIO: 0 (G: 0)
  if (lecturaCritica && jorgeLuisRios) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: jorgeLuisRios.id,
        cursoId: lecturaCritica.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: jorgeLuisRios.id,
          cursoId: lecturaCritica.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: jorgeLuisRios.id,
        cursoId: lecturaCritica.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: jorgeLuisRios.id,
          cursoId: lecturaCritica.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Asignaciones específicas para Introducción al Análisis Matemático
  const analisisMatematico = await cursoRepo.findOne({
    where: { nombre: "Introducción al Análisis Matemático" },
  });
  const segundoGuibar = await docenteRepo.findOne({
    where: { nombres: "Segundo", apellidos: "Guibar Obeso" },
  });

  // Segundo Guibar: TEORIA (2 horas), PRACTICA (4 horas), LABORATORIO: 0 (G: 0)
  if (analisisMatematico && segundoGuibar) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: segundoGuibar.id,
        cursoId: analisisMatematico.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: segundoGuibar.id,
          cursoId: analisisMatematico.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: segundoGuibar.id,
        cursoId: analisisMatematico.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: segundoGuibar.id,
          cursoId: analisisMatematico.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Asignaciones específicas para los 8 nuevos docentes
  const zoraidaVidal = await docenteRepo.findOne({
    where: { nombres: "Zoraida", apellidos: "Vidal Melgarejo" },
  });
  const eversonAgreda = await docenteRepo.findOne({
    where: { nombres: "Everson David", apellidos: "Agreda Gamboa" },
  });
  const juanCarlosObando = await docenteRepo.findOne({
    where: { nombres: "Juan Carlos", apellidos: "Obando Roldán" },
  });
  const marcosFerrer = await docenteRepo.findOne({
    where: { nombres: "Marcos", apellidos: "Ferrer Reyna" },
  });
  const teresitaRojas = await docenteRepo.findOne({
    where: { nombres: "Teresita", apellidos: "Rojas Garcia" },
  });
  const juanCarrascal = await docenteRepo.findOne({
    where: { nombres: "Juan", apellidos: "Carrascal Cabanillas" },
  });
  const vilmaMendez = await docenteRepo.findOne({
    where: { nombres: "Vilma", apellidos: "Mendez Gil" },
  });
  const sheylaEscobedo = await docenteRepo.findOne({
    where: { nombres: "Sheyla Laura", apellidos: "Escobedo Rodriguez" },
  });

  // Zoraida Vidal: Programación Orientada a Objetos II (T: 2, P: 0, L: 4, G: 3)
  const poo2 = await cursoRepo.findOne({
    where: { nombre: "Programación Orientada a Objetos II" },
  });
  if (poo2 && zoraidaVidal) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: zoraidaVidal.id,
        cursoId: poo2.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: zoraidaVidal.id,
          cursoId: poo2.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: zoraidaVidal.id,
        cursoId: poo2.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: zoraidaVidal.id,
          cursoId: poo2.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Everson David: Sistémica (T: 2, P: 1, L: 2, G: 3)
  const sistemica = await cursoRepo.findOne({ where: { nombre: "Sistémica" } });
  if (sistemica && eversonAgreda) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: eversonAgreda.id,
        cursoId: sistemica.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: eversonAgreda.id,
          cursoId: sistemica.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: eversonAgreda.id,
        cursoId: sistemica.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: eversonAgreda.id,
          cursoId: sistemica.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: eversonAgreda.id,
        cursoId: sistemica.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: eversonAgreda.id,
          cursoId: sistemica.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Juan Carlos Obando: Ingeniería Gráfica (T: 1, P: 1, L: 2, G: 3)
  const ingGrafica = await cursoRepo.findOne({
    where: { nombre: "Ingeniería Gráfica" },
  });
  if (ingGrafica && juanCarlosObando) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanCarlosObando.id,
        cursoId: ingGrafica.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanCarlosObando.id,
          cursoId: ingGrafica.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanCarlosObando.id,
        cursoId: ingGrafica.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanCarlosObando.id,
          cursoId: ingGrafica.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanCarlosObando.id,
        cursoId: ingGrafica.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanCarlosObando.id,
          cursoId: ingGrafica.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Marcos Ferrer: Matemática Aplicada (T: 1, P: 2, L: 2, G: 1)
  const matAplicada = await cursoRepo.findOne({
    where: { nombre: "Matemática Aplicada" },
  });
  if (matAplicada && marcosFerrer) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: marcosFerrer.id,
        cursoId: matAplicada.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marcosFerrer.id,
          cursoId: matAplicada.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: marcosFerrer.id,
        cursoId: matAplicada.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marcosFerrer.id,
          cursoId: matAplicada.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: marcosFerrer.id,
        cursoId: matAplicada.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marcosFerrer.id,
          cursoId: matAplicada.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Teresita Rojas: Estadística Aplicada (T: 1, P: 2, L: 2, G: 3)
  const estAplicada = await cursoRepo.findOne({
    where: { nombre: "Estadística Aplicada" },
  });
  if (estAplicada && teresitaRojas) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: teresitaRojas.id,
        cursoId: estAplicada.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: teresitaRojas.id,
          cursoId: estAplicada.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: teresitaRojas.id,
        cursoId: estAplicada.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: teresitaRojas.id,
          cursoId: estAplicada.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: teresitaRojas.id,
        cursoId: estAplicada.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: teresitaRojas.id,
          cursoId: estAplicada.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Juan Carrascal: Administración General (T: 2, P: 2, LABORATORIO: 0 (G: 0))
  const adminGeneral = await cursoRepo.findOne({
    where: { nombre: "Administración General" },
  });
  if (adminGeneral && juanCarrascal) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanCarrascal.id,
        cursoId: adminGeneral.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanCarrascal.id,
          cursoId: adminGeneral.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanCarrascal.id,
        cursoId: adminGeneral.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanCarrascal.id,
          cursoId: adminGeneral.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Vilma Mendez: Física Electrónica (T: 1, P: 2, L: 2, G: 1)
  const fisElectronica = await cursoRepo.findOne({
    where: { nombre: "Física Electrónica" },
  });
  if (fisElectronica && vilmaMendez) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: vilmaMendez.id,
        cursoId: fisElectronica.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: vilmaMendez.id,
          cursoId: fisElectronica.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: vilmaMendez.id,
        cursoId: fisElectronica.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: vilmaMendez.id,
          cursoId: fisElectronica.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: vilmaMendez.id,
        cursoId: fisElectronica.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: vilmaMendez.id,
          cursoId: fisElectronica.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Sheyla Laura: Psicología Organizacional (T: 2, P: 2, LABORATORIO: 0 (G: 0))
  const psicologiaOrg = await cursoRepo.findOne({
    where: { nombre: "Psicología Organizacional" },
  });
  if (psicologiaOrg && sheylaEscobedo) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: sheylaEscobedo.id,
        cursoId: psicologiaOrg.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: sheylaEscobedo.id,
          cursoId: psicologiaOrg.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: sheylaEscobedo.id,
        cursoId: psicologiaOrg.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: sheylaEscobedo.id,
          cursoId: psicologiaOrg.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Asignaciones para los 11 nuevos docentes (Ciclos V, VII, IX)
  const luisBoy = await docenteRepo.findOne({
    where: { nombres: "Luis", apellidos: "Boy Chavil" },
  });
  const robertJerry = await docenteRepo.findOne({
    where: { nombres: "Robert Jerry", apellidos: "Sánchez Ticona" },
  });
  const cesarArellano = await docenteRepo.findOne({
    where: { nombres: "Cesar", apellidos: "Arellano Salazar" },
  });
  const camiloSuarez = await docenteRepo.findOne({
    where: { nombres: "Camilo", apellidos: "Suárez Rebaza" },
  });
  const marcosBaca = await docenteRepo.findOne({
    where: { nombres: "Marcos", apellidos: "Baca Lopez" },
  });
  const anaCuadra = await docenteRepo.findOne({
    where: { nombres: "Ana", apellidos: "Cuadra Mitzugaray" },
  });
  const juanPedro = await docenteRepo.findOne({
    where: { nombres: "Juan Pedro", apellidos: "Santos Fernández" },
  });
  const ricardoMendoza = await docenteRepo.findOne({
    where: { nombres: "Ricardo", apellidos: "Mendoza Rivera" },
  });
  const oscarRomel = await docenteRepo.findOne({
    where: { nombres: "Oscar Romel", apellidos: "Alcántara Moreno" },
  });
  const joseGomez = await docenteRepo.findOne({
    where: { nombres: "José", apellidos: "Gómez Ávila" },
  });
  const jhoeGonzalez = await docenteRepo.findOne({
    where: { nombres: "Jhoe", apellidos: "Gonzalez Vasquez" },
  });

  // CICLO V
  // Luis Boy: Ingeniería de Datos I (T: 2, P: 1, L: 3, G: 3)
  const ingDatosI = await cursoRepo.findOne({
    where: { nombre: "Ingeniería de Datos I" },
  });
  if (ingDatosI && luisBoy) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: luisBoy.id,
        cursoId: ingDatosI.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: luisBoy.id,
          cursoId: ingDatosI.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: luisBoy.id,
        cursoId: ingDatosI.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: luisBoy.id,
          cursoId: ingDatosI.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: luisBoy.id,
        cursoId: ingDatosI.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: luisBoy.id,
          cursoId: ingDatosI.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Juan Carlos Obando: Sistemas de Información (T: 2, P: 2, L: 2, G: 3)
  const sistemasInfo = await cursoRepo.findOne({
    where: { nombre: "Sistemas de Información" },
  });
  if (sistemasInfo && juanCarlosObando) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanCarlosObando.id,
        cursoId: sistemasInfo.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanCarlosObando.id,
          cursoId: sistemasInfo.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanCarlosObando.id,
        cursoId: sistemasInfo.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanCarlosObando.id,
          cursoId: sistemasInfo.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanCarlosObando.id,
        cursoId: sistemasInfo.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanCarlosObando.id,
          cursoId: sistemasInfo.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Everson David: Transformación digital (T: 2, P: 0, L: 2, G: 2)
  const transDigital = await cursoRepo.findOne({
    where: { nombre: "Transformación Digital" },
  });
  if (transDigital && eversonAgreda) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: eversonAgreda.id,
        cursoId: transDigital.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: eversonAgreda.id,
          cursoId: transDigital.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: eversonAgreda.id,
        cursoId: transDigital.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: eversonAgreda.id,
          cursoId: transDigital.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 2,
        }),
      );
    }
  }

  // Robert Jerry: Tecnología web (T: 1, P: 1, L: 2, G: 3)
  const tecnologiaWeb = await cursoRepo.findOne({
    where: { nombre: "Tecnología Web" },
  });
  if (tecnologiaWeb && robertJerry) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: robertJerry.id,
        cursoId: tecnologiaWeb.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: robertJerry.id,
          cursoId: tecnologiaWeb.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: robertJerry.id,
        cursoId: tecnologiaWeb.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: robertJerry.id,
          cursoId: tecnologiaWeb.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: robertJerry.id,
        cursoId: tecnologiaWeb.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: robertJerry.id,
          cursoId: tecnologiaWeb.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Cesar Arellano: Arquitectura de computadoras (T: 1, P: 2, L: 2, G: 3)
  const arquitecturaComp = await cursoRepo.findOne({
    where: { nombre: "Arquitectura de Computadoras" },
  });
  if (arquitecturaComp && cesarArellano) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: cesarArellano.id,
        cursoId: arquitecturaComp.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: cesarArellano.id,
          cursoId: arquitecturaComp.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: cesarArellano.id,
        cursoId: arquitecturaComp.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: cesarArellano.id,
          cursoId: arquitecturaComp.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: cesarArellano.id,
        cursoId: arquitecturaComp.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: cesarArellano.id,
          cursoId: arquitecturaComp.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Camilo Suárez: Teleinformática (T: 1, P: 2, L: 2, G: 2)
  const teleinformatica = await cursoRepo.findOne({
    where: { nombre: "Teleinformática" },
  });
  if (teleinformatica && camiloSuarez) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: camiloSuarez.id,
        cursoId: teleinformatica.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: camiloSuarez.id,
          cursoId: teleinformatica.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: camiloSuarez.id,
        cursoId: teleinformatica.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: camiloSuarez.id,
          cursoId: teleinformatica.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: camiloSuarez.id,
        cursoId: teleinformatica.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: camiloSuarez.id,
          cursoId: teleinformatica.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 2,
        }),
      );
    }
  }

  // Marcos Baca: Investigación de Operaciones (T: 1, P: 2, L: 2, G: 1)
  const investigacionOperaciones = await cursoRepo.findOne({
    where: { nombre: "Investigación de Operaciones" },
  });
  if (investigacionOperaciones && marcosBaca) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: marcosBaca.id,
        cursoId: investigacionOperaciones.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marcosBaca.id,
          cursoId: investigacionOperaciones.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: marcosBaca.id,
        cursoId: investigacionOperaciones.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marcosBaca.id,
          cursoId: investigacionOperaciones.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: marcosBaca.id,
        cursoId: investigacionOperaciones.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marcosBaca.id,
          cursoId: investigacionOperaciones.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Ana Cuadra: Contabilidad Gerencial (T: 1, P: 2, L: 2, G: 1)
  const contabilidadGerencial = await cursoRepo.findOne({
    where: { nombre: "Contabilidad Gerencial" },
  });
  if (contabilidadGerencial && anaCuadra) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: anaCuadra.id,
        cursoId: contabilidadGerencial.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: anaCuadra.id,
          cursoId: contabilidadGerencial.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: anaCuadra.id,
        cursoId: contabilidadGerencial.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: anaCuadra.id,
          cursoId: contabilidadGerencial.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: anaCuadra.id,
        cursoId: contabilidadGerencial.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: anaCuadra.id,
          cursoId: contabilidadGerencial.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // CICLO VII
  // Juan Pedro: Ingeniería de Software I (T: 2, P: 1, L: 3, G: 1)
  const ingSoftwareI = await cursoRepo.findOne({
    where: { nombre: "Ingeniería de Software I" },
  });
  if (ingSoftwareI && juanPedro) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanPedro.id,
        cursoId: ingSoftwareI.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanPedro.id,
          cursoId: ingSoftwareI.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanPedro.id,
        cursoId: ingSoftwareI.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanPedro.id,
          cursoId: ingSoftwareI.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanPedro.id,
        cursoId: ingSoftwareI.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanPedro.id,
          cursoId: ingSoftwareI.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // César Arellano: Redes y Comunicaciones I (T: 1, P: 1, L: 3, G: 3)
  const redesComunicacionesI = await cursoRepo.findOne({
    where: { nombre: "Redes y Comunicaciones I" },
  });
  if (redesComunicacionesI && cesarArellano) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: cesarArellano.id,
        cursoId: redesComunicacionesI.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: cesarArellano.id,
          cursoId: redesComunicacionesI.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: cesarArellano.id,
        cursoId: redesComunicacionesI.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: cesarArellano.id,
          cursoId: redesComunicacionesI.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: cesarArellano.id,
        cursoId: redesComunicacionesI.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: cesarArellano.id,
          cursoId: redesComunicacionesI.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Robert Jerry: Ingeniería de Software I (T: -, P: -, L: 2, G: 3)
  if (ingSoftwareI && robertJerry) {
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: robertJerry.id,
        cursoId: ingSoftwareI.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: robertJerry.id,
          cursoId: ingSoftwareI.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Everson David: Negocios Electrónicos (T: 2, P: 0, L: 0, G: 0)
  const negociosElectronicos = await cursoRepo.findOne({
    where: { nombre: "Negocios Electrónicos" },
  });
  if (negociosElectronicos && eversonAgreda) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: eversonAgreda.id,
        cursoId: negociosElectronicos.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: eversonAgreda.id,
          cursoId: negociosElectronicos.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Alberto Mendoza: Gestión de Servicios de TI (T: 1, P: 2, L: 2, G: 2)
  const gestionServiciosTI = await cursoRepo.findOne({
    where: { nombre: "Gestión de Servicios de TI" },
  });
  if (gestionServiciosTI && albertoMendoza) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: albertoMendoza.id,
        cursoId: gestionServiciosTI.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: albertoMendoza.id,
          cursoId: gestionServiciosTI.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: albertoMendoza.id,
        cursoId: gestionServiciosTI.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: albertoMendoza.id,
          cursoId: gestionServiciosTI.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: albertoMendoza.id,
        cursoId: gestionServiciosTI.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: albertoMendoza.id,
          cursoId: gestionServiciosTI.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 2,
        }),
      );
    }
  }

  // Paul Cotrina: Metodología de la Investigación Científica (T: 2, P: 2, LABORATORIO: 0 (G: 0))
  const metodologiaInvestigacion = await cursoRepo.findOne({
    where: { nombre: "Metodología de la Investigación Científica" },
  });
  if (metodologiaInvestigacion && paulCotrina) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: paulCotrina.id,
        cursoId: metodologiaInvestigacion.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: paulCotrina.id,
          cursoId: metodologiaInvestigacion.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: paulCotrina.id,
        cursoId: metodologiaInvestigacion.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: paulCotrina.id,
          cursoId: metodologiaInvestigacion.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Ricardo Mendoza: Administración de Base de Datos (T: 1, P: 1, L: 3, G: 2)
  const adminBaseDatos = await cursoRepo.findOne({
    where: { nombre: "Administración de Base de Datos" },
  });
  if (adminBaseDatos && ricardoMendoza) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: ricardoMendoza.id,
        cursoId: adminBaseDatos.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: ricardoMendoza.id,
          cursoId: adminBaseDatos.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: ricardoMendoza.id,
        cursoId: adminBaseDatos.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: ricardoMendoza.id,
          cursoId: adminBaseDatos.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: ricardoMendoza.id,
        cursoId: adminBaseDatos.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: ricardoMendoza.id,
          cursoId: adminBaseDatos.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 2,
        }),
      );
    }
  }

  // Oscar Romel: Planeamiento Estratégico de TI (T: 1, P: 2, L: 2, G: 4)
  const planeamientoEstrategicoTI = await cursoRepo.findOne({
    where: { nombre: "Planeamiento Estratégico de TI" },
  });
  if (planeamientoEstrategicoTI && oscarRomel) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: oscarRomel.id,
        cursoId: planeamientoEstrategicoTI.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: oscarRomel.id,
          cursoId: planeamientoEstrategicoTI.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: oscarRomel.id,
        cursoId: planeamientoEstrategicoTI.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: oscarRomel.id,
          cursoId: planeamientoEstrategicoTI.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: oscarRomel.id,
        cursoId: planeamientoEstrategicoTI.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: oscarRomel.id,
          cursoId: planeamientoEstrategicoTI.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 4,
        }),
      );
    }
  }

  // Paul Cotrina: Negocios Electrónicos (L: 2, G: 2)
  if (negociosElectronicos && paulCotrina) {
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: paulCotrina.id,
        cursoId: negociosElectronicos.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: paulCotrina.id,
          cursoId: negociosElectronicos.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 2,
        }),
      );
    }
  }

  // Jhoe Gonzalez: Cadena de Suministros (T: 2, P: 2, LABORATORIO: 0 (G: 0))
  const cadenaSuministros = await cursoRepo.findOne({
    where: { nombre: "Cadena de Suministros" },
  });
  if (cadenaSuministros && jhoeGonzalez) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: jhoeGonzalez.id,
        cursoId: cadenaSuministros.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: jhoeGonzalez.id,
          cursoId: cadenaSuministros.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: jhoeGonzalez.id,
        cursoId: cadenaSuministros.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: jhoeGonzalez.id,
          cursoId: cadenaSuministros.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // CICLO IX
  // Juan Pedro: Tesis I (T: 2, P: 2, L: 2, G: 1)
  const tesisI = await cursoRepo.findOne({ where: { nombre: "Tesis I" } });
  if (tesisI && juanPedro) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanPedro.id,
        cursoId: tesisI.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanPedro.id,
          cursoId: tesisI.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanPedro.id,
        cursoId: tesisI.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanPedro.id,
          cursoId: tesisI.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: juanPedro.id,
        cursoId: tesisI.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: juanPedro.id,
          cursoId: tesisI.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Ricardo Mendoza: Tesis I (T: 2, P: 2, L: 2, G: 1)
  if (tesisI && ricardoMendoza) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: ricardoMendoza.id,
        cursoId: tesisI.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: ricardoMendoza.id,
          cursoId: tesisI.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: ricardoMendoza.id,
        cursoId: tesisI.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: ricardoMendoza.id,
          cursoId: tesisI.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: ricardoMendoza.id,
        cursoId: tesisI.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: ricardoMendoza.id,
          cursoId: tesisI.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Ricardo Mendoza: Analítica de Negocios (T: 1, P: 2, L: 2, G: 1)
  const analiticaNegocios = await cursoRepo.findOne({
    where: { nombre: "Analítica de Negocios" },
  });
  if (analiticaNegocios && ricardoMendoza) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: ricardoMendoza.id,
        cursoId: analiticaNegocios.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: ricardoMendoza.id,
          cursoId: analiticaNegocios.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: ricardoMendoza.id,
        cursoId: analiticaNegocios.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: ricardoMendoza.id,
          cursoId: analiticaNegocios.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: ricardoMendoza.id,
        cursoId: analiticaNegocios.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: ricardoMendoza.id,
          cursoId: analiticaNegocios.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
  }

  // Alberto Mendoza: Auditoría Informática (T: 1, P: 2, L: 2, G: 2)
  const auditoriaInformatica = await cursoRepo.findOne({
    where: { nombre: "Auditoría Informática" },
  });
  if (auditoriaInformatica && albertoMendoza) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: albertoMendoza.id,
        cursoId: auditoriaInformatica.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: albertoMendoza.id,
          cursoId: auditoriaInformatica.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: albertoMendoza.id,
        cursoId: auditoriaInformatica.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: albertoMendoza.id,
          cursoId: auditoriaInformatica.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: albertoMendoza.id,
        cursoId: auditoriaInformatica.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: albertoMendoza.id,
          cursoId: auditoriaInformatica.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 2,
        }),
      );
    }
  }

  // José Gómez: Gestión de Proyectos de TI (T: 1, P: 2, L: 2, G: 3)
  const gestionProyectosTI = await cursoRepo.findOne({
    where: { nombre: "Gestión de Proyectos de TI" },
  });
  if (gestionProyectosTI && joseGomez) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: joseGomez.id,
        cursoId: gestionProyectosTI.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: joseGomez.id,
          cursoId: gestionProyectosTI.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: joseGomez.id,
        cursoId: gestionProyectosTI.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: joseGomez.id,
          cursoId: gestionProyectosTI.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: joseGomez.id,
        cursoId: gestionProyectosTI.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: joseGomez.id,
          cursoId: gestionProyectosTI.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Oscar Romel: Emprendimiento Tecnológico (T: 2, P: 0, L: 2, G: 2)
  const emprendimientoTecnologico = await cursoRepo.findOne({
    where: { nombre: "Emprendimiento Tecnológico" },
  });
  if (emprendimientoTecnologico && oscarRomel) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: oscarRomel.id,
        cursoId: emprendimientoTecnologico.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: oscarRomel.id,
          cursoId: emprendimientoTecnologico.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: oscarRomel.id,
        cursoId: emprendimientoTecnologico.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: oscarRomel.id,
          cursoId: emprendimientoTecnologico.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 2,
        }),
      );
    }
  }

  // Marcelino Torres: Ingeniería Web (T: 1, P: 1, L: 3, G: 3)
  const ingWeb = await cursoRepo.findOne({
    where: { nombre: "Ingeniería Web" },
  });
  if (ingWeb && marcelinoTorres) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: marcelinoTorres.id,
        cursoId: ingWeb.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marcelinoTorres.id,
          cursoId: ingWeb.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: marcelinoTorres.id,
        cursoId: ingWeb.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marcelinoTorres.id,
          cursoId: ingWeb.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: marcelinoTorres.id,
        cursoId: ingWeb.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: marcelinoTorres.id,
          cursoId: ingWeb.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // José Gómez: Computación en la Nube (T: 1, P: 1, L: 3, G: 3)
  const computacionNube = await cursoRepo.findOne({
    where: { nombre: "Computación en la Nube" },
  });
  if (computacionNube && joseGomez) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: joseGomez.id,
        cursoId: computacionNube.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: joseGomez.id,
          cursoId: computacionNube.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingPractica = await docenteCursoRepo.findOne({
      where: {
        docenteId: joseGomez.id,
        cursoId: computacionNube.id,
        tipo_clase: TipoClase.PRACTICA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingPractica) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: joseGomez.id,
          cursoId: computacionNube.id,
          tipo_clase: TipoClase.PRACTICA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: joseGomez.id,
        cursoId: computacionNube.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: joseGomez.id,
          cursoId: computacionNube.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 3,
        }),
      );
    }
  }

  // Camilo Suarez: Hackeo Ético (T: 2, P: 0, L: 2, G: 2)
  const hackeoEtico = await cursoRepo.findOne({
    where: { nombre: "Hackeo Ético" },
  });
  if (hackeoEtico && camiloSuarez) {
    const existingTeoria = await docenteCursoRepo.findOne({
      where: {
        docenteId: camiloSuarez.id,
        cursoId: hackeoEtico.id,
        tipo_clase: TipoClase.TEORIA,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingTeoria) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: camiloSuarez.id,
          cursoId: hackeoEtico.id,
          tipo_clase: TipoClase.TEORIA,
          periodoId: periodoActivo.id,
          grupos: 1,
        }),
      );
    }
    const existingLab = await docenteCursoRepo.findOne({
      where: {
        docenteId: camiloSuarez.id,
        cursoId: hackeoEtico.id,
        tipo_clase: TipoClase.LABORATORIO,
        periodoId: periodoActivo.id,
      },
    });
    if (!existingLab) {
      await docenteCursoRepo.save(
        docenteCursoRepo.create({
          docenteId: camiloSuarez.id,
          cursoId: hackeoEtico.id,
          tipo_clase: TipoClase.LABORATORIO,
          periodoId: periodoActivo.id,
          grupos: 2,
        }),
      );
    }
  }

  // NOTA: No se crean horarios asignados precargados para modalidad ventanas de atención
  // Los horarios se crearán desde 0 mediante el sistema de ventanas de atención

  await AppDataSource.destroy();
  console.log(
    "🎉 ¡Seed completado con 28 docentes, 82 cursos, 13 facultades, 45 escuelas y 45 departamentos! (Sin horarios asignados precargados)",
  );
}

seed().catch((error) => {
  console.error("❌ Error durante la ejecución del seed:", error);
  process.exit(1);
});
