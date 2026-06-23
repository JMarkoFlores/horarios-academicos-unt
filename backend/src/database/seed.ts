
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

// Import our modular seed functions
import { seedTurnosPorDefecto, generarSlotsDesdeTurno } from "./seed-turnos";
import { seedDisponibilidadesDocentes } from "./seed-disponibilidades";
import { seedEstructura, normalize, diaANumero, parsearRangoHoras, mapAmbienteCode } from "./seed-estructura";
import { seedPlanEstudios } from "./seed-plan-estudios";
import { seedHorariosCicloI } from "./seed-horarios-ciclo-I";
import { seedHorariosCicloIII } from "./seed-horarios-ciclo-III";
import { seedHorariosCicloV } from "./seed-horarios-ciclo-V";
import { seedHorariosCicloVII } from "./seed-horarios-ciclo-VII";
import { seedHorariosCicloIX } from "./seed-horarios-ciclo-IX";
import { seedDeclaracionesDemo, DNIS_DOCENTES } from "./seed-declaraciones-demo";

// Enums
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";

// Load environment variables
config({ path: join(__dirname, "../../.env") });

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST ?? "localhost",
  port: parseInt(process.env.DATABASE_PORT ?? "5432", 10),
  database: process.env.DATABASE_NAME ?? "horarios_unt",
  username: process.env.DATABASE_USER ?? "unt_user",
  password: process.env.DATABASE_PASSWORD ?? "unt_pass123",
  entities: [join(__dirname, "../entities/**/*.entity{.ts,.js}")],
  synchronize: false,
  logging: false,
});

export async function main() {
  console.log("🚀 Iniciando SEED UNIFICADO del Sistema de Horarios...");

  await AppDataSource.initialize();
  console.log("✅ Conexión establecida.");

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Truncation outside transaction (DDL operation)
    console.log("🧹 Limpiando base de datos...");
    const tables = [
      "declaracion_observacion", "declaracion_jurada", "carga_adicional",
      "asignacion_lectiva", "notificacion_docente", "cola_docentes",
      "ventana_atencion", "campaña_ventanas", "curso_plan_estudios",
      "plan_estudios", "turno_config", "disponibilidad_docente",
      "declaracion_carga_horaria", "horario_asignado", "docente_curso",
      "grupo", "curso", "docente", "usuario", "departamento", "escuela",
      "facultad", "periodo_academico", "dia_activo", "turno_horario",
      "ambiente", "configuracion_general"
    ];
    for (const table of tables) {
      try {
        await queryRunner.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
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

    // 3. Seed course plan (Plan de Estudios 2018)
    const planRepo = queryRunner.manager.getRepository(PlanEstudios);
    const cursoPlanRepo = queryRunner.manager.getRepository(CursoPlanEstudios);
    const cursoRepo = queryRunner.manager.getRepository(Curso);
    const grupoRepo = queryRunner.manager.getRepository(Grupo);
    const { plan2018, cursos, grupos } = await seedPlanEstudios(
      planRepo,
      cursoRepo,
      cursoPlanRepo,
      grupoRepo,
      estructura.escuela,
      estructura.periodoActivo
    );

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

    // 5. Seed disponibilidad docente (now aware of assigned horarios!)
    const disponibilidadRepo = queryRunner.manager.getRepository(DisponibilidadDocente);
    const docenteRepo = queryRunner.manager.getRepository(Docente);
    const horarioRepo = queryRunner.manager.getRepository(HorarioAsignado);
    await seedDisponibilidadesDocentes(
      disponibilidadRepo, docenteRepo, horarioRepo, turnoConfigRepo, estructura.periodoActivo
    );

    // 6. Seed declaraciones demo
    const declaracionRepo = queryRunner.manager.getRepository(DeclaracionCargaHoraria);
    const observacionRepo = queryRunner.manager.getRepository(DeclaracionObservacion);
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
      })
    );

    // Commit transaction!
    await queryRunner.commitTransaction();
    console.log("🎉 ¡Transacción completada exitosamente!");

    console.log("✅ SEED completado exitosamente!");
  } catch (error: any) {
    console.error("❌ Error durante el SEED:", error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Error fatal en SEED:", error);
    process.exit(1);
  });
}

