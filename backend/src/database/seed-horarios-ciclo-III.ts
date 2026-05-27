import "reflect-metadata";
import { DataSource } from "typeorm";
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
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";

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
    CampañaVentanas,
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

async function seedHorariosCicloIII() {
  console.log("🌱 Iniciando seed de HORARIOS DEL CICLO III...");

  await AppDataSource.initialize();
  console.log("✅ Conexión a la base de datos establecida");

  const docenteRepo = AppDataSource.getRepository(Docente);
  const cursoRepo = AppDataSource.getRepository(Curso);
  const ambienteRepo = AppDataSource.getRepository(Ambiente);
  const grupoRepo = AppDataSource.getRepository(Grupo);
  const horarioRepo = AppDataSource.getRepository(HorarioAsignado);
  const periodoRepo = AppDataSource.getRepository(PeriodoAcademico);

  // ── 1. OBTENER DATOS EXISTENTES ───────────────────────────────────────────
  console.log("📋 Obteniendo datos existentes de la base de datos...");
  const dbDocentes = await docenteRepo.find();
  const dbCursos = await cursoRepo.find();
  const dbAmbientes = await ambienteRepo.find();
  const dbGrupos = await grupoRepo.find({
    relations: ["curso", "periodo_academico"],
  });
  const dbPeriodos = await periodoRepo.find();
  const periodoActivo = dbPeriodos.find(p => p.codigo === "2026-I");
  if (!periodoActivo) {
    throw new Error("No se encontró el período 2026-I");
  }
  console.log(`✅ Datos obtenidos: ${dbDocentes.length} docentes, ${dbCursos.length} cursos, ${dbAmbientes.length} ambientes\n`);

  // ── 2. FUNCIONES AUXILIARES ──────────────────────────────────────────────────
  const diaANumero = (dia: string): number => {
    const map: { [key: string]: number } = {
      "Lunes": 1, "Martes": 2, "Miércoles": 3, "Jueves": 4, "Viernes": 5, "Sábado": 6
    };
    return map[dia] ?? 1;
  };

  const parsearRangoHoras = (rango: string): { inicio: string; fin: string } => {
    const [h1, h2] = rango.split("-").map(s => parseInt(s.trim(), 10));
    const horaInicio = h1 < 7 ? h1 + 12 : h1;
    let horaFin = h2 < 7 ? h2 + 12 : h2;
    if (horaFin <= horaInicio) horaFin += 12;
    return {
      inicio: `${String(horaInicio).padStart(2, '0')}:00`,
      fin: `${String(horaFin).padStart(2, '0')}:00`
    };
  };

  const mapAmbiente = (nombre: string): string => {
    const map: { [key: string]: string } = {
      "Lab. 2": "LAB-2",
      "I-4": "I-4",
      "Lab. 4": "LAB-4",
      "posgrado A-307": "A-307",
      "Lab. 3": "LAB-3",
      "posgrado A-303": "A-303",
      "Lab. 1": "LAB-1",
      "Taller Confecciones - Ing. Industrial": "TALLER-CONFECCIONES",
      "Taller Confecciones (Ing. Industrial)": "TALLER-CONFECCIONES",
      "I I - 2 (Pabellon Ing. Industrial)": "II-2",
      "Taller Confecciones - Ing. Indust.": "TALLER-CONFECCIONES",
      "Lab. Fisica": "LAB-FIS",
      "posgrado A-311": "A-311",
    };
    return map[nombre] ?? "A-307";
  };

  const mapTipoClase = (tipo: string): TipoClase => {
    if (tipo.includes("Laboratorio")) return TipoClase.LABORATORIO;
    if (tipo.includes("Teoría")) return TipoClase.TEORIA;
    return TipoClase.PRACTICA;
  };

  const getGrupo = (curso: Curso, g: number): Grupo | undefined => {
    return dbGrupos.find(gr => gr.curso?.id === curso.id && gr.codigo.endsWith(`-G${g}`));
  };

  // ── 3. DATOS DE LOS HORARIOS DEL CICLO III ───────────────────────────────
  console.log("📋 Datos de horarios del ciclo III cargados");
  const horariosCicloIIIData = [
    // 1
    { docente: "Zoraida Vidal Melgarejo", curso: "Programación Orientada a Objetos II", dia: "Lunes", horas: "9-1", tipo: "Laboratorio", ambiente: "Lab. 2", grupo: 1 },
    { docente: "Zoraida Vidal Melgarejo", curso: "Programación Orientada a Objetos II", dia: "Martes", horas: "9-1", tipo: "Laboratorio", ambiente: "Lab. 2", grupo: 1 },
    { docente: "Zoraida Vidal Melgarejo", curso: "Programación Orientada a Objetos II", dia: "Martes", horas: "2-3", tipo: "Teoría/Práctica", ambiente: "I-4", grupo: 1 },
    { docente: "Zoraida Vidal Melgarejo", curso: "Programación Orientada a Objetos II", dia: "Viernes", horas: "9-1", tipo: "Laboratorio", ambiente: "Lab. 4", grupo: 1 },
    // 2
    { docente: "Everson David Agreda Gamboa", curso: "Sistémica", dia: "Miércoles", horas: "9-12", tipo: "Teoría/Práctica", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Everson David Agreda Gamboa", curso: "Sistémica", dia: "Miércoles", horas: "2-4", tipo: "Laboratorio", ambiente: "Lab. 3", grupo: 1 },
    { docente: "Everson David Agreda Gamboa", curso: "Sistémica", dia: "Miércoles", horas: "4-6", tipo: "Laboratorio", ambiente: "Lab. 3", grupo: 1 },
    { docente: "Everson David Agreda Gamboa", curso: "Sistémica", dia: "Jueves", horas: "4-6", tipo: "Laboratorio", ambiente: "Lab. 3", grupo: 1 },
    // 3
    { docente: "Juan Carlos Obando Roldán", curso: "Ingeniería Gráfica (e)", dia: "Miércoles", horas: "7-9", tipo: "Teoría/Práctica", ambiente: "posgrado A-303", grupo: 1 },
    { docente: "Juan Carlos Obando Roldán", curso: "Ingeniería Gráfica (e)", dia: "Jueves", horas: "8-10", tipo: "Laboratorio", ambiente: "Lab. 1", grupo: 1 },
    { docente: "Juan Carlos Obando Roldán", curso: "Ingeniería Gráfica (e)", dia: "Jueves", horas: "10-1", tipo: "Laboratorio", ambiente: "Lab. 1", grupo: 1 },
    // 4
    { docente: "Marcos Ferrer Reyna", curso: "Matemática Aplicada", dia: "Jueves", horas: "2-4", tipo: "Teoría/Práctica", ambiente: "Taller Confecciones - Ing. Industrial", grupo: 1 },
    { docente: "Marcos Ferrer Reyna", curso: "Matemática Aplicada", dia: "Miércoles", horas: "6-9", tipo: "Teoría/Práctica", ambiente: "posgrado A-303", grupo: 1 },
    // 5
    { docente: "Teresita Rojas Garcia", curso: "Estadística Aplicada", dia: "Martes", horas: "4-6", tipo: "Teoría/Práctica", ambiente: "posgrado A-303", grupo: 1 },
    { docente: "Teresita Rojas Garcia", curso: "Estadística Aplicada", dia: "Jueves", horas: "6-9", tipo: "Teoría", ambiente: "Taller Confecciones - Ing. Industrial", grupo: 1 },
    { docente: "Teresita Rojas Garcia", curso: "Estadística Aplicada", dia: "Viernes", horas: "7-9", tipo: "Teoría/Práctica", ambiente: "Taller Confecciones (Ing. Industrial)", grupo: 1 },
    { docente: "Teresita Rojas Garcia", curso: "Estadística Aplicada", dia: "Viernes", horas: "4-6", tipo: "Teoría/Práctica", ambiente: "posgrado A-303", grupo: 1 },
    // 6
    { docente: "Juan Carrascal Cabanillas", curso: "Administración General", dia: "Lunes", horas: "7-9", tipo: "Teoría/Práctica", ambiente: "Taller Confecciones - Ing. Indust.", grupo: 1 },
    { docente: "Juan Carrascal Cabanillas", curso: "Administración General", dia: "Martes", horas: "7-9", tipo: "Teoría/Práctica", ambiente: "I I - 2 (Pabellon Ing. Industrial)", grupo: 1 },
    //7
    { docente: "Vilma Mendez Gil", curso: "Física Electrónica", dia: "Lunes", horas: "3-6", tipo: "Teoría/Práctica", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Vilma Mendez Gil", curso: "Física Electrónica", dia: "Miércoles", horas: "2-4", tipo: "Laboratorio", ambiente: "Lab. Fisica", grupo: 1 },
    { docente: "Vilma Mendez Gil", curso: "Física Electrónica", dia: "Miércoles", horas: "4-6", tipo: "Laboratorio", ambiente: "Lab. Fisica", grupo: 1 },
    { docente: "Vilma Mendez Gil", curso: "Física Electrónica", dia: "Jueves", horas: "7-9", tipo: "Laboratorio", ambiente: "Lab. Fisica", grupo: 1 },
    { docente: "Vilma Mendez Gil", curso: "Física Electrónica", dia: "Jueves", horas: "9-11", tipo: "Laboratorio", ambiente: "Lab. Fisica", grupo: 1 },
    //8
    { docente: "Sheyla Laura Escobedo Rodriguez", curso: "Psicología Organizacional (e)", dia: "Martes", horas: "6-8", tipo: "Teoría/Práctica", ambiente: "posgrado A-311", grupo: 1 },
    { docente: "Sheyla Laura Escobedo Rodriguez", curso: "Psicología Organizacional (e)", dia: "Viernes", horas: "6-8", tipo: "Teoría/Práctica", ambiente: "posgrado A-311", grupo: 1 },
  ];

  // ── 4. CREAR LOS HORARIOS EN LA BD ───────────────────────────────────────
  console.log("📅 Creando horarios del ciclo III en la base de datos...");
  let creados = 0;
  let saltados = 0;

  for (const data of horariosCicloIIIData) {
    const docente = dbDocentes.find(d => 
      `${d.nombres} ${d.apellidos}`.toLowerCase().includes(data.docente.toLowerCase())
    );
    const curso = dbCursos.find(c => 
      c.nombre.toLowerCase().includes(data.curso.toLowerCase())
    );
    const ambiente = dbAmbientes.find(a => 
      a.codigo === mapAmbiente(data.ambiente)
    );
    const grupo = curso ? getGrupo(curso, data.grupo) : undefined;

    if (!docente || !curso || !ambiente) {
      console.warn(`⚠️ Saltando horario: docente=${data.docente}, curso=${data.curso}, ambiente=${data.ambiente}`);
      saltados++;
      continue;
    }

    const { inicio, fin } = parsearRangoHoras(data.horas);

    await horarioRepo.save(horarioRepo.create({
      docente_id: docente.id,
      curso_id: curso.id,
      ambiente_id: ambiente.id,
      grupo_id: grupo?.id ?? dbGrupos[0]?.id,
      dia: diaANumero(data.dia),
      dia_semana: diaANumero(data.dia),
      hora_inicio: inicio,
      hora_fin: fin,
      tipo_clase: mapTipoClase(data.tipo),
      periodo: periodoActivo.codigo,
      estado: EstadoHorario.CONFIRMADO,
      origen: OrigenHorario.AJUSTE_MANUAL,
    }));

    creados++;
  }

  console.log(`\n✅ Seed completado! ${creados} horarios creados, ${saltados} saltados.\n`);
  console.log("💡 Recuerda: Para ejecutar este seed, usa: npx ts-node src/database/seed-horarios-ciclo-III.ts");

  await AppDataSource.destroy();
}

seedHorariosCicloIII().catch(error => {
  console.error("❌ Error en el seed:", error);
  process.exit(1);
});
