export const testDbConfig = {
  type: "postgres" as const,
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USER || "unt_user",
  password: process.env.DATABASE_PASSWORD || "unt_pass",
  database: process.env.DATABASE_NAME || "horarios_unt_test", // Usar BD de test o env override
  entities: ["../src/**/*.entity.ts"],
  synchronize: true,
  dropSchema: true, // Forzar limpieza en cada arranque de test
  logging: false,
  schema: "public",
};
