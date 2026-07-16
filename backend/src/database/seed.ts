import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { join } from "path";
import * as bcrypt from "bcrypt";

// Entities
import { Usuario } from "../entities/usuario.entity";
import { Docente } from "../entities/docente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Grupo } from "../entities/grupo.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { DiaActivo } from "../entities/dia-activo.entity";
import { Facultad } from "../entities/facultad.entity";
import { Escuela } from "../entities/escuela.entity";
import { Departamento } from "../entities/departamento.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { DeclaracionObservacion } from "../entities/declaracion-observacion.entity";
import { DeclaracionJurada } from "../entities/declaracion-jurada.entity";
import { ConfiguracionGeneral } from "../entities/configuracion-general.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { TurnoConfig } from "../entities/turno-config.entity";
import { CampañaVentanas } from "../entities/campaña-ventanas.entity";
import { VentanaAtencion } from "../entities/ventana-atencion.entity";
import { ColaDocentes } from "../entities/cola-docentes.entity";
import { AuditoriaHorario } from "../entities/auditoria-horario.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { DiaNoLaborable } from "../entities/dia-no-laborable.entity";
import { NotificacionDocente } from "../entities/notificacion-docente.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { Preasignacion } from "../entities/preasignacion.entity";
import { PreferenciasNotificacion } from "../entities/preferencias-notificacion.entity";
import { ReglasPrioridadGlobales } from "../entities/reglas-prioridad.entity";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { SeleccionTemporal } from "../entities/seleccion-temporal.entity";
import { PlanEstudios } from "../entities/plan-estudios.entity";
import { CursoPlanEstudios } from "../entities/curso-plan-estudios.entity";
import { AsignacionLectiva } from "../entities/asignacion-lectiva.entity";
import { DeclaracionClad } from "../entities/declaracion-clad.entity";
import { DetalleClad } from "../entities/detalle-clad.entity";
import { CargaAdicional } from "../entities/carga-adicional.entity";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { ModalidadDocente } from "../common/enums/modalidad-docente.enum";
import { TipoDocente } from "../common/enums/tipo-docente.enum";

// Import our modular seed functions
import { seedTurnosPorDefecto, generarSlotsDesdeTurno } from "./seed-turnos";
import { seedDisponibilidadesDocentes } from "./seed-disponibilidades";
import {
  seedEstructura,
  normalize,
  diaANumero,
  parsearRangoHoras,
  mapAmbienteCode,
} from "./seed-estructura";
import { seedPlanEstudios } from "./seed-plan-estudios";
import { seedPlanEstudios2027 } from "./seed-plan-estudios-2027";
import { asignarAmbientesPorDefecto } from "./asignar-ambientes-por-defecto.helper";
import { seedHorariosCicloI } from "./seed-horarios-ciclo-I";
import { seedHorariosCicloIII } from "./seed-horarios-ciclo-III";
import { seedHorariosCicloV } from "./seed-horarios-ciclo-V";
import { seedHorariosCicloVII } from "./seed-horarios-ciclo-VII";
import { seedHorariosCicloIX } from "./seed-horarios-ciclo-IX";
import {
  seedDeclaracionesDemo,
  DNIS_DOCENTES,
} from "./seed-declaraciones-demo";
import { seedCladDemo } from "./seed-clad-demo";

// Enums
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";
import { EstadoAsignacionLectiva } from "../common/enums/estado-asignacion-lectiva.enum";
import { OfertaAcademica } from "../entities/oferta-academica.entity";

// Load environment variables
config({ path: join(__dirname, "../../.env") });

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST ?? "localhost",
  port: parseInt(process.env.DATABASE_PORT ?? "5432", 10),
  database: process.env.DATABASE_NAME ?? "horarios_unt",
  username: process.env.DATABASE_USER ?? "unt_user",
  password: process.env.DATABASE_PASSWORD ?? "unt_pass123",
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  entities: [join(__dirname, "../entities/**/*.entity{.ts,.js}")],
  synchronize: false,
  logging: false,
});

