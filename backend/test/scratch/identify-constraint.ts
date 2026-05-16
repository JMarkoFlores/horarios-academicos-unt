import { DataSource } from "typeorm";
import { testDbConfig } from "../integration/test-config";

async function main() {
  const ds = new DataSource({
    ...testDbConfig,
    entities: [],
  });
  await ds.initialize();
  const result = await ds.query(`
        SELECT conname, relname 
        FROM pg_constraint c 
        JOIN pg_class r ON r.oid = c.conrelid 
        WHERE conname = 'UQ_c72842a10072eddcdb6c57d6fc4'
    `);
  console.log(result);
  await ds.destroy();
}
main();
