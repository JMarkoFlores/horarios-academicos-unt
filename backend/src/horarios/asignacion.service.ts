import { Injectable, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { Inject } from "@nestjs/common";
import { Repository, DataSource } from "typeorm";
import { Cache } from "cache-manager";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { Preasignacion } from "../entities/preasignacion.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { DocentesService } from "../docentes/docentes.service";
import { ValidacionesService } from "../common/services/validaciones.service";
import { CacheKeyRegistry } from "../common/cache/cache-key-registry";

export interface ResultadoGeneracion {
  asignaciones_creadas: number;
  conflictos: number;
  detalle_conflictos: ConflictoAsignacion[];
}

interface SlotLibre {
  key: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  ambiente: Ambiente;
}

interface FranjaInstitucional {
  key: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

@Injectable()
export class AsignacionService {
  private readonly logger = new Logger(AsignacionService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(ConflictoAsignacion)
    private readonly conflictoRepo: Repository<ConflictoAsignacion>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Curso) private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
    @InjectRepository(Preasignacion)
    private readonly preasignacionRepo: Repository<Preasignacion>,
    private readonly docentesService: DocentesService,
    private readonly validacionesService: ValidacionesService,
  ) {}

  // Complejidad: O(C * (D * (Disp + A) + H * (Disp + A + P + B * A))) → O(C * (D + H * B))
  async generarHorario(periodo: string): Promise<ResultadoGeneracion> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const docentesOrdenados =
        await this.docentesService.findOrdenadosPorJerarquia(periodo);
      const cursos = await this.cursoRepo.find({ where: { activo: true } });
      const aulas = await this.ambienteRepo.find({
        where: { tipo: TipoAmbiente.AULA, activo: true },
      });
      const laboratorios = await this.ambienteRepo.find({
        where: { tipo: TipoAmbiente.LABORATORIO, activo: true },
      });
      const disponibilidades = await this.disponibilidadRepo
        .createQueryBuilder("disponibilidad")
        .leftJoinAndSelect("disponibilidad.docente", "docente")
        .where("disponibilidad.periodo_academico = :periodo", { periodo })
        .andWhere("disponibilidad.disponible = :disponible", {
          disponible: true,
        })
        .cache(`disponibilidad_periodo_${periodo}_asignacion`, 60000)
        .getMany();
      const preasignaciones = await this.preasignacionRepo
        .createQueryBuilder("preasignacion")
        .leftJoinAndSelect("preasignacion.docente", "docente")
        .leftJoinAndSelect("preasignacion.ambiente", "ambiente")
        .where("preasignacion.periodo_academico = :periodo", { periodo })
        .cache(`preasignaciones_periodo_${periodo}_asignacion`, 60000)
        .getMany();

      const docenteMap = new Map(
        docentesOrdenados.map((docente) => [docente.id, docente]),
      );
      const aulaMap = new Map(aulas.map((ambiente) => [ambiente.id, ambiente]));
      const laboratorioMap = new Map(
        laboratorios.map((ambiente) => [ambiente.id, ambiente]),
      );

      const franjasInstitucionales = this.construirFranjasInstitucionales();
      const disponibilidadPorDocente = this.preprocesarDisponibilidadPorDocente(
        disponibilidades,
        franjasInstitucionales,
      );
      const docentesConDisponibilidad = new Set(
        disponibilidades
          .map((disponibilidad) => disponibilidad.docente?.id)
          .filter(
            (docenteId): docenteId is number => typeof docenteId === "number",
          ),
      );
      const preasignacionPorDocente = this.preprocesarPreasignacionesPorDocente(
        preasignaciones,
        franjasInstitucionales,
      );
      const disponibilidadPorAmbienteAula =
        this.preprocesarDisponibilidadPorAmbiente(
          aulaMap,
          franjasInstitucionales,
        );
      const disponibilidadPorAmbienteLab =
        this.preprocesarDisponibilidadPorAmbiente(
          laboratorioMap,
          franjasInstitucionales,
        );

      const slotsOcupadosPorDocente = new Map<number, Set<string>>();
      const cargaPorDocente = new Map<number, number>();

      const asignaciones: HorarioAsignado[] = [];
      const conflictos: ConflictoAsignacion[] = [];

      for (const curso of cursos) {
        const docente = this.encontrarDocenteElegible(
          docentesOrdenados,
          docentesConDisponibilidad,
          disponibilidadPorDocente,
          cargaPorDocente,
        );

        if (!docente) {
          conflictos.push(
            this.crearConflicto(
              "SIN_DOCENTE",
              periodo,
              `Curso "${curso.nombre}": sin docente disponible`,
            ),
          );
          continue;
        }

        const slotTeoria = this.buscarSlotLibre(
          docente,
          aulaMap,
          franjasInstitucionales,
          disponibilidadPorDocente,
          preasignacionPorDocente,
          slotsOcupadosPorDocente,
          disponibilidadPorAmbienteAula,
        );

        if (!slotTeoria) {
          conflictos.push(
            this.crearConflicto(
              "SIN_SLOT_TEORIA",
              periodo,
              `Curso "${curso.nombre}": sin slot disponible para teoría`,
              docente,
            ),
          );
          continue;
        }

        asignaciones.push(
          this.crearAsignacion(
            docenteMap.get(docente.id) ?? docente,
            curso,
            slotTeoria.ambiente,
            slotTeoria,
            TipoClase.TEORIA,
            periodo,
          ),
        );
        this.reservarSlot(
          docente.id,
          slotTeoria.key,
          slotTeoria.ambiente.id,
          slotsOcupadosPorDocente,
          cargaPorDocente,
          disponibilidadPorAmbienteAula,
        );

        if (curso.tiene_laboratorio) {
          const slotLab = this.buscarSlotLibre(
            docente,
            laboratorioMap,
            franjasInstitucionales,
            disponibilidadPorDocente,
            preasignacionPorDocente,
            slotsOcupadosPorDocente,
            disponibilidadPorAmbienteLab,
          );

          if (!slotLab) {
            conflictos.push(
              this.crearConflicto(
                "SIN_SLOT_LABORATORIO",
                periodo,
                `Curso "${curso.nombre}": sin slot para laboratorio`,
                docente,
              ),
            );
          } else {
            asignaciones.push(
              this.crearAsignacion(
                docenteMap.get(docente.id) ?? docente,
                curso,
                slotLab.ambiente,
                slotLab,
                TipoClase.LABORATORIO,
                periodo,
              ),
            );
            this.reservarSlot(
              docente.id,
              slotLab.key,
              slotLab.ambiente.id,
              slotsOcupadosPorDocente,
              cargaPorDocente,
              disponibilidadPorAmbienteLab,
            );
          }
        }
      }

      if (asignaciones.length > 0) {
        await queryRunner.manager.save(HorarioAsignado, asignaciones);
      }
      if (conflictos.length > 0) {
        await queryRunner.manager.save(ConflictoAsignacion, conflictos);
      }
      await queryRunner.commitTransaction();
      await this.invalidateHorariosCache();

      this.logger.log(
        `Generación completada: ${asignaciones.length} asignaciones, ${conflictos.length} conflictos — período ${periodo}`,
      );

      return {
        asignaciones_creadas: asignaciones.length,
        conflictos: conflictos.length,
        detalle_conflictos: conflictos,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error generando horario: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Complejidad: O(1) → O(1)
  async limpiarHorario(
    periodo: string,
  ): Promise<{ eliminados: number; conflictos_eliminados: number }> {
    const resultH = await this.horarioRepo.delete({
      periodo_academico: periodo,
    });
    const resultC = await this.conflictoRepo.delete({
      periodo_academico: periodo,
    });
    await this.invalidateHorariosCache();
    return {
      eliminados: resultH.affected ?? 0,
      conflictos_eliminados: resultC.affected ?? 0,
    };
  }

  // Complejidad: O(D * (Disp + A)) → O(D)
  private encontrarDocenteElegible(
    docentesOrdenados: any[],
    docentesConDisponibilidad: Set<number>,
    disponibilidadPorDocente: Map<number, Set<string>>,
    cargaPorDocente: Map<number, number>,
  ): any | null {
    const MAX_HORAS = 20;

    for (const d of docentesOrdenados) {
      const tieneDisponibilidad = docentesConDisponibilidad.has(d.id);
      if (!tieneDisponibilidad) continue;

      const tieneSlotDisponible =
        (disponibilidadPorDocente.get(d.id)?.size ?? 0) > 0;
      if (!tieneSlotDisponible) continue;

      const horasAsignadas = cargaPorDocente.get(d.id) ?? 0;
      if (horasAsignadas < MAX_HORAS) return d;
    }

    return null;
  }

  // Complejidad: O(H * (Disp + A + P + B * A)) → O(H * B)
  private buscarSlotLibre(
    docente: any,
    ambientes: Map<number, Ambiente>,
    franjasInstitucionales: FranjaInstitucional[],
    disponibilidadPorDocente: Map<number, Set<string>>,
    preasignacionPorDocente: Map<number, Set<string>>,
    slotsOcupadosPorDocente: Map<number, Set<string>>,
    disponibilidadPorAmbiente: Map<number, Set<string>>,
  ): SlotLibre | null {
    const docenteId = docente.id;
    const disponibilidadDocente = disponibilidadPorDocente.get(docenteId);
    if (!disponibilidadDocente || disponibilidadDocente.size === 0) return null;

    const slotsPreasignados = preasignacionPorDocente.get(docenteId);
    const slotsOcupados = slotsOcupadosPorDocente.get(docenteId);
    const ambienteIds = [...ambientes.keys()];

    for (const franja of franjasInstitucionales) {
      const slotKey = franja.key;

      if (!disponibilidadDocente.has(slotKey)) continue;
      if (slotsOcupados?.has(slotKey)) continue;
      if (slotsPreasignados?.has(slotKey)) continue;

      for (const ambienteId of ambienteIds) {
        const slotsDisponiblesAmbiente =
          disponibilidadPorAmbiente.get(ambienteId);
        if (!slotsDisponiblesAmbiente?.has(slotKey)) continue;

        const ambiente = ambientes.get(ambienteId);
        if (!ambiente) continue;

        return {
          key: slotKey,
          dia_semana: franja.dia_semana,
          hora_inicio: franja.hora_inicio,
          hora_fin: franja.hora_fin,
          ambiente,
        };
      }
    }

    return null;
  }

  // Complejidad: O(1) → O(1)
  private crearAsignacion(
    docente: any,
    curso: Curso,
    ambiente: Ambiente,
    slot: { dia_semana: number; hora_inicio: string; hora_fin: string },
    tipoClase: TipoClase,
    periodo: string,
  ): HorarioAsignado {
    const h = new HorarioAsignado();
    h.docente = docente;
    h.curso = curso;
    h.ambiente = ambiente;
    h.dia_semana = slot.dia_semana;
    h.hora_inicio = slot.hora_inicio;
    h.hora_fin = slot.hora_fin;
    h.tipo_clase = tipoClase;
    h.periodo_academico = periodo;
    h.estado = EstadoHorario.BORRADOR;
    return h;
  }

  // Complejidad: O(1) → O(1)
  private crearConflicto(
    tipo: string,
    periodo: string,
    descripcion: string,
    docente?: any,
    ambiente?: Ambiente,
  ): ConflictoAsignacion {
    const c = new ConflictoAsignacion();
    c.tipo_conflicto = tipo;
    c.periodo_academico = periodo;
    c.descripcion = descripcion;
    c.resuelto = false;
    if (docente) c.docente = docente;
    if (ambiente) c.ambiente = ambiente;
    return c;
  }

  // Complejidad: O(1) → O(1)
  private min(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  // Complejidad: O(1) → O(1)
  private solapan(s1: string, e1: string, s2: string, e2: string): boolean {
    return this.min(s1) < this.min(e2) && this.min(e1) > this.min(s2);
  }

  // Complejidad: O(H) → O(H)
  private construirFranjasInstitucionales(): FranjaInstitucional[] {
    const franjas: FranjaInstitucional[] = [];

    for (let dia = 1; dia <= 5; dia++) {
      for (let hora = 7; hora < 22; hora++) {
        const horaInicio = `${hora.toString().padStart(2, "0")}:00`;
        const horaFin = `${(hora + 1).toString().padStart(2, "0")}:00`;
        if (
          !this.validacionesService.verificarFranjaInstitucional(
            horaInicio,
            horaFin,
          )
        ) {
          continue;
        }

        franjas.push({
          key: this.crearClaveSlot(dia, horaInicio, horaFin),
          dia_semana: dia,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
        });
      }
    }

    return franjas;
  }

  // Complejidad: O(Disp * H) → O(Disp * H)
  private preprocesarDisponibilidadPorDocente(
    disponibilidades: DisponibilidadDocente[],
    franjasInstitucionales: FranjaInstitucional[],
  ): Map<number, Set<string>> {
    const disponibilidadPorDocente = new Map<number, Set<string>>();

    for (const disponibilidad of disponibilidades) {
      const docenteId = disponibilidad.docente?.id;
      if (!docenteId) continue;

      let slots = disponibilidadPorDocente.get(docenteId);
      if (!slots) {
        slots = new Set<string>();
        disponibilidadPorDocente.set(docenteId, slots);
      }

      for (const franja of franjasInstitucionales) {
        if (franja.dia_semana !== disponibilidad.dia_semana) continue;
        if (
          this.min(disponibilidad.hora_inicio) <=
            this.min(franja.hora_inicio) &&
          this.min(disponibilidad.hora_fin) >= this.min(franja.hora_fin)
        ) {
          slots.add(franja.key);
        }
      }
    }

    return disponibilidadPorDocente;
  }

  // Complejidad: O(Prea * H) → O(Prea * H)
  private preprocesarPreasignacionesPorDocente(
    preasignaciones: Preasignacion[],
    franjasInstitucionales: FranjaInstitucional[],
  ): Map<number, Set<string>> {
    const preasignacionPorDocente = new Map<number, Set<string>>();

    for (const preasignacion of preasignaciones) {
      const docenteId = preasignacion.docente?.id;
      if (!docenteId) continue;

      let slots = preasignacionPorDocente.get(docenteId);
      if (!slots) {
        slots = new Set<string>();
        preasignacionPorDocente.set(docenteId, slots);
      }

      for (const franja of franjasInstitucionales) {
        if (franja.dia_semana !== preasignacion.dia_semana) continue;
        if (
          this.solapan(
            preasignacion.hora_inicio,
            preasignacion.hora_fin,
            franja.hora_inicio,
            franja.hora_fin,
          )
        ) {
          slots.add(franja.key);
        }
      }
    }

    return preasignacionPorDocente;
  }

  // Complejidad: O(B * H) → O(B * H)
  private preprocesarDisponibilidadPorAmbiente(
    ambientes: Map<number, Ambiente>,
    franjasInstitucionales: FranjaInstitucional[],
  ): Map<number, Set<string>> {
    const disponibilidadPorAmbiente = new Map<number, Set<string>>();
    const clavesFranjas = franjasInstitucionales.map((franja) => franja.key);

    for (const ambienteId of ambientes.keys()) {
      disponibilidadPorAmbiente.set(ambienteId, new Set(clavesFranjas));
    }

    return disponibilidadPorAmbiente;
  }

  // Complejidad: O(1) → O(1)
  private reservarSlot(
    docenteId: number,
    slotKey: string,
    ambienteId: number,
    slotsOcupadosPorDocente: Map<number, Set<string>>,
    cargaPorDocente: Map<number, number>,
    disponibilidadPorAmbiente: Map<number, Set<string>>,
  ): void {
    const slotsDocente =
      slotsOcupadosPorDocente.get(docenteId) ?? new Set<string>();
    slotsDocente.add(slotKey);
    slotsOcupadosPorDocente.set(docenteId, slotsDocente);

    cargaPorDocente.set(docenteId, (cargaPorDocente.get(docenteId) ?? 0) + 1);
    disponibilidadPorAmbiente.get(ambienteId)?.delete(slotKey);
  }

  // Complejidad: O(1) → O(1)
  private crearClaveSlot(
    dia: number,
    horaInicio: string,
    horaFin: string,
  ): string {
    return `${dia}|${horaInicio}|${horaFin}`;
  }

  // Complejidad: O(K) → O(K)
  private async invalidateHorariosCache(): Promise<void> {
    const prefixes = ["http_cache:GET:/horarios", "http_cache:GET:/dashboard"];

    for (const prefix of prefixes) {
      const keys = CacheKeyRegistry.findByPrefix(prefix);
      for (const key of keys) {
        await this.cacheManager.del(key);
        CacheKeyRegistry.forget(key);
      }
    }
  }
}
