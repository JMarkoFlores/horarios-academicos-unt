import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { join } from "path";
import * as bcrypt from "bcrypt";

// Configuración de variables de entorno
config({ path: join(__dirname, "..", "..", ".env") });

// Entidades
import { Usuario } from "../entities/usuario.entity";
import { Docente } from "../entities/docente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Grupo } from "../entities/grupo.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { DiaActivo } from "../entities/dia-activo.entity";
import { Facultad } from "../entities/facultad.entity";
import { Escuela } from "../entities/escuela.entity";
import { Departamento } from "../entities/departamento.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { ConfiguracionGeneral } from "../entities/configuracion-general.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { CampañaVentanas } from "../entities/campaña-ventanas.entity";
import { VentanaAtencion } from "../entities/ventana-atencion.entity";
import { ColaDocentes } from "../entities/cola-docentes.entity";
import { AuditoriaHorario } from "../entities/auditoria-horario.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { DiaNoLaborable } from "../entities/dia-no-laborable.entity";
import { NotificacionDocente } from "../entities/notificacion-docente.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { Preasignacion } from "../entities/preasignacion.entity";
import { PreferenciasNotificacion } from "../entities/preferencias-notificacion.entity";
import { ReglasPrioridadGlobales } from "../entities/reglas-prioridad.entity";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { SeleccionTemporal } from "../entities/seleccion-temporal.entity";
import { PlanEstudios } from "../entities/plan-estudios.entity";
import { CursoPlanEstudios } from "../entities/curso-plan-estudios.entity";
import { AsignacionLectiva } from "../entities/asignacion-lectiva.entity";
import { DeclaracionObservacion } from "../entities/declaracion-observacion.entity";
import { DeclaracionJurada } from "../entities/declaracion-jurada.entity";
import {
  seedDeclaracionesDemo,
  DNIS_DOCENTES,
} from "./seed-declaraciones-demo";

// Enums
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { TipoDocente } from "../common/enums/tipo-docente.enum";
import { ModalidadDocente } from "../common/enums/modalidad-docente.enum";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { EstadoPeriodo } from "../common/enums/estado-periodo.enum";
import { ModoAsignacion } from "../common/enums/modo-asignacion.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";
import { TipoCursoPlan } from "../common/enums/tipo-curso-plan.enum";

// Importar funciones de seed por ciclo
import { seedHorariosCicloI } from "./seed-horarios-ciclo-I";
import { seedHorariosCicloIII } from "./seed-horarios-ciclo-III";
import { seedHorariosCicloV } from "./seed-horarios-ciclo-V";
import { seedHorariosCicloVII } from "./seed-horarios-ciclo-VII";
import { seedHorariosCicloIX } from "./seed-horarios-ciclo-IX";

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST ?? "localhost",
  port: parseInt(process.env.DATABASE_PORT ?? "5432", 10),
  database: process.env.DATABASE_NAME ?? "horarios_unt",
  username: process.env.DATABASE_USER ?? "unt_user",
  password: process.env.DATABASE_PASSWORD ?? "unt_pass123",
  entities: [join(__dirname, "../entities/**/*.entity{.ts,.js}")],
  synchronize: false,
  logging: false,
});

