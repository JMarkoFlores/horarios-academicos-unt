import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  RestriccionesValidacionService,
  ContextoValidacion,
} from "./restricciones-validacion.service";
import { RegistroValidacionService } from "./registro-validacion.service";
import { SugestionesContextualesService } from "./sugerencias-contextuales.service";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";

export interface RespuestaValidacionCompleta {
  exito: boolean;
  motivo?: string;
  validaciones_duras: {
    valido: boolean;
    reglas_pasadas: number;
    reglas_fallidas: Array<{ codigo: string; motivo: string }>;
  };
  validaciones_blandas: {
    advertencias: Array<{ codigo: string; mensaje: string }>;
    sugerencias: Array<{ codigo: string; sugerencia: string }>;
  };
  alternativas?: Array<{
    tipo: "ambiente" | "bloque";
    id: number;
    descripcion: string;
    preferencia: string;
  }>;
}

@Injectable()
export class ValidadorIntegradoService {
  constructor(
    @InjectRepository(HorarioAsignado)
    private horarioRepo: Repository<HorarioAsignado>,
    private restriccionesService: RestriccionesValidacionService,
    private registroService: RegistroValidacionService,
    private sugestionesService: SugestionesContextualesService,
  ) {}

  async validarConSugerencias(
    contexto: ContextoValidacion,
    periodoId: number,
  ): Promise<RespuestaValidacionCompleta> {
    // 1. Ejecutar reglas duras (CRÍTICAS)
    const validacionDura =
      await this.restriccionesService.validarReglaDura(contexto);

    if (!validacionDura.valido) {
      // Registrar el rechazo
      for (const regla of validacionDura.reglas_fallidas) {
        await this.registroService.registrarValidacionAtentada(
          contexto.sesionId,
          contexto.docenteId,
          contexto.cursoId,
          contexto.grupoId,
          regla.codigo,
          "FALLO",
          regla.motivo,
          contexto,
        );
      }

      // Obtener sugerencias para resolver el conflicto
      const alternativas = await this.obtenerAlternativas(contexto, periodoId);

      return {
        exito: false,
        motivo: `Validación fallida: ${validacionDura.reglas_fallidas[0]?.motivo || "Error desconocido"}`,
        validaciones_duras: {
          valido: false,
          reglas_pasadas: validacionDura.reglas_pasadas.length,
          reglas_fallidas: validacionDura.reglas_fallidas.map((r) => ({
            codigo: r.codigo,
            motivo: r.motivo,
          })),
        },
        validaciones_blandas: {
          advertencias: [],
          sugerencias: [],
        },
        alternativas,
      };
    }

    // 2. Ejecutar reglas blandas (ADVERTENCIAS)
    const validacionBlanda =
      await this.restriccionesService.validarReglasBlancas(contexto);

    // 3. Registrar validación exitosa
    for (const regla of validacionDura.reglas_pasadas) {
      await this.registroService.registrarValidacionAtentada(
        contexto.sesionId,
        contexto.docenteId,
        contexto.cursoId,
        contexto.grupoId,
        regla.codigo,
        "EXITO",
        "Regla pasada",
        contexto,
      );
    }

    for (const adv of validacionBlanda.advertencias) {
      await this.registroService.registrarValidacionAtentada(
        contexto.sesionId,
        contexto.docenteId,
        contexto.cursoId,
        contexto.grupoId,
        adv.codigo,
        "ADVERTENCIA",
        adv.advertencia,
        contexto,
      );
    }

    return {
      exito: true,
      validaciones_duras: {
        valido: true,
        reglas_pasadas: validacionDura.reglas_pasadas.length,
        reglas_fallidas: [],
      },
      validaciones_blandas: {
        advertencias: validacionBlanda.advertencias.map((a) => ({
          codigo: a.codigo,
          mensaje: a.advertencia,
        })),
        sugerencias: validacionBlanda.sugerencias,
      },
    };
  }

  private async obtenerAlternativas(
    contexto: ContextoValidacion,
    periodoId: number,
  ): Promise<
    Array<{
      tipo: "ambiente" | "bloque";
      id: number;
      descripcion: string;
      preferencia: string;
    }>
  > {
    const alternativas: Array<{
      tipo: "ambiente" | "bloque";
      id: number;
      descripcion: string;
      preferencia: string;
    }> = [];

    try {
      // Sugerir ambientes alternativos
      const ambientes = await this.sugestionesService.sugerirAmbientesAlternos(
        contexto.cursoId,
        contexto.tipoClase,
        contexto.dia,
        contexto.horaInicio,
        contexto.horaFin,
        contexto.periodo,
      );

      for (const amb of ambientes.slice(0, 3)) {
        if (amb.disponible) {
          alternativas.push({
            tipo: "ambiente",
            id: amb.ambiente_id,
            descripcion: `${amb.ambiente_nombre} (${amb.tipo})`,
            preferencia: "DISPONIBLE_AHORA",
          });
        }
      }

      // Sugerir bloques alternativos en la semana
      const bloques = await this.sugestionesService.sugerirBloquesAlternos(
        contexto.docenteId,
        contexto.cursoId,
        contexto.tipoClase,
        contexto.periodo,
        periodoId,
      );

      for (const bloque of bloques.slice(0, 3)) {
        alternativas.push({
          tipo: "bloque",
          id: bloque.dia,
          descripcion: `${bloque.dia_nombre} ${bloque.hora_inicio}-${bloque.hora_fin} en ${bloque.ambiente_nombre}`,
          preferencia: bloque.preferencia,
        });
      }
    } catch (error) {
      // Si fallan las sugerencias, continuar sin ellas
      console.error("Error al obtener alternativas:", error);
    }

    return alternativas;
  }

  async obtenerHistorialValidacionesDocente(
    docenteId: number,
    periodo: string,
  ): Promise<{
    total_validaciones: number;
    exitosas: number;
    fallidas: number;
    tasa_exito: number;
  }> {
    return this.registroService.obtenerEstadisticasDocente(docenteId, periodo);
  }

  async obtenerHistorialSesion(sesionId: string): Promise<any[]> {
    return this.registroService.obtenerHistorialSesion(sesionId);
  }

  async persistirValidacionesAuditoría(
    sesionId: string,
    horarioId: number,
    usuarioId: number,
    operadorNombre: string,
  ): Promise<void> {
    return this.registroService.persistirHistorialSesion(
      sesionId,
      horarioId,
      usuarioId,
      operadorNombre,
    );
  }
}
