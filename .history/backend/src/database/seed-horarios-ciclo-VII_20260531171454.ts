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

async function seedHorariosCicloVII() {
  console.log("🌱 Iniciando seed de HORARIOS DEL CICLO VII...");

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
      inicio: `${String(horaInicio).padStart(2, '0')}:00:00`,
      fin: `${String(horaFin).padStart(2, '0')}:00:00`
    };
  };

  const mapAmbiente = (nombre: string): string => {
    const map: { [key: string]: string } = {
      "Lab1": "LAB-1",
      "Lab 1": "LAB-1",
      "posgrado A-303": "A-303",
      "Lab 3": "LAB-3",
      "Lab2": "LAB-2",
      "Lab 2": "LAB-2",
      "posgrado A-311": "A-311",
      "posgrado A-307": "A-307",
      "Lab 4": "LAB-4",
      "Audiovisuales": "AUDIOVISUALES",
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

  const getGrupo = (curso: Curso, g: number): Grupo | undefined => {
    return dbGrupos.find(gr => gr.curso?.id === curso.id && gr.codigo.endsWith(`-G${g}`));
  };

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // ── 3. DATOS DE LOS HORARIOS DEL CICLO VII ───────────────────────────────
  console.log("📋 Datos de horarios del ciclo VII cargados");
  const horariosCicloVIIData = [
    // 1. Juan Pedro Santos Fernández
    { docente: "Juan Pedro Santos Fernández", curso: "Ingeniería de Software I", dia: "Martes", horas: "7-10", tipo: "Laboratorio", ambiente: "Lab1", grupo: 1 },
    { docente: "Juan Pedro Santos Fernández", curso: "Ingeniería de Software I", dia: "Martes", horas: "10-1", tipo: "Teoría/Práctica", ambiente: "posgrado A-303", grupo: 1 },
    // 2. César Arellano Salazar
    { docente: "César Arellano Salazar", curso: "Redes y Comunicaciones I", dia: "Lunes", horas: "10-1", tipo: "Laboratorio", ambiente: "Lab 3", grupo: 1 },
    { docente: "César Arellano Salazar", curso: "Redes y Comunicaciones I", dia: "Lunes", horas: "1-3", tipo: "Laboratorio", ambiente: "Lab2", grupo: 1 },
    { docente: "César Arellano Salazar", curso: "Redes y Comunicaciones I", dia: "Lunes", horas: "4-7", tipo: "Laboratorio", ambiente: "Lab2", grupo: 1 },
    { docente: "César Arellano Salazar", curso: "Redes y Comunicaciones I", dia: "Viernes", horas: "4-6", tipo: "Teoría/Práctica", ambiente: "posgrado A-311", grupo: 1 },
    // 3. Robert Jerry Sánchez Ticona
    { docente: "Robert Jerry Sánchez Ticona", curso: "Ingeniería de Software I", dia: "Lunes", horas: "7-10", tipo: "Laboratorio", ambiente: "Lab1", grupo: 1 },
    { docente: "Robert Jerry Sánchez Ticona", curso: "Ingeniería de Software I", dia: "Lunes", horas: "10-1", tipo: "Laboratorio", ambiente: "Lab1", grupo: 1 },
    // 4. Everson David Agreda Gamboa
    { docente: "Everson David Agreda Gamboa", curso: "Negocios Electrónicos (e )", dia: "Martes", horas: "4-6", tipo: "Teoría/Práctica", ambiente: "posgrado A-311", grupo: 1 },
    // 5. Alberto Mendoza de los Santos
    { docente: "Alberto Mendoza de los Santos", curso: "Gestión de Servicios de TI", dia: "Viernes", horas: "7-10", tipo: "Teoría/Práctica", ambiente: "posgrado A-303", grupo: 1 },
    { docente: "Alberto Mendoza de los Santos", curso: "Gestión de Servicios de TI", dia: "Viernes", horas: "10-12", tipo: "Laboratorio", ambiente: "Lab 1", grupo: 1 },
    { docente: "Alberto Mendoza de los Santos", curso: "Gestión de Servicios de TI", dia: "Viernes", horas: "12-2", tipo: "Laboratorio", ambiente: "Lab 1", grupo: 1 },
    // 6. Paul Cotrina Catellanos
    { docente: "Paul Cotrina Catellanos", curso: "Metodología de la Investigación Científica", dia: "Jueves", horas: "2-6", tipo: "Teoría/Práctica", ambiente: "posgrado A-307", grupo: 1 },
    // 7. Ricardo Mendoza Rivera
    { docente: "Ricardo Mendoza Rivera", curso: "Administración de Base de Datos", dia: "Jueves", horas: "7-9", tipo: "Teoría/Práctica", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Ricardo Mendoza Rivera", curso: "Administración de Base de Datos", dia: "Jueves", horas: "6-8", tipo: "Laboratorio", ambiente: "Lab 4", grupo: 1 },
    { docente: "Ricardo Mendoza Rivera", curso: "Administración de Base de Datos", dia: "Viernes", horas: "6-8", tipo: "Laboratorio", ambiente: "Lab 2", grupo: 1 },
    // 8. Oscar Romel Alcántara Moreno
    { docente: "Oscar Romel Alcántara Moreno", curso: "Planeamiento Estratégico de TI", dia: "Martes", horas: "1-4", tipo: "Teoría/Práctica", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Oscar Romel Alcántara Moreno", curso: "Planeamiento Estratégico de TI", dia: "Miércoles", horas: "1-3", tipo: "Laboratorio", ambiente: "Lab 4", grupo: 1 },
    { docente: "Oscar Romel Alcántara Moreno", curso: "Planeamiento Estratégico de TI", dia: "Miércoles", horas: "3-5", tipo: "Laboratorio", ambiente: "Lab 4", grupo: 1 },
    { docente: "Oscar Romel Alcántara Moreno", curso: "Planeamiento Estratégico de TI", dia: "Miércoles", horas: "5-6", tipo: "Laboratorio", ambiente: "Audiovisuales", grupo: 1 },
    { docente: "Oscar Romel Alcántara Moreno", curso: "Planeamiento Estratégico de TI", dia: "Jueves", horas: "9-11", tipo: "Laboratorio", ambiente: "Lab 3", grupo: 1 },
    // 9. Paul Cotrina Castellanos
    { docente: "Paul Cotrina Castellanos", curso: "Negocios Electrónicos (e )", dia: "Lunes", horas: "1-3", tipo: "Laboratorio", ambiente: "Lab 4", grupo: 1 },
    { docente: "Paul Cotrina Castellanos", curso: "Negocios Electrónicos (e )", dia: "Lunes", horas: "3-5", tipo: "Laboratorio", ambiente: "Lab 4", grupo: 1 },
    // 10. Jhoe Gonzalez Vasquez
    { docente: "Jhoe Gonzalez Vasquez", curso: "Cadena de Suministros (e )", dia: "Miércoles", horas: "7-11", tipo: "Teoría/Práctica", ambiente: "Taller de Confecciones - Ing. Industrial", grupo: 1 },
  ];

  // ── 4. CREAR LOS HORARIOS EN LA BD ───────────────────────────────────────
  console.log("📅 Creando horarios del ciclo VII en la base de datos...");
  let creados = 0;
  let saltados = 0;

  for (const data of horariosCicloVIIData) {
    const docente = dbDocentes.find(d => {
      const fullNombre = normalize(`${d.nombres} ${d.apellidos}`);
      const searchNombre = normalize(data.docente);
      return fullNombre.includes(searchNombre) || searchNombre.includes(fullNombre);
    });
    
    const curso = dbCursos.find(c => {
      const dbNombre = normalize(c.nombre);
      const searchNombre = normalize(data.curso);
      const searchNombreClean = searchNombre.split("(")[0].trim();
      return dbNombre.includes(searchNombreClean) || searchNombreClean.includes(dbNombre);
    });

    const ambiente = dbAmbientes.find(a => 
      a.codigo === mapAmbiente(data.ambiente)
    );

    if (docente && curso && ambiente) {
      const grupo = getGrupo(curso, data.grupo);
      if (grupo) {
        const { inicio, fin } = parsearRangoHoras(data.horas);
        
        await horarioRepo.save(
          horarioRepo.create({
            docente_id: docente.id,
            curso_id: curso.id,
            grupo_id: grupo.id,
            ambiente_id: ambiente.id,
            periodo: "2026-I",
            dia: diaANumero(data.dia),
            dia_semana: diaANumero(data.dia),
            hora_inicio: inicio,
            hora_fin: fin,
            tipo_clase: mapTipoClase(data.tipo),
            estado: EstadoHorario.PUBLICADO,
            origen: OrigenHorario.AJUSTE_MANUAL,
          })
        );
        creados++;
      } else {
        console.warn(`⚠️ Grupo no encontrado para curso: ${data.curso} - G${data.grupo}`);
        saltados++;
      }
    } else {
      console.warn(`⚠️ Datos incompletos para: ${data.curso} (Docente: ${!!docente}, Curso: ${!!curso}, Ambiente: ${!!ambiente})`);
      saltados++;
    }
  }

  console.log(`\n✅ Proceso terminado:`);
  console.log(`- Horarios creados: ${creados}`);
  console.log(`- Horarios saltados: ${saltados}`);

  await AppDataSource.destroy();
}

seedHorariosCicloVII().catch((error) => {
  console.error("❌ Error durante el seed de horarios Ciclo VII:", error);
  process.exit(1);
});
