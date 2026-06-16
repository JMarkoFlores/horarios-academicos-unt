import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Cache } from "cache-manager";
import { Repository } from "typeorm";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { ValidacionesService } from "../common/services/validaciones.service";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ValidarSlotDto } from "./dto/validar-slot.dto";

type ResultadoValidacion = { valido: boolean; errores: string[] };
type SlotOcupado = { dia: number; hora_inicio: string; hora_fin: string };

@Injectable()
export class ValidadorHorarioService {
  private static readonly TTL_SLOTS_AMBIENTE = 86400;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly validacionesService: ValidacionesService,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
  ) {}

  async validarSlot(
    params: ValidarSlotDto,
    permitirSuperposiciones: boolean = false,
  ): Promise<ResultadoValidacion> {
    const duracion = this.calcularDuracionHoras(
      params.hora_inicio,
      params.hora_fin,
    );

    // Validaciones básicas que siempre se aplican
    const validacionesBasicas = [
      this.ejecutarValidacion(
        async () =>
          this.validacionesService.verificarFranjaInstitucional(
            params.hora_inicio,
            params.hora_fin,
          ),
        "La hora está fuera de la franja institucional permitida.",
      ),
      this.ejecutarValidacion(
        () =>
          this.validacionesService.verificarDisponibilidadDocente(
            params.docente_id,
            params.dia,
            params.hora_inicio,
            params.hora_fin,
            params.periodo,
          ),
        "El docente no está disponible para el horario solicitado.",
      ),
      this.ejecutarValidacion(
        () =>
          this.validacionesService.verificarMaxHorasDocente(
            params.docente_id,
            params.dia,
            duracion,
            params.periodo,
            params.ignorarCursoId,
            params.ignorarTipoClase,
            params.ignorarGrupoId,
          ),
        "El docente supera el máximo de horas permitidas en el día.",
      ),
      this.ejecutarValidacion(
        async () =>
          !(await this.validacionesService.verificarDiaNoLaborable(
            params.fecha,
            params.periodo,
          )),
        "La fecha seleccionada corresponde a un día no laborable.",
      ),
    ];

    // Validaciones adicionales
    const validacionesAdicionales = [
      this.ejecutarValidacion(
        () => this.validarCruceLaboratorio(params, permitirSuperposiciones),
        "El laboratorio seleccionado ya está ocupado en ese horario.",
      ),
      params.curso_id
        ? this.ejecutarValidacion(async () => {
            const res = await this.validacionesService.verificarHorasCurso(
              params.curso_id!,
              params.tipo_clase,
              duracion,
              params.periodo,
              params.docente_id,
              params.tipo_clase === "LABORATORIO" ||
                params.tipo_clase === "PRACTICA"
                ? params.grupo_id
                : undefined,
            );
            return res.valido;
          }, "El curso ya tiene asignadas todas las horas requeridas para este tipo de clase.")
        : Promise.resolve(null),
      this.ejecutarValidacion(async () => {
        const res =
          await this.validacionesService.verificarDescansoMinimoDocente(
            params.docente_id,
            params.dia,
            params.hora_inicio,
            params.hora_fin,
            params.periodo,
          );
        return res.valido;
      }, "El docente no cumple el descanso mínimo de 1 hora entre clases."),
      this.ejecutarValidacion(async () => {
        const res =
          await this.validacionesService.verificarCargaHorariaSemanalDocente(
            params.docente_id,
            duracion,
            params.periodo,
            params.ignorarCursoId,
            params.ignorarTipoClase,
            params.ignorarGrupoId,
          );
        return res.valido;
      }, "El docente supera su carga horaria semanal máxima permitida."),
      this.ejecutarValidacion(async () => {
        const res = await this.validacionesService.verificarCursosDocente(
          params.docente_id,
          params.periodo,
          params.curso_id,
        );
        return res.valido;
      }, "El docente supera la cantidad máxima de cursos permitidos."),
    ];

    // Si no se permiten superposiciones, agregar validaciones de cruce
    let validacionesCruce: Array<Promise<string | null>> = [];
    if (!permitirSuperposiciones) {
      validacionesCruce = [
        this.ejecutarValidacion(
          () =>
            this.verificarCruceAmbienteConCache(
              params.ambiente_id,
              params.dia,
              params.hora_inicio,
              params.hora_fin,
              params.periodo,
              params.ignorarCursoId,
              params.ignorarTipoClase,
              params.ignorarGrupoId,
            ).then((hayCruce) => !hayCruce),
          "El ambiente seleccionado ya está ocupado en ese horario.",
        ),
        this.ejecutarValidacion(
          async () =>
            !(await this.validacionesService.verificarCruceDocente(
              params.docente_id,
              params.dia,
              params.hora_inicio,
              params.hora_fin,
              params.periodo,
              undefined,
              params.ignorarCursoId,
              params.ignorarTipoClase,
              params.ignorarGrupoId,
            )),
          "El docente tiene un cruce de horario.",
        ),
        this.ejecutarValidacion(
          async () =>
            !(await this.validacionesService.verificarCruceGrupo(
              params.grupo_id,
              params.dia,
              params.hora_inicio,
              params.hora_fin,
              params.periodo,
              undefined,
              params.ignorarCursoId,
              params.ignorarTipoClase,
              params.ignorarGrupoId,
            )),
          "El grupo tiene un cruce de horario.",
        ),
      ];
    }

    const validaciones = await Promise.all([
      ...validacionesBasicas,
      ...validacionesAdicionales,
      ...validacionesCruce,
    ]);

    const errores = validaciones.filter(
      (error): error is string => error !== null,
    );
    return { valido: errores.length === 0, errores };
  }

  async invalidarCacheAmbiente(
    ambienteId: number,
    periodo: string,
  ): Promise<void> {
    await this.cacheManager.del(
      this.crearClaveSlotsAmbiente(ambienteId, periodo),
    );
  }

  private async validarCruceLaboratorio(
    params: ValidarSlotDto,
    permitirSuperposiciones: boolean = false,
  ): Promise<boolean> {
    if (params.tipo_clase !== TipoClase.LABORATORIO) {
      return true;
    }

    if (!params.laboratorio_ambiente_id) {
      return false;
    }

    const hayCruce = await this.verificarCruceAmbienteConCache(
      params.laboratorio_ambiente_id,
      params.dia,
      params.hora_inicio,
      params.hora_fin,
      params.periodo,
    );

    if (!hayCruce) {
      return true;
    }

    // Si se permiten superposiciones, verificar si hay espacio para más bloques
    if (permitirSuperposiciones) {
      // Obtener ocupaciones actuales en la celda
      const horariosEnCelda = await this.horarioRepo.find({
        where: {
          ambiente_id: params.laboratorio_ambiente_id,
          periodo: params.periodo,
          dia: params.dia,
        },
      });

      const ocupacionesEnSlot = horariosEnCelda.filter((h) =>
        h.hora_inicio.startsWith(params.hora_inicio),
      );

      // Permitir si hay menos de 3 ocupaciones
      return ocupacionesEnSlot.length < 3;
    }

    return false;
  }

  private async verificarCruceAmbienteConCache(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    horaFin: string,
    periodo: string,
    ignorarCursoId?: number,
    ignorarTipoClase?: TipoClase,
    ignorarGrupoId?: number,
  ): Promise<boolean> {
    if (ignorarCursoId && ignorarTipoClase) {
      return this.validacionesService.verificarCruceAmbiente(
        ambienteId,
        dia,
        horaInicio,
        horaFin,
        periodo,
        undefined,
        ignorarCursoId,
        ignorarTipoClase,
        ignorarGrupoId,
      );
    }

    const cacheKey = this.crearClaveSlotsAmbiente(ambienteId, periodo);
    const slotsCacheados = await this.cacheManager.get<SlotOcupado[]>(cacheKey);

    if (Array.isArray(slotsCacheados)) {
      return slotsCacheados.some((slot) =>
        this.solapan(
          slot.dia,
          slot.hora_inicio,
          slot.hora_fin,
          dia,
          horaInicio,
          horaFin,
        ),
      );
    }

    const hayCruce = await this.validacionesService.verificarCruceAmbiente(
      ambienteId,
      dia,
      horaInicio,
      horaFin,
      periodo,
    );

    const slots = await this.horarioRepo
      .createQueryBuilder("h")
      .where("h.ambiente_id = :ambienteId", { ambienteId })
      .andWhere("h.periodo = :periodo", { periodo })
      .select([
        "h.dia AS dia",
        "h.hora_inicio AS hora_inicio",
        "h.hora_fin AS hora_fin",
      ])
      .getRawMany<SlotOcupado>();

    await this.cacheManager.set(
      cacheKey,
      slots,
      ValidadorHorarioService.TTL_SLOTS_AMBIENTE,
    );
    return hayCruce;
  }

  private crearClaveSlotsAmbiente(ambienteId: number, periodo: string): string {
    return `slots_ambiente_${ambienteId}_${periodo}`;
  }

  private async ejecutarValidacion(
    validar: () => Promise<boolean> | boolean,
    mensajeError: string,
  ): Promise<string | null> {
    try {
      const valido = await validar();
      return valido ? null : mensajeError;
    } catch {
      return mensajeError;
    }
  }

  private calcularDuracionHoras(horaInicio: string, horaFin: string): number {
    const inicio = this.aMinutos(horaInicio);
    const fin = this.aMinutos(horaFin);
    return Math.max((fin - inicio) / 60, 0);
  }

  private aMinutos(hora: string): number {
    const [horas, minutos] = hora.split(":").map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  }

  private solapan(
    diaSlot: number,
    inicioSlot: string,
    finSlot: string,
    diaObjetivo: number,
    inicioObjetivo: string,
    finObjetivo: string,
  ): boolean {
    if (diaSlot !== diaObjetivo) {
      return false;
    }

    return (
      this.aMinutos(inicioSlot) < this.aMinutos(finObjetivo) &&
      this.aMinutos(finSlot) > this.aMinutos(inicioObjetivo)
    );
  }
}
