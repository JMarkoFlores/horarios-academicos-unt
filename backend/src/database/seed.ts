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
import { CursoAmbiente } from "../entities/curso-ambiente.entity";
import { DiaNoLaborable } from "../entities/dia-no-laborable.entity";
import { NotificacionDocente } from "../entities/notificacion-docente.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { Preasignacion } from "../entities/preasignacion.entity";
import { PreferenciasNotificacion } from "../entities/preferencias-notificacion.entity";
import { ReglasPrioridadGlobales } from "../entities/reglas-prioridad.entity";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { SeleccionTemporal } from "../entities/seleccion-temporal.entity";

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
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";

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
  entities: [
    Usuario, Docente, PeriodoAcademico, Curso, Ambiente, Grupo,
    HorarioAsignado, TurnoHorario, DiaActivo, Facultad, Escuela,
    Departamento, DocenteCurso, DeclaracionCargaHoraria, ConfiguracionGeneral,
    DisponibilidadDocente, CampañaVentanas, VentanaAtencion, ColaDocentes,
    AuditoriaHorario, ConflictoAsignacion, CursoAmbiente, DiaNoLaborable,
    NotificacionDocente, ParametrosCarga, Preasignacion,
    PreferenciasNotificacion, ReglasPrioridadGlobales, RestriccionInstitucional,
    SeleccionTemporal
  ],
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
    Lunes: 1, Martes: 2, Miércoles: 3, Miercoles: 3, Jueves: 4, Viernes: 5, Sábado: 6, Sabado: 6, Domingo: 7,
  };
  return map[dia] ?? 1;
};

const parsearRangoHoras = (rango: string) => {
  const parts = rango.split("-");
  const h1 = parseInt(parts[0].split(":")[0]);
  const h2 = parseInt(parts[1].split(":")[0]);
  let horaInicio = h1 <= 6 ? h1 + 12 : h1;
  let horaFin = h2 <= 6 || h2 < h1 ? h2 + 12 : h2;
  if (h1 >= 7 && h1 <= 12 && h2 < 7) horaFin = h2 + 12;
  return {
    inicio: `${String(horaInicio).padStart(2, "0")}:00:00`,
    fin: `${String(horaFin).padStart(2, "0")}:00:00`,
    diff: horaFin - horaInicio
  };
};

