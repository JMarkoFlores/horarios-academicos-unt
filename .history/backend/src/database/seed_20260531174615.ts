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
import { DiaActivo } from "../entities/dia-activo.entity";
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
import { OrigenHorario } from "../common/enums/origen-horario.enum";
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
    DiaActivo,
    TurnoHorario,
    DocenteCurso,
    ParametrosCarga,
    Facultad,
    Escuela,
    Departamento,
  ],
  synchronize: true,
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
  const facultadRepo = AppDataSource.getRepository(Facultad);
  const escuelaRepo = AppDataSource.getRepository(Escuela);
  const departamentoRepo = AppDataSource.getRepository(Departamento);
  const horarioRepo = AppDataSource.getRepository(HorarioAsignado);

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
      codigo: "2026-I",
      nombre: "Semestre 2026-I",
      fecha_inicio: new Date("2026-03-16"),
      fecha_fin: new Date("2026-07-31"),
      estado: EstadoPeriodo.EN_CURSO,
      activo: true,
      modo_asignacion: ModoAsignacion.MIXTA,
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
  const periodoId = periodoActivo.id;
  console.log("✅ Períodos académicos creados (2026-I Activo)\n");

  // ── 3. AMBIENTES (AULAS Y LABORATORIOS) ──────────────────────────────────
  console.log("🏢 Creando ambientes de estudio...");
  const ambientesData = [
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
      codigo: "A-303",
      nombre: "Posgrado A-303",
      tipo: TipoAmbiente.AULA,
      capacidad: 35,
      piso: 3,
      pabellon: "A",
      activo: true,
    },
    {
      codigo: "A-311",
      nombre: "Posgrado A-311",
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      piso: 1,
      pabellon: "A",
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
      codigo: "TALLER-CONFECCIONES",
      nombre: "Taller de Confecciones - Ing. Industrial",
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      piso: 2,
      pabellon: "C",
      activo: true,
    },
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
      codigo: "AUDIOVISUALES",
      nombre: "Sala de Audiovisuales",
      tipo: TipoAmbiente.AULA,
      capacidad: 50,
      piso: 1,
      pabellon: "B",
      activo: true,
    },
  ];

  const dbAmbientes: Ambiente[] = [];
  for (const a of ambientesData) {
    const ambiente = await ambienteRepo.save(ambienteRepo.create(a));
    dbAmbientes.push(ambiente);
  }
  console.log("✅ Ambientes creados exitosamente\n");

  // ── 4. DOCENTES Y SUS USUARIOS ASOCIADOS ───────────
  console.log("👨‍🏫 Creando docentes de los datos proporcionados...");
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
    { nombres: "César", apellidos: "Arellano Salazar", codigo: "DOC020" },
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

  // ── 5. CURSOS (PLAN DE ESTUDIOS COMPLETO) ─
  console.log("📚 Creando plan de estudios...");
  const cursosData = [
    // === CICLO I ===
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
      codigo: "EE-101",
      nombre: "Introducción a la Ing. de Sistemas",
      creditos: 2,
      horas_teoria: 1,
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
      codigo: "EG-101",
      nombre: "Desarrollo del Pens. Lógico Matemát.",
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
      nombre: "Lectura Crítica y Redac. Textos Acad.",
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

    // === CICLO III ===
    {
      codigo: "EE-301",
      nombre: "Programación Orientada a Objetos II",
      creditos: 4,
      horas_teoria: 2,
      horas_practica: 0,
      horas_laboratorio: 4,
      ciclo: 3,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-302",
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
      codigo: "EE-303",
      nombre: "Ingeniería Gráfica (e)",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 1,
      horas_laboratorio: 2,
      ciclo: 3,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-301",
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
      codigo: "EP-302",
      nombre: "Estadística Aplicada",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 2,
      horas_laboratorio: 0,
      ciclo: 3,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EP-303",
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
      codigo: "EP-305",
      nombre: "Psicología Organizacional (e)",
      creditos: 3,
      horas_teoria: 2,
      horas_practica: 2,
      horas_laboratorio: 0,
      ciclo: 3,
      tiene_laboratorio: false,
      activo: true,
    },

    // === CICLO V ===
    {
      codigo: "EE-501",
      nombre: "Ingeniería de Datos I",
      creditos: 4,
      horas_teoria: 2,
      horas_practica: 1,
      horas_laboratorio: 3,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-502",
      nombre: "Sistemas de Información",
      creditos: 4,
      horas_teoria: 2,
      horas_practica: 2,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-503",
      nombre: "Transformación digital",
      creditos: 3,
      horas_teoria: 2,
      horas_practica: 0,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-504",
      nombre: "Tecnología web",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 1,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-505",
      nombre: "Arquitectura de computadoras",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 2,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-506",
      nombre: "Teleinformática(e)",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 2,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-501",
      nombre: "Investigación de Operaciones",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 2,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-502",
      nombre: "Contabilidad Gerencial",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 2,
      horas_laboratorio: 2,
      ciclo: 5,
      tiene_laboratorio: true,
      activo: true,
    },

    // === CICLO VII ===
    {
      codigo: "EE-701",
      nombre: "Ingeniería de Software I",
      creditos: 4,
      horas_teoria: 2,
      horas_practica: 1,
      horas_laboratorio: 3,
      ciclo: 7,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-702",
      nombre: "Redes y Comunicaciones I",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 1,
      horas_laboratorio: 3,
      ciclo: 7,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-703",
      nombre: "Negocios Electrónicos (e)",
      creditos: 3,
      horas_teoria: 2,
      horas_practica: 0,
      horas_laboratorio: 2,
      ciclo: 7,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-704",
      nombre: "Gestión de Servicios de TI",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 2,
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
      horas_practica: 2,
      horas_laboratorio: 0,
      ciclo: 7,
      tiene_laboratorio: false,
      activo: true,
    },
    {
      codigo: "EE-705",
      nombre: "Administración de Base de Datos",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 1,
      horas_laboratorio: 3,
      ciclo: 7,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-706",
      nombre: "Planeamiento Estratégico de TI",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 2,
      horas_laboratorio: 2,
      ciclo: 7,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EP-701",
      nombre: "Cadena de Suministros (e)",
      creditos: 3,
      horas_teoria: 2,
      horas_practica: 2,
      horas_laboratorio: 0,
      ciclo: 7,
      tiene_laboratorio: false,
      activo: true,
    },

    // === CICLO IX ===
    {
      codigo: "EI-901",
      nombre: "Tesis I",
      creditos: 4,
      horas_teoria: 2,
      horas_practica: 2,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-901",
      nombre: "Analítica de Negocios",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 2,
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
      horas_practica: 2,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-903",
      nombre: "Gestión de Proyectos de TI",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 2,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-904",
      nombre: "Emprendimiento Tecnológico",
      creditos: 3,
      horas_teoria: 2,
      horas_practica: 0,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-905",
      nombre: "Ingeniería Web",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 1,
      horas_laboratorio: 3,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-906",
      nombre: "Computación en la Nube",
      creditos: 3,
      horas_teoria: 1,
      horas_practica: 1,
      horas_laboratorio: 3,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "EE-907",
      nombre: "Hackeo Ético (e)",
      creditos: 3,
      horas_teoria: 2,
      horas_practica: 0,
      horas_laboratorio: 2,
      ciclo: 9,
      tiene_laboratorio: true,
      activo: true,
    },
  ];

  const dbCursos: Curso[] = [];
  for (const c of cursosData) {
    const curso = await cursoRepo.save(cursoRepo.create(c));
    dbCursos.push(curso);
  }
  console.log(`✅ ¡Éxito! ${dbCursos.length} cursos creados.`);

  // ── 6. GRUPOS ACADÉMICOS (según valor G de laboratorios) ─────────────────
  console.log("👥 Creando grupos académicos para 2026-I...");
  const cursosConGruposMultiples: { [key: string]: number } = {
    "EE-102": 2,
    "EE-301": 1,
    "EE-302": 1,
    "EE-303": 1,
    "EP-301": 1,
    "EP-302": 1,
    "EP-304": 1,
    "EE-501": 1,
    "EE-502": 1,
    "EE-503": 1,
    "EE-504": 1,
    "EE-505": 1,
    "EE-506": 1,
    "EP-501": 1,
    "EP-502": 1,
    "EE-701": 1,
    "EE-702": 1,
    "EE-703": 1,
    "EE-704": 1,
    "EE-705": 1,
    "EE-706": 1,
    "EI-901": 1,
    "EE-901": 1,
    "EE-902": 1,
    "EE-903": 1,
    "EE-904": 1,
    "EE-905": 1,
    "EE-906": 1,
    "EE-907": 1,
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

  // ── 7. RELACIÓN CURSO-AMBIENTE ───────────────────────────────────────────
  console.log("🔗 Configurando relaciones Curso-Ambiente...");
  const laboratorios = dbAmbientes.filter(
    (a) => a.tipo === TipoAmbiente.LABORATORIO,
  );
  const ambientesNoLaboratorio = dbAmbientes.filter(
    (a) => a.tipo !== TipoAmbiente.LABORATORIO,
  );

  for (const curso of dbCursos) {
    curso.ambientes = curso.tiene_laboratorio
      ? [...ambientesNoLaboratorio, ...laboratorios]
      : [...ambientesNoLaboratorio];
    await cursoRepo.save(curso);
  }
  console.log("✅ Relaciones Curso-Ambiente mapeadas\n");

  // ── 8. HABILITACIONES DOCENTE-CURSO (según datos del usuario) ──────────────────────
  console.log("🎓 Asignando docentes a cursos según datos proporcionados...");

  // --- RESTRICCIONES INSTITUCIONALES ---
  console.log("📏 Creando restricciones institucionales...");
  const periodoId = periodoActivo?.id ?? dbPeriodos[0]?.id;
  const periodoCodigo = periodoActivo?.codigo ?? "2026-I";

  const restriccionesData = [
    {
      tipo_restriccion: "BLOQUE_ALMUERZO",
      valor: { hora_inicio: "13:00", hora_fin: "14:00" },
      periodo_academico: periodoCodigo,
      activo: true,
    },
    {
      tipo_restriccion: "DURACION_BLOQUE",
      valor: { duracion_minutos: 60 },
      periodo_academico: periodoCodigo,
      activo: true,
    },
    {
      tipo_restriccion: "MAX_HORAS_DIARIAS",
      valor: { max_horas: 10 },
      periodo_academico: periodoCodigo,
      activo: true,
    },
  ];

  for (const r of restriccionesData) {
    await restriccionRepo.save(restriccionRepo.create(r));
  }

  // --- DÍAS ACTIVOS ---
  console.log("📅 Configurando días activos...");
  const diasSemana = [
    { dia_semana: 1, nombre: "Lunes", activo: true },
    { dia_semana: 2, nombre: "Martes", activo: true },
    { dia_semana: 3, nombre: "Miércoles", activo: true },
    { dia_semana: 4, nombre: "Jueves", activo: true },
    { dia_semana: 5, nombre: "Viernes", activo: true },
    { dia_semana: 6, nombre: "Sábado", activo: true },
    { dia_semana: 7, nombre: "Domingo", activo: false },
  ];

  const diaActivoRepo = AppDataSource.getRepository(DiaActivo);
  for (const d of diasSemana) {
    await diaActivoRepo.save(diaActivoRepo.create(d));
  }

  const docenteCursoData = [
    // === CICLO I ===
    {
      docenteNombre: "Marcelino Torres Villanueva",
      cursoCodigo: "EE-102",
      tipoClases: [TipoClase.TEORIA, TipoClase.LABORATORIO],
      grupos: 2,
    },
    {
      docenteNombre: "Alberto Mendoza de los Santos",
      cursoCodigo: "EE-101",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA],
      grupos: 1,
    },
    {
      docenteNombre: "Paul Cotrina Castellanos",
      cursoCodigo: "EE-102",
      tipoClases: [TipoClase.LABORATORIO],
      grupos: 2,
    },
    {
      docenteNombre: "Bertha Urtecho Zavaleta",
      cursoCodigo: "EG-103",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA],
      grupos: 1,
    },
    {
      docenteNombre: "Jose Luis Ponte Bejarano",
      cursoCodigo: "EG-101",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA],
      grupos: 1,
    },
    {
      docenteNombre: "Jorge Luis Rios Gonzales",
      cursoCodigo: "EG-102",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA],
      grupos: 1,
    },
    {
      docenteNombre: "Segundo Guibar Obeso",
      cursoCodigo: "EG-104",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA],
      grupos: 1,
    },
    {
      docenteNombre: "Miguel Ipanaque Zapata",
      cursoCodigo: "EG-105",
      tipoClases: [TipoClase.PRACTICA],
      grupos: 1,
    },
    {
      docenteNombre: "Martha Cardoso",
      cursoCodigo: "EG-105",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA],
      grupos: 1,
    },

    // === CICLO III ===
    {
      docenteNombre: "Zoraida Vidal Melgarejo",
      cursoCodigo: "EE-301",
      tipoClases: [TipoClase.TEORIA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Everson David Agreda Gamboa",
      cursoCodigo: "EE-302",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Juan Carlos Obando Roldán",
      cursoCodigo: "EE-303",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Marcos Ferrer Reyna",
      cursoCodigo: "EP-301",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 1,
    },
    {
      docenteNombre: "Teresita Rojas Garcia",
      cursoCodigo: "EP-302",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Juan Carrascal Cabanillas",
      cursoCodigo: "EP-303",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA],
      grupos: 1,
    },
    {
      docenteNombre: "Vilma Mendez Gil",
      cursoCodigo: "EP-304",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 1,
    },
    {
      docenteNombre: "Sheyla Laura Escobedo Rodriguez",
      cursoCodigo: "EP-305",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA],
      grupos: 1,
    },

    // === CICLO V ===
    {
      docenteNombre: "Luis Boy Chavil",
      cursoCodigo: "EE-501",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Juan Carlos Obando Roldan",
      cursoCodigo: "EE-502",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Everson David Agreda Gamboa",
      cursoCodigo: "EE-503",
      tipoClases: [TipoClase.TEORIA, TipoClase.LABORATORIO],
      grupos: 2,
    },
    {
      docenteNombre: "Robert Jerry Sánchez Ticona",
      cursoCodigo: "EE-504",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Cesar Arellano Salazar",
      cursoCodigo: "EE-505",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Camilo Suárez Rebaza",
      cursoCodigo: "EE-506",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 2,
    },
    {
      docenteNombre: "Marcos Baca Lopez",
      cursoCodigo: "EP-501",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 1,
    },
    {
      docenteNombre: "Ana Cuadra Mitzugaray",
      cursoCodigo: "EP-502",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 1,
    },

    // === CICLO VII ===
    {
      docenteNombre: "Juan Pedro Santos Fernández",
      cursoCodigo: "EE-701",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 1,
    },
    {
      docenteNombre: "César Arellano Salazar",
      cursoCodigo: "EE-702",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Robert Jerry Sánchez Ticona",
      cursoCodigo: "EE-701",
      tipoClases: [TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Everson David Agreda Gamboa",
      cursoCodigo: "EE-703",
      tipoClases: [TipoClase.TEORIA],
      grupos: 0,
    },
    {
      docenteNombre: "Alberto Mendoza de los Santos",
      cursoCodigo: "EE-704",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 2,
    },
    {
      docenteNombre: "Paul Cotrina Castellanos",
      cursoCodigo: "EI-701",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA],
      grupos: 1,
    },
    {
      docenteNombre: "Ricardo Mendoza Rivera",
      cursoCodigo: "EE-705",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 2,
    },
    {
      docenteNombre: "Oscar Romel Alcántara Moreno",
      cursoCodigo: "EE-706",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 4,
    },
    {
      docenteNombre: "Paul Cotrina Castellanos",
      cursoCodigo: "EE-703",
      tipoClases: [TipoClase.LABORATORIO],
      grupos: 2,
    },
    {
      docenteNombre: "Jhoe Gonzalez Vasquez",
      cursoCodigo: "EP-701",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA],
      grupos: 1,
    },

    // === CICLO IX ===
    {
      docenteNombre: "Juan Pedro Santos Fernández",
      cursoCodigo: "EI-901",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 1,
    },
    {
      docenteNombre: "Ricardo Mendoza Rivera",
      cursoCodigo: "EI-901",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 1,
    },
    {
      docenteNombre: "Ricardo Mendoza Rivera",
      cursoCodigo: "EE-901",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 1,
    },
    {
      docenteNombre: "Alberto Mendoza de los Santos",
      cursoCodigo: "EE-902",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 2,
    },
    {
      docenteNombre: "José Gómez Ávila",
      cursoCodigo: "EE-903",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Oscar Romel Alcántara Moreno",
      cursoCodigo: "EE-904",
      tipoClases: [TipoClase.TEORIA, TipoClase.LABORATORIO],
      grupos: 2,
    },
    {
      docenteNombre: "Marcelino Torres Villanueva",
      cursoCodigo: "EE-905",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "José Gómez Ávila",
      cursoCodigo: "EE-906",
      tipoClases: [TipoClase.TEORIA, TipoClase.PRACTICA, TipoClase.LABORATORIO],
      grupos: 3,
    },
    {
      docenteNombre: "Camilo Suarez Rebaza",
      cursoCodigo: "EE-907",
      tipoClases: [TipoClase.TEORIA, TipoClase.LABORATORIO],
      grupos: 2,
    },
  ];

  for (const dcData of docenteCursoData) {
    const docente = dbDocentes.find(
      (d) => `${d.nombres} ${d.apellidos}` === dcData.docenteNombre,
    );
    const curso = dbCursos.find((c) => c.codigo === dcData.cursoCodigo);

    if (docente && curso) {
      for (const tipoClase of dcData.tipoClases) {
        await docenteCursoRepo.save(
          docenteCursoRepo.create({
            docenteId: docente.id,
            cursoId: curso.id,
            tipo_clase: tipoClase,
            periodoId,
            grupos: dcData.grupos,
          }),
        );
      }
    }
  }
  console.log("✅ Asignaciones docente-curso completadas\n");

  // ── 9. (Horarios Asignados serán creados por el usuario) ────────────────
  console.log("📅 Horarios asignados no creados (listo para que tú los crees)\n");

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

  // ── 11. DISPONIBILIDAD DOCENTE ───────────────────────
  console.log(
    "🕐 Registrando disponibilidad horaria completa para asignaciones...",
  );
  const slotsToSave: DisponibilidadDocente[] = [];
  for (const doc of dbDocentes) {
    for (let dia = 1; dia <= 5; dia++) {
      const horasValidas = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
      for (const h of horasValidas) {
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

  // ── 12. FACULTADES, ESCUELAS Y DEPARTAMENTOS ────────────────────────────────────
  console.log("🏛️  Creando facultades, escuelas y departamentos...");

  const coordFac = await usuarioRepo.save(
    usuarioRepo.create({
      nombre: "Coordinador Académico",
      email: "coord@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true,
    }),
  );

  const fing = await facultadRepo.save(
    facultadRepo.create({
      codigo: "FING",
      nombre: "Facultad de Ingeniería",
      descripcion: "Facultad de Ingeniería",
      activo: true,
      coordinador_id: coordFac.id,
    }),
  );

  const dirEscuela = await usuarioRepo.save(
    usuarioRepo.create({
      nombre: "Director de Escuela",
      email: "dir.eisist@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true,
    }),
  );

  const escuela = await escuelaRepo.save(
    escuelaRepo.create({
      codigo: "EISIST",
      nombre: "Ingeniería de Sistemas",
      facultad_id: fing.id,
      activo: true,
    }),
  );

  const departamentosData = [
    { codigo: "DINGSI", nombre: "Ing. de Sistemas", escuela_id: escuela.id },
    { codigo: "DMATEM", nombre: "Matemáticas", escuela_id: escuela.id },
    { codigo: "DESTAD", nombre: "Estadística", escuela_id: escuela.id },
    { codigo: "DLENGUA", nombre: "Lengua Nacional y Literatura", escuela_id: escuela.id },
    { codigo: "DPSICO", nombre: "CC. Psicológicas", escuela_id: escuela.id },
    { codigo: "DADMIN", nombre: "Administración", escuela_id: escuela.id },
    { codigo: "DFISICA", nombre: "Física", escuela_id: escuela.id },
    { codigo: "DINDUS", nombre: "Ingeniería Industrial", escuela_id: escuela.id },
    { codigo: "DCONT", nombre: "Contabilidad y Finanzas", escuela_id: escuela.id },
  ];

  for (const dep of departamentosData) {
    await departamentoRepo.save(departamentoRepo.create(dep));
  }
  console.log("✅ Facultades, escuelas y departamentos creados\n");

  console.log("🎉 Seed completado exitosamente!");
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error("❌ Error durante el seed:", error);
  process.exit(1);
});
