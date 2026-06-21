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
  { estado: EstadoDeclaracionCarga.BORRADOR, count: 5 },
  { estado: EstadoDeclaracionCarga.ENVIADO_DOCENTE, count: 5 },
  { estado: EstadoDeclaracionCarga.OBSERVADO_DPTO, count: 3 },
  { estado: EstadoDeclaracionCarga.SUBSANADO, count: 2 },
  { estado: EstadoDeclaracionCarga.VALIDADO_DPTO, count: 3 },
  { estado: EstadoDeclaracionCarga.APROBADO_FACULTAD, count: 2 },
  { estado: EstadoDeclaracionCarga.CERRADO, count: 2 },
];

function buildCargaNoLectiva(horasLectivas: number, horasNoLectivas: number) {
  const prep = Math.min(6, Math.round(horasNoLectivas * 0.4));
  const inv = Math.min(4, Math.round(horasNoLectivas * 0.3));
  const gest = Math.max(0, horasNoLectivas - prep - inv);
  return {
    actividades: [
      { id: 1, descripcion: "Docencia universitaria", horas: horasLectivas },
      { id: 2, descripcion: "Preparación de clases y evaluación", horas: prep },
      { id: 3, descripcion: "Investigación aplicada", horas: inv },
      { id: 6, descripcion: "Gestión académica", horas: gest },
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
    case EstadoDeclaracionCarga.ENVIADO_DOCENTE:
    case EstadoDeclaracionCarga.OBSERVADO_DPTO:
    case EstadoDeclaracionCarga.SUBSANADO:
      return { fecha_firma_docente: docente, fecha_firma_director: null, fecha_firma_decano: null };
    case EstadoDeclaracionCarga.VALIDADO_DPTO:
      return { fecha_firma_docente: docente, fecha_firma_director: director, fecha_firma_decano: null };
    case EstadoDeclaracionCarga.APROBADO_FACULTAD:
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

  for (let i = 0; i < ordenados.length; i++) {
    const doc = ordenados[i];
    const estado =
      estadoPorIndice[i] ?? EstadoDeclaracionCarga.NO_INICIADO;
    const horasLectivas = 12 + (i % 8);
    const horasNoLectivas = 4 + (i % 6);
    const fechas = fechasPorEstado(estado, new Date(baseFecha.getTime() + i * 86400000));
    const tieneCarga =
      estado !== EstadoDeclaracionCarga.BORRADOR &&
      estado !== EstadoDeclaracionCarga.NO_INICIADO;

    const declaracion = await declaracionRepo.save(
      declaracionRepo.create({
        docente_id: doc.id,
        periodo_academico_id: periodoActivo.id,
        departamento_id: departamento.id,
        facultad_id: facultad.id,
        estado,
        sede: "Trujillo - Ciudad Universitaria",
        observaciones:
          estado === EstadoDeclaracionCarga.OBSERVADO_DPTO
            ? "Revisar horas del rubro de investigación"
            : null,
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
    (d) =>
      d.estado === EstadoDeclaracionCarga.OBSERVADO_DPTO ||
      d.estado === EstadoDeclaracionCarga.SUBSANADO,
  );

  const textosObs = [
    "Las horas de preparación exceden el 50% permitido. Ajustar rubro 2.",
    "Falta detallar actividades de investigación en el rubro 3.",
    "Verificar coherencia entre carga lectiva y horario asignado.",
    "Corregir totales de carga no lectiva antes de reenviar.",
  ];

  for (let i = 0; i < obsDeclaraciones.length; i++) {
    const decl = obsDeclaraciones[i];
    const esSubsanado = decl.estado === EstadoDeclaracionCarga.SUBSANADO;
    const fecha = new Date("2026-03-20T09:00:00");
    fecha.setDate(fecha.getDate() + i * 2);

    await observacionRepo.save(
      observacionRepo.create({
        declaracion_id: decl.id,
        usuario_id: directorDpto.id,
        observacion: textosObs[i % textosObs.length],
        estado_origen: EstadoDeclaracionCarga.ENVIADO_DOCENTE,
        estado_destino: EstadoDeclaracionCarga.OBSERVADO_DPTO,
        tipo: TipoObservacion.OBSERVACION_DPTO,
        subsanada: esSubsanado,
        subsanada_en: esSubsanado ? new Date("2026-03-25T11:00:00") : null,
        created_at: fecha,
      }),
    );
    observacionesCreadas++;

    if (i === 0) {
      await observacionRepo.save(
        observacionRepo.create({
          declaracion_id: decl.id,
          usuario_id: decano.id,
          observacion:
            "Observación histórica de seguimiento académico (solo referencia).",
          estado_origen: EstadoDeclaracionCarga.OBSERVADO_DPTO,
          estado_destino: EstadoDeclaracionCarga.OBSERVADO_DPTO,
          tipo: TipoObservacion.OBSERVACION_DPTO,
          subsanada: false,
          created_at: new Date("2026-03-18T14:30:00"),
        }),
      );
      observacionesCreadas++;
    }
  }

  const candidatosJurada = declaraciones.filter((d) =>
    [
      EstadoDeclaracionCarga.ENVIADO_DOCENTE,
      EstadoDeclaracionCarga.VALIDADO_DPTO,
      EstadoDeclaracionCarga.APROBADO_FACULTAD,
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
