import { DataSource } from "typeorm";
import { AnalyticsService } from "../../src/analytics/analytics.service";
import { HorarioAsignado } from "../../src/entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../../src/entities/conflicto-asignacion.entity";
import { Docente } from "../../src/entities/docente.entity";
import { Ambiente } from "../../src/entities/ambiente.entity";
import { Curso } from "../../src/entities/curso.entity";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432"),
    username: process.env.DATABASE_USER || "unt_user",
    password: process.env.DATABASE_PASSWORD || "unt_pass",
    database: process.env.DATABASE_NAME || "horarios_unt",
    entities: [HorarioAsignado, ConflictoAsignacion, Docente, Ambiente, Curso],
  });

  await dataSource.initialize();

  const service = new AnalyticsService(
    dataSource,
    dataSource.getRepository(HorarioAsignado),
    dataSource.getRepository(ConflictoAsignacion),
    dataSource.getRepository(Docente),
    dataSource.getRepository(Ambiente),
    dataSource.getRepository(Curso),
  );

  const kpis = await service.getKPIMetrics("2026-I");
  console.log("KPIs:", kpis);

  const suggestions = await service.getSmartSuggestions("2026-I");
  console.log("Suggestions:", suggestions);

  await dataSource.destroy();
}

main().catch((err) => console.error(err));
