import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { join } from "path";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";

config({ path: join(__dirname, "..", "..", ".env") });

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

type CheckResult = { ok: boolean; message: string };

async function countOrphans(
  ds: DataSource,
  childTable: string,
  childCol: string,
  parentTable: string,
): Promise<number> {
  const rows = await ds.query(
    `SELECT COUNT(*)::int AS n FROM "${childTable}" c
     LEFT JOIN "${parentTable}" p ON p.id = c."${childCol}"
     WHERE p.id IS NULL`,
  );
  return rows[0]?.n ?? 0;
}

async function main() {
  console.log("🔍 Verificando integridad del seed...\n");
  await AppDataSource.initialize();

  const checks: CheckResult[] = [];

  const docentes = await AppDataSource.query(
    `SELECT COUNT(*)::int AS n FROM docente WHERE activo = true`,
  );
  const docentesConDni = await AppDataSource.query(
    `SELECT COUNT(*)::int AS n FROM docente WHERE dni IS NOT NULL AND LENGTH(dni::text) = 8`,
  );
  checks.push({
    ok: docentes[0].n >= 28,
    message: `Docentes activos: ${docentes[0].n} (mín. 28)`,
  });
  checks.push({
    ok: docentesConDni[0].n >= 28,
    message: `Docentes con DNI (8 dígitos): ${docentesConDni[0].n} (mín. 28)`,
  });

  const cursosPlan = await AppDataSource.query(
    `SELECT COUNT(*)::int AS n FROM curso_plan_estudios cp
     INNER JOIN plan_estudios p ON p.id = cp.plan_estudios_id
     WHERE p.codigo = '2018' AND cp.ciclo IN (1,3,5,7,9)`,
  );
  checks.push({
    ok: cursosPlan[0].n >= 30,
    message: `Cursos plan 2018 (ciclos I,III,V,VII,IX): ${cursosPlan[0].n} (mín. 30)`,
  });

  const asignaciones = await AppDataSource.query(
    `SELECT COUNT(*)::int AS n FROM asignacion_lectiva`,
  );
  checks.push({
    ok: asignaciones[0].n >= 20,
    message: `Asignaciones lectivas: ${asignaciones[0].n} (mín. 20)`,
  });

  const estadosRequeridos = [
    EstadoDeclaracionCarga.BORRADOR,
    EstadoDeclaracionCarga.ENVIADO_DOCENTE,
    EstadoDeclaracionCarga.OBSERVADO_DPTO,
    EstadoDeclaracionCarga.SUBSANADO,
    EstadoDeclaracionCarga.VALIDADO_DPTO,
    EstadoDeclaracionCarga.APROBADO_FACULTAD,
    EstadoDeclaracionCarga.CERRADO,
  ];

  const estadosDistintos = await AppDataSource.query(
    `SELECT COUNT(DISTINCT estado)::int AS n FROM declaracion_carga_horaria`,
  );
  checks.push({
    ok: estadosDistintos[0].n >= 5,
    message: `Estados distintos en declaraciones: ${estadosDistintos[0].n} (mín. 5)`,
  });

  for (const estado of estadosRequeridos) {
    const row = await AppDataSource.query(
      `SELECT COUNT(*)::int AS n FROM declaracion_carga_horaria WHERE estado = $1`,
      [estado],
    );
    const minimo =
      estado === EstadoDeclaracionCarga.BORRADOR
        ? 5
        : estado === EstadoDeclaracionCarga.ENVIADO_DOCENTE
          ? 5
          : estado === EstadoDeclaracionCarga.OBSERVADO_DPTO
            ? 3
            : estado === EstadoDeclaracionCarga.SUBSANADO
              ? 2
              : estado === EstadoDeclaracionCarga.VALIDADO_DPTO
                ? 3
                : 2;
    checks.push({
      ok: row[0].n >= minimo,
      message: `Declaraciones ${estado}: ${row[0].n} (mín. ${minimo})`,
    });
  }

  const observaciones = await AppDataSource.query(
    `SELECT COUNT(*)::int AS n FROM declaracion_observacion`,
  );
  checks.push({
    ok: observaciones[0].n >= 3,
    message: `Observaciones: ${observaciones[0].n} (mín. 3)`,
  });

  const juradas = await AppDataSource.query(
    `SELECT COUNT(*)::int AS n FROM declaracion_jurada`,
  );
  checks.push({
    ok: juradas[0].n >= 3,
    message: `Declaraciones juradas: ${juradas[0].n} (mín. 3)`,
  });

  const horarios = await AppDataSource.query(
    `SELECT COUNT(*)::int AS n FROM horario_asignado`,
  );
  checks.push({
    ok: horarios[0].n > 0,
    message: `Horarios asignados: ${horarios[0].n}`,
  });

  const config = await AppDataSource.query(
    `SELECT COUNT(*)::int AS n FROM configuracion_general`,
  );
  checks.push({
    ok: config[0].n >= 1,
    message: `Configuración general: ${config[0].n}`,
  });

  const orphans: CheckResult[] = [];
  const orphanChecks = [
    ["declaracion_carga_horaria", "docente_id", "docente"],
    ["declaracion_carga_horaria", "departamento_id", "departamento"],
    ["asignacion_lectiva", "docente_id", "docente"],
    ["declaracion_observacion", "declaracion_id", "declaracion_carga_horaria"],
    ["declaracion_jurada", "declaracion_id", "declaracion_carga_horaria"],
  ] as const;

  for (const [child, col, parent] of orphanChecks) {
    const n = await countOrphans(AppDataSource, child, col, parent);
    orphans.push({
      ok: n === 0,
      message: `Huérfanos ${child}.${col} → ${parent}: ${n}`,
    });
  }

  let fallos = 0;
  console.log("── Conteos y requisitos ──");
  for (const c of checks) {
    console.log(`${c.ok ? "✅" : "❌"} ${c.message}`);
    if (!c.ok) fallos++;
  }

  console.log("\n── Integridad referencial ──");
  for (const c of orphans) {
    console.log(`${c.ok ? "✅" : "❌"} ${c.message}`);
    if (!c.ok) fallos++;
  }

  await AppDataSource.destroy();

  if (fallos > 0) {
    console.log(`\n❌ Verificación fallida: ${fallos} chequeo(s) no cumplido(s).`);
    process.exit(1);
  }

  console.log("\n✅ Seed verificado correctamente.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
