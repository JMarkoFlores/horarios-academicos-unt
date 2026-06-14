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

export async function seedHorariosCicloV() {
  console.log("🌱 Iniciando seed de HORARIOS DEL CICLO V...");

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
      "posgrado A-303": "A-303",
      "Lab. 4": "LAB-4",
      "Lab 1": "LAB-1",
      "Lab1": "LAB-1",
      "Lab. 3": "LAB-3",
      "posgrado A-307": "A-307",
      "Lab4": "LAB-4",
      "Lab2": "LAB-2",
      "Lab. 2": "LAB-2",
      "posgrado A-311": "A-311",
    };
    return map[nombre] || nombre;
  };

  const mapTipoClase = (tipo: string): TipoClase => {
    if (tipo.toLowerCase().includes("laboratorio")) return TipoClase.LABORATORIO;
    if (tipo.toLowerCase().includes("teoría")) return TipoClase.TEORIA;
    if (tipo.toLowerCase().includes("práctica")) return TipoClase.PRACTICA;
    if (tipo.toLowerCase().includes("teoría/práctica")) return TipoClase.TEORIA; // Se mapeará a Teoría por defecto si es mixto
    return TipoClase.TEORIA;
  };

  const getGrupo = (curso: Curso, g: number): Grupo | undefined => {
    return dbGrupos.find(gr => gr.curso?.id === curso.id && gr.codigo.endsWith(`-G${g}`));
  };

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // ── 3. DATOS DE LOS HORARIOS DEL CICLO V ───────────────────────────────
  console.log("📋 Datos de horarios del ciclo V cargados");
  const horariosCicloVData = [
    // 1. Luis Boy Chavil - Ing. de Datos I (T:2, P:1, L:3, G:3)
    { docente: "Luis Boy Chavil", curso: "Ingeniería de Datos I", dia: "Lunes", horas: "07:00-09:00", tipo: "Teoría", ambiente: "posgrado A-303", grupo: 1 },
    { docente: "Luis Boy Chavil", curso: "Ingeniería de Datos I", dia: "Lunes", horas: "09:00-10:00", tipo: "Práctica", ambiente: "posgrado A-303", grupo: 1 },
    { docente: "Luis Boy Chavil", curso: "Ingeniería de Datos I", dia: "Lunes", horas: "10:00-13:00", tipo: "Laboratorio", ambiente: "Lab. 4", grupo: 1 },
    { docente: "Luis Boy Chavil", curso: "Ingeniería de Datos I", dia: "Martes", horas: "07:00-10:00", tipo: "Laboratorio", ambiente: "Lab. 4", grupo: 2 },
    { docente: "Luis Boy Chavil", curso: "Ingeniería de Datos I", dia: "Martes", horas: "10:00-13:00", tipo: "Laboratorio", ambiente: "Lab. 4", grupo: 3 },

    // 2. Juan Carlos Obando Roldan - Sistemas de Información (T:2, P:2, L:2, G:3)
    { docente: "Juan Carlos Obando Roldan", curso: "Sistemas de Información", dia: "Miércoles", horas: "09:00-11:00", tipo: "Teoría", ambiente: "posgrado A-303", grupo: 1 },
    { docente: "Juan Carlos Obando Roldan", curso: "Sistemas de Información", dia: "Miércoles", horas: "11:00-13:00", tipo: "Práctica", ambiente: "posgrado A-303", grupo: 1 },
    { docente: "Juan Carlos Obando Roldan", curso: "Sistemas de Información", dia: "Miércoles", horas: "14:00-16:00", tipo: "Laboratorio", ambiente: "Lab 1", grupo: 1 },
    { docente: "Juan Carlos Obando Roldan", curso: "Sistemas de Información", dia: "Miércoles", horas: "16:00-18:00", tipo: "Laboratorio", ambiente: "Lab 1", grupo: 2 },
    { docente: "Juan Carlos Obando Roldan", curso: "Sistemas de Información", dia: "Miércoles", horas: "18:00-20:00", tipo: "Laboratorio", ambiente: "Lab 1", grupo: 3 },

    // 3. Everson David Agreda Gamboa - Transformación digital (T:2, P:0, L:2, G:2)
    { docente: "Everson David Agreda Gamboa", curso: "Transformación digital", dia: "Jueves", horas: "07:00-09:00", tipo: "Laboratorio", ambiente: "Lab. 3", grupo: 1 },
    { docente: "Everson David Agreda Gamboa", curso: "Transformación digital", dia: "Jueves", horas: "09:00-11:00", tipo: "Teoría", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Everson David Agreda Gamboa", curso: "Transformación digital", dia: "Jueves", horas: "11:00-13:00", tipo: "Laboratorio", ambiente: "Lab. 3", grupo: 2 },

    // 4. Robert Jerry Sánchez Ticona - Tecnología web (T:1, P:1, L:2, G:3)
    { docente: "Robert Jerry Sánchez Ticona", curso: "Tecnología web", dia: "Lunes", horas: "15:00-18:00", tipo: "Laboratorio", ambiente: "Lab1", grupo: 1 },
    { docente: "Robert Jerry Sánchez Ticona", curso: "Tecnología web", dia: "Martes", horas: "15:00-18:00", tipo: "Laboratorio", ambiente: "Lab1", grupo: 2 },
    { docente: "Robert Jerry Sánchez Ticona", curso: "Tecnología web", dia: "Miércoles", horas: "07:00-08:00", tipo: "Teoría", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Robert Jerry Sánchez Ticona", curso: "Tecnología web", dia: "Miércoles", horas: "08:00-09:00", tipo: "Práctica", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Robert Jerry Sánchez Ticona", curso: "Tecnología web", dia: "Jueves", horas: "15:00-18:00", tipo: "Laboratorio", ambiente: "Lab4", grupo: 3 },

    // 5. Cesar Arellano Salazar - Arquitectura de computadoras (T:1, P:2, L:2, G:3)
    { docente: "Cesar Arellano Salazar", curso: "Arquitectura de computadoras", dia: "Viernes", horas: "09:00-10:00", tipo: "Teoría", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Cesar Arellano Salazar", curso: "Arquitectura de computadoras", dia: "Viernes", horas: "10:00-12:00", tipo: "Práctica", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Cesar Arellano Salazar", curso: "Arquitectura de computadoras", dia: "Miércoles", horas: "14:00-16:00", tipo: "Laboratorio", ambiente: "Lab2", grupo: 1 },
    { docente: "Cesar Arellano Salazar", curso: "Arquitectura de computadoras", dia: "Miércoles", horas: "16:00-18:00", tipo: "Laboratorio", ambiente: "Lab2", grupo: 2 },
    { docente: "Cesar Arellano Salazar", curso: "Arquitectura de computadoras", dia: "Miércoles", horas: "18:00-20:00", tipo: "Laboratorio", ambiente: "Lab2", grupo: 3 },

    // 6. Camilo Suárez Rebaza - Teleinformática(e) (T:1, P:2, L:2, G:2)
    { docente: "Camilo Suárez Rebaza", curso: "Teleinformática(e)", dia: "Martes", horas: "13:00-15:00", tipo: "Laboratorio", ambiente: "Lab2", grupo: 1 },
    { docente: "Camilo Suárez Rebaza", curso: "Teleinformática(e)", dia: "Martes", horas: "19:00-21:00", tipo: "Laboratorio", ambiente: "Lab2", grupo: 2 },
    { docente: "Camilo Suárez Rebaza", curso: "Teleinformática(e)", dia: "Viernes", horas: "17:00-18:00", tipo: "Teoría", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Camilo Suárez Rebaza", curso: "Teleinformática(e)", dia: "Viernes", horas: "18:00-20:00", tipo: "Práctica", ambiente: "posgrado A-307", grupo: 1 },

    // 7. Marcos Baca Lopez - Investigación de Operaciones (T:1, P:2, L:2, G:3)
    { docente: "Marcos Baca Lopez", curso: "Investigación de Operaciones", dia: "Jueves", horas: "07:00-09:00", tipo: "Laboratorio", ambiente: "Lab. 2", grupo: 1 },
    { docente: "Marcos Baca Lopez", curso: "Investigación de Operaciones", dia: "Jueves", horas: "09:00-11:00", tipo: "Laboratorio", ambiente: "Lab. 2", grupo: 2 },
    { docente: "Marcos Baca Lopez", curso: "Investigación de Operaciones", dia: "Jueves", horas: "11:00-12:00", tipo: "Teoría", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Marcos Baca Lopez", curso: "Investigación de Operaciones", dia: "Jueves", horas: "12:00-14:00", tipo: "Práctica", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Marcos Baca Lopez", curso: "Investigación de Operaciones", dia: "Viernes", horas: "07:00-09:00", tipo: "Laboratorio", ambiente: "Lab. 2", grupo: 3 },

    // 8. Ana Cuadra Mitzugaray - Contabilidad Gerencial (T:1, P:2, L:2, G:1)
    { docente: "Ana Cuadra Mitzugaray", curso: "Contabilidad Gerencial", dia: "Jueves", horas: "18:00-20:00", tipo: "Laboratorio", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Ana Cuadra Mitzugaray", curso: "Contabilidad Gerencial", dia: "Viernes", horas: "14:00-15:00", tipo: "Teoría", ambiente: "posgrado A-307", grupo: 1 },
    { docente: "Ana Cuadra Mitzugaray", curso: "Contabilidad Gerencial", dia: "Viernes", horas: "15:00-17:00", tipo: "Práctica", ambiente: "posgrado A-307", grupo: 1 },
  ];

  // ── 4. CREAR LOS HORARIOS EN LA BD ───────────────────────────────────────
  console.log("📅 Creando horarios del ciclo V en la base de datos...");
  let creados = 0;
  let saltados = 0;

  for (const data of horariosCicloVData) {
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

if (require.main === module) {
  seedHorariosCicloV().catch((error) => {
    console.error("❌ Error durante el seed de horarios Ciclo V:", error);
    process.exit(1);
  });
}