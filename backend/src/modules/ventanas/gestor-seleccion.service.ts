import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  BadRequestException,
  Injectable,
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
import { PeriodoAcademico } from "../../entities/periodo-academico.entity";
import { ValidadorHorarioService } from "../../horarios/validador-horario.service";
import { SeleccionarCeldaDto } from "./dto/seleccionar-celda.dto";
import { VentanaAtencion } from "../../entities/ventana-atencion.entity";
import { ValidacionesService } from "../../common/services/validaciones.service";

type SeleccionTemporalRedis = {
  ventanaId: string;
  sesionId: string;
  docenteId: number;
  cursoId: number;
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

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    private readonly validadorHorarioService: ValidadorHorarioService,
    private readonly validacionesService: ValidacionesService,
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

  async seleccionarCelda(datos: SeleccionarCeldaDto): Promise<{
    exito: boolean;
    motivo?: string;
    expira_en?: string;
  }> {
    const clave = this.crearClaveSeleccion(
      datos.ambienteId,
      datos.dia,
      datos.horaInicio,
      datos.periodo,
    );
    const actual = await this.redis.get(clave);

    if (actual) {
      const seleccionActual = this.parseSeleccion(actual);
      if (seleccionActual.sesionId !== datos.sesionId) {
        return { exito: false, motivo: "Celda reservada por otro operador" };
      }
    }

    const payload: SeleccionTemporalRedis = {
      ventanaId: datos.ventanaId,
      sesionId: datos.sesionId,
      docenteId: datos.docenteId,
      cursoId: datos.cursoId,
      tipoClase: datos.tipoClase,
      ambienteId: datos.ambienteId,
      dia: datos.dia,
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      periodo: datos.periodo,
    };

    await this.redis.set(clave, JSON.stringify(payload), "EX", 1800);
    await this.redis.sadd(this.crearClaveSesion(datos.sesionId), clave);
    await this.redis.sadd("selecciones_sesiones_activas", datos.sesionId);
    await this.redis.expire(this.crearClaveSesion(datos.sesionId), 1800);

    return {
      exito: true,
      expira_en: new Date(Date.now() + 1800 * 1000).toISOString(),
    };
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

    const seleccion = this.parseSeleccion(valor);
    if (seleccion.sesionId !== sesionId) {
      throw new BadRequestException("La selección no pertenece a esta sesión.");
    }

    await this.redis.del(clave);
    await this.redis.srem(this.crearClaveSesion(sesionId), clave);
  }

  async confirmarSelecciones(
    sesionId: string,
    periodoId: number,
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
      selecciones.push(this.parseSeleccion(valor));
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const gruposMap = await this.resolverGruposPorCurso(
        periodoId,
        selecciones,
      );

      for (const seleccion of selecciones) {
        const grupoId = gruposMap.get(seleccion.cursoId);
        if (!grupoId) {
          errores.push({
            cursoId: seleccion.cursoId,
            motivo: "No existe grupo asociado al curso en el período indicado.",
          });
          continue;
        }

        const validacion = await this.validadorHorarioService.validarSlot({
          docente_id: seleccion.docenteId,
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
        const grupoId = gruposMap.get(seleccion.cursoId)!;
        const horario = queryRunner.manager.create(HorarioAsignado, {
          docente_id: seleccion.docenteId,
          curso_id: seleccion.cursoId,
          grupo_id: grupoId,
          ambiente_id: seleccion.ambienteId,
          periodo: periodo.codigo,
          dia: seleccion.dia,
          hora_inicio: seleccion.horaInicio,
          hora_fin: seleccion.horaFin,
          tipo_clase: seleccion.tipoClase as any,
          estado: EstadoHorario.CONFIRMADO,
        });

        await queryRunner.manager.save(HorarioAsignado, horario);
      }

      await queryRunner.commitTransaction();

      for (const seleccion of selecciones) {
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
  ): Promise<any[]> {
    const ventana = await this.dataSource.getRepository(VentanaAtencion).findOne({
      where: { id: ventanaId },
    });
    if (!ventana) throw new NotFoundException('Ventana no encontrada');
    const periodo = ventana.periodo;

    const horariosConfirmados = await this.dataSource.getRepository(HorarioAsignado).find({
      where: { ambiente_id: ambienteId, periodo },
    });

    const matriz = [];
    const periodoEntity = await this.periodoRepo.findOne({ where: { codigo: periodo } });
    
    for (let dia = 1; dia <= 5; dia++) {
      let fechaSlot = new Date();
      if (periodoEntity) {
        fechaSlot = new Date(this.construirFechaDesdeDia(new Date(periodoEntity.fecha_inicio), dia));
      }

      const esNoLaborable = await this.validacionesService.verificarDiaNoLaborable(fechaSlot, periodo);

      for (let h = 7; h <= 20; h++) {
        const horaInicio = `${h.toString().padStart(2, '0')}:00`;
        const horaFin = `${(h + 1).toString().padStart(2, '0')}:00`;

        let estado = 'LIBRE';
        let metadata = null;

        const fueraDeFranja = !this.validacionesService.verificarFranjaInstitucional(horaInicio, horaFin);
        if (fueraDeFranja || esNoLaborable) {
          estado = 'BLOQUEADO';
        } else {
          const confirmado = horariosConfirmados.find(
            hc => hc.dia === dia && hc.hora_inicio === horaInicio
          );
          if (confirmado) {
            estado = 'CONFIRMADO';
            metadata = { docenteId: confirmado.docente_id, cursoId: confirmado.curso_id };
          } else {
            const claveRedis = this.crearClaveSeleccion(ambienteId, dia, horaInicio, periodo);
            const enRedis = await this.redis.get(claveRedis);
            if (enRedis) {
              const seleccion = this.parseSeleccion(enRedis);
              if (sesionIdQuery && seleccion.sesionId === sesionIdQuery) {
                estado = 'TEMPORAL_PROPIO';
              } else {
                estado = 'TEMPORAL_OTRO';
              }
              metadata = { docenteId: seleccion.docenteId, cursoId: seleccion.cursoId, sesionId: seleccion.sesionId };
            }
          }
        }

        matriz.push({
          dia,
          horaInicio,
          horaFin,
          estado,
          metadata
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
    return JSON.parse(valor) as SeleccionTemporalRedis;
  }
}
