import { Repository } from "typeorm";
import { Docente } from "../entities/docente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { DeclaracionClad } from "../entities/declaracion-clad.entity";
import { DetalleClad } from "../entities/detalle-clad.entity";
import { CargaAdicional } from "../entities/carga-adicional.entity";
import { EstadoClad } from "../common/enums/estado-clad.enum";
import { TipoDependenciaClad } from "../common/enums/tipo-dependencia-clad.enum";

export async function seedCladDemo(
  cladRepo: Repository<DeclaracionClad>,
  detalleRepo: Repository<DetalleClad>,
  cargaAdicionalRepo: Repository<CargaAdicional>,
  declaracionRepo: Repository<DeclaracionCargaHoraria>,
  docentes: Docente[],
  periodoActivo: PeriodoAcademico
) {
  const docente = docentes.find((d) =>
    d.nombres.toLowerCase().includes("marcelino") &&
    d.apellidos.toLowerCase().includes("torres")
  );
  if (!docente) {
    console.warn("⚠️ Docente Marcelino Torres no encontrado, saltando seed CLAD");
    return;
  }

  const declaracionCarga = await declaracionRepo.findOne({
    where: { docente_id: docente.id, periodo_academico_id: periodoActivo.id },
  });

  if (!declaracionCarga) {
    console.warn("⚠️ DeclaracionCargaHoraria no encontrada para Marcelino, saltando seed CLAD");
    return;
  }

  const clad = await cladRepo.save(
    cladRepo.create({
      docente_id: docente.id,
      periodo_academico_id: periodoActivo.id,
      tipo_dependencia: TipoDependenciaClad.POSGRADO,
      nombre_dependencia: "Posgrado - Maestría en Ingeniería de Sistemas",
      firma_docente: { nombre: `${docente.nombres} ${docente.apellidos}`, fecha: "2026-04-10" },
      firma_director_dpto: { nombre: "Director de Departamento", fecha: "2026-04-12", cargo: "Director del Departamento de Ingeniería de Sistemas" },
      firma_director_dependencia: { nombre: "Director de Posgrado FI", fecha: "2026-04-14", cargo: "Director de Posgrado - Facultad de Ingeniería" },
      firma_decano: { nombre: "Decano de Ingeniería", fecha: "2026-04-18", cargo: "Decano de la Facultad de Ingeniería" },
      estado: EstadoClad.APROBADO_FINAL,
      observaciones: null,
      total_horas: 8,
      fecha_envio: new Date("2026-04-10"),
      fecha_validacion_dpto: new Date("2026-04-12"),
      fecha_validacion_dependencia: new Date("2026-04-14"),
      fecha_aprobacion_final: new Date("2026-04-18"),
    })
  );

  const detallesData = [
    {
      nombre_curso: "Métodos Cuantitativos para la Investigación",
      codigo_curso: "POS-IS-701",
      fecha_inicio: new Date("2026-04-01"),
      fecha_fin: new Date("2026-07-31"),
      horario: {
        dia: 2,
        hora_inicio: "18:00",
        hora_fin: "21:00",
        lugar: "Posgrado A-303",
      },
      horas_semanales: 3,
    },
    {
      nombre_curso: "Seminario de Tesis I",
      codigo_curso: "POS-IS-702",
      fecha_inicio: new Date("2026-04-01"),
      fecha_fin: new Date("2026-07-31"),
      horario: {
        dia: 4,
        hora_inicio: "18:00",
        hora_fin: "21:00",
        lugar: "Posgrado A-307",
      },
      horas_semanales: 3,
    },
    {
      nombre_curso: "Asesoría de Tesis",
      codigo_curso: "POS-IS-800",
      fecha_inicio: new Date("2026-04-01"),
      fecha_fin: new Date("2026-07-31"),
      horario: {
        dia: 6,
        hora_inicio: "09:00",
        hora_fin: "11:00",
        lugar: "Oficina Docente",
      },
      horas_semanales: 2,
    },
  ];

  for (const det of detallesData) {
    await detalleRepo.save(
      detalleRepo.create({
        declaracion_clad_id: clad.id,
        nombre_curso: det.nombre_curso,
        codigo_curso: det.codigo_curso,
        fecha_inicio: det.fecha_inicio,
        fecha_fin: det.fecha_fin,
        horario: det.horario,
        horas_semanales: det.horas_semanales,
      })
    );
  }

  await cargaAdicionalRepo.save(
    cargaAdicionalRepo.create({
      declaracion_id: declaracionCarga.id,
      docente_id: docente.id,
      dependencia: "POSGRADO - Maestría en Ingeniería de Sistemas",
      actividad: "Docencia en programa de maestría y asesoría de tesis",
      fecha_inicio: new Date("2026-04-01"),
      fecha_fin: new Date("2026-07-31"),
      horario_semanal: [
        { dia: "Martes", hora_inicio: "18:00", hora_fin: "21:00" },
        { dia: "Jueves", hora_inicio: "18:00", hora_fin: "21:00" },
        { dia: "Sábado", hora_inicio: "09:00", hora_fin: "11:00" },
      ],
      total_horas: 8,
      unidad_academica: "Posgrado - Facultad de Ingeniería",
      resolucion: "R.N° 045-2026-POS-FI-UNT",
      observaciones: "Carga horaria adicional aprobada por Consejo de Facultad",
    })
  );

  console.log(`✅ CLAD demo para Marcelino Torres: 1 DeclaracionClad (APROBADO_FINAL), 3 Detalles, 1 CargaAdicional`);
}
