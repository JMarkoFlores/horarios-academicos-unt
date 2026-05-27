import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import Redis from "ioredis";
import { DataSource, Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { EstadoHorario } from "../../common/enums/estado-horario.enum";
import { Grupo } from "../../entities/grupo.entity";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { SeleccionTemporal } from "../../entities/seleccion-temporal.entity";
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { ValidadorHorarioService } from "../../horarios/validador-horario.service";
import { SeleccionarCeldaDto } from "./dto/seleccionar-celda.dto";
import { VentanaAtencion } from "../../entities/ventana-atencion.entity";
import { ValidacionesService } from "../../common/services/validaciones.service";
import { AuditoriaService } from "../../modules/auditoria/auditoria.service";
import { Ambiente } from "../../entities/ambiente.entity";
import { ParametrosCarga } from "../../entities/parametros-carga.entity";
import { Docente } from "../../entities/docente.entity";
import { Curso } from "../../entities/curso.entity";
import { SincronizacionRedisService } from "./sincronizacion-redis.service";

type SeleccionTemporalRedis = {
  ventanaId: string;
  sesionId: string;
  docenteId: number;
  cursoId: number;
  grupoId?: number;
  tipoClase: string;
  ambienteId: number;
  dia: number;
  horaInicio: string;
  horaFin: string;
  periodo: string;
};

@Injectable()
export class GestorSeleccionTemporalService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(GestorSeleccionTemporalService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(ParametrosCarga)
    private readonly parametrosCargaRepo: Repository<ParametrosCarga>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(HorarioAsignado)
    private readonly horarioAsignadoRepo: Repository<HorarioAsignado>,
    private readonly validadorHorarioService: ValidadorHorarioService,
    private readonly validacionesService: ValidacionesService,
    private readonly auditoriaService: AuditoriaService,
    private readonly sincronizacionRedisService: SincronizacionRedisService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>("REDIS_HOST", "localhost"),
      port: this.configService.get<number>("REDIS_PORT", 6379),
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private esPeriodoImpar(periodoCodigo: string): boolean {
    const parts = periodoCodigo.split("-");
    if (parts.length === 2 && parts[1] === "I") {
      return true;
    }
    return false;
  }

  async seleccionarCelda(datos: SeleccionarCeldaDto): Promise<{
    exito: boolean;
    motivo?: string;
    expira_en?: string;
    alternativas?: Array<{ id: number; codigo: string; nombre: string }>;
  }> {
    this.logger.debug(
      `[seleccionarCelda] Recibido: grupoId=${datos.grupoId}, cursoId=${datos.cursoId}, tipoClase=${datos.tipoClase}`,
    );

    const clave = this.crearClaveSeleccion(
      datos.ambienteId,
      datos.dia,
      datos.horaInicio,
      datos.periodo,
    );
    const actual = await this.redis.get(clave);

    // Obtener todas las selecciones actuales en esta celda
    let seleccionesActuales: SeleccionTemporalRedis[] = [];
    if (actual) {
      try {
        const parsed = JSON.parse(actual);
        if (Array.isArray(parsed)) {
          seleccionesActuales = parsed;
        } else {
          seleccionesActuales = [parsed];
        }
      } catch {
        seleccionesActuales = [];
      }
    }

    // Verificar si ya hay 3 selecciones (límite)
    if (seleccionesActuales.length >= 3) {
      return { exito: false, motivo: "Máximo 3 bloques permitidos por celda" };
    }

    // Verificar si esta sesión ya tiene una selección en esta celda
    const seleccionExistente = seleccionesActuales.find(
      (s) => s.sesionId === datos.sesionId,
    );
    if (seleccionExistente) {
      // Si es la misma sesión, permitir actualizar la selección
      seleccionesActuales = seleccionesActuales.filter(
        (s) => s.sesionId !== datos.sesionId,
      );
    } else {
      // Verificar si hay selecciones de otras sesiones
      const otrasSesiones = seleccionesActuales.filter(
        (s) => s.sesionId !== datos.sesionId,
      );
      if (otrasSesiones.length > 0) {
        return {
          exito: false,
          motivo: "Celda ya tiene selecciones de otros operadores",
        };
      }
    }

    // 1. Resolver período y grupo para las validaciones
    const periodo = await this.periodoRepo.findOne({
      where: { codigo: datos.periodo },
    });
    if (!periodo) {
      return { exito: false, motivo: "Período académico no encontrado." };
    }

    // 1.5. Validar que el curso tenga el ciclo correcto para el período
    const curso = await this.cursoRepo.findOne({
      where: { id: datos.cursoId },
    });
    if (!curso) {
      return { exito: false, motivo: "Curso no encontrado." };
    }
    const isPeriodoImpar = this.esPeriodoImpar(datos.periodo);
    const cursoCicloImpar = curso.ciclo % 2 !== 0;
    if (isPeriodoImpar !== cursoCicloImpar) {
      const cicloRequerido = isPeriodoImpar ? "impar" : "par";
      return {
        exito: false,
        motivo: `Para el período ${datos.periodo} solo se pueden seleccionar cursos de ciclo ${cicloRequerido}. El curso ${curso.nombre} es de ciclo ${curso.ciclo}.`,
      };
    }

    // Buscar el grupo correcto para las validaciones
    let grupoIdParaValidacion: number;

    if (datos.tipoClase === "LABORATORIO" && datos.grupoId) {
      // Para laboratorio, buscar el grupo específico por número de grupo
      const grupoEspecifico = await this.grupoRepo.findOne({
        where: {
          curso_id: datos.cursoId,
          codigo: `${curso?.codigo}-G${datos.grupoId}`,
        },
      });
      if (!grupoEspecifico) {
        return {
          exito: false,
          motivo: `No existe el grupo G${datos.grupoId} para este curso.`,
        };
      }
      grupoIdParaValidacion = grupoEspecifico.id;
    } else {
      // Para teoría o si no hay grupoId, usar cualquier grupo del curso
      const grupo = await this.grupoRepo
        .createQueryBuilder("grupo")
        .innerJoin("grupo.curso", "curso")
        .innerJoin("grupo.periodo_academico", "periodo")
        .where("curso.id = :cursoId", { cursoId: datos.cursoId })
        .andWhere("periodo.id = :periodoId", { periodoId: periodo.id })
        .select(["grupo.id AS grupo_id"])
        .getRawOne<{ grupo_id: number }>();

      if (!grupo) {
        return {
          exito: false,
          motivo: "No existe grupo asociado al curso en el período indicado.",
        };
      }
      grupoIdParaValidacion = grupo.grupo_id;
    }

    const fechaSlot = this.construirFechaDesdeDia(
      new Date(periodo.fecha_inicio),
      datos.dia,
    );

    // 2. Calcular total de ocupaciones en la celda (confirmadas + temporales)
    const horariosConfirmadosCelda = await this.dataSource
      .getRepository(HorarioAsignado)
      .find({
        where: {
          ambiente_id: datos.ambienteId,
          periodo: datos.periodo,
          dia: datos.dia,
        },
      });
    const ocupacionesConfirmadasCelda = horariosConfirmadosCelda.filter((hc) =>
      hc.hora_inicio.startsWith(datos.horaInicio),
    );

    // Total de ocupaciones en la celda = confirmadas + temporales
    const totalOcupaciones =
      ocupacionesConfirmadasCelda.length + seleccionesActuales.length;

    this.logger.debug(
      `[seleccionarCelda] Ocupaciones confirmadas=${ocupacionesConfirmadasCelda.length}, temporales=${seleccionesActuales.length}, total=${totalOcupaciones}`,
    );

    if (totalOcupaciones >= 3) {
      this.logger.debug(
        `[seleccionarCelda] Rechazado: máximo 3 bloques alcanzado`,
      );
      return {
        exito: false,
        motivo:
          "Máximo 3 bloques permitidos por celda (actual: " +
          totalOcupaciones +
          ")",
      };
    }

    // 3. Ejecutar las validaciones, pero permitir superposiciones si hay espacio
    const permitirSuperposiciones = datos.permitirSuperposiciones || true; // Permitir por defecto para soportar múltiples bloques
    this.logger.debug(
      `[seleccionarCelda] Ejecutando validaciones, permitirSuperposiciones=${permitirSuperposiciones}`,
    );
    const validacion = await this.validadorHorarioService.validarSlot(
      {
        docente_id: datos.docenteId,
        curso_id: datos.cursoId,
        grupo_id: grupoIdParaValidacion,
        ambiente_id: datos.ambienteId,
        laboratorio_ambiente_id:
          datos.tipoClase === "LABORATORIO" ? datos.ambienteId : undefined,
        periodo: datos.periodo,
        dia: datos.dia,
        hora_inicio: datos.horaInicio,
        hora_fin: datos.horaFin,
        tipo_clase: datos.tipoClase as any,
        fecha: fechaSlot,
      },
      permitirSuperposiciones,
    );

    this.logger.debug(
      `[seleccionarCelda] Validación resultado: valido=${validacion.valido}, errores=${validacion.errores}`,
    );

    if (!validacion.valido) {
      const ocupado = validacion.errores.some(
        (e) => e.includes("ambiente") || e.includes("ocupado"),
      );
      if (ocupado) {
        const alternativas = await this.sugerirAmbientesAlternativos(
          datos.ambienteId,
          datos.dia,
          datos.horaInicio,
          datos.horaFin,
          datos.periodo,
        );
        return {
          exito: false,
          motivo: validacion.errores[0],
          alternativas,
        };
      }
      return { exito: false, motivo: validacion.errores[0] };
    }

    // 3. Validar horas consecutivas del mismo curso+tipo en la sesión
    // Solo para TEORÍA y LABORATORIO. PRÁCTICA permite distribución equitativa.
    if (datos.tipoClase !== "PRACTICA") {
      const consecutivas = await this.verificarHorasConsecutivas(datos);
      if (!consecutivas.valido) {
        return {
          exito: false,
          motivo: consecutivas.motivo,
        };
      }
    } else {
      // Para PRÁCTICA, validar distribución equitativa de horas
      const distribucionEquitativa = await this.verificarDistribucionEquitativa(
        datos,
        curso,
      );
      if (!distribucionEquitativa.valido) {
        return {
          exito: false,
          motivo: distribucionEquitativa.motivo,
        };
      }
    }

    // 3.5. Validar que no se excedan las horas requeridas del curso
    const horasValidas = await this.validarHorasRequeridas(datos, curso);
    if (!horasValidas.valido) {
      return {
        exito: false,
        motivo: horasValidas.motivo,
      };
    }

    // 4. Adquirir lock distribuido para prevenir race conditions
    const lockResult = await this.sincronizacionRedisService.adquirirLockCelda(
      datos.ambienteId,
      datos.dia,
      datos.horaInicio,
      datos.periodo,
      datos.sesionId,
    );

    if (!lockResult.acquired) {
      return {
        exito: false,
        motivo:
          "Celda siendo seleccionada por otro operador. Intente otra opción.",
      };
    }

    // 5. Guardar selección con persistencia (Redis + BD)
    const nuevaSeleccion: SeleccionTemporalRedis = {
      ventanaId: datos.ventanaId,
      sesionId: datos.sesionId,
      docenteId: datos.docenteId,
      cursoId: datos.cursoId,
      grupoId: datos.grupoId,
      tipoClase: datos.tipoClase,
      ambienteId: datos.ambienteId,
      dia: datos.dia,
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      periodo: datos.periodo,
    };

    // Agregar la nueva selección al array
    const todasLasSelecciones = [...seleccionesActuales, nuevaSeleccion];

    // Guardar el array en Redis directamente
    await this.redis.setex(
      clave,
      1800, // TTL de 30 minutos (1800 segundos)
      JSON.stringify(todasLasSelecciones),
    );
    this.logger.debug(
      `[seleccionarCelda] Guardado en Redis clave=${clave}, selecciones=${todasLasSelecciones.length}`,
    );

    // Persistir cada selección individualmente en BD
    // Nota: No llamamos a guardarSeleccionConPersistencia porque sobrescribe el array en Redis
    // En su lugar, persistimos directamente en BD sin tocar Redis
    for (const sel of todasLasSelecciones) {
      try {
        // Obtener el grupo del curso
        const grupo = await this.dataSource.getRepository(Grupo).findOne({
          where: { curso_id: sel.cursoId },
        });

        if (!grupo) {
          this.logger.error(
            `No se encontró grupo para el curso ${sel.cursoId}`,
          );
          throw new Error(`No se encontró grupo para el curso ${sel.cursoId}`);
        }

        // Limpiar registros antiguos de la sesión para evitar duplicate key
        await this.dataSource.getRepository(SeleccionTemporal).delete({
          sesion_id: sel.sesionId,
          ambiente_id: sel.ambienteId,
          dia: sel.dia,
          hora_inicio: sel.horaInicio,
          periodo: sel.periodo,
        } as any);

        // Persistir en BD
        const entity = this.dataSource.getRepository(SeleccionTemporal).create({
          sesion_id: sel.sesionId,
          ventana_atencion_id: sel.ventanaId,
          docente_id: sel.docenteId,
          curso_id: sel.cursoId,
          grupo_id: grupo.id,
          ambiente_id: sel.ambienteId,
          dia: sel.dia,
          hora_inicio: sel.horaInicio,
          hora_fin: sel.horaFin,
          tipo_clase: sel.tipoClase as any,
          periodo: sel.periodo,
          estado: "PENDIENTE",
          contexto_validacion: sel as unknown as Record<string, unknown>,
        } as any);

        await this.dataSource.getRepository(SeleccionTemporal).save(entity);

        // Registrar en sesión (set de claves)
        const claveSesion = this.crearClaveSesion(sel.sesionId);
        await this.redis.sadd(claveSesion, clave);
        await this.redis.expire(claveSesion, 1800);
      } catch (error) {
        this.logger.error(
          `Error persistiendo selección: ${(error as any).message}`,
          error,
        );
        throw error;
      }
    }

    // 6. Mantener compatibilidad con sesión activas tracking
    await this.redis.sadd("selecciones_sesiones_activas", datos.sesionId);

    return {
      exito: true,
      expira_en: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  private async verificarHorasConsecutivas(
    datos: SeleccionarCeldaDto,
  ): Promise<{ valido: boolean; motivo?: string }> {
    const claves = await this.redis.smembers(
      this.crearClaveSesion(datos.sesionId),
    );
    if (!claves || claves.length === 0) return { valido: true };

    const existentesRaw = await this.redis.mget(...claves);
    const existentes = (existentesRaw || [])
      .filter((v): v is string => v !== null)
      .flatMap((v) => this.parseSelecciones(v))
      .filter(
        (s) => s.cursoId === datos.cursoId && s.tipoClase === datos.tipoClase,
      );

    if (existentes.length === 0) return { valido: true };

    // Regla: todas las selecciones del mismo curso+tipo deben ser del mismo día
    const diasDistintos = new Set(existentes.map((s) => s.dia));
    if (
      diasDistintos.size > 1 ||
      (diasDistintos.size === 1 && !diasDistintos.has(datos.dia))
    ) {
      return {
        valido: false,
        motivo: `Las horas del curso deben estar todas en el mismo día. Ya tiene selecciones en ${[...diasDistintos].map((d) => ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"][d - 1]).join(", ")}.`,
      };
    }

    // Regla: el nuevo slot debe ser consecutivo a alguno existente
    const aMinutos = (t: string): number => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const iniNuevo = aMinutos(datos.horaInicio);
    const finNuevo = aMinutos(datos.horaFin);

    const esConsecutivo = existentes.some((s) => {
      const iniEx = aMinutos(s.horaInicio);
      const finEx = aMinutos(s.horaFin);
      return finEx === iniNuevo || finNuevo === iniEx;
    });

    if (!esConsecutivo) {
      return {
        valido: false,
        motivo: `Las horas del curso deben ser consecutivas. Ya tiene selecciones en ${existentes.map((s) => `${s.horaInicio}-${s.horaFin}`).join(", ")}. Seleccione un slot adyacente.`,
      };
    }

    return { valido: true };
  }

  private async verificarDistribucionEquitativa(
    datos: SeleccionarCeldaDto,
    curso: Curso,
  ): Promise<{ valido: boolean; motivo?: string }> {
    const claves = await this.redis.smembers(
      this.crearClaveSesion(datos.sesionId),
    );
    if (!claves || claves.length === 0) return { valido: true };

    const existentesRaw = await this.redis.mget(...claves);
    const existentes = (existentesRaw || [])
      .filter((v): v is string => v !== null)
      .flatMap((v) => this.parseSelecciones(v))
      .filter(
        (s) => s.cursoId === datos.cursoId && s.tipoClase === datos.tipoClase,
      );

    if (existentes.length === 0) return { valido: true };

    // Calcular duración de cada bloque (en horas)
    const aMinutos = (hora: string) => {
      const [h, m] = hora.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const calcularDuracionHoras = (inicio: string, fin: string) => {
      return (aMinutos(fin) - aMinutos(inicio)) / 60;
    };

    // Obtener duraciones de bloques existentes
    const duraciones = existentes.map((s) =>
      calcularDuracionHoras(s.horaInicio, s.horaFin),
    );
    const duracionNueva = calcularDuracionHoras(
      datos.horaInicio,
      datos.horaFin,
    );
    duraciones.push(duracionNueva);

    // Ordenar duraciones
    duraciones.sort((a, b) => a - b);

    // Verificar que la distribución sea equitativa
    // La diferencia máxima entre bloques no debe ser mayor a 1 hora
    const diferenciaMaxima = duraciones[duraciones.length - 1] - duraciones[0];
    if (diferenciaMaxima > 1) {
      return {
        valido: false,
        motivo: `La distribución de horas de práctica debe ser equitativa. Los bloques actuales tienen duraciones: ${duraciones.map((d) => `${d}h`).join(", ")}. La diferencia máxima permitida es de 1 hora.`,
      };
    }

    return { valido: true };
  }

  private async sugerirAmbientesAlternativos(
    ambienteIdExcluir: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
  ): Promise<Array<{ id: number; codigo: string; nombre: string }>> {
    const ambientes = await this.ambienteRepo.find({
      where: { activo: true },
      select: ["id", "codigo", "nombre"],
      order: { capacidad: "DESC" },
      take: 20,
    });

    const alternativas: Array<{ id: number; codigo: string; nombre: string }> =
      [];

    await Promise.all(
      ambientes
        .filter((a) => a.id !== ambienteIdExcluir)
        .map(async (amb) => {
          const clave = this.crearClaveSeleccion(
            amb.id,
            dia,
            horaInicio,
            periodo,
          );
          const enRedis = await this.redis.get(clave);
          if (enRedis) return;

          const hayCruce =
            await this.validacionesService.verificarCruceAmbiente(
              amb.id,
              dia,
              horaInicio,
              horaFin,
              periodo,
            );
          if (!hayCruce) {
            alternativas.push({
              id: amb.id,
              codigo: amb.codigo,
              nombre: amb.nombre,
            });
          }
        }),
    );

    return alternativas.slice(0, 5);
  }

  async deseleccionarCelda(
    sesionId: string,
    ambienteId: number,
    dia: number,
    horaInicio: string,
    periodo: string,
  ): Promise<void> {
    const clave = this.crearClaveSeleccion(
      ambienteId,
      dia,
      horaInicio,
      periodo,
    );
    const valor = await this.redis.get(clave);

    if (!valor) {
      return;
    }

    // Obtener todas las selecciones actuales
    let seleccionesActuales: SeleccionTemporalRedis[] = [];
    try {
      const parsed = JSON.parse(valor);
      if (Array.isArray(parsed)) {
        seleccionesActuales = parsed;
      } else {
        seleccionesActuales = [parsed];
      }
    } catch {
      return;
    }

    // Verificar si la selección pertenece a esta sesión
    const seleccionDeSesion = seleccionesActuales.find(
      (s) => s.sesionId === sesionId,
    );
    if (!seleccionDeSesion) {
      throw new BadRequestException("La selección no pertenece a esta sesión.");
    }

    // Remover solo la selección de esta sesión
    const seleccionesRestantes = seleccionesActuales.filter(
      (s) => s.sesionId !== sesionId,
    );

    if (seleccionesRestantes.length === 0) {
      // Si no quedan selecciones, borrar la clave completa
      await this.redis.del(clave);
      await this.redis.srem(this.crearClaveSesion(sesionId), clave);

      // Liberar el lock de la celda
      const claveLock = `lock_celda_${ambienteId}_${dia}_${horaInicio}_${periodo}`;
      await this.redis.del(claveLock);
    } else {
      // Si quedan selecciones, actualizar el array en Redis
      await this.redis.setex(clave, 10, JSON.stringify(seleccionesRestantes));
    }

    // Eliminar de la base de datos
    await this.dataSource.getRepository(SeleccionTemporal).delete({
      sesion_id: sesionId,
      ambiente_id: ambienteId,
      dia,
      hora_inicio: horaInicio,
      periodo,
    } as any);
  }

  async limpiarSesion(sesionId: string): Promise<void> {
    const claveSesion = this.crearClaveSesion(sesionId);
    const clavesSeleccion = await this.redis.smembers(claveSesion);

    for (const clave of clavesSeleccion) {
      await this.redis.del(clave);
    }

    await this.redis.del(claveSesion);

    // Limpiar todas las selecciones de Redis (enfoque más agresivo pero más efectivo)
    const claves = await this.redis.keys("seleccion_*");
    for (const clave of claves) {
      const valor = await this.redis.get(clave);
      if (valor) {
        try {
          const seleccion = this.parseSeleccion(valor);
          if (seleccion.sesionId === sesionId) {
            await this.redis.del(clave);
          }
        } catch (e) {
          // Ignorar errores de parseo
        }
      }
    }

    this.logger.debug(
      `Sesión limpiada: ${sesionId}, ${clavesSeleccion.length} selecciones eliminadas del set`,
    );
  }

  async confirmarSelecciones(
    sesionId: string,
    periodoId: number,
    usuarioOperadorId?: number,
  ): Promise<{ confirmados: number; errores: Array<Record<string, unknown>> }> {
    const periodo = await this.periodoRepo.findOne({
      where: { id: periodoId },
    });
    if (!periodo) {
      throw new NotFoundException(`Periodo ${periodoId} no encontrado`);
    }

    const claveSesion = this.crearClaveSesion(sesionId);
    const claves = await this.redis.smembers(claveSesion);
    const errores: Array<Record<string, unknown>> = [];

    if (claves.length === 0) {
      return { confirmados: 0, errores };
    }

    const selecciones: SeleccionTemporalRedis[] = [];
    for (const clave of claves) {
      const valor = await this.redis.get(clave);
      if (!valor) {
        continue;
      }
      selecciones.push(...this.parseSelecciones(valor));
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const horariosCreados: HorarioAsignado[] = [];

    try {
      // Ya no necesitamos resolverGruposPorCurso, usaremos el grupoId de Redis
      // const gruposMap = await this.resolverGruposPorCurso(
      //   periodoId,
      //   selecciones,
      // );

      // Cargar parámetros de carga para el período
      const parametrosCarga = await this.parametrosCargaRepo.find({
        where: { periodo_academico: periodo.codigo },
      });
      const parametrosMap = new Map<string, ParametrosCarga>();
      for (const p of parametrosCarga) {
        parametrosMap.set(
          `${p.tipo_docente}_${p.categoria}_${p.modalidad ?? ""}`,
          p,
        );
      }

      // Calcular carga actual de cada docente
      const docenteIds = [...new Set(selecciones.map((s) => s.docenteId))];
      const docentes = await this.docenteRepo.findByIds(docenteIds);
      const docenteMap = new Map(docentes.map((d) => [d.id, d]));

      const cargaActualMap = new Map<number, number>();
      for (const docenteId of docenteIds) {
        const horarios = await this.dataSource
          .getRepository(HorarioAsignado)
          .find({
            where: { docente_id: docenteId, periodo: periodo.codigo },
          });
        const totalHoras = horarios.reduce((sum, h) => {
          const [h1, m1] = h.hora_inicio.split(":").map(Number);
          const [h2, m2] = h.hora_fin.split(":").map(Number);
          return sum + (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
        }, 0);
        cargaActualMap.set(docenteId, totalHoras);
      }

      for (const seleccion of selecciones) {
        // Solo requerir grupoId para laboratorio
        const grupoId = seleccion.grupoId;
        if (seleccion.tipoClase === "LABORATORIO" && !grupoId) {
          errores.push({
            cursoId: seleccion.cursoId,
            motivo: "No se especificó grupo para la selección de laboratorio.",
          });
          continue;
        }

        // Para TEORIA y PRACTICA, usar grupoId de la selección o un grupo por defecto
        const grupoFinal = grupoId || 1;

        // Verificar carga máxima del docente
        const docente = docenteMap.get(seleccion.docenteId);
        if (docente) {
          const pKey = `${docente.tipo_docente}_${docente.categoria}_${docente.modalidad ?? ""}`;
          const parametro = parametrosMap.get(pKey);
          const maxHoras = parametro?.horas_max_semanal ?? 999;

          const duracion = this.calcularDuracionHoras(
            seleccion.horaInicio,
            seleccion.horaFin,
          );
          const cargaActual = cargaActualMap.get(seleccion.docenteId) ?? 0;

          if (cargaActual + duracion > maxHoras) {
            errores.push({
              cursoId: seleccion.cursoId,
              docenteId: seleccion.docenteId,
              motivo: `Carga excedida: ${cargaActual}h + ${duracion}h excede máximo de ${maxHoras}h`,
            });
            continue;
          }
        }

        const validacion = await this.validadorHorarioService.validarSlot({
          docente_id: seleccion.docenteId,
          curso_id: seleccion.cursoId,
          grupo_id: grupoId,
          ambiente_id: seleccion.ambienteId,
          laboratorio_ambiente_id:
            seleccion.tipoClase === "LABORATORIO"
              ? seleccion.ambienteId
              : undefined,
          periodo: periodo.codigo,
          dia: seleccion.dia,
          hora_inicio: seleccion.horaInicio,
          hora_fin: seleccion.horaFin,
          tipo_clase: seleccion.tipoClase as any,
          fecha: this.construirFechaDesdeDia(
            periodo.fecha_inicio,
            seleccion.dia,
          ),
        });

        if (!validacion.valido) {
          errores.push({
            cursoId: seleccion.cursoId,
            docenteId: seleccion.docenteId,
            ambienteId: seleccion.ambienteId,
            errores: validacion.errores,
          });
          continue;
        }
      }

      if (errores.length > 0) {
        await queryRunner.rollbackTransaction();
        return { confirmados: 0, errores };
      }

      for (const seleccion of selecciones) {
        // Solo requerir grupoId para laboratorio
        const grupoId = seleccion.grupoId;
        if (seleccion.tipoClase === "LABORATORIO" && !grupoId) {
          errores.push({
            cursoId: seleccion.cursoId,
            motivo: "No se especificó grupo para la selección de laboratorio.",
          });
          continue;
        }

        let grupoFinal: number | undefined;

        if (seleccion.tipoClase === "LABORATORIO" && grupoId) {
          // Para LABORATORIO con grupoId especificado, buscar el grupo con ese número
          // Los grupos tienen formato ${curso.codigo}-G1, ${curso.codigo}-G2, etc.
          const curso = await queryRunner.manager.findOne(Curso, {
            where: { id: seleccion.cursoId },
          });
          const codigoGrupoEsperado = `${curso?.codigo}-G${grupoId}`;
          this.logger.debug(
            `Buscando grupo para LABORATORIO: cursoId=${seleccion.cursoId}, grupoId=${grupoId}, codigoEsperado=${codigoGrupoEsperado}`,
          );
          const grupoConNumero = await queryRunner.manager.findOne(Grupo, {
            where: {
              curso_id: seleccion.cursoId,
              codigo: codigoGrupoEsperado,
            },
          });
          if (!grupoConNumero) {
            // Si no existe el grupo específico, buscar cualquier grupo del curso
            this.logger.debug(
              `Grupo ${codigoGrupoEsperado} no encontrado, buscando cualquier grupo del curso`,
            );
            const grupoExistente = await queryRunner.manager.findOne(Grupo, {
              where: { curso_id: seleccion.cursoId },
              order: { id: "ASC" },
            });
            if (!grupoExistente) {
              errores.push({
                cursoId: seleccion.cursoId,
                motivo: `No existe grupo ${grupoId} para el curso.`,
              });
              continue;
            }
            grupoFinal = grupoExistente.id;
            this.logger.debug(
              `Usando grupo existente: id=${grupoExistente.id}, codigo=${grupoExistente.codigo}`,
            );
          } else {
            grupoFinal = grupoConNumero.id;
            this.logger.debug(
              `Grupo encontrado: id=${grupoConNumero.id}, codigo=${grupoConNumero.codigo}`,
            );
          }
        } else {
          // Para TEORIA y PRACTICA, obtener un grupo válido existente
          const grupoExistente = await queryRunner.manager.findOne(Grupo, {
            where: { curso_id: seleccion.cursoId },
            order: { id: "ASC" },
          });
          if (!grupoExistente) {
            errores.push({
              cursoId: seleccion.cursoId,
              motivo: "No existe grupo asociado al curso.",
            });
            continue;
          }
          grupoFinal = grupoExistente.id;
        }

        const horario = queryRunner.manager.create(HorarioAsignado, {
          docente_id: seleccion.docenteId,
          curso_id: seleccion.cursoId,
          grupo_id: grupoFinal,
          ambiente_id: seleccion.ambienteId,
          periodo: periodo.codigo,
          dia: seleccion.dia,
          hora_inicio: seleccion.horaInicio,
          hora_fin: seleccion.horaFin,
          tipo_clase: seleccion.tipoClase as any,
          estado: EstadoHorario.CONFIRMADO,
        });

        const saved = await queryRunner.manager.save(HorarioAsignado, horario);
        horariosCreados.push(saved);
      }

      await queryRunner.commitTransaction();

      // Marcar selecciones como confirmadas en BD
      await this.sincronizacionRedisService.marcarSeleccionesComoConfirmadas(
        sesionId,
      );

      // Liberar locks y limpiar Redis
      for (const seleccion of selecciones) {
        // Liberar lock de la celda
        await this.sincronizacionRedisService.liberarLock(
          seleccion.ambienteId,
          seleccion.dia,
          seleccion.horaInicio,
          seleccion.periodo,
        );

        await this.redis.del(
          this.crearClaveSeleccion(
            seleccion.ambienteId,
            seleccion.dia,
            seleccion.horaInicio,
            seleccion.periodo,
          ),
        );
        await this.validadorHorarioService.invalidarCacheAmbiente(
          seleccion.ambienteId,
          periodo.codigo,
        );
      }

      await this.redis.del(claveSesion);
      await this.redis.srem("selecciones_sesiones_activas", sesionId);

      // Invalidar caché de estadísticas en Redis
      await this.redis.del(`stats_periodo_${periodo.codigo}`);

      // Registrar auditoría para cada horario confirmado
      if (usuarioOperadorId) {
        for (const horario of horariosCreados) {
          await this.auditoriaService.registrar({
            horario_id: horario.id,
            usuario_id: usuarioOperadorId,
            accion: "CONFIRMACION_VENTANA",
            datos_anteriores: null,
            datos_nuevos: {
              docente_id: horario.docente_id,
              curso_id: horario.curso_id,
              ambiente_id: horario.ambiente_id,
              dia: horario.dia,
              hora_inicio: horario.hora_inicio,
              hora_fin: horario.hora_fin,
              tipo_clase: horario.tipo_clase,
              periodo: horario.periodo,
            },
            ip: "0.0.0.0",
            motivo: `Confirmación desde sesión ${sesionId}`,
          });
        }
      }

      return { confirmados: selecciones.length, errores };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async limpiarSeleccionesExpiradas(): Promise<void> {
    const sesiones = await this.redis.smembers("selecciones_sesiones_activas");

    for (const sesionId of sesiones) {
      const claveSesion = this.crearClaveSesion(sesionId);
      const claves = await this.redis.smembers(claveSesion);

      if (claves.length === 0) {
        await this.redis.srem("selecciones_sesiones_activas", sesionId);
        continue;
      }

      for (const clave of claves) {
        const existe = await this.redis.exists(clave);
        if (!existe) {
          await this.redis.srem(claveSesion, clave);
        }
      }

      const restantes = await this.redis.scard(claveSesion);
      if (restantes === 0) {
        await this.redis.del(claveSesion);
        await this.redis.srem("selecciones_sesiones_activas", sesionId);
      }
    }
  }

  async obtenerSeleccionesSesion(
    sesionId: string,
  ): Promise<SeleccionTemporalRedis[]> {
    const claves = await this.redis.smembers(this.crearClaveSesion(sesionId));
    const selecciones: SeleccionTemporalRedis[] = [];

    for (const clave of claves) {
      const valor = await this.redis.get(clave);
      if (!valor) {
        continue;
      }

      selecciones.push(this.parseSeleccion(valor));
    }

    return selecciones;
  }

  async obtenerDisponibilidadMatriz(
    ventanaId: string,
    ambienteId: number,
    sesionIdQuery?: string,
    docenteId?: number,
  ): Promise<any[]> {
    this.logger.debug(
      `obtenerDisponibilidadMatriz: ventanaId=${ventanaId}, ambienteId=${ambienteId}, docenteId=${docenteId}`,
    );

    const ventana = await this.dataSource
      .getRepository(VentanaAtencion)
      .findOne({
        where: { id: ventanaId },
      });
    if (!ventana) throw new NotFoundException("Ventana no encontrada");
    const periodo = ventana.periodo;

    const horariosConfirmados = await this.dataSource
      .getRepository(HorarioAsignado)
      .find({
        where: { ambiente_id: ambienteId, periodo },
        relations: ["curso"],
      });

    // Si se proporciona docenteId, también obtener sus horarios confirmados en otros ambientes
    let horariosDocenteEnOtrosAmbientes: HorarioAsignado[] = [];
    if (docenteId) {
      horariosDocenteEnOtrosAmbientes = await this.dataSource
        .getRepository(HorarioAsignado)
        .find({
          where: { docente_id: docenteId, periodo },
          relations: ["curso"],
        });
    }

    this.logger.debug(
      `Horarios confirmados encontrados: ${horariosConfirmados.length} para ambiente=${ambienteId}, periodo=${periodo}`,
    );
    this.logger.debug(
      `Datos de horarios confirmados: ${JSON.stringify(horariosConfirmados.map((h) => ({ id: h.id, dia: h.dia, hora_inicio: h.hora_inicio, docente_id: h.docente_id, grupo_id: h.grupo_id })))}`,
    );

    const matriz = [];
    const periodoEntity = await this.periodoRepo.findOne({
      where: { codigo: periodo },
    });

    for (let dia = 1; dia <= 5; dia++) {
      let fechaSlot = new Date();
      if (periodoEntity) {
        fechaSlot = new Date(
          this.construirFechaDesdeDia(
            new Date(periodoEntity.fecha_inicio),
            dia,
          ),
        );
      }

      const esNoLaborable =
        await this.validacionesService.verificarDiaNoLaborable(
          fechaSlot,
          periodo,
        );

      for (let h = 7; h <= 21; h++) {
        const horaInicio = `${h.toString().padStart(2, "0")}:00`;
        const horaFin = `${(h + 1).toString().padStart(2, "0")}:00`;

        let estado = "LIBRE";
        let metadata = null;
        let ocupaciones: any[] = [];

        const fueraDeFranja =
          !this.validacionesService.verificarFranjaInstitucional(
            horaInicio,
            horaFin,
          );
        if (fueraDeFranja || esNoLaborable) {
          estado = "BLOQUEADO";
        } else {
          const confirmados = horariosConfirmados.filter(
            (hc) => hc.dia === dia && hc.hora_inicio.startsWith(horaInicio),
          );

          // Poblar ocupaciones con los horarios confirmados del ambiente actual
          ocupaciones = confirmados.map((hc) => ({
            docenteId: hc.docente_id,
            cursoId: hc.curso_id,
            cursoNombre: hc.curso?.nombre,
            tipoClase: hc.tipo_clase,
            ambienteId: hc.ambiente_id,
            grupoId: hc.grupo_id,
            otroAmbiente: false,
          }));

          // Verificar si el docente tiene horario confirmado en este slot en otro ambiente
          const horariosDocenteEnOtrosAmbientesSlot =
            horariosDocenteEnOtrosAmbientes.filter(
              (hc) =>
                hc.dia === dia &&
                hc.hora_inicio.startsWith(horaInicio) &&
                hc.ambiente_id !== ambienteId,
            );

          // Agregar horarios del docente en otros ambientes para que se vean en la grilla
          for (const hc of horariosDocenteEnOtrosAmbientesSlot) {
            const yaExiste = ocupaciones.some(
              (o) => o.docenteId === hc.docente_id && o.cursoId === hc.curso_id,
            );
            if (!yaExiste) {
              ocupaciones.push({
                docenteId: hc.docente_id,
                cursoId: hc.curso_id,
                cursoNombre: hc.curso?.nombre,
                tipoClase: hc.tipo_clase,
                ambienteId: hc.ambiente_id,
                grupoId: hc.grupo_id,
                otroAmbiente: true,
              });
            }
          }

          // Verificar siempre Redis, incluso si hay horarios confirmados
          const claveRedis = this.crearClaveSeleccion(
            ambienteId,
            dia,
            horaInicio,
            periodo,
          );
          const enRedis = await this.redis.get(claveRedis);
          this.logger.debug(
            `[obtenerDisponibilidadMatriz] Redis clave=${claveRedis}, enRedis=${!!enRedis}`,
          );

          let seleccionesTemporales: SeleccionTemporalRedis[] = [];
          if (enRedis) {
            try {
              const parsed = JSON.parse(enRedis);
              if (Array.isArray(parsed)) {
                seleccionesTemporales = parsed;
              } else {
                seleccionesTemporales = [parsed];
              }
            } catch {
              seleccionesTemporales = [];
            }
            this.logger.debug(
              `[obtenerDisponibilidadMatriz] Selecciones temporales=${seleccionesTemporales.length}, sesionIdQuery=${sesionIdQuery}`,
            );
          }

          // Combinar ocupaciones confirmadas y temporales
          const ocupacionesTemporales = seleccionesTemporales.map((s) => ({
            docenteId: s.docenteId,
            cursoId: s.cursoId,
            cursoNombre: undefined, // No tenemos el nombre del curso en temporal
            tipoClase: s.tipoClase,
            ambienteId: s.ambienteId,
            grupoId: s.grupoId,
          }));

          // Total de ocupaciones = confirmadas + temporales
          const totalOcupaciones = [
            ...ocupaciones,
            ...ocupacionesTemporales,
          ].slice(0, 3);

          if (totalOcupaciones.length > 0) {
            const ocupacionDocente = totalOcupaciones.find(
              (o) => o.docenteId === docenteId,
            );

            // Determinar si hay selecciones temporales propias
            const seleccionPropia = seleccionesTemporales.find(
              (s) => s.sesionId === sesionIdQuery,
            );

            if (seleccionPropia) {
              // Hay selección temporal propia - priorizar estado temporal
              if (totalOcupaciones.length > 1) {
                estado = "TEMPORAL_PROPIO_MULTIPLE";
                metadata = {
                  sesionId: seleccionPropia.sesionId,
                  ocupaciones: totalOcupaciones,
                };
              } else {
                estado = "TEMPORAL_PROPIO";
                metadata = {
                  docenteId: seleccionPropia.docenteId,
                  cursoId: seleccionPropia.cursoId,
                  sesionId: seleccionPropia.sesionId,
                };
              }
            } else if (ocupacionDocente) {
              estado =
                totalOcupaciones.length === 1
                  ? "CONFIRMADO_DOCENTE"
                  : "CONFIRMADO_DOCENTE_MULTIPLE";
              metadata = { ocupaciones: totalOcupaciones };
            } else {
              estado =
                totalOcupaciones.length === 1
                  ? "CONFIRMADO"
                  : "CONFIRMADO_MULTIPLE";
              metadata = { ocupaciones: totalOcupaciones };
            }
          }
        }

        matriz.push({
          dia,
          horaInicio,
          horaFin,
          estado,
          metadata,
        });
      }
    }

    return matriz;
  }

  private async resolverGruposPorCurso(
    periodoId: number,
    selecciones: SeleccionTemporalRedis[],
  ): Promise<Map<number, number>> {
    const cursosIds = [
      ...new Set(selecciones.map((seleccion) => seleccion.cursoId)),
    ];
    if (cursosIds.length === 0) {
      return new Map<number, number>();
    }

    const grupos = await this.grupoRepo
      .createQueryBuilder("grupo")
      .innerJoin("grupo.curso", "curso")
      .innerJoin("grupo.periodo_academico", "periodo")
      .where("curso.id IN (:...cursosIds)", { cursosIds })
      .andWhere("periodo.id = :periodoId", { periodoId })
      .orderBy("grupo.id", "ASC")
      .select(["grupo.id AS grupo_id", "curso.id AS curso_id"])
      .getRawMany<{ grupo_id: number; curso_id: number }>();

    const gruposMap = new Map<number, number>();
    for (const grupo of grupos) {
      if (!gruposMap.has(grupo.curso_id)) {
        gruposMap.set(grupo.curso_id, grupo.grupo_id);
      }
    }

    return gruposMap;
  }

  private construirFechaDesdeDia(fechaBase: Date, dia: number): string {
    const base = new Date(fechaBase);
    const fecha = new Date(base);
    const day = fecha.getDay() === 0 ? 7 : fecha.getDay();
    fecha.setDate(fecha.getDate() - (day - 1) + (dia - 1));
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  private crearClaveSeleccion(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    periodo: string,
  ): string {
    return `seleccion_${ambienteId}_${dia}_${horaInicio}_${periodo}`;
  }

  private crearClaveSesion(sesionId: string): string {
    return `selecciones_sesion_${sesionId}`;
  }

  private parseSeleccion(valor: string): SeleccionTemporalRedis {
    const parsed = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  }

  private parseSelecciones(valor: string): SeleccionTemporalRedis[] {
    const parsed = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  private calcularDuracionHoras(horaInicio: string, horaFin: string): number {
    const [h1, m1] = horaInicio.split(":").map(Number);
    const [h2, m2] = horaFin.split(":").map(Number);
    const inicio = (h1 || 0) * 60 + (m1 || 0);
    const fin = (h2 || 0) * 60 + (m2 || 0);
    return Math.max((fin - inicio) / 60, 0);
  }

  private async validarHorasRequeridas(
    datos: SeleccionarCeldaDto,
    curso: Curso,
  ): Promise<{ valido: boolean; motivo?: string }> {
    // Obtener horas requeridas según tipo de clase
    let horasRequeridas =
      datos.tipoClase === "TEORIA"
        ? curso.horas_teoria || 0
        : datos.tipoClase === "PRACTICA"
          ? curso.horas_practica || 0
          : curso.horas_laboratorio || 0;

    this.logger.debug(
      `Validando horas: cursoId=${datos.cursoId}, tipoClase=${datos.tipoClase}, horasRequeridas=${horasRequeridas}, grupoId=${datos.grupoId}`,
    );

    if (horasRequeridas === 0) {
      return { valido: true }; // No hay restricción si no hay horas requeridas
    }

    // Si es laboratorio o práctica con grupoId, validar por grupo específico
    // Cada grupo debe tener las horas completas requeridas (no divididas)
    if (
      (datos.tipoClase === "LABORATORIO" || datos.tipoClase === "PRACTICA") &&
      datos.grupoId
    ) {
      // Obtener el número total de grupos para este curso (solo para logging)
      const gruposCurso = await this.grupoRepo.find({
        where: { curso_id: datos.cursoId },
      });
      const numGrupos = gruposCurso.length || 1;
      this.logger.debug(
        `Horas requeridas para ${datos.tipoClase} grupo ${datos.grupoId}: ${horasRequeridas} (total grupos: ${numGrupos})`,
      );
    }

    // Contar horas ya asignadas en la base de datos (horarios confirmados)
    // Filtrar por grupo si es laboratorio
    let whereClause: any = {
      curso_id: datos.cursoId,
      tipo_clase: datos.tipoClase as any,
      docente_id: datos.docenteId,
      estado: EstadoHorario.CONFIRMADO,
    };

    let grupoIdParaFiltro: number | undefined;
    if (
      (datos.tipoClase === "LABORATORIO" || datos.tipoClase === "PRACTICA") &&
      datos.grupoId
    ) {
      // Buscar el grupo_id correspondiente al número de grupo
      const curso = await this.cursoRepo.findOne({
        where: { id: datos.cursoId },
      });
      const grupoConNumero = await this.grupoRepo.findOne({
        where: {
          curso_id: datos.cursoId,
          codigo: `${curso?.codigo}-G${datos.grupoId}`,
        },
      });
      if (grupoConNumero) {
        whereClause.grupo_id = grupoConNumero.id;
        grupoIdParaFiltro = grupoConNumero.id;
      }
    }

    const horariosConfirmados = await this.horarioAsignadoRepo.find({
      where: whereClause,
    });

    let horasConfirmadas = 0;
    for (const horario of horariosConfirmados) {
      horasConfirmadas += this.calcularDuracionHoras(
        horario.hora_inicio,
        horario.hora_fin,
      );
    }

    this.logger.debug(
      `Horas confirmadas para ${datos.tipoClase}${grupoIdParaFiltro ? ` grupo ${datos.grupoId}` : ""}: ${horasConfirmadas}h`,
    );

    // Obtener selecciones actuales de la sesión
    const claveSesion = this.crearClaveSesion(datos.sesionId);
    const clavesSeleccion = await this.redis.smembers(claveSesion);

    this.logger.debug(
      `Selecciones temporales en sesión: ${clavesSeleccion.length} claves`,
    );

    let horasAsignadas = 0;
    for (const clave of clavesSeleccion) {
      const valor = await this.redis.get(clave);
      if (valor) {
        const seleccionesEnClave = this.parseSelecciones(valor);
        for (const seleccion of seleccionesEnClave) {
          this.logger.debug(
            `Selección temporal: cursoId=${seleccion.cursoId}, tipoClase=${seleccion.tipoClase}, grupoId=${seleccion.grupoId}`,
          );
          if (
            seleccion.cursoId === datos.cursoId &&
            seleccion.tipoClase === datos.tipoClase
          ) {
            // Para laboratorio o práctica, filtrar por grupo
            if (
              (datos.tipoClase === "LABORATORIO" ||
                datos.tipoClase === "PRACTICA") &&
              datos.grupoId
            ) {
              this.logger.debug(
                `Filtrando temporal: seleccion.grupoId=${seleccion.grupoId} vs datos.grupoId=${datos.grupoId}`,
              );
              if (seleccion.grupoId === datos.grupoId) {
                horasAsignadas += this.calcularDuracionHoras(
                  seleccion.horaInicio,
                  seleccion.horaFin,
                );
              }
            } else {
              horasAsignadas += this.calcularDuracionHoras(
                seleccion.horaInicio,
                seleccion.horaFin,
              );
            }
          }
        }
      }
    }

    this.logger.debug(
      `Horas temporales para ${datos.tipoClase}${grupoIdParaFiltro ? ` grupo ${datos.grupoId}` : ""}: ${horasAsignadas}h`,
    );

    this.logger.debug(
      `Horas temporales para ${datos.tipoClase}${datos.grupoId ? ` grupo ${datos.grupoId}` : ""}: ${horasAsignadas}h`,
    );

    // Calcular horas de la nueva selección
    const horasNuevaSeleccion = this.calcularDuracionHoras(
      datos.horaInicio,
      datos.horaFin,
    );
    const totalHoras = horasConfirmadas + horasAsignadas + horasNuevaSeleccion;

    if (totalHoras > horasRequeridas) {
      return {
        valido: false,
        motivo: `Excede las horas requeridas. Confirmadas: ${horasConfirmadas}h, Temporales: ${horasAsignadas}h, Nueva: ${horasNuevaSeleccion}h, Requeridas: ${horasRequeridas}h`,
      };
    }

    return { valido: true };
  }
}
