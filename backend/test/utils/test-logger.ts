import {
  ConflictDetail,
  WarningDetail,
  ValidationMetrics,
  ConflictType,
  WarningType,
} from "../validation/schedule-validator";

export interface TestLogEntry {
  timestamp: Date;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
  category: string;
  message: string;
  details?: any;
}

export class TestLogger {
  private logs: TestLogEntry[] = [];
  private category: string;

  constructor(category: string) {
    this.category = category;
  }

  info(message: string, details?: any): void {
    this.log("INFO", message, details);
  }

  warn(message: string, details?: any): void {
    this.log("WARN", message, details);
  }

  error(message: string, details?: any): void {
    this.log("ERROR", message, details);
  }

  success(message: string, details?: any): void {
    this.log("SUCCESS", message, details);
  }

  protected log(
    level: "INFO" | "WARN" | "ERROR" | "SUCCESS",
    message: string,
    details?: any,
  ): void {
    const entry: TestLogEntry = {
      timestamp: new Date(),
      level,
      category: this.category,
      message,
      details,
    };
    this.logs.push(entry);
  }

  getLogs(): TestLogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }

  generateReport(): string {
    if (this.logs.length === 0) {
      return "No logs recorded.";
    }

    let report = `📋 Test Log Report - ${this.category}\n`;
    report += "=".repeat(60) + "\n\n";

    const grouped = new Map<string, TestLogEntry[]>();
    this.logs.forEach((log) => {
      if (!grouped.has(log.level)) {
        grouped.set(log.level, []);
      }
      grouped.get(log.level)!.push(log);
    });

    const levelOrder = ["ERROR", "WARN", "INFO", "SUCCESS"];
    levelOrder.forEach((level) => {
      const logs = grouped.get(level);
      if (logs && logs.length > 0) {
        const icon =
          level === "ERROR"
            ? "❌"
            : level === "WARN"
              ? "⚠️"
              : level === "SUCCESS"
                ? "✅"
                : "ℹ️";
        report += `${icon} ${level} (${logs.length})\n`;
        logs.forEach((log) => {
          report += `  [${log.timestamp.toISOString()}] ${log.message}\n`;
          if (log.details) {
            report += `    Details: ${JSON.stringify(log.details, null, 2)}\n`;
          }
        });
        report += "\n";
      }
    });

    return report;
  }

  hasErrors(): boolean {
    return this.logs.some((log) => log.level === "ERROR");
  }

  hasWarnings(): boolean {
    return this.logs.some((log) => log.level === "WARN");
  }

  getErrorCount(): number {
    return this.logs.filter((log) => log.level === "ERROR").length;
  }

  getWarningCount(): number {
    return this.logs.filter((log) => log.level === "WARN").length;
  }
}

export class ConflictLogger extends TestLogger {
  constructor(category: string = "ConflictDetection") {
    super(category);
  }

  logConflict(conflict: ConflictDetail): void {
    const severityIcon =
      conflict.severity === "CRITICAL"
        ? "🔴"
        : conflict.severity === "HIGH"
          ? "🟠"
          : conflict.severity === "MEDIUM"
            ? "🟡"
            : "🟢";
    const level =
      conflict.severity === "CRITICAL" || conflict.severity === "HIGH"
        ? "ERROR"
        : "WARN";

    this.log(
      level,
      `${severityIcon} ${conflict.type}: ${conflict.description}`,
      {
        type: conflict.type,
        severity: conflict.severity,
        affectedEntities: conflict.affectedEntities,
        suggestion: conflict.suggestion,
      },
    );
  }

  logConflicts(conflicts: ConflictDetail[]): void {
    conflicts.forEach((conflict) => this.logConflict(conflict));
  }

  logWarning(warning: WarningDetail): void {
    this.warn(
      `⚠️ ${warning.type}: ${warning.description}`,
      warning.affectedEntities,
    );
  }

  logWarnings(warnings: WarningDetail[]): void {
    warnings.forEach((warning) => this.logWarning(warning));
  }

  logMetrics(metrics: ValidationMetrics): void {
    this.info("📊 Validation Metrics", metrics);
  }

  logValidationResult(
    valid: boolean,
    conflicts: ConflictDetail[],
    warnings: WarningDetail[],
  ): void {
    if (valid) {
      this.success("✅ Validation passed - No critical conflicts detected");
    } else {
      this.error(
        `❌ Validation failed - ${conflicts.filter((c) => c.severity === "CRITICAL").length} critical conflicts detected`,
      );
    }

    if (conflicts.length > 0) {
      this.info(`Total conflicts: ${conflicts.length}`);
    }

    if (warnings.length > 0) {
      this.info(`Total warnings: ${warnings.length}`);
    }
  }

