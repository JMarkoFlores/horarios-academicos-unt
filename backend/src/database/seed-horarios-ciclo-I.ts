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

export async function seedHorariosCicloI(dataSource: DataSource) {
  console.log("🌱 Iniciando seed de HORARIOS DEL CICLO I (Actualizado)...");

  const docenteRepo = dataSource.getRepository(Docente);
  const cursoRepo = dataSource.getRepository(Curso);
  const ambienteRepo = dataSource.getRepository(Ambiente);
  const grupoRepo = dataSource.getRepository(Grupo);
  const horarioRepo = dataSource.getRepository(HorarioAsignado);
  const periodoRepo = dataSource.getRepository(PeriodoAcademico);

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
  const dbGrupos = await grupoRepo.find();

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const getDocente = (nombre: string) => {
    return dbDocentes.find(d => normalize(`${d.nombres} ${d.apellidos}`).includes(normalize(nombre)));
  };

  const getCurso = (nombre: string) => {
    return dbCursos.find(c => normalize(c.nombre).includes(normalize(nombre).split("(")[0].trim()));
  };

  const getAmbiente = (codigo: string) => {
    return dbAmbientes.find(a => a.codigo === codigo || a.nombre === codigo);
  };

  const getGrupo = (curso: Curso, gCode: string) => {
    const searchCode = gCode.startsWith(curso.codigo) ? gCode : `${curso.codigo}-${gCode}`;
    return dbGrupos.find(gr => (gr.curso_id === curso.id || gr.curso?.id === curso.id) && gr.codigo === searchCode);
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
  let creados = 0;
  let saltados = 0;

  for (const item of data) {
    const doc = getDocente(item.doc);
    const curso = getCurso(item.curso);
    const amb = getAmbiente(item.amb);

    if (doc && curso && amb) {
      const grupo = getGrupo(curso, item.g);
      if (grupo) {
        await horarioRepo.save(horarioRepo.create({
          docente_id: doc.id,
          curso_id: curso.id,
          ambiente_id: amb.id,
          grupo_id: grupo.id,
          periodo: periodo,
          dia: item.dia,
          hora_inicio: item.inicio.includes(":") ? (item.inicio.split(":").length === 2 ? `${item.inicio}:00` : item.inicio) : `${item.inicio}:00:00`,
          hora_fin: item.fin.includes(":") ? (item.fin.split(":").length === 2 ? `${item.fin}:00` : item.fin) : `${item.fin}:00:00`,
          tipo_clase: item.tipo,
          estado: EstadoHorario.PUBLICADO,
          origen: OrigenHorario.AJUSTE_MANUAL
        }));
        creados++;
      } else {
        console.warn(`⚠️ Grupo no encontrado para curso: ${item.curso} - ${item.g}`);
        saltados++;
      }
    } else {
      console.warn(`⚠️ Datos incompletos para: ${item.curso} (Docente: ${!!doc}, Curso: ${!!curso}, Ambiente: ${!!amb})`);
      saltados++;
    }
  }

  console.log(`✅ Seed de Ciclo I completado: ${creados} creados, ${saltados} saltados`);
}

if (require.main === module) {
  AppDataSource.initialize()
    .then(async (ds) => {
      await seedHorariosCicloI(ds);
      await ds.destroy();
    })
    .catch((err) => console.error("❌ Error durante el seed:", err));
}