// ── HELPERS ──────────────────────────────────────────────────────────────────

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const diaANumero = (dia: string): number => {
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

const parsearRangoHoras = (rango: string) => {
  const parts = rango.split("-");
  const h1 = parseInt(parts[0].split(":")[0]);
  const h2 = parseInt(parts[1].split(":")[0]);
  const horaInicio = h1 <= 6 ? h1 + 12 : h1;
  let horaFin = h2 <= 6 || h2 < h1 ? h2 + 12 : h2;
  if (h1 >= 7 && h1 <= 12 && h2 < 7) horaFin = h2 + 12;
  return {
    inicio: `${String(horaInicio).padStart(2, "0")}:00:00`,
    fin: `${String(horaFin).padStart(2, "0")}:00:00`,
    diff: horaFin - horaInicio,
  };
};

const mapAmbienteCode = (nombre: string): string => {
  const map: { [key: string]: string } = {
    "Lab. 1": "LAB-1",
    Lab1: "LAB-1",
    "Lab. 2": "LAB-2",
    Lab2: "LAB-2",
    "Lab. 3": "LAB-3",
    Lab3: "LAB-3",
    "Lab. 4": "LAB-4",
    Lab4: "LAB-4",
    "posgrado A-307": "A-307",
    "posgrado A-303": "A-303",
    "posgrado A-311": "A-311",
    "I-4": "I-4",
    "Lab. Fisica": "LAB-FIS",
    "Taller Confecciones - Ing. Industrial": "TALLER-CONFECCIONES",
    "Taller Confecciones (Ing. Industrial)": "TALLER-CONFECCIONES",
    "Taller de Confecciones - Ing. Industrial": "TALLER-CONFECCIONES",
    "Taller Confecciones - Ing. Indust.": "TALLER-CONFECCIONES",
    "I I - 2 (Pabellon Ing. Industrial)": "II-2",
  };
  return map[nombre] ?? nombre;
};

const mapTipoClase = (tipo: string): TipoClase => {
  const t = tipo.toLowerCase();
  if (t.includes("laboratorio")) return TipoClase.LABORATORIO;
  if (t.includes("teoria") || t.includes("teoría")) return TipoClase.TEORIA;
  if (t.includes("practica") || t.includes("práctica"))
    return TipoClase.PRACTICA;
  return TipoClase.TEORIA;
};

// ── MAIN SEED FUNCTION ───────────────────────────────────────────────────────

export async function main() {
  console.log("🚀 Iniciando SEED UNIFICADO del Sistema de Horarios...");

  await AppDataSource.initialize();
  console.log("✅ Conexión establecida.");

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    console.log("🧹 Limpiando base de datos...");
    const tables = [
      "declaracion_observacion",
      "declaracion_jurada",
      "carga_adicional",
      "asignacion_lectiva",
      "notificacion_docente",
      "cola_docentes",
      "ventana_atencion",
      "campaña_ventanas",
      "curso_plan_estudios",
      "plan_estudios",
      "disponibilidad_docente",
      "declaracion_carga_horaria",
      "horario_asignado",
      "docente_curso",
      "grupo",
      "curso",
      "docente",
      "usuario",
      "departamento",
      "escuela",
      "facultad",
      "periodo_academico",
      "dia_activo",
      "turno_horario",
      "ambiente",
      "configuracion_general",
    ];
    for (const table of tables) {
      try {
        await queryRunner.query(
          `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`,
        );
      } catch (error: any) {
        if (error.code === "42P01") {
          console.log(`⚠️  Tabla "${table}" no existe, saltando...`);
        } else {
          throw error;
        }
      }
    }

    const docenteRepo = AppDataSource.getRepository(Docente);
    const usuarioRepo = AppDataSource.getRepository(Usuario);
    const facultadRepo = AppDataSource.getRepository(Facultad);
    const escuelaRepo = AppDataSource.getRepository(Escuela);
    const departamentoRepo = AppDataSource.getRepository(Departamento);
    const periodoRepo = AppDataSource.getRepository(PeriodoAcademico);
    const cursoRepo = AppDataSource.getRepository(Curso);
    const grupoRepo = AppDataSource.getRepository(Grupo);
    const ambienteRepo = AppDataSource.getRepository(Ambiente);
    const horarioRepo = AppDataSource.getRepository(HorarioAsignado);
    const turnoRepo = AppDataSource.getRepository(TurnoHorario);
    const diaActivoRepo = AppDataSource.getRepository(DiaActivo);
    const declaracionRepo = AppDataSource.getRepository(
      DeclaracionCargaHoraria,
    );

    const passwordHash = await bcrypt.hash("Admin123!", 10);

    // ── 0.5. USUARIOS ESPECIALES ──────────────────────────────────────────
    console.log("🔑 Creando usuarios administrativos...");
    const admin = await usuarioRepo.save(
      usuarioRepo.create({
        nombre: "Administrador del Sistema",
        email: "admin@unt.edu.pe",
        password_hash: passwordHash,
        rol: RolUsuario.ADMINISTRADOR_SISTEMA,
        activo: true,
      }),
    );

    const decano = await usuarioRepo.save(
      usuarioRepo.create({
        nombre: "Decano de Ingeniería",
        email: "decano@unt.edu.pe",
        password_hash: passwordHash,
        rol: RolUsuario.DECANO,
        activo: true,
      }),
    );

    const directorEscuela = await usuarioRepo.save(
      usuarioRepo.create({
        nombre: "Director de Escuela de Sistemas",
        email: "director.escuela@unt.edu.pe",
        password_hash: passwordHash,
        rol: RolUsuario.DIRECTOR_ESCUELA,
        activo: true,
      }),
    );

    const directorDpto = await usuarioRepo.save(
      usuarioRepo.create({
        nombre: "Director de Departamento de Sistemas",
        email: "director.departamento@unt.edu.pe",
        password_hash: passwordHash,
        rol: RolUsuario.DIRECTOR_DEPARTAMENTO,
        activo: true,
      }),
    );

    const coordinadorAcademico = await usuarioRepo.save(
      usuarioRepo.create({
        nombre: "Coordinador Académico",
        email: "coordinador@unt.edu.pe",
        password_hash: passwordHash,
        rol: RolUsuario.COORDINADOR_ACADEMICO,
        activo: true,
      }),
    );

    const secretaria = await usuarioRepo.save(
      usuarioRepo.create({
        nombre: "Secretaria de Sistemas",
        email: "secretaria@unt.edu.pe",
        password_hash: passwordHash,
        rol: RolUsuario.SECRETARIA,
        activo: true,
      }),
    );

    const operador = await usuarioRepo.save(
      usuarioRepo.create({
        nombre: "Operador de Horarios",
        email: "operador@unt.edu.pe",
        password_hash: passwordHash,
        rol: RolUsuario.OPERADOR_HORARIOS,
        activo: true,
      }),
    );

    // ── 1. INFRAESTRUCTURA ────────────────────────────────────────────────
    console.log("🏗️ Creando infraestructura base...");
    await turnoRepo.save([
      {
        nombre: "Mañana",
        hora_inicio: "07:00",
        hora_fin: "14:00",
        activo: true,
      },
      {
        nombre: "Tarde",
        hora_inicio: "14:00",
        hora_fin: "23:00",
        activo: true,
      },
    ]);

    await diaActivoRepo.save([
      { dia_semana: 1, nombre: "Lunes", activo: true },
      { dia_semana: 2, nombre: "Martes", activo: true },
      { dia_semana: 3, nombre: "Miércoles", activo: true },
      { dia_semana: 4, nombre: "Jueves", activo: true },
      { dia_semana: 5, nombre: "Viernes", activo: true },
      { dia_semana: 6, nombre: "Sábado", activo: false },
      { dia_semana: 7, nombre: "Domingo", activo: false },
    ]);

    const periodos = await periodoRepo.save([
      {
        codigo: "2025-II",
        nombre: "Semestre 2025-II",
        fecha_inicio: new Date("2025-08-01"),
        fecha_fin: new Date("2025-12-31"),
        estado: EstadoPeriodo.FINALIZADO,
        activo: false,
        modo_asignacion: ModoAsignacion.AUTOMATICA,
      },
      {
        codigo: "2026-I",
        nombre: "Semestre 2026-I",
        fecha_inicio: new Date("2026-03-01"),
        fecha_fin: new Date("2026-07-31"),
        estado: EstadoPeriodo.EN_CURSO,
        activo: true,
        modo_asignacion: ModoAsignacion.MIXTA,
      },
    ]);
    const periodoActivo = periodos.find((p) => p.codigo === "2026-I")!;

    console.log("🏢 Creando facultades, escuelas y departamentos...");
    const facultad = await facultadRepo.save(
      facultadRepo.create({
        nombre: "Facultad de Ingeniería",
        codigo: "FI",
        coordinador_id: decano.id,
      }),
    );
    const escuela = await escuelaRepo.save(
      escuelaRepo.create({
        nombre: "Ingeniería de Sistemas",
        codigo: "IS",
        facultad_id: facultad.id,
        coordinador_id: directorEscuela.id,
      }),
    );
    const departamentosData = [
      {
        nombre: "Departamento de Ingeniería de Sistemas",
        codigo: "DING",
        departamento_nombre: "INGENIERÍA DE SISTEMAS",
      },
      {
        nombre: "Departamento de Ciencias Psicológicas, Filosofía y Arte",
        codigo: "DCPFA",
        departamento_nombre: "CIENCIAS PSICOLÓGICAS FILOSOFÍA Y ARTE",
      },
      {
        nombre: "Departamento de Matemáticas",
        codigo: "DMAT",
        departamento_nombre: "MATEMÁTICAS",
      },
      {
        nombre: "Departamento de Lengua Nacional y Literatura",
        codigo: "DLNL",
        departamento_nombre: "LENGUA NACIONAL Y LITERATURA",
      },
      {
        nombre: "Departamento de Estadística",
        codigo: "DEST",
        departamento_nombre: "ESTADÍSTICA",
      },
      {
        nombre: "Departamento de Comunicación Social",
        codigo: "DCS",
        departamento_nombre: "COMUNICACIÓN SOCIAL",
      },
      {
        nombre: "Departamento de Filosofía y Arte",
        codigo: "DFA",
        departamento_nombre: "FILOSOFÍA Y ARTE",
      },
      {
        nombre: "Departamento de Ciencias de la Educación",
        codigo: "DCE",
        departamento_nombre: "CIENCIAS DE LA EDUCACIÓN",
      },
      {
        nombre: "Departamento de Ciencias Sociales",
        codigo: "DCSO",
        departamento_nombre: "CIENCIAS SOCIALES",
      },
      {
        nombre: "Departamento de Física",
        codigo: "DFIS",
        departamento_nombre: "FÍSICA",
      },
      {
        nombre: "Departamento de Administración",
        codigo: "DADM",
        departamento_nombre: "ADMINISTRACIÓN",
      },
      {
        nombre: "Departamento de Economía",
        codigo: "DECO",
        departamento_nombre: "ECONOMÍA",
      },
      {
        nombre: "Departamento de Contabilidad y Finanzas",
        codigo: "DCF",
        departamento_nombre: "CONTABILIDAD Y FINANZAS",
      },
      {
        nombre: "Departamento de Ingeniería de Sistemas y Industrial",
        codigo: "DISI",
        departamento_nombre: "INGENIERÍA DE SISTEMAS INGENIERÍA INDUSTRIAL",
      },
      {
        nombre: "Departamento de Ingeniería Industrial",
        codigo: "DII",
        departamento_nombre: "INGENIERÍA INDUSTRIAL",
      },
      {
        nombre: "Departamento de Ingeniería Química y Ambiental",
        codigo: "DIQA",
        departamento_nombre: "INGENIERÍA QUÍMICA INGENIERÍA AMBIENTAL",
      },
      {
        nombre: "Departamento de Derecho",
        codigo: "DDER",
        departamento_nombre: "DERECHO",
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
            d.departamento_nombre === "INGENIERÍA DE SISTEMAS"
              ? directorDpto.id
              : null,
        }),
      );
      createdDepartamentos[d.departamento_nombre] = dep;
    }
    const departamento = createdDepartamentos["INGENIERÍA DE SISTEMAS"];

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

    console.log("🏠 Creando ambientes...");
    const ambientesData = [
      {
        codigo: "A-307",
        nombre: "Aula 307",
        tipo: TipoAmbiente.AULA,
        capacidad: 40,
      },
      {
        codigo: "A-303",
        nombre: "Aula 303",
        tipo: TipoAmbiente.AULA,
        capacidad: 40,
      },
      {
        codigo: "A-311",
        nombre: "Aula 311",
        tipo: TipoAmbiente.AULA,
        capacidad: 40,
      },
      {
        codigo: "LAB-1",
        nombre: "Laboratorio 1",
        tipo: TipoAmbiente.LABORATORIO,
        capacidad: 30,
      },
      {
        codigo: "LAB-2",
        nombre: "Laboratorio 2",
        tipo: TipoAmbiente.LABORATORIO,
        capacidad: 30,
      },
      {
        codigo: "LAB-3",
        nombre: "Laboratorio 3",
        tipo: TipoAmbiente.LABORATORIO,
        capacidad: 30,
      },
      {
        codigo: "LAB-4",
        nombre: "Laboratorio 4",
        tipo: TipoAmbiente.LABORATORIO,
        capacidad: 30,
      },
      {
        codigo: "LAB-FIS",
        nombre: "Laboratorio de Física",
        tipo: TipoAmbiente.LABORATORIO,
        capacidad: 30,
      },
      {
        codigo: "TALLER-CONFECCIONES",
        nombre: "Taller de Confecciones",
        tipo: TipoAmbiente.TALLER,
        capacidad: 40,
      },
      {
        codigo: "II-2",
        nombre: "Pabellón Industrial II-2",
        tipo: TipoAmbiente.AULA,
        capacidad: 50,
      },
      {
        codigo: "I-4",
        nombre: "Aula I-4",
        tipo: TipoAmbiente.AULA,
        capacidad: 45,
      },
      {
        codigo: "Audiovisuales",
        nombre: "Sala de Audiovisuales",
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

    console.log("👨‍🏫 Creando docentes...");
    const docentesData = [
      {
        nombres: "Marcelino",
        apellidos: "Torres Villanueva",
        email: "torres.villanueva@unt.edu.pe",
        ibm: 1001,
      },
      {
        nombres: "Alberto",
        apellidos: "Mendoza de los Santos",
        email: "mendoza.santos@unt.edu.pe",
        ibm: 1002,
      },
      {
        nombres: "Paul",
        apellidos: "Cotrina Castellanos",
        email: "cotrina.castellanos@unt.edu.pe",
        ibm: 1003,
      },
      {
        nombres: "Bertha",
        apellidos: "Urtecho Zavaleta",
        email: "urtecho.zavaleta@unt.edu.pe",
        ibm: 1004,
      },
      {
        nombres: "Jose Luis",
        apellidos: "Ponte Bejarano",
        email: "ponte.bejarano@unt.edu.pe",
        ibm: 1005,
      },
      {
        nombres: "Jorge Luis",
        apellidos: "Rios Gonzales",
        email: "rios.gonzales@unt.edu.pe",
        ibm: 1006,
      },
      {
        nombres: "Segundo",
        apellidos: "Guibar Obeso",
        email: "guibar.obeso@unt.edu.pe",
        ibm: 1007,
      },
      {
        nombres: "Miguel",
        apellidos: "Ipanaque Zapata",
        email: "ipanaque.zapata@unt.edu.pe",
        ibm: 1008,
      },
      {
        nombres: "Martha",
        apellidos: "Cardoso",
        email: "cardoso@unt.edu.pe",
        ibm: 1009,
      },
      {
        nombres: "Zoraida",
        apellidos: "Vidal Melgarejo",
        email: "zvidal@unt.edu.pe",
        ibm: 1010,
      },
      {
        nombres: "Everson David",
        apellidos: "Agreda Gamboa",
        email: "eagreda@unt.edu.pe",
        ibm: 1011,
      },
      {
        nombres: "Juan Carlos",
        apellidos: "Obando Roldan",
        email: "jobando@unt.edu.pe",
        ibm: 1012,
      },
      {
        nombres: "Marcos",
        apellidos: "Ferrer Reyna",
        email: "mferrer@unt.edu.pe",
        ibm: 1013,
      },
      {
        nombres: "Teresita",
        apellidos: "Rojas Garcia",
        email: "trojas@unt.edu.pe",
        ibm: 1014,
      },
      {
        nombres: "Juan",
        apellidos: "Carrascal Cabanillas",
        email: "jcarrascal@unt.edu.pe",
        ibm: 1015,
      },
      {
        nombres: "Vilma",
        apellidos: "Mendez Gil",
        email: "vmendez@unt.edu.pe",
        ibm: 1016,
      },
      {
        nombres: "Sheyla Laura",
        apellidos: "Escobedo Rodriguez",
        email: "sescobedo@unt.edu.pe",
        ibm: 1017,
      },
      {
        nombres: "Luis",
        apellidos: "Boy Chavil",
        email: "lboy@unt.edu.pe",
        ibm: 1018,
      },
      {
        nombres: "Robert Jerry",
        apellidos: "Sanchez Ticona",
        email: "rsanchez@unt.edu.pe",
        ibm: 1019,
      },
      {
        nombres: "Cesar",
        apellidos: "Arellano Salazar",
        email: "carellano@unt.edu.pe",
        ibm: 1020,
      },
      {
        nombres: "Camilo",
        apellidos: "Suarez Rebaza",
        email: "csuarez@unt.edu.pe",
        ibm: 1021,
      },
      {
        nombres: "Marcos",
        apellidos: "Baca Lopez",
        email: "mbaca@unt.edu.pe",
        ibm: 1022,
      },
      {
        nombres: "Ana",
        apellidos: "Cuadra Mitzugaray",
        email: "acuadra@unt.edu.pe",
        ibm: 1023,
      },
      {
        nombres: "Juan Pedro",
        apellidos: "Santos Fernandez",
        email: "jsantos@unt.edu.pe",
        ibm: 4247,
      },
      {
        nombres: "Ricardo",
        apellidos: "Mendoza Rivera",
        email: "rmendoza@unt.edu.pe",
        ibm: 1025,
      },
      {
        nombres: "Oscar Romel",
        apellidos: "Alcantara Moreno",
        email: "oalcantara@unt.edu.pe",
        ibm: 1026,
      },
      {
        nombres: "Jhoe",
        apellidos: "Gonzalez Vasquez",
        email: "jgonzalez@unt.edu.pe",
        ibm: 1027,
      },
      {
        nombres: "Jose",
        apellidos: "Gomez Avila",
        email: "jgomez@unt.edu.pe",
        ibm: 1028,
      },
    ];

    const fechasIngreso = [
      "2005-03-01",
      "2008-04-15",
      "2010-01-10",
      "2012-06-20",
      "2014-03-01",
      "2015-08-15",
      "2006-11-30",
      "2009-02-28",
      "2011-09-01",
      "2013-07-15",
      "2016-04-01",
      "2018-10-10",
      "2007-12-01",
      "2017-05-20",
      "2019-01-15",
      "2020-03-01",
      "2021-08-15",
      "2013-11-01",
      "2022-02-20",
      "2019-07-01",
      "2016-09-15",
      "2020-06-01",
      "2018-03-10",
      "2015-04-01",
      "2017-11-20",
      "2021-01-15",
      "2023-03-01",
      "2022-09-10",
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

    for (const [i, d] of docentesData.entries()) {
      const cond = condiciones[i];
      const usuario = await usuarioRepo.save(
        usuarioRepo.create({
          nombre: `${d.nombres} ${d.apellidos}`,
          email: d.email,
          password_hash: passwordHash,
          rol: RolUsuario.DOCENTE,
          activo: true,
        }),
      );
      await docenteRepo.save(
        docenteRepo.create({
          ...d,
          ibm: DNIS_DOCENTES[i] ?? d.ibm,
          codigo: `DOC-${DNIS_DOCENTES[i] ?? d.ibm}`,
          usuario,
          departamento_id: departamento.id,
          facultad_id: facultad.id,
          tipo_docente: cond.tipo_docente,
          categoria: cond.categoria,
          tipo_contrato: cond.tipo_contrato,
          modalidad: modalidadesAsignadas[i],
          fecha_ingreso: new Date(fechasIngreso[i]),
          activo: true,
        }),
      );
    }

    console.log("📋 Creando Plan de Estudios 2018...");
    const planRepo = AppDataSource.getRepository(PlanEstudios);
    const cursoPlanRepo = AppDataSource.getRepository(CursoPlanEstudios);
    const plan2018 = await planRepo.save(
      planRepo.create({
        codigo: "2018",
        nombre: "Plan de Estudios 2018",
        descripcion:
          "Plan de estudios de Ingeniería de Sistemas - Aprobado con R.N° 123-2018-UNT",
        resolucion: "R.N° 123-2018-UNT",
        anio: 2018,
        activo: true,
        escuela_id: escuela.id,
      }),
    );

    console.log("📚 Creando cursos y grupos...");
    // Datos reales de PLAN_ESTUDIO_2018.md
    const planEstudio2018Data = [
      {
        codigo: "1939",
        ciclo: 1,
        tipo: "S",
        nombre: "INTRODUCCIÓN A LA INGENIERÍA DE SISTEMAS",
        ht: 3,
        hp: 2,
        hl: 0,
        creditos: 2,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "2347",
        ciclo: 1,
        tipo: "S",
        nombre: "INTRODUCCIÓN A LA PROGRAMACIÓN",
        ht: 1,
        hp: 0,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "1854",
        ciclo: 1,
        tipo: "OB",
        nombre: "DESARROLLO PERSONAL",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "CIENCIAS PSICOLÓGICAS FILOSOFÍA Y ARTE",
        prerequisitos: "-",
      },
      {
        codigo: "1855",
        ciclo: 1,
        tipo: "OB",
        nombre: "DESARROLLO DEL PENSAMIENTO LÓGICO MATEMÁTICO",
        ht: 1,
        hp: 4,
        hl: 0,
        creditos: 3,
        departamento: "MATEMÁTICAS",
        prerequisitos: "-",
      },
      {
        codigo: "1857",
        ciclo: 1,
        tipo: "OB",
        nombre: "LECTURA CRÍTICA Y REDACCIÓN DE TEXTOS ACADÉMICOS",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "LENGUA NACIONAL Y LITERATURA",
        prerequisitos: "-",
      },
      {
        codigo: "1863",
        ciclo: 1,
        tipo: "OB",
        nombre: "INTRODUCCIÓN AL ANÁLISIS MATEMÁTICO",
        ht: 2,
        hp: 4,
        hl: 0,
        creditos: 4,
        departamento: "MATEMÁTICAS",
        prerequisitos: "-",
      },
      {
        codigo: "1867",
        ciclo: 1,
        tipo: "OP",
        nombre: "ESTADÍSTICA GENERAL",
        ht: 2,
        hp: 4,
        hl: 0,
        creditos: 4,
        departamento: "ESTADÍSTICA",
        prerequisitos: "-",
      },
      {
        codigo: "1883",
        ciclo: 1,
        tipo: "EL",
        nombre: "TALLER DE TÉCNICAS DE COMUNICACIÓN EFICAZ",
        ht: 0,
        hp: 2,
        hl: 0,
        creditos: 1,
        departamento: "COMUNICACIÓN SOCIAL",
        prerequisitos: "-",
      },
      {
        codigo: "1884",
        ciclo: 1,
        tipo: "EL",
        nombre: "TALLER DE MÚSICA",
        ht: 0,
        hp: 2,
        hl: 0,
        creditos: 1,
        departamento: "FILOSOFÍA Y ARTE",
        prerequisitos: "-",
      },
      {
        codigo: "1908",
        ciclo: 1,
        tipo: "EL",
        nombre: "TALLER DE LIDERAZGO Y TRABAJO EN EQUIPO",
        ht: 0,
        hp: 2,
        hl: 0,
        creditos: 1,
        departamento: "CIENCIAS PSICOLÓGICAS",
        prerequisitos: "-",
      },
      {
        codigo: "2055",
        ciclo: 1,
        tipo: "EL",
        nombre: "TALLER DE DEPORTE",
        ht: 0,
        hp: 2,
        hl: 0,
        creditos: 1,
        departamento: "CIENCIAS DE LA EDUCACIÓN",
        prerequisitos: "-",
      },
      {
        codigo: "2056",
        ciclo: 1,
        tipo: "EL",
        nombre: "TALLER DE TEATRO",
        ht: 0,
        hp: 2,
        hl: 0,
        creditos: 1,
        departamento: "FILOSOFÍA Y ARTE",
        prerequisitos: "-",
      },
      {
        codigo: "2051",
        ciclo: 2,
        tipo: "S",
        nombre: "PROGRAMACIÓN ORIENTADA A OBJETOS I",
        ht: 2,
        hp: 0,
        hl: 4,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "1939 INTRODUCCIÓN A LA INGENIERÍA DE SISTEMAS (Ciclo 1)",
      },
      {
        codigo: "1858",
        ciclo: 2,
        tipo: "OB",
        nombre: "SOCIEDAD CULTURA Y ECOLOGÍA",
        ht: 1,
        hp: 4,
        hl: 0,
        creditos: 3,
        departamento: "CIENCIAS SOCIALES",
        prerequisitos: "-",
      },
      {
        codigo: "1859",
        ciclo: 2,
        tipo: "OB",
        nombre: "CULTURA INVESTIGATIVA Y PENSAMIENTO CRÍTICO",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "CIENCIAS DE LA EDUCACIÓN",
        prerequisitos: "-",
      },
      {
        codigo: "1860",
        ciclo: 2,
        tipo: "OB",
        nombre: "ÉTICA CONVIVENCIA HUMANA Y CIUDADANÍA",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "FILOSOFÍA Y ARTE CIENCIAS PSICOLÓGICAS",
        prerequisitos: "-",
      },
      {
        codigo: "1861",
        ciclo: 2,
        tipo: "OB",
        nombre: "ANÁLISIS MATEMÁTICO",
        ht: 2,
        hp: 4,
        hl: 0,
        creditos: 4,
        departamento: "MATEMÁTICAS",
        prerequisitos: "1863 INTRODUCCIÓN AL ANÁLISIS MATEMÁTICO (Ciclo 1)",
      },
      {
        codigo: "1875",
        ciclo: 2,
        tipo: "OP",
        nombre: "FÍSICA GENERAL",
        ht: 2,
        hp: 4,
        hl: 0,
        creditos: 4,
        departamento: "FÍSICA",
        prerequisitos: "-",
      },
      {
        codigo: "1888",
        ciclo: 2,
        tipo: "EL",
        nombre: "TALLER DE MANEJO DE TIC",
        ht: 0,
        hp: 2,
        hl: 0,
        creditos: 1,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "1889",
        ciclo: 2,
        tipo: "EL",
        nombre: "TALLER DE DANZAS FOLCLÓRICAS",
        ht: 0,
        hp: 2,
        hl: 0,
        creditos: 1,
        departamento: "FILOSOFÍA Y ARTE",
        prerequisitos: "-",
      },
      {
        codigo: "1890",
        ciclo: 2,
        tipo: "EL",
        nombre: "TALLER DE DEPORTE",
        ht: 0,
        hp: 2,
        hl: 0,
        creditos: 1,
        departamento: "CIENCIAS DE LA EDUCACIÓN",
        prerequisitos: "-",
      },
      {
        codigo: "2057",
        ciclo: 2,
        tipo: "EL",
        nombre: "TALLER DE MÚSICA",
        ht: 0,
        hp: 2,
        hl: 0,
        creditos: 1,
        departamento: "FILOSOFÍA Y ARTE",
        prerequisitos: "-",
      },
      {
        codigo: "2140",
        ciclo: 3,
        tipo: "S",
        nombre: "ADMINISTRACIÓN GENERAL",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "ADMINISTRACIÓN",
        prerequisitos: "1860 ÉTICA CONVIVENCIA HUMANA Y CIUDADANÍA (Ciclo 2)",
      },
      {
        codigo: "2141",
        ciclo: 3,
        tipo: "S",
        nombre: "SISTÉMICA",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "1939 INTRODUCCIÓN A LA INGENIERÍA DE SISTEMAS (Ciclo 1)",
      },
      {
        codigo: "2142",
        ciclo: 3,
        tipo: "S",
        nombre: "ESTADÍSTICA APLICADA",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "ESTADÍSTICA",
        prerequisitos: "1867 ESTADÍSTICA GENERAL (Ciclo 1)",
      },
      {
        codigo: "2143",
        ciclo: 3,
        tipo: "S",
        nombre: "MATEMÁTICA APLICADA",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "MATEMÁTICAS",
        prerequisitos: "1861 ANÁLISIS MATEMÁTICO (Ciclo 2)",
      },
      {
        codigo: "2144",
        ciclo: 3,
        tipo: "S",
        nombre: "FÍSICA ELECTRÓNICA",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "FÍSICA",
        prerequisitos: "1875 FÍSICA GENERAL (Ciclo 2)",
      },
      {
        codigo: "2145",
        ciclo: 3,
        tipo: "S",
        nombre: "PROGRAMACIÓN ORIENTADA A OBJETOS II",
        ht: 2,
        hp: 0,
        hl: 4,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "2051 PROGRAMACIÓN ORIENTADA A OBJETOS I (Ciclo 2)",
      },
      {
        codigo: "2146",
        ciclo: 3,
        tipo: "EL",
        nombre: "INGENIERÍA GRÁFICA",
        ht: 1,
        hp: 1,
        hl: 3,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "2147",
        ciclo: 3,
        tipo: "EL",
        nombre: "PSICOLOGÍA ORGANIZACIONAL",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "CIENCIAS PSICOLÓGICAS",
        prerequisitos: "-",
      },
      {
        codigo: "2650",
        ciclo: 4,
        tipo: "S",
        nombre: "ECONOMÍA GENERAL",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "ECONOMÍA",
        prerequisitos: "2141 SISTÉMICA (Ciclo 3)",
      },
      {
        codigo: "2651",
        ciclo: 4,
        tipo: "S",
        nombre: "DISEÑO WEB",
        ht: 1,
        hp: 1,
        hl: 3,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "2142 ESTADÍSTICA APLICADA (Ciclo 3)",
      },
      {
        codigo: "2652",
        ciclo: 4,
        tipo: "S",
        nombre: "PENSAMIENTO DE DISEÑO",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "2141 SISTÉMICA (Ciclo 3)",
      },
      {
        codigo: "2653",
        ciclo: 4,
        tipo: "S",
        nombre: "GESTIÓN DE PROCESOS",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "2141 SISTÉMICA (Ciclo 3)",
      },
      {
        codigo: "2654",
        ciclo: 4,
        tipo: "S",
        nombre: "SISTEMAS DIGITALES",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "2143 MATEMÁTICA APLICADA (Ciclo 3); 2144 FÍSICA ELECTRÓNICA (Ciclo 3)",
      },
      {
        codigo: "2655",
        ciclo: 4,
        tipo: "S",
        nombre: "ESTRUCTURA DE DATOS ORIENTADA A OBJETOS",
        ht: 2,
        hp: 1,
        hl: 3,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "2145 PROGRAMACIÓN ORIENTADA A OBJETOS II (Ciclo 3)",
      },
      {
        codigo: "2656",
        ciclo: 4,
        tipo: "EL",
        nombre: "COMPUTACIÓN GRÁFICA Y VISUAL",
        ht: 1,
        hp: 1,
        hl: 3,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "2657",
        ciclo: 4,
        tipo: "EL",
        nombre: "PLATAFORMAS TECNOLÓGICAS",
        ht: 2,
        hp: 0,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "2689",
        ciclo: 5,
        tipo: "S",
        nombre: "CONTABILIDAD GERENCIAL",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "CONTABILIDAD Y FINANZAS",
        prerequisitos: "2650 ECONOMÍA GENERAL (Ciclo 4)",
      },
      {
        codigo: "2690",
        ciclo: 5,
        tipo: "S",
        nombre: "TECNOLOGÍAS WEB",
        ht: 1,
        hp: 1,
        hl: 3,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "2651 DISEÑO WEB (Ciclo 4)",
      },
      {
        codigo: "2691",
        ciclo: 5,
        tipo: "S",
        nombre: "INVESTIGACIÓN DE OPERACIONES",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS INGENIERÍA INDUSTRIAL",
        prerequisitos: "2652 PENSAMIENTO DE DISEÑO (Ciclo 4)",
      },
      {
        codigo: "2692",
        ciclo: 5,
        tipo: "S",
        nombre: "INGENIERÍA DE DATOS I",
        ht: 2,
        hp: 1,
        hl: 3,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "2653 GESTIÓN DE PROCESOS (Ciclo 4); 2655 ESTRUCTURA DE DATOS ORIENTADA A OBJETOS (Ciclo 4)",
      },
      {
        codigo: "2693",
        ciclo: 5,
        tipo: "S",
        nombre: "ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "2654 SISTEMAS DIGITALES (Ciclo 4)",
      },
      {
        codigo: "2694",
        ciclo: 5,
        tipo: "S",
        nombre: "SISTEMAS DE INFORMACIÓN",
        ht: 2,
        hp: 2,
        hl: 2,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "2651 DISEÑO WEB (Ciclo 4); 2655 ESTRUCTURA DE DATOS ORIENTADA A OBJETOS (Ciclo 4)",
      },
      {
        codigo: "2695",
        ciclo: 5,
        tipo: "EL",
        nombre: "TELEINFORMÁTICA",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "2696",
        ciclo: 5,
        tipo: "EL",
        nombre: "TRANSFORMACIÓN DIGITAL",
        ht: 2,
        hp: 0,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "3125",
        ciclo: 6,
        tipo: "S",
        nombre: "FINANZAS CORPORATIVAS",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "CONTABILIDAD Y FINANZAS",
        prerequisitos: "2689 CONTABILIDAD GERENCIAL (Ciclo 5)",
      },
      {
        codigo: "3126",
        ciclo: 6,
        tipo: "S",
        nombre: "SISTEMAS INTELIGENTES",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "2141 SISTÉMICA (Ciclo 3); 2693 ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS (Ciclo 5)",
      },
      {
        codigo: "3127",
        ciclo: 6,
        tipo: "S",
        nombre: "INGENIERÍA ECONÓMICA",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA INDUSTRIAL",
        prerequisitos:
          "2689 CONTABILIDAD GERENCIAL (Ciclo 5); 2691 INVESTIGACIÓN DE OPERACIONES (Ciclo 5)",
      },
      {
        codigo: "3128",
        ciclo: 6,
        tipo: "S",
        nombre: "INGENIERÍA DE DATOS II",
        ht: 2,
        hp: 1,
        hl: 3,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "2692 INGENIERÍA DE DATOS I (Ciclo 5)",
      },
      {
        codigo: "3129",
        ciclo: 6,
        tipo: "S",
        nombre: "SISTEMAS OPERATIVOS",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "2693 ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS (Ciclo 5)",
      },
      {
        codigo: "3130",
        ciclo: 6,
        tipo: "S",
        nombre: "INGENIERÍA DE REQUISITOS",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "2692 INGENIERÍA DE DATOS I (Ciclo 5); 2694 SISTEMAS DE INFORMACIÓN (Ciclo 5)",
      },
      {
        codigo: "3131",
        ciclo: 6,
        tipo: "EL",
        nombre: "INGENIERÍA AMBIENTAL",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "INGENIERÍA QUÍMICA INGENIERÍA AMBIENTAL",
        prerequisitos: "-",
      },
      {
        codigo: "3132",
        ciclo: 6,
        tipo: "EL",
        nombre: "GESTIÓN DEL TALENTO HUMANO",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "ADMINISTRACIÓN",
        prerequisitos: "-",
      },
      {
        codigo: "3444",
        ciclo: 7,
        tipo: "S",
        nombre: "CADENA DE SUMINISTROS",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "INGENIERÍA INDUSTRIAL",
        prerequisitos: "3125 FINANZAS CORPORATIVAS (Ciclo 6)",
      },
      {
        codigo: "3445",
        ciclo: 7,
        tipo: "S",
        nombre: "GESTIÓN DE SERVICIOS DE TI",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "3126 SISTEMAS INTELIGENTES (Ciclo 6); 3130 INGENIERÍA DE REQUISITOS (Ciclo 6)",
      },
      {
        codigo: "3446",
        ciclo: 7,
        tipo: "S",
        nombre: "METODOLOGÍA DE LA INVESTIGACIÓN CIENTÍFICA",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "2142 ESTADÍSTICA APLICADA (Ciclo 3)",
      },
      {
        codigo: "3447",
        ciclo: 7,
        tipo: "S",
        nombre: "PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "3127 INGENIERÍA ECONÓMICA (Ciclo 6); 3128 INGENIERÍA DE DATOS II (Ciclo 6)",
      },
      {
        codigo: "3448",
        ciclo: 7,
        tipo: "S",
        nombre: "REDES Y COMUNICACIONES I",
        ht: 1,
        hp: 1,
        hl: 3,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "3129 SISTEMAS OPERATIVOS (Ciclo 6)",
      },
      {
        codigo: "3449",
        ciclo: 7,
        tipo: "S",
        nombre: "INGENIERÍA DEL SOFTWARE I",
        ht: 2,
        hp: 1,
        hl: 3,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "3130 INGENIERÍA DE REQUISITOS (Ciclo 6)",
      },
      {
        codigo: "3450",
        ciclo: 7,
        tipo: "EL",
        nombre: "ADMINISTRACIÓN DE BASE DE DATOS",
        ht: 1,
        hp: 1,
        hl: 3,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "3451",
        ciclo: 7,
        tipo: "EL",
        nombre: "NEGOCIOS ELECTRÓNICOS",
        ht: 2,
        hp: 0,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "4482",
        ciclo: 8,
        tipo: "S",
        nombre: "MARKETING Y MEDIOS SOCIALES",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "2690 TECNOLOGÍAS WEB (Ciclo 5); 3444 CADENA DE SUMINISTROS (Ciclo 7)",
      },
      {
        codigo: "4483",
        ciclo: 8,
        tipo: "S",
        nombre: "SEGURIDAD DE LA INFORMACIÓN",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "3445 GESTIÓN DE SERVICIOS DE TI (Ciclo 7); 3448 REDES Y COMUNICACIONES I (Ciclo 7)",
      },
      {
        codigo: "4484",
        ciclo: 8,
        tipo: "S",
        nombre: "INTERNET DE LAS COSAS",
        ht: 1,
        hp: 1,
        hl: 3,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "3448 REDES Y COMUNICACIONES I (Ciclo 7); 3449 INGENIERÍA DEL SOFTWARE I (Ciclo 7)",
      },
      {
        codigo: "4485",
        ciclo: 8,
        tipo: "S",
        nombre: "INTELIGENCIA DE NEGOCIOS",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "3447 PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN (Ciclo 7)",
      },
      {
        codigo: "4486",
        ciclo: 8,
        tipo: "S",
        nombre: "REDES Y COMUNICACIONES II",
        ht: 1,
        hp: 1,
        hl: 3,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "3448 REDES Y COMUNICACIONES I (Ciclo 7)",
      },
      {
        codigo: "4487",
        ciclo: 8,
        tipo: "S",
        nombre: "INGENIERÍA DEL SOFTWARE II",
        ht: 2,
        hp: 1,
        hl: 3,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "3449 INGENIERÍA DEL SOFTWARE I (Ciclo 7)",
      },
      {
        codigo: "4488",
        ciclo: 8,
        tipo: "EL",
        nombre: "DEONTOLOGÍA Y DERECHO INFORMÁTICO",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "DERECHO",
        prerequisitos: "-",
      },
      {
        codigo: "4489",
        ciclo: 8,
        tipo: "EL",
        nombre: "ARQUITECTURA BASADA EN MICROSERVICIOS",
        ht: 2,
        hp: 0,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "4490",
        ciclo: 9,
        tipo: "S",
        nombre: "GESTIÓN DE PROYECTOS DE TI",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "3445 GESTIÓN DE SERVICIOS DE TI (Ciclo 7); 4484 INTERNET DE LAS COSAS (Ciclo 8)",
      },
      {
        codigo: "4491",
        ciclo: 9,
        tipo: "S",
        nombre: "AUDITORÍA INFORMÁTICA",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "4483 SEGURIDAD DE LA INFORMACIÓN (Ciclo 8)",
      },
      {
        codigo: "4492",
        ciclo: 9,
        tipo: "S",
        nombre: "TESIS I",
        ht: 2,
        hp: 2,
        hl: 2,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "3446 METODOLOGÍA DE LA INVESTIGACIÓN CIENTÍFICA (Ciclo 7); 170 créditos aprobados",
      },
      {
        codigo: "4493",
        ciclo: 9,
        tipo: "S",
        nombre: "ANALÍTICA DE NEGOCIOS",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "4482 MARKETING Y MEDIOS SOCIALES (Ciclo 8); 4485 INTELIGENCIA DE NEGOCIOS (Ciclo 8)",
      },
      {
        codigo: "4494",
        ciclo: 9,
        tipo: "S",
        nombre: "COMPUTACIÓN EN LA NUBE",
        ht: 1,
        hp: 1,
        hl: 3,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "4486 REDES Y COMUNICACIONES II (Ciclo 8)",
      },
      {
        codigo: "4495",
        ciclo: 9,
        tipo: "S",
        nombre: "INGENIERÍA WEB",
        ht: 1,
        hp: 1,
        hl: 3,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "4486 REDES Y COMUNICACIONES II (Ciclo 8); 4487 INGENIERÍA DEL SOFTWARE II (Ciclo 8)",
      },
      {
        codigo: "4496",
        ciclo: 9,
        tipo: "EL",
        nombre: "EMPRENDIMIENTO TECNOLÓGICO",
        ht: 2,
        hp: 0,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "4497",
        ciclo: 9,
        tipo: "EL",
        nombre: "HACKEO ÉTICO",
        ht: 2,
        hp: 0,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "-",
      },
      {
        codigo: "4498",
        ciclo: 10,
        tipo: "S",
        nombre: "SISTEMAS DE INFORMACIÓN EMPRESARIAL",
        ht: 2,
        hp: 1,
        hl: 3,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "4490 GESTIÓN DE PROYECTOS DE TI (Ciclo 9)",
      },
      {
        codigo: "4499",
        ciclo: 10,
        tipo: "S",
        nombre: "GOBIERNO DE TI",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "4490 GESTIÓN DE PROYECTOS DE TI (Ciclo 9); 4491 AUDITORÍA INFORMÁTICA (Ciclo 9)",
      },
      {
        codigo: "4501",
        ciclo: 10,
        tipo: "S",
        nombre: "ARQUITECTURA EMPRESARIAL",
        ht: 1,
        hp: 2,
        hl: 2,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos:
          "4491 AUDITORÍA INFORMÁTICA (Ciclo 9); 4494 COMPUTACIÓN EN LA NUBE (Ciclo 9)",
      },
      {
        codigo: "4502",
        ciclo: 10,
        tipo: "S",
        nombre: "RESPONSABILIDAD SOCIAL CORPORATIVA",
        ht: 2,
        hp: 2,
        hl: 0,
        creditos: 3,
        departamento: "INGENIERÍA INDUSTRIAL",
        prerequisitos: "4490 GESTIÓN DE PROYECTOS DE TI (Ciclo 9)",
      },
      {
        codigo: "4503",
        ciclo: 10,
        tipo: "S",
        nombre: "APLICACIONES MÓVILES",
        ht: 1,
        hp: 1,
        hl: 3,
        creditos: 3,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "4495 INGENIERÍA WEB (Ciclo 9)",
      },
      {
        codigo: "4504",
        ciclo: 10,
        tipo: "S",
        nombre: "PRÁCTICAS PRE PROFESIONALES",
        ht: 2,
        hp: 1,
        hl: 3,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "4492 TESIS I (Ciclo 9); 192 créditos aprobados",
      },
      {
        codigo: "5265",
        ciclo: 10,
        tipo: "S",
        nombre: "TRABAJO DE INVESTIGACIÓN",
        ht: 2,
        hp: 2,
        hl: 2,
        creditos: 4,
        departamento: "INGENIERÍA DE SISTEMAS",
        prerequisitos: "4492 TESIS I (Ciclo 9)",
      },
    ];

    // Mapear tipo de curso
    const mapTipoCurso = (tipo: string): string => {
      switch (tipo) {
        case "S":
          return TipoCursoPlan.ESPECIALIDAD;
        case "OB":
          return TipoCursoPlan.OBLIGATORIO_GENERAL;
        case "OP":
          return TipoCursoPlan.OBLIGATORIO_PROFESIONAL;
        case "EL":
          return TipoCursoPlan.ELECTIVO;
        default:
          return TipoCursoPlan.ESPECIALIDAD;
      }
    };

    const createdCursos: { [codigo: string]: Curso } = {};
    const createdCursosById: { [id: number]: Curso } = {};
    for (const c of planEstudio2018Data) {
      const cursoDep = createdDepartamentos[c.departamento] || departamento;
      const curso = await cursoRepo.save(
        cursoRepo.create({
          codigo: c.codigo,
          nombre: c.nombre,
          ciclo: c.ciclo,
          creditos: c.creditos,
          horas_teoria: c.ht,
          horas_practica: c.hp,
          horas_laboratorio: c.hl,
          tiene_laboratorio: c.hl > 0,
          departamento_id: cursoDep.id,
          prerequisitos: c.prerequisitos === "-" ? null : c.prerequisitos,
          activo: true,
        }),
      );
      createdCursos[c.codigo] = curso;
      createdCursosById[curso.id] = curso;
    }

    console.log("🔗 Vinculando cursos al Plan 2018...");
    for (const pc of planEstudio2018Data) {
      const curso = createdCursos[pc.codigo];
      if (!curso) {
        console.warn(`⚠️ Curso ${pc.codigo} no encontrado, saltando...`);
        continue;
      }
      // Parsear prerequisitos a IDs
      const prerequisitosIds: number[] = [];
      if (pc.prerequisitos !== "-") {
        const prereqParts = pc.prerequisitos.split(";").map((c) => c.trim());
        for (const part of prereqParts) {
          // Saltar si es un requisito de créditos (contiene "créditos")
          if (part.toLowerCase().includes("créditos")) {
            continue;
          }
          // Extraer el código (primer número en la parte)
          const match = part.match(/^(\d+)/);
          if (match) {
            const cod = match[1];
            if (createdCursos[cod]) {
              prerequisitosIds.push(createdCursos[cod].id);
            } else {
              console.warn(
                `⚠️ Prerequisito con código ${cod} no encontrado para curso ${pc.codigo}`,
              );
            }
          }
        }
      }
      await cursoPlanRepo.save(
        cursoPlanRepo.create({
          curso_id: curso.id,
          plan_estudios_id: plan2018.id,
          ciclo: pc.ciclo,
          tipo_curso: mapTipoCurso(pc.tipo),
          horas_teoria: pc.ht,
          horas_practica: pc.hp,
          horas_laboratorio: pc.hl,
          creditos: pc.creditos,
          prerequisitos: prerequisitosIds.length > 0 ? prerequisitosIds : null,
          estado: "ACTIVO",
        }),
      );
    }
    console.log(
      `✅ Plan 2018 cargado con ${planEstudio2018Data.length} cursos`,
    );

    console.log(
      "📅 Creando asignaciones de horarios desde archivos por ciclo...",
    );
    await seedHorariosCicloI();
    await seedHorariosCicloIII();
    await seedHorariosCicloV();
    await seedHorariosCicloVII();
    await seedHorariosCicloIX();

    console.log("🔗 Poblando relaciones curso-ambiente...");
    const horariosCursoAmbiente = await horarioRepo.find({
      relations: ["curso", "ambiente"],
    });
    const cursoAmbienteMap = new Map<number, Set<number>>();
    for (const h of horariosCursoAmbiente) {
      if (!cursoAmbienteMap.has(h.curso.id)) {
        cursoAmbienteMap.set(h.curso.id, new Set());
      }
      cursoAmbienteMap.get(h.curso.id)!.add(h.ambiente.id);
    }
    let coursesUpdated = 0;
    for (const [cursoId, ambienteIds] of cursoAmbienteMap.entries()) {
      const curso = createdCursosById[cursoId];
      if (!curso) {
        console.warn(
          `⚠️ Curso con ID ${cursoId} no encontrado en createdCursosById`,
        );
        continue;
      }
      const ambientesToAssign: Ambiente[] = [];
      for (const ambId of ambienteIds) {
        const amb = ambientesById[ambId];
        if (!amb) {
          console.warn(
            `⚠️ Ambiente con ID ${ambId} no encontrado en ambientesById`,
          );
          continue;
        }
        ambientesToAssign.push(amb);
      }
      curso.ambientes = ambientesToAssign;
      await cursoRepo.save(curso);
      coursesUpdated++;
      console.log(
        `✅ Asignados ${ambientesToAssign.length} ambientes a curso: ${curso.nombre} (ID ${cursoId})`,
      );
    }
    console.log(
      `✅ Relaciones curso-ambiente creadas para ${coursesUpdated} cursos`,
    );

    console.log("🧹 Limpiando cache de TypeORM...");
    try {
      await AppDataSource.queryResultCache?.clear();
    } catch (e) {
      console.warn("⚠️ No se pudo limpiar el cache:", e);
    }

    console.log("🧹 Limpiando Asignaciones Lectivas previas...");
    const asignacionRepo = AppDataSource.getRepository(AsignacionLectiva);
    await asignacionRepo
      .createQueryBuilder()
      .delete()
      .from(AsignacionLectiva)
      .execute();
    console.log("📝 Creando Asignaciones Lectivas desde Horarios Asignados...");

    // Obtener el usuario admin para "asignado_por_id" (ya lo tenemos como 'admin')
    if (!admin) throw new Error("Usuario admin no encontrado");

    // Obtener todos los horarios asignados con relaciones
    const horarios = await horarioRepo.find({
      relations: ["docente", "curso", "grupo"],
    });

    // Obtener todos los curso_plan_estudios con su curso
    const cursoPlanes = await cursoPlanRepo.find({
      relations: ["curso"],
    });

    // Agrupar horarios por: docente_id + curso_id + tipo_clase + grupo_id + periodo_codigo
    const gruposAsignacion = new Map<string, any>();

    for (const horario of horarios) {
      // Encontrar el CursoPlanEstudios correspondiente al curso y ciclo
      const cursoPlan = cursoPlanes.find(
        (cp) =>
          cp.curso.id === horario.curso.id && cp.ciclo === horario.curso.ciclo,
      );
      if (!cursoPlan) {
        console.warn(
          `⚠️ CursoPlan no encontrado para curso: ${horario.curso.nombre} (ciclo ${horario.curso.ciclo})`,
        );
        continue;
      }

      // Encontrar el PeriodoAcademico por el código del horario
      const periodoAcademico = await periodoRepo.findOne({
        where: { codigo: horario.periodo },
      });
      if (!periodoAcademico) {
        console.warn(
          `⚠️ PeriodoAcademico no encontrado para código: ${horario.periodo}`,
        );
        continue;
      }

      // Calcular horas_asignadas según el tipo de clase
      let horasAsignadas = 0;
      switch (horario.tipo_clase) {
        case TipoClase.TEORIA:
          horasAsignadas = cursoPlan.horas_teoria;
          break;
        case TipoClase.PRACTICA:
          horasAsignadas = cursoPlan.horas_practica;
          break;
        case TipoClase.LABORATORIO:
          horasAsignadas = cursoPlan.horas_laboratorio;
          break;
      }

      // Crear key única para evitar duplicados
      const key = `${horario.docente.id}-${horario.curso.id}-${horario.tipo_clase}-${horario.grupo.id}-${horario.periodo}`;

      if (!gruposAsignacion.has(key)) {
        // Extraer la sección del código del grupo (ej: "2347-T1" → "T1", "2347-L1" → "L1")
        const parts = horario.grupo.codigo.split("-");
        const seccion = parts.length > 1 ? parts[parts.length - 1] : "T1";

        // Alternar estado para algunas asignaciones
        const esPendiente = gruposAsignacion.size % 3 === 0;

        const nroAlumnos = horario.grupo?.cupo_maximo ?? 0;

        gruposAsignacion.set(key, {
          docente_id: horario.docente.id,
          curso_plan_id: cursoPlan.id,
          periodo_id: periodoAcademico.id,
          grupo_id: horario.grupo.id,
          tipo_clase: horario.tipo_clase,
          seccion: seccion,
          nro_alumnos: nroAlumnos,
          horas_asignadas: horasAsignadas,
          estado: esPendiente ? "PENDIENTE" : "CONFIRMADO",
          asignado_por_id: admin.id,
          ...(esPendiente
            ? {}
            : {
                confirmado_por_id: admin.id,
                confirmado_en: new Date(),
              }),
        });
      }
    }

    // Guardar todas las Asignaciones Lectivas
    let countAsig = 0;
    for (const asignacionData of gruposAsignacion.values()) {
      await asignacionRepo.save(asignacionRepo.create(asignacionData));
      countAsig++;
    }
    console.log(`✅ ${countAsig} Asignaciones Lectivas creadas exitosamente!`);

    const dbDocentes = await docenteRepo.find({ order: { id: "ASC" } });

    console.log("📝 Generando declaraciones de carga en múltiples estados...");
    const observacionRepo = AppDataSource.getRepository(DeclaracionObservacion);
    const juradaRepo = AppDataSource.getRepository(DeclaracionJurada);

    const demoResult = await seedDeclaracionesDemo({
      declaracionRepo,
      observacionRepo,
      juradaRepo,
      docentes: dbDocentes,
      periodoActivo,
      departamento,
      facultad,
      directorDpto,
      decano,
    });

    const resumenEstados = await AppDataSource.query(
      `SELECT estado, COUNT(*)::int AS total
       FROM declaracion_carga_horaria
       GROUP BY estado ORDER BY estado`,
    );
    console.log("📊 Declaraciones por estado:");
    for (const row of resumenEstados) {
      console.log(`   • ${row.estado}: ${row.total}`);
    }
    console.log(
      `✅ ${demoResult.declaraciones.length} declaraciones, ${demoResult.observaciones} observaciones, ${demoResult.juradas} juradas`,
    );

    await AppDataSource.getRepository(ConfiguracionGeneral).save({
      nombre_institucional: "Universidad Nacional de Trujillo",
      logo_url:
        "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png",
      color_primario: "#1a237e",
      color_secundario: "#283593",
      color_acento: "#e91e63",
    });

    console.log("\n✅ SEED UNIFICADO COMPLETADO EXITOSAMENTE.");
    console.log("   Ejecute: npm run seed:verify  para validar integridad.");
  } catch (error) {
    console.error("\n❌ ERROR DURANTE EL SEED:", error);
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
