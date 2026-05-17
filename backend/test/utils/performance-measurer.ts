export interface PerformanceMetrics {
  operationName: string;
  durationMs: number;
  durationSeconds: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  operationName: string;
  totalDurationMs: number;
  averageDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  executionCount: number;
  executions: PerformanceMetrics[];
}

export class PerformanceMeasurer {
  private measurements: Map<string, PerformanceMetrics[]> = new Map();

  /**
   * Measure the execution time of an async operation
   */
  async measure<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    const timestamp = new Date();

    try {
      const result = await operation();
      const endTime = performance.now();
      const durationMs = endTime - startTime;

      const metrics: PerformanceMetrics = {
        operationName,
        durationMs,
        durationSeconds: durationMs / 1000,
        timestamp,
        metadata,
      };

      this.addMeasurement(operationName, metrics);

      return { result, metrics };
    } catch (error) {
      const endTime = performance.now();
      const durationMs = endTime - startTime;

      const metrics: PerformanceMetrics = {
        operationName,
        durationMs,
        durationSeconds: durationMs / 1000,
        timestamp,
        metadata: { ...metadata, error: true },
      };

      this.addMeasurement(operationName, metrics);
      throw error;
    }
  }

  /**
   * Add a measurement manually
   */
  addMeasurement(operationName: string, metrics: PerformanceMetrics): void {
    if (!this.measurements.has(operationName)) {
      this.measurements.set(operationName, []);
    }
    this.measurements.get(operationName)!.push(metrics);
  }

  /**
   * Get performance report for a specific operation
   */
  getReport(operationName: string): PerformanceReport | null {
    const measurements = this.measurements.get(operationName);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const durations = measurements.map((m) => m.durationMs);
    const totalDurationMs = durations.reduce((sum, d) => sum + d, 0);
    const averageDurationMs = totalDurationMs / durations.length;
    const minDurationMs = Math.min(...durations);
    const maxDurationMs = Math.max(...durations);

    return {
      operationName,
      totalDurationMs,
      averageDurationMs,
      minDurationMs,
      maxDurationMs,
      executionCount: measurements.length,
      executions: measurements,
    };
  }

  /**
   * Get all performance reports
   */
  getAllReports(): PerformanceReport[] {
    const reports: PerformanceReport[] = [];
    for (const [operationName] of this.measurements) {
      const report = this.getReport(operationName);
      if (report) {
        reports.push(report);
      }
    }
    return reports.sort((a, b) => b.totalDurationMs - a.totalDurationMs);
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
  }

  /**
   * Clear measurements for a specific operation
   */
  clearOperation(operationName: string): void {
    this.measurements.delete(operationName);
  }

  /**
   * Generate a human-readable performance report
   */
  generateReport(): string {
    const reports = this.getAllReports();
    if (reports.length === 0) {
      return "No performance measurements recorded.";
    }

    let report = "📊 Performance Report\n";
    report += "=".repeat(50) + "\n\n";

    reports.forEach((r) => {
      report += `### ${r.operationName}\n`;
      report += `- Executions: ${r.executionCount}\n`;
      report += `- Total Duration: ${r.totalDurationMs.toFixed(2)}ms (${(r.totalDurationMs / 1000).toFixed(2)}s)\n`;
      report += `- Average Duration: ${r.averageDurationMs.toFixed(2)}ms\n`;
      report += `- Min Duration: ${r.minDurationMs.toFixed(2)}ms\n`;
      report += `- Max Duration: ${r.maxDurationMs.toFixed(2)}ms\n`;
      report += "\n";
    });

    return report;
  }

  /**
   * Check if performance is within acceptable thresholds
   */
  checkThresholds(
    operationName: string,
    maxDurationMs?: number,
    maxAverageDurationMs?: number,
  ): { passed: boolean; message: string } {
    const report = this.getReport(operationName);
    if (!report) {
      return { passed: true, message: "No measurements recorded" };
    }

    const issues: string[] = [];

    if (maxDurationMs && report.maxDurationMs > maxDurationMs) {
      issues.push(
        `Max duration ${report.maxDurationMs.toFixed(2)}ms exceeds threshold ${maxDurationMs}ms`,
      );
    }

    if (
      maxAverageDurationMs &&
      report.averageDurationMs > maxAverageDurationMs
    ) {
      issues.push(
        `Average duration ${report.averageDurationMs.toFixed(2)}ms exceeds threshold ${maxAverageDurationMs}ms`,
      );
    }

    if (issues.length === 0) {
      return { passed: true, message: "All thresholds passed" };
    }

    return { passed: false, message: issues.join("; ") };
  }

  /**
   * Export measurements to JSON
   */
  exportToJson(): string {
    const reports = this.getAllReports();
    return JSON.stringify(reports, null, 2);
  }

  /**
   * Create a performance benchmark for multiple iterations
   */
  async benchmark<T>(
    operationName: string,
    operation: () => Promise<T>,
    iterations: number = 10,
    warmupIterations: number = 2,
  ): Promise<PerformanceReport> {
    // Warmup iterations
    for (let i = 0; i < warmupIterations; i++) {
      await operation();
    }

    // Clear warmup measurements
    this.clearOperation(operationName);

    // Benchmark iterations
    for (let i = 0; i < iterations; i++) {
      await this.measure(operationName, operation, { iteration: i + 1 });
    }

    const report = this.getReport(operationName);
    if (!report) {
      throw new Error("Benchmark failed to record measurements");
    }

    return report;
  }
}
