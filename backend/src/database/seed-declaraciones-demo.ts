import { Repository } from "typeorm";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { DeclaracionObservacion } from "../entities/declaracion-observacion.entity";
import { DeclaracionJurada } from "../entities/declaracion-jurada.entity";
import { Docente } from "../entities/docente.entity";
import { Departamento } from "../entities/departamento.entity";
import { Facultad } from "../entities/facultad.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Usuario } from "../entities/usuario.entity";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";
import { TipoObservacion } from "../common/enums/tipo-observacion.enum";

/** DNIs de 8 dígitos (formato peruano) para los 28 docentes del seed */
export const DNIS_DOCENTES = [
  17893456, 42567891, 72345612, 19876543, 45671234, 56782345, 67893456, 78904567,
  89015678, 90126789, 12345678, 23456789, 34567890, 45678901, 56789012, 67890123,
  78901234, 89012345, 90123456, 10234567, 21345678, 32456789, 43567890, 54678901,
  65789012, 76890123, 42471234, 87901234,
];

interface SeedDeclaracionesParams {
  declaracionRepo: Repository<DeclaracionCargaHoraria>;
  observacionRepo: Repository<DeclaracionObservacion>;
  juradaRepo: Repository<DeclaracionJurada>;
  docentes: Docente[];
  periodoActivo: PeriodoAcademico;
  departamento: Departamento;
  facultad: Facultad;
  directorDpto: Usuario;
  decano: Usuario;
}

const ESTADOS_DEMO: Array<{ estado: EstadoDeclaracionCarga; count: number }> = [
  { estado: EstadoDeclaracionCarga.BORRADOR, count: 10 },
  { estado: EstadoDeclaracionCarga.CONFIRMADO, count: 11 },
  { estado: EstadoDeclaracionCarga.CERRADO, count: 2 },
];

function buildCargaNoLectiva(horasLectivas: number, horasNoLectivas: number) {
  const prep = Math.min(Math.floor(horasLectivas * 0.5), horasNoLectivas);
  const inv = Math.max(0, Math.floor((horasNoLectivas - prep) / 2));
  const gest = Math.max(0, horasNoLectivas - prep - inv);
  return {
    actividades: [
      { 
        id: 2, 
        descripcion: "PREPARACIÓN DE CLASES Y EVALUACIÓN", 
        horas: prep,
        detalle: "Preparación de material didáctico, sílabos y evaluación continua.",
        horarios: prep > 0 ? [{ dia: "Lunes", inicio: "08:00", fin: "10:00" }] : []
      },
      { 
        id: 3, 
        descripcion: "INVESTIGACIÓN (BÁSICA Y/O APLICADA)", 
        horas: inv,
        detalle: "Desarrollo de proyecto de investigación en PIC.",
        horarios: inv > 0 ? [{ dia: "Miércoles", inicio: "14:00", fin: "16:00" }] : []
      },
      { 
        id: 7, 
        descripcion: "ACTIVIDADES DE GESTIÓN INSTITUCIONAL", 
        horas: gest,
        detalle: "Reuniones de comité directivo y coordinación académica.",
        horarios: gest > 0 ? [{ dia: "Jueves", inicio: "16:00", fin: "18:00" }] : []
      },
    ],
    total_horas_lectivas: horasLectivas,
    total_horas_no_lectivas: horasNoLectivas,
  };
}

function fechasPorEstado(estado: EstadoDeclaracionCarga, base: Date) {
  const docente = new Date(base);
  const director = new Date(base);
  director.setDate(director.getDate() + 3);
  const decanoF = new Date(base);
  decanoF.setDate(decanoF.getDate() + 7);

  switch (estado) {
    case EstadoDeclaracionCarga.CONFIRMADO:
      return { fecha_firma_docente: docente, fecha_firma_director: director, fecha_firma_decano: null };
    case EstadoDeclaracionCarga.CERRADO:
      return {
        fecha_firma_docente: docente,
        fecha_firma_director: director,
        fecha_firma_decano: decanoF,
      };
    default:
      return { fecha_firma_docente: null, fecha_firma_director: null, fecha_firma_decano: null };
  }
}

function tipoJuradaPorModalidad(modalidad: string | null): string {
  if (modalidad === "DEDICACION_EXCLUSIVA") return "EXCLUSIVIDAD";
  if (modalidad?.startsWith("TIEMPO_COMPLETO")) return "COMPATIBILIDAD_TOTAL";
  return "COMPATIBILIDAD_PARCIAL";
}

