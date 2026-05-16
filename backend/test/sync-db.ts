import { DataSource } from "typeorm";
import { testDbConfig } from "./integration/test-config";

async function sync() {
  console.log("Sincronizando base de datos de prueba...");
  const dataSource = new DataSource({
    ...testDbConfig,
    synchronize: true,
  });

  try {
    await dataSource.initialize();
    console.log("Esquema sincronizado exitosamente.");
    await dataSource.destroy();
  } catch (error) {
    console.error("Error sincronizando el esquema:", error);
    process.exit(1);
  }
}

sync();