export async function main(dataSource?: DataSource) {
  console.log("🚀 Iniciando SEED UNIFICADO del Sistema de Horarios...");

  let ownDataSource = false;
  let ds: DataSource;

  if (dataSource && dataSource.isInitialized) {
    ds = dataSource;
    console.log("✅ Usando DataSource de la app (con SSL si aplica).");
  } else {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    ds = AppDataSource;
    ownDataSource = true;
    console.log("✅ Conexión propia establecida.");
  }

  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  try {
    // Truncation outside transaction (DDL operation)
    console.log("🧹 Limpiando base de datos...");
    const tables = [
      "declaracion_observacion",
      "declaracion_jurada",
      "declaraciones_clad",
      "detalles_clad",
      "carga_adicional",
      "oferta_academica",
      "asignacion_lectiva",
      "notificacion_docente",
      "cola_docentes",
      "ventana_atencion",
      "campaña_ventanas",
      "curso_plan_estudios",
      "plan_estudios",
      "turno_config",
      "disponibilidad_docente",
      "declaracion_carga_horaria",
      "horario_asignado",
      "docente_curso",
      "grupo",
      "curso",
      "docente",
      "usuario",
      "departamento",
      "escuela",
      "facultad",
      "periodo_academico",
      "dia_activo",
      "turno_horario",
      "ambiente",
      "configuracion_general",
      "restriccion_institucional",
    ];
    for (const table of tables) {
      try {
        await queryRunner.query(
          `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`,
        );
      } catch (error: any) {
        if (error.code === "42P01") {
          console.log(`⚠️  Tabla "${table}" no existe, saltando...`);
        } else {
          throw error;
        }
      }
    }

    // Start transaction for data insertion
    await queryRunner.startTransaction();
    console.log("📝 Transacción iniciada.");

    // 1. Seed basic structure
    const estructura = await seedEstructura(queryRunner);
    console.log("✅ Estructura base creada.");

    // 2. Seed default turnos config
    const turnoConfigRepo = queryRunner.manager.getRepository(TurnoConfig);
    await seedTurnosPorDefecto(turnoConfigRepo);
    console.log("✅ Turnos por defecto creados.");

    // 2b. Seed ParametrosCarga for active period
    const parametrosCargaRepo =
      queryRunner.manager.getRepository(ParametrosCarga);
    const modalidades = Object.values(ModalidadDocente);
    const perfiles = [
      [TipoDocente.ORDINARIO, CategoriaDocente.PRINCIPAL],
      [TipoDocente.ORDINARIO, CategoriaDocente.ASOCIADO],
      [TipoDocente.ORDINARIO, CategoriaDocente.AUXILIAR],
      [TipoDocente.CONTRATADO, CategoriaDocente.SIN_CATEGORIA],
      [TipoDocente.JEFE_PRACTICA_CONTRATADO, CategoriaDocente.SIN_CATEGORIA],
    ] as const;
    const limitesPorModalidad: Record<
      ModalidadDocente,
      { min: number; max: number; cursos: number }
    > = {
      [ModalidadDocente.DEDICACION_EXCLUSIVA]: { min: 16, max: 22, cursos: 8 },
      [ModalidadDocente.TIEMPO_COMPLETO_40]: { min: 16, max: 22, cursos: 8 },
      [ModalidadDocente.TIEMPO_PARCIAL_20]: { min: 8, max: 12, cursos: 5 },
      [ModalidadDocente.TIEMPO_PARCIAL_12]: { min: 4, max: 8, cursos: 4 },
      [ModalidadDocente.TIEMPO_PARCIAL_10]: { min: 4, max: 6, cursos: 3 },
      [ModalidadDocente.TIEMPO_PARCIAL_8]: { min: 2, max: 4, cursos: 2 },
    };
    await parametrosCargaRepo
      .createQueryBuilder()
      .delete()
      .where("periodo_academico = :periodo", {
        periodo: estructura.periodoActivo.codigo,
      })
      .andWhere(
        "(modalidad NOT IN (:...modalidades) OR tipo_docente NOT IN (:...tipos) OR categoria NOT IN (:...categorias))",
        {
          modalidades,
          tipos: Object.values(TipoDocente),
          categorias: Object.values(CategoriaDocente),
        },
      )
      .execute();
    let paramsCount = 0;
    for (const modalidad of modalidades) {
      for (const [tipoDocente, categoria] of perfiles) {
        if (
          tipoDocente === TipoDocente.JEFE_PRACTICA_CONTRATADO &&
          modalidad === ModalidadDocente.DEDICACION_EXCLUSIVA
        ) {
          continue;
        }
        const limites = limitesPorModalidad[modalidad];
          const exists = await parametrosCargaRepo.findOne({
            where: {
              periodo_academico: estructura.periodoActivo.codigo,
              modalidad,
              categoria,
              tipo_docente: tipoDocente,
            },
          });
          if (!exists) {
            await parametrosCargaRepo.save(
              parametrosCargaRepo.create({
                periodo_academico: estructura.periodoActivo.codigo,
                modalidad,
                categoria,
                tipo_docente: tipoDocente,
                horas_min_semanal: limites.min,
                horas_max_semanal: limites.max,
                cursos_max_docente: limites.cursos,
              }),
            );
            paramsCount++;
          }
      }
    }
    console.log(`✅ ${paramsCount} parámetros de carga creados.`);

    // 3. Seed course plan (Plan de Estudios 2018)
    const planRepo = queryRunner.manager.getRepository(PlanEstudios);
    const cursoPlanRepo = queryRunner.manager.getRepository(CursoPlanEstudios);
    const cursoRepo = queryRunner.manager.getRepository(Curso);
    const { plan2018, cursos } = await seedPlanEstudios(
      planRepo,
      cursoRepo,
      cursoPlanRepo,
      estructura.escuela,
      estructura.departamentos,
    );

    // 3b. Seed Plan de Estudios 2027 (reuses existing Curso records)
    await seedPlanEstudios2027(
      planRepo,
      cursoRepo,
      cursoPlanRepo,
      estructura.escuela,
      estructura.departamentos,
    );
    console.log("✅ Plan de Estudios 2027 completado.");

    // 3b. Asignar ambientes por defecto a los cursos
    console.log("🏠 Asignando ambientes por defecto a cursos...");
    await asignarAmbientesPorDefecto(queryRunner.manager);

    // 3c. Seed OfertaAcademica from CursoPlanEstudios
    console.log("📋 Generando oferta académica desde plan de estudios...");
    const ofertaRepo = queryRunner.manager.getRepository(OfertaAcademica);
    const periodoActivo = await queryRunner.manager
      .getRepository(PeriodoAcademico)
      .findOne({ where: { activo: true } });
    if (!periodoActivo)
      throw new Error("No hay período activo para generar oferta académica");
    const todosCursosPlan = await cursoPlanRepo.find();
    let ofertaCount = 0;
    for (const cp of todosCursosPlan) {
      const tipos: { tipo: TipoClase; horas: number }[] = [
        { tipo: TipoClase.TEORIA, horas: cp.horas_teoria },
        { tipo: TipoClase.PRACTICA, horas: cp.horas_practica },
        { tipo: TipoClase.LABORATORIO, horas: cp.horas_laboratorio },
      ];
      for (const { tipo, horas } of tipos) {
        if (horas <= 0) continue;
        const exists = await ofertaRepo.findOne({
          where: {
            periodo_id: periodoActivo.id,
            curso_plan_id: cp.id,
            tipo_clase: tipo,
          },
        });
        if (exists) continue;
        await ofertaRepo.save(
          ofertaRepo.create({
            periodo_id: periodoActivo.id,
            curso_plan_id: cp.id,
            tipo_clase: tipo,
            secciones: 1,
            activo: true,
          }),
        );
        ofertaCount++;
      }
    }
    console.log(`✅ ${ofertaCount} registros de oferta académica generados.`);

    // 4. Seed horarios for each cycle
    console.log("📚 Iniciando seed de horarios por ciclo...");
    await seedHorariosCicloI(queryRunner.manager);
    console.log("✅ Horarios Ciclo I completados.");
    await seedHorariosCicloIII(queryRunner.manager);
    console.log("✅ Horarios Ciclo III completados.");
    await seedHorariosCicloV(queryRunner.manager);
    console.log("✅ Horarios Ciclo V completados.");
    await seedHorariosCicloVII(queryRunner.manager);
    console.log("✅ Horarios Ciclo VII completados.");
    await seedHorariosCicloIX(queryRunner.manager);
    console.log("✅ Horarios Ciclo IX completados.");

    // 4b. Derive AsignacionLectiva + DocenteCurso from HorarioAsignado
    console.log("📋 Derivando asignaciones lectivas desde horarios...");
    const horarioRepo = queryRunner.manager.getRepository(HorarioAsignado);
    const docenteCursoRepo = queryRunner.manager.getRepository(DocenteCurso);
    const asignacionLectivaRepo =
      queryRunner.manager.getRepository(AsignacionLectiva);
    const allHorarios = await horarioRepo.find({
      where: { periodo: estructura.periodoActivo.codigo },
      relations: ["grupo"],
    });
    const periodo = estructura.periodoActivo;

    const seenDC = new Set<string>();
    const seenAL = new Map<
      string,
      { horas: number; grupoId: number | null; seccion: string }
    >();
    let dcCount = 0,
      alCount = 0;

    for (const h of allHorarios) {
      const startH = parseInt((h as any).hora_inicio.split(":")[0], 10);
      const endH = parseInt((h as any).hora_fin.split(":")[0], 10);
      const horas = endH - startH;

      const cursoPlan = await cursoPlanRepo.findOne({
        where: { curso_id: (h as any).curso_id, plan_estudios_id: plan2018.id },
      });
      if (!cursoPlan) continue;

      const tc = (h as any).tipo_clase;
      const dcKey = `${(h as any).docente_id}-${(h as any).curso_id}-${tc}`;
      if (!seenDC.has(dcKey)) {
        seenDC.add(dcKey);
        await docenteCursoRepo.save(
          docenteCursoRepo.create({
            docenteId: (h as any).docente_id,
            cursoId: (h as any).curso_id,
            tipo_clase: tc as TipoClase,
            periodoId: periodo.id,
            grupos: 1,
          }),
        );
        dcCount++;
      }

      const grupoId = (h as any).grupo_id ?? null;
      const seccion = grupoId ? `G${grupoId}` : "U";
      const alKey = `${(h as any).docente_id}-${cursoPlan.id}-${tc}-${seccion}`;

      if (!seenAL.has(alKey)) {
        seenAL.set(alKey, { horas, grupoId, seccion });
      } else {
        // Sum hours for same docente/curso/tipo/seccion
        seenAL.get(alKey)!.horas += horas;
      }
    }

    // Now save all unique AsignacionLectiva entries and map them back to horarios
    const asignacionLectivaMap = new Map<string, number>();
    for (const [alKey, data] of seenAL.entries()) {
      const [docenteId, cursoPlanId, tc, seccion] = alKey.split("-");

      // Vary nro_alumnos based on tipo_clase (lab typically smaller)
      let nroAlumnos = 25;
      if (tc === "LABORATORIO") {
        nroAlumnos = Math.floor(Math.random() * 15) + 20; // 20-34
      } else if (tc === "PRACTICA") {
        nroAlumnos = Math.floor(Math.random() * 20) + 25; // 25-44
      } else {
        nroAlumnos = Math.floor(Math.random() * 30) + 25; // 25-54
      }

      const asignacion = await asignacionLectivaRepo.save(
        asignacionLectivaRepo.create({
          docente_id: parseInt(docenteId),
          curso_plan_id: parseInt(cursoPlanId),
          periodo_id: periodo.id,
          grupo_id: data.grupoId,
          tipo_clase: tc as TipoClase,
          seccion: seccion,
          nro_alumnos: nroAlumnos,
          horas_asignadas: data.horas,
          estado: EstadoAsignacionLectiva.CONFIRMADO,
          asignado_por_id: estructura.admin.id,
        }),
      );
      asignacionLectivaMap.set(alKey, asignacion.id);
      alCount++;
    }
    console.log(
      `✅ ${dcCount} DocenteCurso y ${alCount} AsignacionLectiva derivados de horarios`,
    );

    // Update horarios with asignacion_lectiva_id
    console.log("🔗 Actualizando horarios con asignacion_lectiva_id...");
    console.log(`   Total horarios encontrados: ${allHorarios.length}`);
    console.log(`   Total AsignacionLectiva creadas: ${asignacionLectivaMap.size}`);
    let horariosActualizados = 0;
    let horariosSkippedNoCursoPlan = 0;
    let horariosSkippedNoMatch = 0;
    for (const h of allHorarios) {
      const grupoId = (h as any).grupo_id ?? null;
      const seccion = grupoId ? `G${grupoId}` : "U";
      const cursoPlan = await cursoPlanRepo.findOne({
        where: { curso_id: (h as any).curso_id, plan_estudios_id: plan2018.id },
      });
if (!cursoPlan) { horariosSkippedNoCursoPlan++; continue; }

      const tc = (h as any).tipo_clase;
      const alKey = `${(h as any).docente_id}-${cursoPlan.id}-${tc}-${seccion}`;
      const asignacionLectivaId = asignacionLectivaMap.get(alKey);

      if (asignacionLectivaId) {
        (h as any).asignacion_lectiva_id = asignacionLectivaId;
        await horarioRepo.save(h);
        horariosActualizados++;
      } else {
        horariosSkippedNoMatch++;
      }
    }
    console.log(`✅ ${horariosActualizados} horarios actualizados con asignacion_lectiva_id`);
    if (horariosSkippedNoCursoPlan > 0) {
      console.log(`⚠️  ${horariosSkippedNoCursoPlan} horarios saltados (sin cursoPlan)`);
    }
    if (horariosSkippedNoMatch > 0) {
      console.log(`⚠️  ${horariosSkippedNoMatch} horarios saltados (sin match en asignacionLectivaMap)`);
    }

    // 5. Seed disponibilidad docente (now aware of assigned horarios!)
    const disponibilidadRepo = queryRunner.manager.getRepository(
      DisponibilidadDocente,
    );
    const docenteRepo = queryRunner.manager.getRepository(Docente);
    await seedDisponibilidadesDocentes(
      disponibilidadRepo,
      docenteRepo,
      horarioRepo,
      turnoConfigRepo,
      estructura.periodoActivo,
    );

    // 6. Seed declaraciones demo
    const declaracionRepo = queryRunner.manager.getRepository(
      DeclaracionCargaHoraria,
    );
    const observacionRepo = queryRunner.manager.getRepository(
      DeclaracionObservacion,
    );
    const juradaRepo = queryRunner.manager.getRepository(DeclaracionJurada);
    await seedDeclaracionesDemo({
      declaracionRepo,
      observacionRepo,
      juradaRepo,
      docentes: estructura.docentes,
      periodoActivo: estructura.periodoActivo,
      departamento: estructura.departamento,
      facultad: estructura.facultad,
      directorDpto: estructura.directorDpto,
      decano: estructura.decano,
    });
    console.log("✅ Declaraciones demo completadas.");

    // 6b. Seed CLAD demo for Marcelino Torres
    const cladRepo = queryRunner.manager.getRepository(DeclaracionClad);
    const detalleCladRepo = queryRunner.manager.getRepository(DetalleClad);
    const cargaAdicionalRepo =
      queryRunner.manager.getRepository(CargaAdicional);
    await seedCladDemo(
      cladRepo,
      detalleCladRepo,
      cargaAdicionalRepo,
      declaracionRepo,
      estructura.docentes,
      estructura.periodoActivo,
    );
    console.log("✅ CLAD demo completado.");

    // 7. Seed Configuracion General
    const configRepo = queryRunner.manager.getRepository(ConfiguracionGeneral);
    const CONFIG = {
      logo_url:
        process.env.SEED_LOGO_URL ??
        "https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png",
      color_primario: process.env.SEED_COLOR_PRIMARIO ?? "#1a237e",
      color_secundario: process.env.SEED_COLOR_SECUNDARIO ?? "#283593",
      color_acento: process.env.SEED_COLOR_ACENTO ?? "#e91e63",
    };

    await configRepo.save(
      configRepo.create({
        nombre_institucional: "Universidad Nacional de Trujillo",
        logo_url: CONFIG.logo_url,
        color_primario: CONFIG.color_primario,
        color_secundario: CONFIG.color_secundario,
        color_acento: CONFIG.color_acento,
      }),
    );

    // 8. Seed Restricciones Institucionales por defecto (con upsert para evitar duplicados)
    const restriccionRepo = queryRunner.manager.getRepository(
      RestriccionInstitucional,
    );
    const periodoCodigo = estructura.periodoActivo.codigo;

    const restriccionesDefault = [
      {
        tipo_restriccion: "DURACION_BLOQUE",
        valor: { duracion_minutos: 60 },
        periodo_academico: periodoCodigo,
        activo: true,
      },
      {
        tipo_restriccion: "FRANJA_HORARIA",
        valor: { hora_inicio: "07:00", hora_fin: "22:00" },
        periodo_academico: periodoCodigo,
        activo: true,
      },
      {
        tipo_restriccion: "BLOQUE_ALMUERZO",
        valor: { hora_inicio: "13:00", hora_fin: "14:00" },
        periodo_academico: periodoCodigo,
        activo: true,
      },
      {
        tipo_restriccion: "MAX_HORAS_DIARIAS",
        valor: { max_horas: 8 },
        periodo_academico: periodoCodigo,
        activo: true,
      },
      {
        tipo_restriccion: "MAX_HORAS_SEMANALES",
        valor: { max_horas: 40 },
        periodo_academico: periodoCodigo,
        activo: true,
      },
    ];

    for (const restriccionData of restriccionesDefault) {
      const existente = await restriccionRepo.findOne({
        where: {
          tipo_restriccion: restriccionData.tipo_restriccion,
          periodo_academico: restriccionData.periodo_academico,
        },
      });

      if (existente) {
        await restriccionRepo.save({
          ...existente,
          valor: restriccionData.valor,
          activo: restriccionData.activo,
        });
      } else {
        await restriccionRepo.save(restriccionRepo.create(restriccionData));
      }
    }
    console.log(
      "✅ Restricciones institucionales por defecto creadas/actualizadas.",
    );

    // Commit transaction!
    await queryRunner.commitTransaction();
    console.log("🎉 ¡Transacción completada exitosamente!");

    console.log("✅ SEED completado exitosamente!");
  } catch (error: any) {
    console.error("❌ Error durante el SEED:", error);
    try { await queryRunner.rollbackTransaction(); } catch (_) {}
    throw error;
  } finally {
    await queryRunner.release();
    if (ownDataSource) {
      await ds.destroy();
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Error fatal en SEED:", error);
    process.exit(1);
  });
}
