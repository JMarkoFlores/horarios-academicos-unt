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

export async function seedHorariosCicloVII(dataSource: DataSource) {
  console.log("🌱 Iniciando seed de HORARIOS DEL CICLO VII...");

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
    const [h1, h2] = rango.split("-").map((s) => parseInt(s.trim(), 10));
    const horaInicio = h1 < 7 ? h1 + 12 : h1;
    let horaFin = h2 < 7 ? h2 + 12 : h2;
    if (horaFin <= horaInicio) horaFin += 12;
    return {
      inicio: `${String(horaInicio).padStart(2, "0")}:00:00`,
      fin: `${String(horaFin).padStart(2, "0")}:00:00`,
    };
  };

  const mapAmbiente = (nombre: string): string => {
    const map: { [key: string]: string } = {
      Lab1: "LAB-1",
      "Lab 1": "LAB-1",
      "posgrado A-303": "A-303",
      "Lab 3": "LAB-3",
      Lab2: "LAB-2",
      "Lab 2": "LAB-2",
      "posgrado A-311": "A-311",
      "posgrado A-307": "A-307",
      "Lab 4": "LAB-4",
      Audiovisuales: "Audiovisuales",
      "Taller de Confecciones - Ing. Industrial": "TALLER-CONFECCIONES",
    };
    return map[nombre] || nombre;
  };

  const mapTipoClase = (tipo: string): TipoClase => {
    const t = tipo.toLowerCase();
    if (t.includes("laboratorio")) return TipoClase.LABORATORIO;
    if (t.includes("teoria") || t.includes("teoría")) return TipoClase.TEORIA;
    if (t.includes("practica") || t.includes("práctica"))
      return TipoClase.PRACTICA;
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

  // ── 3. DATOS DE LOS HORARIOS DEL CICLO VII ───────────────────────────────
  console.log("📋 Datos de horarios del ciclo VII cargados");
  const horariosCicloVIIData = [
    // 1. Juan Pedro Santos Fernández - Ingeniería de Software I (T:2, P:1, L:3, G:1)
    {
      docente: "Juan Pedro Santos Fernández",
      curso: "INGENIERÍA DEL SOFTWARE I",
      dia: "Martes",
      horas: "07:00-10:00",
      tipo: "Laboratorio",
      ambiente: "Lab1",
      grupo: 1,
    },
    {
      docente: "Juan Pedro Santos Fernández",
      curso: "INGENIERÍA DEL SOFTWARE I",
      dia: "Martes",
      horas: "10:00-12:00",
      tipo: "Teoría",
      ambiente: "posgrado A-303",
      grupo: 1,
    },
    {
      docente: "Juan Pedro Santos Fernández",
      curso: "INGENIERÍA DEL SOFTWARE I",
      dia: "Martes",
      horas: "12:00-13:00",
      tipo: "Práctica",
      ambiente: "posgrado A-303",
      grupo: 1,
    },

    // 2. César Arellano Salazar - Redes y Comunicaciones I (T:1, P:1, L:3, G:3)
    {
      docente: "César Arellano Salazar",
      curso: "REDES Y COMUNICACIONES I",
      dia: "Lunes",
      horas: "10:00-13:00",
      tipo: "Laboratorio",
      ambiente: "Lab 3",
      grupo: 1,
    },
    {
      docente: "César Arellano Salazar",
      curso: "REDES Y COMUNICACIONES I",
      dia: "Lunes",
      horas: "13:00-16:00",
      tipo: "Laboratorio",
      ambiente: "Lab2",
      grupo: 2,
    },
    {
      docente: "César Arellano Salazar",
      curso: "REDES Y COMUNICACIONES I",
      dia: "Lunes",
      horas: "16:00-19:00",
      tipo: "Laboratorio",
      ambiente: "Lab2",
      grupo: 3,
    },
    {
      docente: "César Arellano Salazar",
      curso: "REDES Y COMUNICACIONES I",
      dia: "Viernes",
      horas: "16:00-17:00",
      tipo: "Teoría",
      ambiente: "posgrado A-311",
      grupo: 1,
    },
    {
      docente: "César Arellano Salazar",
      curso: "REDES Y COMUNICACIONES I",
      dia: "Viernes",
      horas: "17:00-18:00",
      tipo: "Práctica",
      ambiente: "posgrado A-311",
      grupo: 1,
    },

    // 3. Robert Jerry Sánchez Ticona - Ingeniería de Software I (T:-, P:-, L:3, G:2)
    {
      docente: "Robert Jerry Sánchez Ticona",
      curso: "INGENIERÍA DEL SOFTWARE I",
      dia: "Lunes",
      horas: "07:00-10:00",
      tipo: "Laboratorio",
      ambiente: "Lab1",
      grupo: 1,
    },
    {
      docente: "Robert Jerry Sánchez Ticona",
      curso: "INGENIERÍA DEL SOFTWARE I",
      dia: "Lunes",
      horas: "10:00-13:00",
      tipo: "Laboratorio",
      ambiente: "Lab1",
      grupo: 2,
    },

    // 4. Everson David Agreda Gamboa - Negocios Electrónicos (e ) (T:2, P:0, L:0, G:0)
    {
      docente: "Everson David Agreda Gamboa",
      curso: "NEGOCIOS ELECTRÓNICOS",
      dia: "Martes",
      horas: "16:00-18:00",
      tipo: "Teoría",
      ambiente: "posgrado A-311",
      grupo: 1,
    },

    // 5. Alberto Mendoza de los Santos - Gestión de Servicios de TI (T:1, P:2, L:2, G:2)
    {
      docente: "Alberto Mendoza de los Santos",
      curso: "GESTIÓN DE SERVICIOS DE TI",
      dia: "Viernes",
      horas: "07:00-08:00",
      tipo: "Teoría",
      ambiente: "posgrado A-303",
      grupo: 1,
    },
    {
      docente: "Alberto Mendoza de los Santos",
      curso: "GESTIÓN DE SERVICIOS DE TI",
      dia: "Viernes",
      horas: "08:00-10:00",
      tipo: "Práctica",
      ambiente: "posgrado A-303",
      grupo: 1,
    },
    {
      docente: "Alberto Mendoza de los Santos",
      curso: "GESTIÓN DE SERVICIOS DE TI",
      dia: "Viernes",
      horas: "10:00-12:00",
      tipo: "Laboratorio",
      ambiente: "Lab 1",
      grupo: 1,
    },
    {
      docente: "Alberto Mendoza de los Santos",
      curso: "GESTIÓN DE SERVICIOS DE TI",
      dia: "Viernes",
      horas: "12:00-14:00",
      tipo: "Laboratorio",
      ambiente: "Lab 1",
      grupo: 2,
    },

    // 6. Paul Cotrina Castellanos - Metodología de la Investigación Científica (T:2, P:2, L:0, G:-)
    {
      docente: "Paul Cotrina Castellanos",
      curso: "METODOLOGÍA DE LA INVESTIGACIÓN CIENTÍFICA",
      dia: "Jueves",
      horas: "14:00-16:00",
      tipo: "Teoría",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Paul Cotrina Castellanos",
      curso: "METODOLOGÍA DE LA INVESTIGACIÓN CIENTÍFICA",
      dia: "Jueves",
      horas: "16:00-18:00",
      tipo: "Práctica",
      ambiente: "posgrado A-307",
      grupo: 1,
    },

    // 7. Ricardo Mendoza Rivera - Administración de Base de Datos (T:1, P:1, L:3, G:2)
    {
      docente: "Ricardo Mendoza Rivera",
      curso: "ADMINISTRACIÓN DE BASE DE DATOS",
      dia: "Jueves",
      horas: "07:00-08:00",
      tipo: "Teoría",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Ricardo Mendoza Rivera",
      curso: "ADMINISTRACIÓN DE BASE DE DATOS",
      dia: "Jueves",
      horas: "08:00-09:00",
      tipo: "Práctica",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Ricardo Mendoza Rivera",
      curso: "ADMINISTRACIÓN DE BASE DE DATOS",
      dia: "Jueves",
      horas: "18:00-21:00",
      tipo: "Laboratorio",
      ambiente: "Lab 4",
      grupo: 1,
    },
    {
      docente: "Ricardo Mendoza Rivera",
      curso: "ADMINISTRACIÓN DE BASE DE DATOS",
      dia: "Viernes",
      horas: "18:00-21:00",
      tipo: "Laboratorio",
      ambiente: "Lab 2",
      grupo: 2,
    },

    // 8. Oscar Romel Alcántara Moreno - Planeamiento Estratégico de TI (T:1, P:2, L:2, G:4)
    {
      docente: "Oscar Romel Alcántara Moreno",
      curso: "PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN",
      dia: "Martes",
      horas: "13:00-14:00",
      tipo: "Teoría",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Oscar Romel Alcántara Moreno",
      curso: "PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN",
      dia: "Martes",
      horas: "14:00-16:00",
      tipo: "Práctica",
      ambiente: "posgrado A-307",
      grupo: 1,
    },
    {
      docente: "Oscar Romel Alcántara Moreno",
      curso: "PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN",
      dia: "Miércoles",
      horas: "13:00-15:00",
      tipo: "Laboratorio",
      ambiente: "Lab 4",
      grupo: 1,
    },
    {
      docente: "Oscar Romel Alcántara Moreno",
      curso: "PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN",
      dia: "Miércoles",
      horas: "15:00-17:00",
      tipo: "Laboratorio",
      ambiente: "Lab 4",
      grupo: 2,
    },
    {
      docente: "Oscar Romel Alcántara Moreno",
      curso: "PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN",
      dia: "Miércoles",
      horas: "17:00-19:00",
      tipo: "Laboratorio",
      ambiente: "Audiovisuales",
      grupo: 3,
    },
    {
      docente: "Oscar Romel Alcántara Moreno",
      curso: "PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN",
      dia: "Jueves",
      horas: "09:00-11:00",
      tipo: "Laboratorio",
      ambiente: "Lab 3",
      grupo: 4,
    },

    // 9. Paul Cotrina Castellanos - Negocios Electrónicos (e ) (T:-, P:-, L:2, G:2)
    {
      docente: "Paul Cotrina Castellanos",
      curso: "NEGOCIOS ELECTRÓNICOS",
      dia: "Lunes",
      horas: "14:00-16:00",
      tipo: "Laboratorio",
      ambiente: "Lab 4",
      grupo: 1,
    },
    {
      docente: "Paul Cotrina Castellanos",
      curso: "NEGOCIOS ELECTRÓNICOS",
      dia: "Lunes",
      horas: "16:00-18:00",
      tipo: "Laboratorio",
      ambiente: "Lab 4",
      grupo: 2,
    },

    // 10. Jhoe Gonzalez Vasquez - Cadena de Suministros (e ) (T:2, P:2, L:-, G:-)
    {
      docente: "Jhoe Gonzalez Vasquez",
      curso: "CADENA DE SUMINISTROS",
      dia: "Miércoles",
      horas: "07:00-09:00",
      tipo: "Teoría",
      ambiente: "Taller de Confecciones - Ing. Industrial",
      grupo: 1,
    },
    {
      docente: "Jhoe Gonzalez Vasquez",
      curso: "CADENA DE SUMINISTROS",
      dia: "Miércoles",
      horas: "09:00-11:00",
      tipo: "Práctica",
      ambiente: "Taller de Confecciones - Ing. Industrial",
      grupo: 1,
    },
  ];

  // ── 4. CREAR LOS HORARIOS EN LA BD ───────────────────────────────────────
  console.log("📅 Creando horarios del ciclo VII en la base de datos...");
  let creados = 0;
  let saltados = 0;

  for (const data of horariosCicloVIIData) {
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
