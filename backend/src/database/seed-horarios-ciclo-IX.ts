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

const AppDataSourceIX = new DataSource({
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

export async function seedHorariosCicloIX(dataSource: DataSource) {
  console.log("🌱 Iniciando seed de HORARIOS DEL CICLO IX...");

  const docenteRepo = dataSource.getRepository(Docente);
  const cursoRepo = dataSource.getRepository(Curso);
  const ambienteRepo = dataSource.getRepository(Ambiente);
  const grupoRepo = dataSource.getRepository(Grupo);
  const horarioRepo = dataSource.getRepository(HorarioAsignado);
  const periodoRepo = dataSource.getRepository(PeriodoAcademico);

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
    // Si ya viene en formato HH:mm-HH:mm, lo usamos directamente
    if (rango.includes(":")) {
      const [i, f] = rango.split("-");
      return { inicio: i.trim(), fin: f.trim() };
    }

    const [h1, h2] = rango.split("-").map(s => parseInt(s.trim(), 10));
    
    let horaInicio = h1;
    if (h1 <= 6) horaInicio += 12;
    
    let horaFin = h2;
    if (h2 <= 6 || h2 < h1) horaFin += 12;
    
    // Caso especial: si el rango es algo como "7-10" o "9-1", h2=1 debe ser 13
    if (h1 >= 7 && h1 <= 12 && h2 < 7) {
      horaFin = h2 + 12;
    }

    return {
      inicio: `${String(horaInicio).padStart(2, '0')}:00`,
      fin: `${String(horaFin).padStart(2, '0')}:00`
    };
  };

  const mapAmbiente = (nombre: string): string => {
    const map: { [key: string]: string } = {
      "Lab1": "LAB-1",
      "Lab 1": "LAB-1",
      "posgrado A-303": "A-303",
      "Lab 3": "LAB-3",
      "Lab. 3": "LAB-3",
      "Lab2": "LAB-2",
      "Lab 2": "LAB-2",
      "Lab 4": "LAB-4",
      "posgrado A-311": "A-311",
      "posgrado A-307": "A-307",
      "Audiovisuales": "Audiovisuales",
      "Taller de Confecciones - Ing. Industrial": "TALLER-CONFECCIONES",
    };
    return map[nombre] || nombre;
  };

  const mapTipoClase = (tipo: string): TipoClase => {
    const t = tipo.toLowerCase();
    if (t.includes("laboratorio")) return TipoClase.LABORATORIO;
    if (t.includes("teoria") || t.includes("teoría")) return TipoClase.TEORIA;
    if (t.includes("practica") || t.includes("práctica")) return TipoClase.PRACTICA;
    return TipoClase.TEORIA;
  };

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const getDocente = (nombre: string) => {
    return dbDocentes.find(d => normalize(`${d.nombres} ${d.apellidos}`).includes(normalize(nombre)));
  };

  const getCurso = (nombre: string) => {
    return dbCursos.find(c => normalize(c.nombre).includes(normalize(nombre).split("(")[0].trim()));
  };

  const getAmbiente = (codigo: string) => {
    const code = mapAmbiente(codigo);
    return dbAmbientes.find(a => a.codigo === code || a.nombre === codigo);
  };

  const getGrupo = (curso: Curso, g: number) => {
    return dbGrupos.find(gr => (gr.curso_id === curso.id || gr.curso?.id === curso.id) && gr.codigo.endsWith(`-G${g}`));
  };

  // ── 3. DATOS DE LOS HORARIOS DEL CICLO IX ───────────────────────────────
  console.log("📋 Datos de horarios del ciclo IX cargados");
  const data = [
    // 1. Juan Pedro Santos Fernández - Tesis I (T:2, P:2, L:2, G:1)
    { doc: "Juan Pedro Santos Fernández", curso: "Tesis I", dia: "Jueves", horas: "07:00-09:00", tipo: "Teoría", amb: "posgrado A-303", g: 1 },
    { doc: "Juan Pedro Santos Fernández", curso: "Tesis I", dia: "Jueves", horas: "09:00-11:00", tipo: "Práctica", amb: "posgrado A-303", g: 1 },
    { doc: "Juan Pedro Santos Fernández", curso: "Tesis I", dia: "Jueves", horas: "11:00-13:00", tipo: "Laboratorio", amb: "Lab 2", g: 1 },
    
    // 2. Ricardo Mendoza Rivera - Tesis I (T:2, P:2, L:2, G:1)
    { doc: "Ricardo Mendoza Rivera", curso: "Tesis I", dia: "Jueves", horas: "14:00-16:00", tipo: "Teoría", amb: "posgrado A-311", g: 1 },
    { doc: "Ricardo Mendoza Rivera", curso: "Tesis I", dia: "Jueves", horas: "16:00-18:00", tipo: "Práctica", amb: "posgrado A-311", g: 1 },
    { doc: "Ricardo Mendoza Rivera", curso: "Tesis I", dia: "Viernes", horas: "16:00-18:00", tipo: "Laboratorio", amb: "Lab 4", g: 1 },
    
    // 3. Ricardo Mendoza Rivera - Analítica de Negocios (T:1, P:2, L:2, G:1)
    { doc: "Ricardo Mendoza Rivera", curso: "Analítica de Negocios", dia: "Viernes", horas: "10:00-11:00", tipo: "Teoría", amb: "posgrado A-303", g: 1 },
    { doc: "Ricardo Mendoza Rivera", curso: "Analítica de Negocios", dia: "Viernes", horas: "11:00-13:00", tipo: "Práctica", amb: "posgrado A-303", g: 1 },
    { doc: "Ricardo Mendoza Rivera", curso: "Analítica de Negocios", dia: "Viernes", horas: "14:00-16:00", tipo: "Laboratorio", amb: "Lab 4", g: 1 },
    
    // 4. Alberto Mendoza de los Santos - Auditoría Informática (T:1, P:2, L:2, G:2)
    { doc: "Alberto Mendoza de los Santos", curso: "Auditoría Informática", dia: "Lunes", horas: "10:00-11:00", tipo: "Teoría", amb: "posgrado A-303", g: 1 },
    { doc: "Alberto Mendoza de los Santos", curso: "Auditoría Informática", dia: "Lunes", horas: "11:00-13:00", tipo: "Práctica", amb: "posgrado A-303", g: 1 },
    { doc: "Alberto Mendoza de los Santos", curso: "Auditoría Informática", dia: "Martes", horas: "10:00-12:00", tipo: "Laboratorio", amb: "Lab 3", g: 1 },
    { doc: "Alberto Mendoza de los Santos", curso: "Auditoría Informática", dia: "Martes", horas: "12:00-14:00", tipo: "Laboratorio", amb: "Lab 3", g: 2 },
    
    // 5. José Gómez Ávila - Gestión de Proyectos de TI (T:1, P:2, L:2, G:3)
    { doc: "José Gómez Ávila", curso: "Gestión de Proyectos de TI", dia: "Lunes", horas: "14:00-15:00", tipo: "Teoría", amb: "posgrado A-303", g: 1 },
    { doc: "José Gómez Ávila", curso: "Gestión de Proyectos de TI", dia: "Lunes", horas: "15:00-17:00", tipo: "Práctica", amb: "posgrado A-303", g: 1 },
    { doc: "José Gómez Ávila", curso: "Gestión de Proyectos de TI", dia: "Martes", horas: "10:00-12:00", tipo: "Laboratorio", amb: "Audiovisuales", g: 1 },
    { doc: "José Gómez Ávila", curso: "Gestión de Proyectos de TI", dia: "Martes", horas: "13:00-15:00", tipo: "Laboratorio", amb: "Lab 1", g: 2 },
    { doc: "José Gómez Ávila", curso: "Gestión de Proyectos de TI", dia: "Martes", horas: "19:00-21:00", tipo: "Laboratorio", amb: "Lab 1", g: 3 },
    
    // 6. Oscar Romel Alcántara Moreno - Emprendimiento Tecnológico (T:2, P:0, L:2, G:2)
    { doc: "Oscar Romel Alcántara Moreno", curso: "Emprendimiento Tecnológico", dia: "Viernes", horas: "14:00-16:00", tipo: "Laboratorio", amb: "Lab 2", g: 1 },
    { doc: "Oscar Romel Alcántara Moreno", curso: "Emprendimiento Tecnológico", dia: "Viernes", horas: "16:00-18:00", tipo: "Laboratorio", amb: "Lab 2", g: 2 },
    { doc: "Oscar Romel Alcántara Moreno", curso: "Emprendimiento Tecnológico", dia: "Viernes", horas: "18:00-20:00", tipo: "Teoría", amb: "posgrado A-303", g: 1 },
    
    // 7. Marcelino Torres Villanueva - Ingeniería Web (T:1, P:1, L:3, G:3)
    { doc: "Marcelino Torres Villanueva", curso: "Ingeniería Web", dia: "Lunes", horas: "18:00-19:00", tipo: "Teoría", amb: "posgrado A-303", g: 1 },
    { doc: "Marcelino Torres Villanueva", curso: "Ingeniería Web", dia: "Lunes", horas: "19:00-20:00", tipo: "Práctica", amb: "posgrado A-303", g: 1 },
    { doc: "Marcelino Torres Villanueva", curso: "Ingeniería Web", dia: "Martes", horas: "14:00-17:00", tipo: "Laboratorio", amb: "Lab 4", g: 1 },
    { doc: "Marcelino Torres Villanueva", curso: "Ingeniería Web", dia: "Martes", horas: "17:00-20:00", tipo: "Laboratorio", amb: "Lab 4", g: 2 },
    { doc: "Marcelino Torres Villanueva", curso: "Ingeniería Web", dia: "Miércoles", horas: "10:00-13:00", tipo: "Laboratorio", amb: "Lab 4", g: 3 },
    
    // 8. José Gómez Ávila - Computación en la Nube (T:1, P:1, L:3, G:3)
    { doc: "José Gómez Ávila", curso: "Computación en la Nube", dia: "Lunes", horas: "07:00-10:00", tipo: "Laboratorio", amb: "Lab 3", g: 1 },
    { doc: "José Gómez Ávila", curso: "Computación en la Nube", dia: "Miércoles", horas: "07:00-10:00", tipo: "Laboratorio", amb: "Lab 3", g: 2 },
    { doc: "José Gómez Ávila", curso: "Computación en la Nube", dia: "Miércoles", horas: "17:00-20:00", tipo: "Laboratorio", amb: "Lab 4", g: 3 },
    { doc: "José Gómez Ávila", curso: "Computación en la Nube", dia: "Jueves", horas: "18:00-19:00", tipo: "Teoría", amb: "posgrado A-303", g: 1 },
    { doc: "José Gómez Ávila", curso: "Computación en la Nube", dia: "Jueves", horas: "19:00-20:00", tipo: "Práctica", amb: "posgrado A-303", g: 1 },
    
    // 9. Camilo Suarez Rebaza - Hackeo Ético (e) (T:2, P:0, L:2, G:2)
    { doc: "Camilo Suarez Rebaza", curso: "Hackeo Ético (e)", dia: "Martes", horas: "08:00-10:00", tipo: "Teoría", amb: "posgrado A-303", g: 1 },
    { doc: "Camilo Suarez Rebaza", curso: "Hackeo Ético (e)", dia: "Martes", horas: "15:00-17:00", tipo: "Laboratorio", amb: "Lab 2", g: 1 },
    { doc: "Camilo Suarez Rebaza", curso: "Hackeo Ético (e)", dia: "Martes", horas: "17:00-19:00", tipo: "Laboratorio", amb: "Lab 2", g: 2 },
  ];

  // ── 4. CREAR LOS HORARIOS EN LA BD ───────────────────────────────────────
  console.log("📅 Creando horarios del ciclo IX en la base de datos...");
  let creados = 0;
  let saltados = 0;

  for (const item of data) {
    const docente = getDocente(item.doc);
    const curso = getCurso(item.curso);
    const ambiente = getAmbiente(item.amb);

    if (docente && curso && ambiente) {
      const grupo = getGrupo(curso, item.g);
      if (grupo) {
        const { inicio, fin } = parsearRangoHoras(item.horas);
        
        await horarioRepo.save(
          horarioRepo.create({
            docente_id: docente.id,
            curso_id: curso.id,
            grupo_id: grupo.id,
            ambiente_id: ambiente.id,
            periodo: "2026-I",
            dia: diaANumero(item.dia),
            hora_inicio: inicio,
            hora_fin: fin,
            tipo_clase: mapTipoClase(item.tipo),
            estado: EstadoHorario.PUBLICADO,
            origen: OrigenHorario.AJUSTE_MANUAL,
          })
        );
        creados++;
      } else {
        console.warn(`⚠️ Grupo no encontrado para curso: ${item.curso} - G${item.g}`);
        saltados++;
      }
    } else {
      console.warn(`⚠️ Datos incompletos para: ${item.curso} (Docente: ${!!docente}, Curso: ${!!curso}, Ambiente: ${!!ambiente})`);
      saltados++;
    }
  }

  console.log(`\n✅ Seed de Ciclo IX completado! ${creados} horarios creados, ${saltados} saltados.\n`);
}

if (require.main === module) {
  // logic to run standalone if needed
}
