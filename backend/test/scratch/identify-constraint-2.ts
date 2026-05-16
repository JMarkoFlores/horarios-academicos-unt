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
        WHERE conname = 'UQ_8a12759d0325d14835de084f7cb'
    `);
  console.log(result);
  await ds.destroy();
}
main();
