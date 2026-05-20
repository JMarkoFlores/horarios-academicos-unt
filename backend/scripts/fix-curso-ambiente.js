const { Client } = require("pg");
const { config } = require("dotenv");
const { resolve } = require("path");

config({ path: resolve(__dirname, "../.env") });

const client = new Client({
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  database: process.env.DATABASE_NAME || "horarios_unt",
  user: process.env.DATABASE_USER || "unt_user",
  password: process.env.DATABASE_PASSWORD || "unt_pass123",
});

async function main() {
  await client.connect();
  await client.query("DROP TABLE IF EXISTS curso_ambiente CASCADE");
  console.log("✅ Tabla 'curso_ambiente' eliminada. Reinicia el backend para que TypeORM la recree.");
  await client.end();
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