  generateDetailedConflictReport(conflicts: ConflictDetail[]): string {
    if (conflicts.length === 0) {
      return "✅ No conflicts detected";
    }

    let report = "🔍 Detailed Conflict Report\n";
    report += "=".repeat(60) + "\n\n";

    const byType = new Map<ConflictType, ConflictDetail[]>();
    conflicts.forEach((c) => {
      if (!byType.has(c.type)) {
        byType.set(c.type, []);
      }
      byType.get(c.type)!.push(c);
    });

    byType.forEach((conflictsOfType, type) => {
      report += `### ${type} (${conflictsOfType.length})\n`;
      conflictsOfType.forEach((c) => {
        const severityIcon =
          c.severity === "CRITICAL"
            ? "🔴"
            : c.severity === "HIGH"
              ? "🟠"
              : c.severity === "MEDIUM"
                ? "🟡"
                : "🟢";
        report += `${severityIcon} [${c.severity}] ${c.description}\n`;

        if (c.affectedEntities.horarios) {
          report += `  Horarios afectados: ${c.affectedEntities.horarios.length}\n`;
        }
        if (c.affectedEntities.docentes) {
          report += `  Docentes afectados: ${c.affectedEntities.docentes.map((d) => `${d.nombres} ${d.apellidos}`).join(", ")}\n`;
        }
        if (c.affectedEntities.ambientes) {
          report += `  Ambientes afectados: ${c.affectedEntities.ambientes.map((a) => a.nombre).join(", ")}\n`;
        }
        if (c.affectedEntities.cursos) {
          report += `  Cursos afectados: ${c.affectedEntities.cursos.map((c) => c.nombre).join(", ")}\n`;
        }

        if (c.suggestion) {
          report += `  💡 Sugerencia: ${c.suggestion}\n`;
        }
        report += "\n";
      });
    });

    return report;
  }

  generateSummaryReport(
    conflicts: ConflictDetail[],
    warnings: WarningDetail[],
    metrics: ValidationMetrics,
  ): string {
    let report = "📋 Validation Summary Report\n";
    report += "=".repeat(60) + "\n\n";

    // Overall status
    const criticalConflicts = conflicts.filter(
      (c) => c.severity === "CRITICAL",
    ).length;
    const highConflicts = conflicts.filter((c) => c.severity === "HIGH").length;
    const mediumConflicts = conflicts.filter(
      (c) => c.severity === "MEDIUM",
    ).length;
    const lowConflicts = conflicts.filter((c) => c.severity === "LOW").length;

    if (criticalConflicts === 0 && highConflicts === 0) {
      report += "✅ Overall Status: PASSED\n";
    } else {
      report += "❌ Overall Status: FAILED\n";
    }

    report += "\n";

    // Conflict summary
    report += "🔴 CRITICAL Conflicts: " + criticalConflicts + "\n";
    report += "🟠 HIGH Conflicts: " + highConflicts + "\n";
    report += "🟡 MEDIUM Conflicts: " + mediumConflicts + "\n";
    report += "🟢 LOW Conflicts: " + lowConflicts + "\n";
    report += "⚠️  Warnings: " + warnings.length + "\n";
    report += "\n";

    // Metrics
    report += "📊 Metrics:\n";
    report += `  Total Horarios: ${metrics.totalHorarios}\n`;
    report += `  Total Docentes: ${metrics.totalDocentes}\n`;
    report += `  Total Ambientes: ${metrics.totalAmbientes}\n`;
    report += `  Total Cursos: ${metrics.totalCursos}\n`;
    report += `  Utilización Docentes: ${metrics.porcentajeUtilizacionDocentes.toFixed(2)}%\n`;
    report += `  Utilización Ambientes: ${metrics.porcentajeUtilizacionAmbientes.toFixed(2)}%\n`;
    report += "\n";

    // Conflict breakdown by type
    const byType = new Map<ConflictType, number>();
    conflicts.forEach((c) => {
      byType.set(c.type, (byType.get(c.type) || 0) + 1);
    });

    if (byType.size > 0) {
      report += "📋 Conflicts by Type:\n";
      byType.forEach((count, type) => {
        report += `  ${type}: ${count}\n`;
      });
      report += "\n";
    }

    // Warning breakdown by type
    const warningsByType = new Map<WarningType, number>();
    warnings.forEach((w) => {
      warningsByType.set(w.type, (warningsByType.get(w.type) || 0) + 1);
    });

    if (warningsByType.size > 0) {
      report += "⚠️  Warnings by Type:\n";
      warningsByType.forEach((count, type) => {
        report += `  ${type}: ${count}\n`;
      });
    }

    return report;
  }
}
