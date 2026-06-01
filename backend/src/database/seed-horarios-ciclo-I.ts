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
import { DiaActivo } from "../entities/dia-activo.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { Facultad } from "../entities/facultad.entity";
import { Escuela } from "../entities/escuela.entity";
import { Departamento } from "../entities/departamento.entity";
import { ConfiguracionGeneral } from "../entities/configuracion-general.entity";
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
    DiaActivo,
    TurnoHorario,
    DocenteCurso,
    ParametrosCarga,
    Facultad,
    Escuela,
    Departamento,
    ConfiguracionGeneral,
  ],
  synchronize: false,
  logging: false,
});

async function seedHorariosCicloI() {
  console.log("🌱 Iniciando seed de HORARIOS DEL CICLO I (Actualizado)...");

  await AppDataSource.initialize();
  console.log("✅ Conexión a la base de datos establecida");

  const docenteRepo = AppDataSource.getRepository(Docente);
  const cursoRepo = AppDataSource.getRepository(Curso);
  const ambienteRepo = AppDataSource.getRepository(Ambiente);
  const grupoRepo = AppDataSource.getRepository(Grupo);
  const horarioRepo = AppDataSource.getRepository(HorarioAsignado);
  const periodoRepo = AppDataSource.getRepository(PeriodoAcademico);

  const periodo = "2026-I";
  const dbPeriodo = await periodoRepo.findOne({ where: { codigo: periodo } });
  if (!dbPeriodo) throw new Error(`No se encontró el periodo ${periodo}`);

  // Limpiar horarios previos del Ciclo I para este periodo
  console.log("🧹 Limpiando horarios previos del Ciclo I...");
  const cursosCicloI = await cursoRepo.find({ where: { ciclo: 1 } });
  const cursosIds = cursosCicloI.map(c => c.id);
  if (cursosIds.length > 0) {
    await horarioRepo.createQueryBuilder()
      .delete()
      .from(HorarioAsignado)
      .where("curso_id IN (:...ids)", { ids: cursosIds })
      .andWhere("periodo = :periodo", { periodo })
      .execute();
  }

  const dbDocentes = await docenteRepo.find();
  const dbCursos = await cursoRepo.find({ where: { ciclo: 1 } });
  const dbAmbientes = await ambienteRepo.find();

  const getDocente = (nombre: string) => {
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return dbDocentes.find(d => norm(`${d.nombres} ${d.apellidos}`).includes(norm(nombre)));
  };

  const getCurso = (nombre: string) => {
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return dbCursos.find(c => norm(c.nombre).includes(norm(nombre)));
  };

  const getAmbiente = (codigo: string) => dbAmbientes.find(a => a.codigo === codigo);

  const asegurarGrupo = async (curso: Curso, codigoGrupo: string) => {
    let grupo = await grupoRepo.findOne({ where: { curso: { id: curso.id }, codigo: codigoGrupo, periodo_academico: { id: dbPeriodo.id } } });
    if (!grupo) {
      grupo = await grupoRepo.save(grupoRepo.create({
        codigo: codigoGrupo,
        nombre: `Grupo ${codigoGrupo.split('-G')[1]}`,
        ciclo: curso.ciclo,
        cupo_maximo: 30,
        curso,
        periodo_academico: dbPeriodo
      }));
    }
    return grupo;
  };

  const data = [
    // 1. Marcelino Torres Villanueva - Intro Prog
    { doc: "Marcelino Torres Villanueva", curso: "Introducción a la Programación", dia: 1, inicio: "07:00", fin: "09:00", tipo: TipoClase.TEORIA, amb: "A-307", g: "G1" },
    { doc: "Marcelino Torres Villanueva", curso: "Introducción a la Programación", dia: 1, inicio: "14:00", fin: "16:00", tipo: TipoClase.LABORATORIO, amb: "LAB-3", g: "G1" },
    { doc: "Marcelino Torres Villanueva", curso: "Introducción a la Programación", dia: 1, inicio: "16:00", fin: "18:00", tipo: TipoClase.LABORATORIO, amb: "LAB-3", g: "G2" },
    
    // 2. Alberto Mendoza de los Santos - Intro Ing Sist
    { doc: "Alberto Mendoza de los Santos", curso: "Introducción a la Ing. de Sistemas", dia: 2, inicio: "07:00", fin: "08:00", tipo: TipoClase.TEORIA, amb: "A-307", g: "G1" },
    { doc: "Alberto Mendoza de los Santos", curso: "Introducción a la Ing. de Sistemas", dia: 2, inicio: "08:00", fin: "10:00", tipo: TipoClase.PRACTICA, amb: "A-307", g: "G1" },

    // 3. Paul Cotrina Castellanos - Intro Prog
    { doc: "Paul Cotrina Castellanos", curso: "Introducción a la Programación", dia: 4, inicio: "09:00", fin: "11:00", tipo: TipoClase.LABORATORIO, amb: "LAB-4", g: "G1" },
    { doc: "Paul Cotrina Castellanos", curso: "Introducción a la Programación", dia: 4, inicio: "11:00", fin: "13:00", tipo: TipoClase.LABORATORIO, amb: "LAB-4", g: "G2" },

    // 4. Bertha Urtecho Zavaleta - Desarrollo Personal
    { doc: "Bertha Urtecho Zavaleta", curso: "Desarrollo Personal", dia: 5, inicio: "09:00", fin: "11:00", tipo: TipoClase.TEORIA, amb: "TALLER-CONFECCIONES", g: "G1" },
    { doc: "Bertha Urtecho Zavaleta", curso: "Desarrollo Personal", dia: 5, inicio: "11:00", fin: "13:00", tipo: TipoClase.PRACTICA, amb: "TALLER-CONFECCIONES", g: "G1" },

    // 5. Jose Luis Ponte Bejarano - Desarrollo del Pens. Lógico Matemát.
    { doc: "Jose Luis Ponte Bejarano", curso: "Desarrollo del Pens", dia: 2, inicio: "10:00", fin: "11:00", tipo: TipoClase.TEORIA, amb: "A-307", g: "G1" },
    { doc: "Jose Luis Ponte Bejarano", curso: "Desarrollo del Pens", dia: 2, inicio: "11:00", fin: "13:00", tipo: TipoClase.PRACTICA, amb: "A-307", g: "G1" },
    { doc: "Jose Luis Ponte Bejarano", curso: "Desarrollo del Pens", dia: 5, inicio: "07:00", fin: "09:00", tipo: TipoClase.PRACTICA, amb: "A-307", g: "G1" },

    // 6. Jorge Luis Rios Gonzales - Lectura Crítica
    { doc: "Jorge Luis Rios Gonzales", curso: "Lectura Crítica", dia: 4, inicio: "14:00", fin: "16:00", tipo: TipoClase.TEORIA, amb: "A-303", g: "G1" },
    { doc: "Jorge Luis Rios Gonzales", curso: "Lectura Crítica", dia: 4, inicio: "16:00", fin: "18:00", tipo: TipoClase.PRACTICA, amb: "A-303", g: "G1" },

    // 7. Segundo Guibar Obeso - Intro Análisis Mat
    { doc: "Segundo Guibar Obeso", curso: "Introducción al Análisis Matemático", dia: 1, inicio: "09:00", fin: "11:00", tipo: TipoClase.TEORIA, amb: "A-307", g: "G1" },
    { doc: "Segundo Guibar Obeso", curso: "Introducción al Análisis Matemático", dia: 1, inicio: "11:00", fin: "13:00", tipo: TipoClase.PRACTICA, amb: "A-307", g: "G1" },
    { doc: "Segundo Guibar Obeso", curso: "Introducción al Análisis Matemático", dia: 2, inicio: "16:00", fin: "18:00", tipo: TipoClase.PRACTICA, amb: "A-307", g: "G1" },

    // 8. Miguel Ipanaque Zapata - Estadística Gral
    { doc: "Miguel Ipanaque Zapata", curso: "Estadística General", dia: 4, inicio: "07:00", fin: "09:00", tipo: TipoClase.PRACTICA, amb: "TALLER-CONFECCIONES", g: "G1" },

    // 9. Martha Cardoso - Estadística Gral
    { doc: "Martha Cardoso", curso: "Estadística General", dia: 5, inicio: "14:00", fin: "16:00", tipo: TipoClase.TEORIA, amb: "A-303", g: "G1" },
    { doc: "Martha Cardoso", curso: "Estadística General", dia: 5, inicio: "16:00", fin: "18:00", tipo: TipoClase.PRACTICA, amb: "TALLER-CONFECCIONES", g: "G1" },
  ];

  console.log("📅 Creando asignaciones...");
  for (const item of data) {
    const doc = getDocente(item.doc);
    const curso = getCurso(item.curso);
    const amb = getAmbiente(item.amb);

    if (!doc) { console.warn(`⚠️ Docente no encontrado: ${item.doc}`); continue; }
    if (!curso) { console.warn(`⚠️ Curso no encontrado: ${item.curso}`); continue; }
    if (!amb) { console.warn(`⚠️ Ambiente no encontrado: ${item.amb}`); continue; }

    const grupoCode = `${curso.codigo}-${item.g}`;
    const grupo = await asegurarGrupo(curso, grupoCode);

    await horarioRepo.save(horarioRepo.create({
      docente_id: doc.id,
      curso_id: curso.id,
      ambiente_id: amb.id,
      grupo_id: grupo.id,
      periodo: periodo,
      dia: item.dia,
      hora_inicio: `${item.inicio}:00`,
      hora_fin: `${item.fin}:00`,
      tipo_clase: item.tipo,
      estado: EstadoHorario.PUBLICADO,
      origen: OrigenHorario.AJUSTE_MANUAL
    }));
  }

  console.log("✅ Seed de Ciclo I completado.");
  await AppDataSource.destroy();
}

seedHorariosCicloI().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