const mapAmbienteCode = (nombre: string): string => {
  const map: { [key: string]: string } = {
    "Lab. 1": "LAB-1", Lab1: "LAB-1", "Lab. 2": "LAB-2", Lab2: "LAB-2",
    "Lab. 3": "LAB-3", Lab3: "LAB-3", "Lab. 4": "LAB-4", Lab4: "LAB-4",
    "posgrado A-307": "A-307", "posgrado A-303": "A-303", "posgrado A-311": "A-311",
    "I-4": "I-4", "Lab. Fisica": "LAB-FIS", "Taller Confecciones - Ing. Industrial": "TALLER-CONFECCIONES",
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
  if (t.includes("practica") || t.includes("práctica")) return TipoClase.PRACTICA;
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
      "notificacion_docente", "cola_docentes", "ventana_atencion", "campaña_ventanas",
      "disponibilidad_docente", "declaracion_carga_horaria", "horario_asignado",
      "docente_curso", "grupo", "curso", "docente", "usuario", "departamento",
      "escuela", "facultad", "periodo_academico", "dia_activo", "turno_horario",
      "ambiente", "configuracion_general"
    ];
    for (const table of tables) {
      await queryRunner.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
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
    const declaracionRepo = AppDataSource.getRepository(DeclaracionCargaHoraria);

    const passwordHash = await bcrypt.hash("Admin123!", 10);

    // ── 0.5. USUARIOS ESPECIALES ──────────────────────────────────────────
    console.log("🔑 Creando usuarios administrativos...");
    const admin = await usuarioRepo.save(usuarioRepo.create({
      nombre: "Administrador del Sistema",
      email: "admin@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.ADMINISTRADOR_SISTEMA,
      activo: true
    }));

    const decano = await usuarioRepo.save(usuarioRepo.create({
      nombre: "Decano de Ingeniería",
      email: "decano@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DECANO,
      activo: true
    }));

    const directorEscuela = await usuarioRepo.save(usuarioRepo.create({
      nombre: "Director de Escuela de Sistemas",
      email: "director.escuela@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_ESCUELA,
      activo: true
    }));

    const directorDpto = await usuarioRepo.save(usuarioRepo.create({
      nombre: "Director de Departamento de Sistemas",
      email: "director.departamento@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.DIRECTOR_DEPARTAMENTO,
      activo: true
    }));

    const coordinadorAcademico = await usuarioRepo.save(usuarioRepo.create({
      nombre: "Coordinador Académico",
      email: "coordinador@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.COORDINADOR_ACADEMICO,
      activo: true
    }));

    const secretaria = await usuarioRepo.save(usuarioRepo.create({
      nombre: "Secretaria de Sistemas",
      email: "secretaria@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.SECRETARIA,
      activo: true
    }));

    const operador = await usuarioRepo.save(usuarioRepo.create({
      nombre: "Operador de Horarios",
      email: "operador@unt.edu.pe",
      password_hash: passwordHash,
      rol: RolUsuario.OPERADOR_HORARIOS,
      activo: true
    }));

    // ── 1. INFRAESTRUCTURA ────────────────────────────────────────────────
    console.log("🏗️ Creando infraestructura base...");
    await turnoRepo.save([
      { nombre: "Mañana", hora_inicio: "07:00", hora_fin: "14:00", activo: true },
      { nombre: "Tarde", hora_inicio: "14:00", hora_fin: "23:00", activo: true },
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
      { codigo: "2025-II", nombre: "Semestre 2025-II", fecha_inicio: new Date("2025-08-01"), fecha_fin: new Date("2025-12-31"), estado: EstadoPeriodo.FINALIZADO, activo: false, modo_asignacion: ModoAsignacion.AUTOMATICA },
      { codigo: "2026-I", nombre: "Semestre 2026-I", fecha_inicio: new Date("2026-03-01"), fecha_fin: new Date("2026-07-31"), estado: EstadoPeriodo.EN_CURSO, activo: true, modo_asignacion: ModoAsignacion.MIXTA },
    ]);
    const periodoActivo = periodos.find(p => p.codigo === "2026-I")!;

    console.log("🏢 Creando facultades, escuelas y departamentos...");
    const facultad = await facultadRepo.save(facultadRepo.create({ 
      nombre: "Facultad de Ingeniería", 
      codigo: "FI",
      coordinador_id: decano.id 
    }));
    const escuela = await escuelaRepo.save(escuelaRepo.create({ 
      nombre: "Ingeniería de Sistemas", 
      codigo: "IS", 
      facultad_id: facultad.id,
      coordinador_id: directorEscuela.id 
    }));
    const departamento = await departamentoRepo.save(departamentoRepo.create({ 
      nombre: "Departamento de Sistemas", 
      codigo: "DS", 
      escuela_id: escuela.id,
      coordinador_id: directorDpto.id 
    }));

    console.log("🏠 Creando ambientes...");
    const ambientesData = [
      { codigo: "A-307", nombre: "Aula 307", tipo: TipoAmbiente.AULA, capacidad: 40 },
      { codigo: "A-303", nombre: "Aula 303", tipo: TipoAmbiente.AULA, capacidad: 40 },
      { codigo: "A-311", nombre: "Aula 311", tipo: TipoAmbiente.AULA, capacidad: 40 },
      { codigo: "LAB-1", nombre: "Laboratorio 1", tipo: TipoAmbiente.LABORATORIO, capacidad: 30 },
      { codigo: "LAB-2", nombre: "Laboratorio 2", tipo: TipoAmbiente.LABORATORIO, capacidad: 30 },
      { codigo: "LAB-3", nombre: "Laboratorio 3", tipo: TipoAmbiente.LABORATORIO, capacidad: 30 },
      { codigo: "LAB-4", nombre: "Laboratorio 4", tipo: TipoAmbiente.LABORATORIO, capacidad: 30 },
      { codigo: "LAB-FIS", nombre: "Laboratorio de Física", tipo: TipoAmbiente.LABORATORIO, capacidad: 30 },
      { codigo: "TALLER-CONFECCIONES", nombre: "Taller de Confecciones", tipo: TipoAmbiente.TALLER, capacidad: 40 },
      { codigo: "II-2", nombre: "Pabellón Industrial II-2", tipo: TipoAmbiente.AULA, capacidad: 50 },
      { codigo: "I-4", nombre: "Aula I-4", tipo: TipoAmbiente.AULA, capacidad: 45 },
      { codigo: "Audiovisuales", nombre: "Sala de Audiovisuales", tipo: TipoAmbiente.AULA, capacidad: 60 },
    ];
    await ambienteRepo.save(ambientesData.map(a => ambienteRepo.create({ ...a, activo: true })));

    console.log("👨‍🏫 Creando docentes...");
    const docentesData = [
      { nombres: "Marcelino", apellidos: "Torres Villanueva", email: "torres.villanueva@unt.edu.pe" },
      { nombres: "Alberto", apellidos: "Mendoza de los Santos", email: "mendoza.santos@unt.edu.pe" },
      { nombres: "Paul", apellidos: "Cotrina Castellanos", email: "cotrina.castellanos@unt.edu.pe" },
      { nombres: "Bertha", apellidos: "Urtecho Zavaleta", email: "urtecho.zavaleta@unt.edu.pe" },
      { nombres: "Jose Luis", apellidos: "Ponte Bejarano", email: "ponte.bejarano@unt.edu.pe" },
      { nombres: "Jorge Luis", apellidos: "Rios Gonzales", email: "rios.gonzales@unt.edu.pe" },
      { nombres: "Segundo", apellidos: "Guibar Obeso", email: "guibar.obeso@unt.edu.pe" },
      { nombres: "Miguel", apellidos: "Ipanaque Zapata", email: "ipanaque.zapata@unt.edu.pe" },
      { nombres: "Martha", apellidos: "Cardoso", email: "cardoso@unt.edu.pe" },
      { nombres: "Zoraida", apellidos: "Vidal Melgarejo", email: "zvidal@unt.edu.pe" },
      { nombres: "Everson David", apellidos: "Agreda Gamboa", email: "eagreda@unt.edu.pe" },
      { nombres: "Juan Carlos", apellidos: "Obando Roldan", email: "jobando@unt.edu.pe" },
      { nombres: "Marcos", apellidos: "Ferrer Reyna", email: "mferrer@unt.edu.pe" },
      { nombres: "Teresita", apellidos: "Rojas Garcia", email: "trojas@unt.edu.pe" },
      { nombres: "Juan", apellidos: "Carrascal Cabanillas", email: "jcarrascal@unt.edu.pe" },
      { nombres: "Vilma", apellidos: "Mendez Gil", email: "vmendez@unt.edu.pe" },
      { nombres: "Sheyla Laura", apellidos: "Escobedo Rodriguez", email: "sescobedo@unt.edu.pe" },
      { nombres: "Luis", apellidos: "Boy Chavil", email: "lboy@unt.edu.pe" },
      { nombres: "Robert Jerry", apellidos: "Sanchez Ticona", email: "rsanchez@unt.edu.pe" },
      { nombres: "Cesar", apellidos: "Arellano Salazar", email: "carellano@unt.edu.pe" },
      { nombres: "Camilo", apellidos: "Suarez Rebaza", email: "csuarez@unt.edu.pe" },
      { nombres: "Marcos", apellidos: "Baca Lopez", email: "mbaca@unt.edu.pe" },
      { nombres: "Ana", apellidos: "Cuadra Mitzugaray", email: "acuadra@unt.edu.pe" },
      { nombres: "Juan Pedro", apellidos: "Santos Fernandez", email: "jsantos@unt.edu.pe" },
      { nombres: "Ricardo", apellidos: "Mendoza Rivera", email: "rmendoza@unt.edu.pe" },
      { nombres: "Oscar Romel", apellidos: "Alcantara Moreno", email: "oalcantara@unt.edu.pe" },
      { nombres: "Jhoe", apellidos: "Gonzalez Vasquez", email: "jgonzalez@unt.edu.pe" },
      { nombres: "Jose", apellidos: "Gomez Avila", email: "jgomez@unt.edu.pe" },
    ];

    for (const d of docentesData) {
      const usuario = await usuarioRepo.save(usuarioRepo.create({
        nombre: `${d.nombres} ${d.apellidos}`,
        email: d.email,
        password_hash: passwordHash,
        rol: RolUsuario.DOCENTE,
        activo: true
      }));
      await docenteRepo.save(docenteRepo.create({
        ...d,
        codigo: d.email.split("@")[0].toUpperCase(),
        usuario,
        departamento_id: departamento.id,
        facultad_id: facultad.id,
        tipo_docente: TipoDocente.ORDINARIO,
        categoria: CategoriaDocente.AUXILIAR,
        tipo_contrato: TipoContrato.NOMBRADO,
        modalidad: ModalidadDocente.TIEMPO_COMPLETO_40,
        fecha_ingreso: new Date("2010-01-01"),
        activo: true
      }));
    }

    console.log("📚 Creando cursos y grupos...");
    const cursosData = [
      { codigo: "IS-101", nombre: "Introducción a la Programación", ciclo: 1, ht: 2, hp: 0, hl: 4 },
      { codigo: "IS-102", nombre: "Introducción a la Ing. de Sistemas", ciclo: 1, ht: 2, hp: 2, hl: 0 },
      { codigo: "IS-103", nombre: "Desarrollo Personal", ciclo: 1, ht: 1, hp: 2, hl: 0 },
      { codigo: "IS-104", nombre: "Desarrollo del Pens. Lógico Matemát.", ciclo: 1, ht: 2, hp: 4, hl: 0 },
      { codigo: "IS-105", nombre: "Lectura Crítica y Redac. Textos Acad.", ciclo: 1, ht: 2, hp: 2, hl: 0 },
      { codigo: "IS-106", nombre: "Introducción al Análisis Matemático", ciclo: 1, ht: 2, hp: 4, hl: 0 },
      { codigo: "IS-107", nombre: "Estadística General", ciclo: 1, ht: 2, hp: 2, hl: 0 },
      { codigo: "IS-301", nombre: "Estructura de Datos", ciclo: 3, ht: 2, hp: 0, hl: 4 },
      { codigo: "IS-302", nombre: "Lenguajes de Programación I", ciclo: 3, ht: 2, hp: 2, hl: 2 },
      { codigo: "IS-303", nombre: "Fundamentos de Sistemas de Información", ciclo: 3, ht: 1, hp: 2, hl: 3 },
      { codigo: "IS-304", nombre: "Organización y Arquitectura de Computadoras", ciclo: 3, ht: 2, hp: 4, hl: 2 },
      { codigo: "IS-305", nombre: "Análisis y Diseño de Algoritmos", ciclo: 3, ht: 2, hp: 2, hl: 2 },
      { codigo: "IS-306", nombre: "Modelamiento de Datos", ciclo: 3, ht: 2, hp: 2, hl: 0 },
      { codigo: "IS-307", nombre: "Física Electrónica", ciclo: 3, ht: 2, hp: 2, hl: 2 },
      { codigo: "IS-308", nombre: "Psicología Organizacional", ciclo: 3, ht: 1, hp: 2, hl: 0 },
      { codigo: "IS-501", nombre: "Ingeniería de Datos I", ciclo: 5, ht: 2, hp: 2, hl: 4 },
      { codigo: "IS-502", nombre: "Sistemas de Información", ciclo: 5, ht: 2, hp: 2, hl: 2 },
      { codigo: "IS-503", nombre: "Transformación digital", ciclo: 5, ht: 2, hp: 0, hl: 2 },
      { codigo: "IS-504", nombre: "Tecnología web", ciclo: 5, ht: 1, hp: 2, hl: 3 },
      { codigo: "IS-505", nombre: "Arquitectura de computadoras", ciclo: 5, ht: 2, hp: 2, hl: 4 },
      { codigo: "IS-506", nombre: "Teleinformática(e)", ciclo: 5, ht: 1, hp: 2, hl: 2 },
      { codigo: "IS-507", nombre: "Investigación de Operaciones", ciclo: 5, ht: 2, hp: 4, hl: 2 },
      { codigo: "IS-508", nombre: "Contabilidad Gerencial", ciclo: 5, ht: 1, hp: 2, hl: 2 },
      { codigo: "IS-701", nombre: "Ingeniería de Software I", ciclo: 7, ht: 2, hp: 2, hl: 4 },
      { codigo: "IS-702", nombre: "Redes y Comunicaciones I", ciclo: 7, ht: 2, hp: 2, hl: 4 },
      { codigo: "IS-703", nombre: "Negocios Electrónicos (e )", ciclo: 7, ht: 2, hp: 0, hl: 2 },
      { codigo: "IS-704", nombre: "Gestión de Servicios de TI", ciclo: 7, ht: 1, hp: 2, hl: 2 },
      { codigo: "IS-705", nombre: "Metodología de la Investigación Científica", ciclo: 7, ht: 2, hp: 2, hl: 0 },
      { codigo: "IS-706", nombre: "Administración de Base de Datos", ciclo: 7, ht: 2, hp: 2, hl: 4 },
      { codigo: "IS-707", nombre: "Planeamiento Estratégico de TI", ciclo: 7, ht: 2, hp: 4, hl: 2 },
      { codigo: "IS-708", nombre: "Cadena de Suministros (e )", ciclo: 7, ht: 2, hp: 2, hl: 0 },
      { codigo: "IS-901", nombre: "Tesis I", ciclo: 9, ht: 2, hp: 4, hl: 2 },
      { codigo: "IS-902", nombre: "Analítica de Negocios", ciclo: 9, ht: 1, hp: 2, hl: 2 },
      { codigo: "IS-903", nombre: "Auditoría Informática", ciclo: 9, ht: 1, hp: 2, hl: 2 },
      { codigo: "IS-904", nombre: "Gestión de Proyectos de TI", ciclo: 9, ht: 1, hp: 2, hl: 2 },
      { codigo: "IS-905", nombre: "Emprendimiento Tecnológico", ciclo: 9, ht: 2, hp: 0, hl: 2 },
      { codigo: "IS-906", nombre: "Ingeniería Web", ciclo: 9, ht: 1, hp: 2, hl: 4 },
      { codigo: "IS-907", nombre: "Computación en la Nube", ciclo: 9, ht: 1, hp: 2, hl: 4 },
      { codigo: "IS-908", nombre: "Hackeo Ético (e)", ciclo: 9, ht: 2, hp: 0, hl: 2 },
    ];

    for (const c of cursosData) {
      const curso = await cursoRepo.save(cursoRepo.create({ 
        codigo: c.codigo,
        nombre: c.nombre,
        ciclo: c.ciclo,
        creditos: 4,
        horas_teoria: c.ht,
        horas_practica: c.hp,
        horas_laboratorio: c.hl,
        tiene_laboratorio: c.hl > 0,
        departamento_id: departamento.id,
        activo: true 
      }));
      const numGrupos = (c.codigo === "IS-707") ? 4 : 3;
      for (let i = 1; i <= numGrupos; i++) {
        const gCode = `G${i}`;
        await grupoRepo.save(grupoRepo.create({
          codigo: `${c.codigo}-${gCode}`,
          nombre: `Grupo ${i}`,
          cupo_maximo: 40,
          ciclo: c.ciclo,
          curso_id: curso.id,
          periodo_academico_id: periodoActivo.id
        }));
      }
    }

    console.log("📅 Creando asignaciones de horarios desde archivos por ciclo...");
    await seedHorariosCicloI(AppDataSource);
    await seedHorariosCicloIII(AppDataSource);
    await seedHorariosCicloV(AppDataSource);
    await seedHorariosCicloVII(AppDataSource);
    await seedHorariosCicloIX(AppDataSource);

    const dbDocentes = await docenteRepo.find();
    const dbCursos = await cursoRepo.find();
    const dbAmbientes = await ambienteRepo.find();
    const dbGrupos = await grupoRepo.find();

    console.log("📝 Generando declaraciones de carga horaria...");
    for (const doc of dbDocentes) {
      await declaracionRepo.save(declaracionRepo.create({
        docente_id: doc.id,
        periodo_academico_id: periodoActivo.id,
        departamento_id: departamento.id,
        facultad_id: facultad.id,
        estado: EstadoDeclaracionCarga.NO_INICIADO,
        sede: "Trujillo - Ciudad Universitaria",
        carga_no_lectiva: {
          cursos_lectivos: [],
          total_horas_lectivas: 0,
          actividades: []
        }
      }));
    }

    await AppDataSource.getRepository(ConfiguracionGeneral).save({
      nombre_institucional: "Universidad Nacional de Trujillo",
      logo_url: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png",
      color_primario: "#1a237e",
      color_secundario: "#283593",
      color_acento: "#e91e63"
    });

    console.log("\n✅ SEED UNIFICADO COMPLETADO EXITOSAMENTE.");

  } catch (error) {
    console.error("\n❌ ERROR DURANTE EL SEED:", error);
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