export async function seedDeclaracionesDemo(
  params: SeedDeclaracionesParams,
): Promise<{
  declaraciones: DeclaracionCargaHoraria[];
  observaciones: number;
  juradas: number;
}> {
  const {
    declaracionRepo,
    observacionRepo,
    juradaRepo,
    docentes,
    periodoActivo,
    departamento,
    facultad,
    directorDpto,
    decano,
  } = params;

  const ordenados = [...docentes].sort((a, b) => a.id - b.id);
  const estadoPorIndice: EstadoDeclaracionCarga[] = [];
  for (const { estado, count } of ESTADOS_DEMO) {
    for (let i = 0; i < count; i++) {
      estadoPorIndice.push(estado);
    }
  }

  const declaraciones: DeclaracionCargaHoraria[] = [];
  const baseFecha = new Date("2026-03-15T10:00:00");

  const horarioRepo = declaracionRepo.manager.getRepository("HorarioAsignado");
  const horariosDB = await horarioRepo.find({
    where: { periodo: periodoActivo.codigo }
  });
  
  const horasPorDocente = new Map<number, number>();
  for (const h of horariosDB) {
    const [hIni] = (h as any).hora_inicio.split(":");
    const [hFin] = (h as any).hora_fin.split(":");
    const horas = parseInt(hFin, 10) - parseInt(hIni, 10);
    const actual = horasPorDocente.get((h as any).docente_id) || 0;
    horasPorDocente.set((h as any).docente_id, actual + horas);
  }

  for (let i = 0; i < ordenados.length; i++) {
    const doc = ordenados[i];
    let estado = estadoPorIndice[i] ?? EstadoDeclaracionCarga.BORRADOR;

    let totalHoras = 40;
    if (doc.modalidad === "TIEMPO_PARCIAL_20") totalHoras = 20;
    else if (doc.modalidad === "TIEMPO_PARCIAL_12") totalHoras = 12;
    else if (doc.modalidad === "TIEMPO_PARCIAL_10") totalHoras = 10;
    else if (doc.modalidad === "TIEMPO_PARCIAL_8") totalHoras = 8;
    
    const horasLectivas = horasPorDocente.get(doc.id) || 0;
    let horasNoLectivas = totalHoras - horasLectivas;
    if (horasNoLectivas < 0) horasNoLectivas = 0;
    const fechas = fechasPorEstado(estado, new Date(baseFecha.getTime() + i * 86400000));
    const tieneCarga =
      estado !== EstadoDeclaracionCarga.BORRADOR;

    const declaracion = await declaracionRepo.save(
      declaracionRepo.create({
        docente_id: doc.id,
        periodo_academico_id: periodoActivo.id,
        departamento_id: departamento.id,
        facultad_id: facultad.id,
        estado,
        sede: "Trujillo - Ciudad Universitaria",
        observaciones: null,
        carga_no_lectiva: tieneCarga
          ? buildCargaNoLectiva(horasLectivas, horasNoLectivas)
          : {
              actividades: [],
              total_horas_lectivas: 0,
              total_horas_no_lectivas: 0,
            },
        total_horas_lectivas: tieneCarga ? horasLectivas : 0,
        total_horas_no_lectivas: tieneCarga ? horasNoLectivas : 0,
        total_horas_general: tieneCarga ? horasLectivas + horasNoLectivas : 0,
        ...fechas,
      }),
    );
    declaraciones.push(declaracion);
  }

  let observacionesCreadas = 0;
  const obsDeclaraciones = declaraciones.filter(
    (d) => d.estado === EstadoDeclaracionCarga.BORRADOR,
  ).slice(0, 4);

  const textosObs = [
    "Las horas de preparación exceden el 50% permitido. Ajustar rubro 2.",
    "Falta detallar actividades de investigación en el rubro 3.",
    "Verificar coherencia entre carga lectiva y horario asignado.",
    "Corregir totales de carga no lectiva antes de reenviar.",
  ];

  for (let i = 0; i < obsDeclaraciones.length; i++) {
    const decl = obsDeclaraciones[i];
    const fecha = new Date("2026-03-20T09:00:00");
    fecha.setDate(fecha.getDate() + i * 2);

    await observacionRepo.save(
      observacionRepo.create({
        declaracion_id: decl.id,
        usuario_id: directorDpto.id,
        observacion: textosObs[i % textosObs.length],
        estado_origen: EstadoDeclaracionCarga.BORRADOR,
        estado_destino: EstadoDeclaracionCarga.BORRADOR,
        tipo: TipoObservacion.OBSERVACION_DPTO,
        subsanada: false,
        created_at: fecha,
      }),
    );
    observacionesCreadas++;
  }

  const candidatosJurada = declaraciones.filter((d) =>
    [
      EstadoDeclaracionCarga.CONFIRMADO,
      EstadoDeclaracionCarga.CERRADO,
    ].includes(d.estado),
  );

  let juradasCreadas = 0;
  for (const decl of candidatosJurada.slice(0, 5)) {
    const docente = ordenados.find((d) => d.id === decl.docente_id);
    if (!docente) continue;

    const tipo = tipoJuradaPorModalidad(docente.modalidad);
    await juradaRepo.save(
      juradaRepo.create({
        declaracion_id: decl.id,
        docente_id: docente.id,
        periodo_id: periodoActivo.id,
        tipo_declaracion: tipo,
        contenido: {
          docente: `${docente.apellidos.toUpperCase()}, ${docente.nombres.toUpperCase()}`,
          dni: docente.ibm,
          departamento: departamento.nombre,
          facultad: facultad.nombre,
          modalidad: docente.modalidad,
          tipoDeclaracion: tipo,
          periodo: periodoActivo.codigo,
          fechaGeneracion: new Date().toISOString(),
        },
        estado: decl.estado === EstadoDeclaracionCarga.CERRADO ? "FIRMADA" : "PENDIENTE",
        fecha_firma:
          decl.estado === EstadoDeclaracionCarga.CERRADO
            ? new Date("2026-04-01T12:00:00")
            : null,
      }),
    );
    juradasCreadas++;
  }

  return {
    declaraciones,
    observaciones: observacionesCreadas,
    juradas: juradasCreadas,
  };
}
