import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditoriaHorario } from "../../entities/auditoria-horario.entity";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";

export interface RegistroValidacion {
  id?: number;
  horario_id?: number;
  ventana_atencion_id?: string;
  sesion_id: string;
  docente_id: number;
  curso_id: number;
  grupo_id: number;
  accion:
    | "VALIDACION_ATENTADA"
    | "VALIDACION_EXITOSA"
    | "ASIGNACION_CONFIRMADA";
  regla_codigo: string;
  resultado: "EXITO" | "FALLO" | "ADVERTENCIA";
  motivo?: string;
  datos_validacion?: any; // JSON con contexto
  usuario_id?: number;
  operador_nombre?: string;
  timestamp: Date;
}

@Injectable()
export class RegistroValidacionService {
  private registrosEnMemoria: Map<string, RegistroValidacion[]> = new Map();

  constructor(
    @InjectRepository(AuditoriaHorario)
    private auditoriaRepo: Repository<AuditoriaHorario>,
    @InjectRepository(HorarioAsignado)
    private horarioRepo: Repository<HorarioAsignado>,
  ) {}

  async registrarValidacionAtentada(
    sesionId: string,
    docenteId: number,
    cursoId: number,
    grupoId: number,
    reglaCodigo: string,
    resultado: "EXITO" | "FALLO" | "ADVERTENCIA",
    motivo?: string,
    datosValidacion?: any,
  ): Promise<RegistroValidacion> {
    const registro: RegistroValidacion = {
      sesion_id: sesionId,
      docente_id: docenteId,
      curso_id: cursoId,
      grupo_id: grupoId,
      accion: "VALIDACION_ATENTADA",
      regla_codigo: reglaCodigo,
      resultado,
      motivo,
      datos_validacion: datosValidacion,
      timestamp: new Date(),
    };

    // Guardar en memoria (será persistido al confirmar)
    if (!this.registrosEnMemoria.has(sesionId)) {
      this.registrosEnMemoria.set(sesionId, []);
    }
    this.registrosEnMemoria.get(sesionId).push(registro);

    return registro;
  }

  async obtenerHistorialSesion(
    sesionId: string,
  ): Promise<RegistroValidacion[]> {
    return this.registrosEnMemoria.get(sesionId) || [];
  }

  async persistirHistorialSesion(
    sesionId: string,
    horarioId: number,
    usuarioId: number,
    operadorNombre: string,
  ): Promise<void> {
    const registros = this.registrosEnMemoria.get(sesionId) || [];

    for (const registro of registros) {
      // Crear entry en auditoría con detalles de validación
      await this.auditoriaRepo.save({
        horario_id: horarioId,
        accion: registro.accion,
        datos_anteriores: null,
        datos_nuevos: {
          regla: registro.regla_codigo,
          resultado: registro.resultado,
          motivo: registro.motivo,
        },
        usuario_id: usuarioId,
        ip: "N/A",
        motivo: `Validación: ${registro.resultado} - ${registro.motivo || "N/A"}`,
        creado_en: registro.timestamp,
      });
    }

    // Limpiar después de persistir
    this.registrosEnMemoria.delete(sesionId);
  }

  async obtenerHistorialDocente(
    docenteId: number,
    periodo: string,
    limit = 100,
  ): Promise<RegistroValidacion[]> {
    const registros: RegistroValidacion[] = [];

    // Buscar en auditoría todas las validaciones de este docente
    const auditorias = await this.auditoriaRepo.find({
      where: {
        // Filtrar por docente - requeriría campo en auditoria
      },
      take: limit,
      order: { creado_en: "DESC" },
    });

    return registros;
  }

  async obtenerEstadisticasDocente(
    docenteId: number,
    periodo: string,
  ): Promise<{
    total_validaciones: number;
    exitosas: number;
    fallidas: number;
    advertencias: number;
    tasa_exito: number;
  }> {
    const registros = await this.obtenerHistorialDocente(
      docenteId,
      periodo,
      1000,
    );

    const exitosas = registros.filter((r) => r.resultado === "EXITO").length;
    const fallidas = registros.filter((r) => r.resultado === "FALLO").length;
    const advertencias = registros.filter(
      (r) => r.resultado === "ADVERTENCIA",
    ).length;
    const total = registros.length;

    return {
      total_validaciones: total,
      exitosas,
      fallidas,
      advertencias,
      tasa_exito: total > 0 ? (exitosas / total) * 100 : 0,
    };
  }

  async exportarAuditoriaVentana(
    ventanaId: string,
    formato: "JSON" | "CSV",
  ): Promise<string> {
    // Buscar todos los registros de auditoría de esta ventana
    const auditorias = await this.auditoriaRepo.find({
      where: {
        // Filtrar por ventana_id - requeriría campo en auditoria
      },
      order: { creado_en: "ASC" },
    });

    if (formato === "JSON") {
      return JSON.stringify(auditorias, null, 2);
    }

    // CSV
    const headers = [
      "Timestamp",
      "Usuario",
      "Acción",
      "Motivo",
      "Datos Nuevos",
    ];
    const rows = auditorias.map((a) => [
      a.creado_en.toISOString(),
      a.usuario_id || "N/A",
      a.accion,
      a.motivo,
      JSON.stringify(a.datos_nuevos),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    return csv;
  }

  limpiarRegistrosExpirados(tiempoExpiracionMs = 3600000): void {
    // Limpiar registros en memoria más antiguos que el tiempo especificado
    const ahora = Date.now();

    for (const [sesionId, registros] of this.registrosEnMemoria.entries()) {
      const vigentes = registros.filter(
        (r) => ahora - r.timestamp.getTime() < tiempoExpiracionMs,
      );

      if (vigentes.length === 0) {
        this.registrosEnMemoria.delete(sesionId);
      } else {
        this.registrosEnMemoria.set(sesionId, vigentes);
      }
    }
  }
}
