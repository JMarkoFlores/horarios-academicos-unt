/**
 * Script standalone para asignar ambientes por defecto a los cursos.
 * Ejecutar con: npx ts-node -r tsconfig-paths/register src/database/run-asignar-ambientes.ts
 *
 * Este script NO borra datos existentes; solo completa los ambientes faltantes.
 */
import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { join } from "path";
import { asignarAmbientesPorDefecto } from "./asignar-ambientes-por-defecto.helper";

config({ path: join(__dirname, "../../.env") });

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST ?? "localhost",
  port: parseInt(process.env.DATABASE_PORT ?? "5433", 10),
  database: process.env.DATABASE_NAME ?? "horarios_unt",
  username: process.env.DATABASE_USER ?? "unt_user",
  password: process.env.DATABASE_PASSWORD ?? "unt_pass123",
  entities: [join(__dirname, "../entities/**/*.entity{.ts,.js}")],
  synchronize: false,
  logging: false,
});

async function main() {
  console.log("🚀 Conectando a la base de datos...");
  await AppDataSource.initialize();
  console.log("✅ Conexión establecida.");

  try {
    const resultado = await AppDataSource.transaction(async (manager) => {
      return asignarAmbientesPorDefecto(manager);
    });
    console.log(
      `✅ Completado: ${resultado.relacionesCreadas} relaciones creadas en ${resultado.cursosProcesados} cursos.`,
    );
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
