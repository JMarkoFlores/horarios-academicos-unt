export const testDbConfig = {
  type: "postgres" as const,
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USER || "unt_user",
  password: process.env.DATABASE_PASSWORD || "unt_pass",
  database: "horarios_unt_test", // Usar BD de test separada
  entities: ["../src/**/*.entity.ts"],
  synchronize: true,
  dropSchema: false, // Cambiar a false para evitar problemas de permisos
  logging: false,
  schema: "public",
};
