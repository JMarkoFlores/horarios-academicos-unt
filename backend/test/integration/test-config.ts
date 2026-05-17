export const testDbConfig = {
  type: "postgres" as const,
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USER || "unt_user",
  password: process.env.DATABASE_PASSWORD || "unt_pass123", // Coincidir con unt_pass123 del CI
  database: process.env.DATABASE_NAME || "horarios_unt",
  entities: [__dirname + "/../../src/**/*.entity{.ts,.js}"],
  synchronize: process.env.GITHUB_ACTIONS !== 'true',
  dropSchema: false,
  logging: false,
  schema: "public",
};

if (process.env.GITHUB_ACTIONS === 'true') {
  console.log(`CI Connection: ${testDbConfig.host}:${testDbConfig.port} as ${testDbConfig.username}`);
  console.log(`Entities path: ${testDbConfig.entities}`);
}
