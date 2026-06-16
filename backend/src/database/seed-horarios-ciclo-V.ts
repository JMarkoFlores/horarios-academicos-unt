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

export async function seedHorariosCicloV(dataSource: DataSource) {
  console.log("🌱 Iniciando seed de HORARIOS DEL CICLO V...");

  const docenteRepo = dataSource.getRepository(Docente);
  const cursoRepo = dataSource.getRepository(Curso);
  const ambienteRepo = dataSource.getRepository(Ambiente);
  const grupoRepo = dataSource.getRepository(Grupo);
  const horarioRepo = dataSource.getRepository(HorarioAsignado);
  const periodoRepo = dataSource.getRepository(PeriodoAcademico);

  // ── 1. OBTENER DATOS EXISTENTES ───────────────────────────────────────────
  console.log("📋 Obteniendo datos existentes de la base de datos...");
  const dbDocentes = await docenteRepo.find();
  const dbCursos = await cursoRepo.find({ where: { ciclo: 5 } });
  const dbAmbientes = await ambienteRepo.find();
  const dbGrupos = await grupoRepo.find({
    relations: ["curso", "periodo_academico"],
  });
  const dbPeriodos = await periodoRepo.find();
  const periodoActivo = dbPeriodos.find((p) => p.codigo === "2026-I");
  if (!periodoActivo) {
    throw new Error("No se encontró el período 2026-I");
  }
  console.log(
    `✅ Datos obtenidos: ${dbDocentes.length} docentes, ${dbCursos.length} cursos, ${dbAmbientes.length} ambientes\n`,
  );

  // ── 2. FUNCIONES AUXILIARES ──────────────────────────────────────────────────
  const diaANumero = (dia: string): number => {
    const map: { [key: string]: number } = {
      Lunes: 1,
      Martes: 2,
      Miércoles: 3,
      Jueves: 4,
      Viernes: 5,
      Sábado: 6,
    };
    return map[dia] ?? 1;
  };

  const parsearRangoHoras = (
    rango: string,
  ): { inicio: string; fin: string } => {
    // Si ya viene en formato HH:mm-HH:mm, lo usamos directamente
    if (rango.includes(":")) {
      const [i, f] = rango.split("-");
      return { inicio: i.trim(), fin: f.trim() };
    }

    const [h1, h2] = rango.split("-").map((s) => parseInt(s.trim(), 10));

    let horaInicio = h1;
    if (h1 <= 6) horaInicio += 12;

    let horaFin = h2;
    if (h2 <= 6 || h2 < h1) horaFin += 12;

    // Caso especial: si el rango es algo como "7-10" o "9-1", h2=1 debe ser 13
    if (h1 >= 7 && h1 <= 12 && h2 < 7) {
      horaFin = h2 + 12;
    }

    return {
      inicio: `${String(horaInicio).padStart(2, "0")}:00`,
      fin: `${String(horaFin).padStart(2, "0")}:00`,
    };
  };

  const mapAmbiente = (nombre: string): string => {
    const map: { [key: string]: string } = {
      "posgrado A-303": "A-303",
      "Lab. 4": "LAB-4",
      "Lab 1": "LAB-1",
      Lab1: "LAB-1",
      "Lab. 3": "LAB-3",
      "posgrado A-307": "A-307",
      Lab4: "LAB-4",
      Lab2: "LAB-2",
      "Lab. 2": "LAB-2",
      "posgrado A-311": "A-311",
    };
    return map[nombre] || nombre;
  };

  const mapTipoClase = (tipo: string): TipoClase => {
    if (tipo.toLowerCase().includes("laboratorio"))
      return TipoClase.LABORATORIO;
    if (tipo.toLowerCase().includes("teoría")) return TipoClase.TEORIA;
    if (tipo.toLowerCase().includes("práctica")) return TipoClase.PRACTICA;
    if (tipo.toLowerCase().includes("teoría/práctica")) return TipoClase.TEORIA; // Se mapeará a Teoría por defecto si es mixto
    return TipoClase.TEORIA;
  };

  const asegurarGrupo = async (
    curso: Curso,
    g: number,
    tipoStr: string,
  ): Promise<Grupo> => {
    const tipo = mapTipoClase(tipoStr);
    const sufijo =
      tipo === TipoClase.TEORIA ? "T" : tipo === TipoClase.PRACTICA ? "P" : "L";
    const codigoGrupo = `${curso.codigo}-${sufijo}${g}`;
    let grupo = await grupoRepo.findOne({
      where: {
        curso: { id: curso.id },
        codigo: codigoGrupo,
        periodo_academico: { id: periodoActivo.id },
      },
    });
    if (!grupo) {
      grupo = await grupoRepo.save(
        grupoRepo.create({
          codigo: codigoGrupo,
          nombre: `${tipo === TipoClase.TEORIA ? "Teoría" : tipo === TipoClase.PRACTICA ? "Práctica" : "Laboratorio"} ${g}`,
          tipo,
          ciclo: curso.ciclo,
          cupo_maximo: tipo === TipoClase.LABORATORIO ? 30 : 40,
          curso_id: curso.id,
          periodo_academico_id: periodoActivo.id,
        }),
      );
    }
    return grupo;
  };

  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  // ── 3. DATOS DE LOS HORARIOS DEL CICLO V ───────────────────────────────
  console.log("📋 Datos de horarios del ciclo V cargados");
  const horariosCicloVData = [
    // 1. Luis Boy Chavil - Ing. de Datos I (T:2, P:1, L:3, G:3)
    {
      docente: "Luis Boy Chavil",
      curso: "INGENIERÍA DE DATOS I",
      dia: "Lunes",
      horas: "07:00-09:00",
      tipo: "Teoría",
      ambiente: "posgrado A-303",
      grupo: 1,
    },
    {
      docente: "Luis Boy Chavil",
      curso: "INGENIERÍA DE DATOS I",
      dia: "Lunes",
      horas: "09:00-10:00",
      tipo: "Práctica",
      ambiente: "posgrado A-303",
      grupo: 1,
    },
    {
      docente: "Luis Boy Chavil",
      curso: "INGENIERÍA DE DATOS I",
      dia: "Lunes",
      horas: "10:00-13:00",
      tipo: "Laboratorio",
      ambiente: "Lab. 4",
      grupo: 1,
    },
    {
      docente: "Luis Boy Chavil",
      curso: "INGENIERÍA DE DATOS I",
      dia: "Martes",
      horas: "07:00-10:00",
      tipo: "Laboratorio",
      ambiente: "Lab. 4",
      grupo: 2,
    },
    {
      docente: "Luis Boy Chavil",
      curso: "INGENIERÍA DE DATOS I",
      dia: "Martes",
      horas: "10:00-13:00",
      tipo: "Laboratorio",
      ambiente: "Lab. 4",
      grupo: 3,
    },

    // 2. Juan Carlos Obando Roldan - Sistemas de Información (T:2, P:2, L:2, G:3)
    {
      docente: "Juan Carlos Obando Roldan",
      curso: "SISTEMAS DE INFORMACIÓN",
      dia: "Miércoles",
      horas: "09:00-11:00",
      tipo: "Teoría",
      ambiente: "posgrado A-303",
      grupo: 1,
    },
    {
      docente: "Juan Carlos Obando Roldan",
      curso: "SISTEMAS DE INFORMACIÓN",
      dia: "Miércoles",
      horas: "11:00-13:00",
      tipo: "Práctica",
      ambiente: "posgrado A-303",
      grupo: 1,
    },
    {
      docente: "Juan Carlos Obando Roldan",
      curso: "SISTEMAS DE INFORMACIÓN",
      dia: "Miércoles",
      horas: "14:00-16:00",
      tipo: "Laboratorio",
      ambiente: "Lab 1",
      grupo: 1,
    },
    {
      docente: "Juan Carlos Obando Roldan",
      curso: "SISTEMAS DE INFORMACIÓN",
      dia: "Miércoles",
      horas: "16:00-18:00",
      tipo: "Laboratorio",
      ambiente: "Lab 1",
      grupo: 2,
    },
    {
      docente: "Juan Carlos Obando Roldan",
      curso: "SISTEMAS DE INFORMACIÓN",
      dia: "Miércoles",
      horas: "18:00-20:00",
      tipo: "Laboratorio",
      ambiente: "Lab 1",
      grupo: 3,
    },

    // 3. Everson David Agreda Gamboa - Transformación digital (T:2, P:0, L:2, G:2)
    {
      docente: "Everson David Agreda Gamboa",
      curso: "TRANSFORMACIÓN DIGITAL",
      dia: "Jueves",
      horas: "07:00-09:00",
      tipo: "Laboratorio",
      ambiente: "Lab. 3",
      grupo: 1,
    },
    {
      docente: "Everson David Agreda Gamboa",
      curso: "TRANSFORMACIÓN DIGITAL",
      dia: "Jueves",
      horas: "09:00-11:00",
      tipo: "Teoría",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Everson David Agreda Gamboa",
      curso: "TRANSFORMACIÓN DIGITAL",
      dia: "Jueves",
      horas: "11:00-13:00",
      tipo: "Laboratorio",
      ambiente: "Lab. 3",
      grupo: 2,
    },

    // 4. Robert Jerry Sánchez Ticona - Tecnología web (T:1, P:1, L:2, G:3)
    {
      docente: "Robert Jerry Sánchez Ticona",
      curso: "TECNOLOGÍAS WEB",
      dia: "Lunes",
      horas: "15:00-18:00",
      tipo: "Laboratorio",
      ambiente: "Lab1",
      grupo: 1,
    },
    {
      docente: "Robert Jerry Sánchez Ticona",
      curso: "TECNOLOGÍAS WEB",
      dia: "Martes",
      horas: "15:00-18:00",
      tipo: "Laboratorio",
      ambiente: "Lab1",
      grupo: 2,
    },
    {
      docente: "Robert Jerry Sánchez Ticona",
      curso: "TECNOLOGÍAS WEB",
      dia: "Miércoles",
      horas: "07:00-08:00",
      tipo: "Teoría",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Robert Jerry Sánchez Ticona",
      curso: "TECNOLOGÍAS WEB",
      dia: "Miércoles",
      horas: "08:00-09:00",
      tipo: "Práctica",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Robert Jerry Sánchez Ticona",
      curso: "TECNOLOGÍAS WEB",
      dia: "Jueves",
      horas: "15:00-18:00",
      tipo: "Laboratorio",
      ambiente: "Lab4",
      grupo: 3,
    },

    // 5. Cesar Arellano Salazar - Arquitectura de computadoras (T:1, P:2, L:2, G:3)
    {
      docente: "Cesar Arellano Salazar",
      curso: "ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS",
      dia: "Viernes",
      horas: "09:00-10:00",
      tipo: "Teoría",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Cesar Arellano Salazar",
      curso: "ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS",
      dia: "Viernes",
      horas: "10:00-12:00",
      tipo: "Práctica",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Cesar Arellano Salazar",
      curso: "ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS",
      dia: "Miércoles",
      horas: "14:00-16:00",
      tipo: "Laboratorio",
      ambiente: "Lab2",
      grupo: 1,
    },
    {
      docente: "Cesar Arellano Salazar",
      curso: "ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS",
      dia: "Miércoles",
      horas: "16:00-18:00",
      tipo: "Laboratorio",
      ambiente: "Lab2",
      grupo: 2,
    },
    {
      docente: "Cesar Arellano Salazar",
      curso: "ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS",
      dia: "Miércoles",
      horas: "18:00-20:00",
      tipo: "Laboratorio",
      ambiente: "Lab2",
      grupo: 3,
    },

    // 6. Camilo Suárez Rebaza - Teleinformática(e) (T:1, P:2, L:2, G:2)
    {
      docente: "Camilo Suárez Rebaza",
      curso: "TELEINFORMÁTICA",
      dia: "Martes",
      horas: "13:00-15:00",
      tipo: "Laboratorio",
      ambiente: "Lab2",
      grupo: 1,
    },
    {
      docente: "Camilo Suárez Rebaza",
      curso: "TELEINFORMÁTICA",
      dia: "Martes",
      horas: "19:00-21:00",
      tipo: "Laboratorio",
      ambiente: "Lab2",
      grupo: 2,
    },
    {
      docente: "Camilo Suárez Rebaza",
      curso: "TELEINFORMÁTICA",
      dia: "Viernes",
      horas: "17:00-18:00",
      tipo: "Teoría",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Camilo Suárez Rebaza",
      curso: "TELEINFORMÁTICA",
      dia: "Viernes",
      horas: "18:00-20:00",
      tipo: "Práctica",
      ambiente: "posgrado A-307",
      grupo: 1,
    },

    // 7. Marcos Baca Lopez - Investigación de Operaciones (T:1, P:2, L:2, G:3)
    {
      docente: "Marcos Baca Lopez",
      curso: "INVESTIGACIÓN DE OPERACIONES",
      dia: "Jueves",
      horas: "07:00-09:00",
      tipo: "Laboratorio",
      ambiente: "Lab. 2",
      grupo: 1,
    },
    {
      docente: "Marcos Baca Lopez",
      curso: "INVESTIGACIÓN DE OPERACIONES",
      dia: "Jueves",
      horas: "09:00-11:00",
      tipo: "Laboratorio",
      ambiente: "Lab. 2",
      grupo: 2,
    },
    {
      docente: "Marcos Baca Lopez",
      curso: "INVESTIGACIÓN DE OPERACIONES",
      dia: "Jueves",
      horas: "11:00-12:00",
      tipo: "Teoría",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Marcos Baca Lopez",
      curso: "INVESTIGACIÓN DE OPERACIONES",
      dia: "Jueves",
      horas: "12:00-14:00",
      tipo: "Práctica",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Marcos Baca Lopez",
      curso: "INVESTIGACIÓN DE OPERACIONES",
      dia: "Viernes",
      horas: "07:00-09:00",
      tipo: "Laboratorio",
      ambiente: "Lab. 2",
      grupo: 3,
    },

    // 8. Ana Cuadra Mitzugaray - Contabilidad Gerencial (T:1, P:2, L:2, G:1)
    {
      docente: "Ana Cuadra Mitzugaray",
      curso: "CONTABILIDAD GERENCIAL",
      dia: "Jueves",
      horas: "18:00-20:00",
      tipo: "Laboratorio",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Ana Cuadra Mitzugaray",
      curso: "CONTABILIDAD GERENCIAL",
      dia: "Viernes",
      horas: "14:00-15:00",
      tipo: "Teoría",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Ana Cuadra Mitzugaray",
      curso: "CONTABILIDAD GERENCIAL",
      dia: "Viernes",
      horas: "15:00-17:00",
      tipo: "Práctica",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
  ];

  // ── 4. CREAR LOS HORARIOS EN LA BD ───────────────────────────────────────
  console.log("📅 Creando horarios del ciclo V en la base de datos...");
  let creados = 0;
  let saltados = 0;

  for (const data of horariosCicloVData) {
    const docente = dbDocentes.find((d) => {
      const fullNombre = normalize(`${d.nombres} ${d.apellidos}`);
      const searchNombre = normalize(data.docente);
      return (
        fullNombre.includes(searchNombre) || searchNombre.includes(fullNombre)
      );
    });

    const curso = dbCursos.find((c) => {
      const dbNombre = normalize(c.nombre);
      const searchNombre = normalize(data.curso);
      const searchNombreClean = searchNombre.split("(")[0].trim();
      return (
        dbNombre.includes(searchNombreClean) ||
        searchNombreClean.includes(dbNombre)
      );
    });

    const ambiente = dbAmbientes.find(
      (a) => a.codigo === mapAmbiente(data.ambiente),
    );

    if (!docente || !curso || !ambiente) {
      console.warn(
        `⚠️ Datos incompletos para: ${data.curso} (Docente: ${!!docente}, Curso: ${!!curso}, Ambiente: ${!!ambiente})`,
      );
      saltados++;
      continue;
    }

    const grupo = await asegurarGrupo(curso, data.grupo, data.tipo);
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
      }),
    );
    creados++;
  }

  console.log(`\n✅ Proceso terminado:`);
  console.log(`- Horarios creados: ${creados}`);
  console.log(`- Horarios saltados: ${saltados}`);
}
