import { DataSource } from "typeorm";

import { Docente } from "../entities/docente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Grupo } from "../entities/grupo.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";

const mapTipoClase = (tipo: TipoClase) => {
  if (tipo === TipoClase.LABORATORIO) return "L";
  if (tipo === TipoClase.PRACTICA) return "P";
  return "T";
};

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
  const cursosIds = cursosCicloI.map((c) => c.id);
  if (cursosIds.length > 0) {
    await horarioRepo
      .createQueryBuilder()
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
    const norm = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return dbDocentes.find((d) =>
      norm(`${d.nombres} ${d.apellidos}`).includes(norm(nombre)),
    );
  };

  const getCurso = (nombre: string) => {
    const norm = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return dbCursos.find((c) => norm(c.nombre).includes(norm(nombre)));
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
      Audiovisuales: "Audiovisuales",
    };
    return map[nombre] || nombre;
  };

  const getAmbiente = (nombre: string) =>
    dbAmbientes.find((a) => a.codigo === mapAmbiente(nombre));

  const asegurarGrupo = async (
    curso: Curso,
    g: number,
    tipoClase: TipoClase,
  ) => {
    const sufijo = mapTipoClase(tipoClase);
    const codigoGrupo = `${curso.codigo}-${sufijo}${g}`;
    let grupo = await grupoRepo.findOne({
      where: {
        curso: { id: curso.id },
        codigo: codigoGrupo,
        periodo_academico: { id: dbPeriodo.id },
      },
    });
    if (!grupo) {
      const nombreTipo =
        tipoClase === TipoClase.TEORIA
          ? "Teoría"
          : tipoClase === TipoClase.PRACTICA
            ? "Práctica"
            : "Laboratorio";
      grupo = await grupoRepo.save(
        grupoRepo.create({
          codigo: codigoGrupo,
          nombre: `${nombreTipo} ${g}`,
          tipo: tipoClase,
          ciclo: curso.ciclo,
          cupo_maximo: tipoClase === TipoClase.LABORATORIO ? 30 : 40,
          curso,
          periodo_academico: dbPeriodo,
        }),
      );
    }
    return grupo;
  };

  const data = [
    // 1. Marcelino Torres Villanueva - Intro Prog
    {
      doc: "Marcelino Torres Villanueva",
      curso: "INTRODUCCIÓN A LA PROGRAMACIÓN",
      dia: 1,
      inicio: "07:00",
      fin: "09:00",
      tipo: TipoClase.TEORIA,
      amb: "A-307",
      g: 1,
    },
    {
      doc: "Marcelino Torres Villanueva",
      curso: "INTRODUCCIÓN A LA PROGRAMACIÓN",
      dia: 1,
      inicio: "14:00",
      fin: "16:00",
      tipo: TipoClase.LABORATORIO,
      amb: "LAB-3",
      g: 1,
    },
    {
      doc: "Marcelino Torres Villanueva",
      curso: "INTRODUCCIÓN A LA PROGRAMACIÓN",
      dia: 1,
      inicio: "16:00",
      fin: "18:00",
      tipo: TipoClase.LABORATORIO,
      amb: "LAB-3",
      g: 2,
    },

    // 2. Alberto Mendoza de los Santos - Intro Ing Sist
    {
      doc: "Alberto Mendoza de los Santos",
      curso: "INTRODUCCIÓN A LA INGENIERÍA DE SISTEMAS",
      dia: 2,
      inicio: "07:00",
      fin: "08:00",
      tipo: TipoClase.TEORIA,
      amb: "A-307",
      g: 1,
    },
    {
      doc: "Alberto Mendoza de los Santos",
      curso: "INTRODUCCIÓN A LA INGENIERÍA DE SISTEMAS",
      dia: 2,
      inicio: "08:00",
      fin: "10:00",
      tipo: TipoClase.PRACTICA,
      amb: "A-307",
      g: 1,
    },

    // 3. Paul Cotrina Castellanos - Intro Prog
    {
      doc: "Paul Cotrina Castellanos",
      curso: "INTRODUCCIÓN A LA PROGRAMACIÓN",
      dia: 4,
      inicio: "09:00",
      fin: "11:00",
      tipo: TipoClase.LABORATORIO,
      amb: "LAB-4",
      g: 1,
    },
    {
      doc: "Paul Cotrina Castellanos",
      curso: "INTRODUCCIÓN A LA PROGRAMACIÓN",
      dia: 4,
      inicio: "11:00",
      fin: "13:00",
      tipo: TipoClase.LABORATORIO,
      amb: "LAB-4",
      g: 2,
    },

    // 4. Bertha Urtecho Zavaleta - Desarrollo Personal
    {
      doc: "Bertha Urtecho Zavaleta",
      curso: "DESARROLLO PERSONAL",
      dia: 5,
      inicio: "09:00",
      fin: "11:00",
      tipo: TipoClase.TEORIA,
      amb: "TALLER-CONFECCIONES",
      g: 1,
    },
    {
      doc: "Bertha Urtecho Zavaleta",
      curso: "DESARROLLO PERSONAL",
      dia: 5,
      inicio: "11:00",
      fin: "13:00",
      tipo: TipoClase.PRACTICA,
      amb: "TALLER-CONFECCIONES",
      g: 1,
    },

    // 5. Jose Luis Ponte Bejarano - Desarrollo del Pens. Lógico Matemát.
    {
      doc: "Jose Luis Ponte Bejarano",
      curso: "DESARROLLO DEL PENSAMIENTO LÓGICO MATEMÁTICO",
      dia: 2,
      inicio: "10:00",
      fin: "11:00",
      tipo: TipoClase.TEORIA,
      amb: "A-307",
      g: 1,
    },
    {
      doc: "Jose Luis Ponte Bejarano",
      curso: "DESARROLLO DEL PENSAMIENTO LÓGICO MATEMÁTICO",
      dia: 2,
      inicio: "11:00",
      fin: "13:00",
      tipo: TipoClase.PRACTICA,
      amb: "A-307",
      g: 1,
    },
    {
      doc: "Jose Luis Ponte Bejarano",
      curso: "DESARROLLO DEL PENSAMIENTO LÓGICO MATEMÁTICO",
      dia: 5,
      inicio: "07:00",
      fin: "09:00",
      tipo: TipoClase.PRACTICA,
      amb: "A-307",
      g: 1,
    },

    // 6. Jorge Luis Rios Gonzales - Lectura Crítica
    {
      doc: "Jorge Luis Rios Gonzales",
      curso: "LECTURA CRÍTICA Y REDACCIÓN DE TEXTOS ACADÉMICOS",
      dia: 4,
      inicio: "14:00",
      fin: "16:00",
      tipo: TipoClase.TEORIA,
      amb: "A-303",
      g: 1,
    },
    {
      doc: "Jorge Luis Rios Gonzales",
      curso: "LECTURA CRÍTICA Y REDACCIÓN DE TEXTOS ACADÉMICOS",
      dia: 4,
      inicio: "16:00",
      fin: "18:00",
      tipo: TipoClase.PRACTICA,
      amb: "A-303",
      g: 1,
    },

    // 7. Segundo Guibar Obeso - Intro Análisis Mat
    {
      doc: "Segundo Guibar Obeso",
      curso: "INTRODUCCIÓN AL ANÁLISIS MATEMÁTICO",
      dia: 1,
      inicio: "09:00",
      fin: "11:00",
      tipo: TipoClase.TEORIA,
      amb: "A-307",
      g: 1,
    },
    {
      doc: "Segundo Guibar Obeso",
      curso: "INTRODUCCIÓN AL ANÁLISIS MATEMÁTICO",
      dia: 1,
      inicio: "11:00",
      fin: "13:00",
      tipo: TipoClase.PRACTICA,
      amb: "A-307",
      g: 1,
    },
    {
      doc: "Segundo Guibar Obeso",
      curso: "INTRODUCCIÓN AL ANÁLISIS MATEMÁTICO",
      dia: 2,
      inicio: "16:00",
      fin: "18:00",
      tipo: TipoClase.PRACTICA,
      amb: "A-307",
      g: 1,
    },

    // 8. Miguel Ipanaque Zapata - Estadística Gral
    {
      doc: "Miguel Ipanaque Zapata",
      curso: "ESTADÍSTICA GENERAL",
      dia: 4,
      inicio: "07:00",
      fin: "09:00",
      tipo: TipoClase.PRACTICA,
      amb: "TALLER-CONFECCIONES",
      g: 1,
    },

    // 9. Martha Cardoso - Estadística Gral
    {
      doc: "Martha Cardoso",
      curso: "ESTADÍSTICA GENERAL",
      dia: 5,
      inicio: "14:00",
      fin: "16:00",
      tipo: TipoClase.TEORIA,
      amb: "A-303",
      g: 1,
    },
    {
      doc: "Martha Cardoso",
      curso: "ESTADÍSTICA GENERAL",
      dia: 5,
      inicio: "16:00",
      fin: "18:00",
      tipo: TipoClase.PRACTICA,
      amb: "TALLER-CONFECCIONES",
      g: 1,
    },
  ];

  console.log("📅 Creando asignaciones...");
  for (const item of data) {
    const doc = getDocente(item.doc);
    const curso = getCurso(item.curso);
    const amb = getAmbiente(item.amb);

    if (!doc) {
      console.warn(`⚠️ Docente no encontrado: ${item.doc}`);
      continue;
    }
    if (!curso) {
      console.warn(`⚠️ Curso no encontrado: ${item.curso}`);
      continue;
    }
    if (!amb) {
      console.warn(`⚠️ Ambiente no encontrado: ${item.amb}`);
      continue;
    }

    const grupo = await asegurarGrupo(curso, item.g, item.tipo);

    await horarioRepo.save(
      horarioRepo.create({
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
        origen: OrigenHorario.AJUSTE_MANUAL,
      }),
    );
  }

  console.log("✅ Seed de Ciclo I completado.");
}
