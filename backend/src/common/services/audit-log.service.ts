import { Injectable, Logger } from "@nestjs/common";
import { mkdir, appendFile } from "fs/promises";
import { dirname, resolve } from "path";

interface AuditLogEntry {
  usuario: string;
  accion: string;
  entidad: string;
  entidadId: string | number;
  timestamp: string;
  ip: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly auditLogPath = resolve(process.cwd(), "logs", "audit.log");

  async log(entry: Omit<AuditLogEntry, "timestamp">): Promise<void> {
    const payload: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    try {
      await mkdir(dirname(this.auditLogPath), { recursive: true });
      await appendFile(
        this.auditLogPath,
        `${JSON.stringify(payload)}\n`,
        "utf8",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`No se pudo registrar log de auditoria: ${message}`);
    }
  }
}
