import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
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

export interface ResultadoGeneracion {
  asignaciones_creadas: number;
  conflictos: number;
  detalle_conflictos: ConflictoAsignacion[];
}

interface SlotLibre {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  ambiente: Ambiente;
}

@Injectable()
export class AsignacionService {
  private readonly logger = new Logger(AsignacionService.name);

  constructor(
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
        .createQueryBuilder('disponibilidad')
        .leftJoinAndSelect('disponibilidad.docente', 'docente')
        .where('disponibilidad.periodo_academico = :periodo', { periodo })
        .andWhere('disponibilidad.disponible = :disponible', { disponible: true })
        .cache(`disponibilidad_periodo_${periodo}_asignacion`, 60000)
        .getMany();
      const preasignaciones = await this.preasignacionRepo
        .createQueryBuilder('preasignacion')
        .leftJoinAndSelect('preasignacion.docente', 'docente')
        .leftJoinAndSelect('preasignacion.ambiente', 'ambiente')
        .where('preasignacion.periodo_academico = :periodo', { periodo })
        .cache(`preasignaciones_periodo_${periodo}_asignacion`, 60000)
        .getMany();

      const asignaciones: HorarioAsignado[] = [];
      const conflictos: ConflictoAsignacion[] = [];

      for (const curso of cursos) {
        const docente = this.encontrarDocenteElegible(
          docentesOrdenados,
          asignaciones,
          disponibilidades,
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
          aulas,
          disponibilidades,
          preasignaciones,
          asignaciones,
          periodo,
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
            docente,
            curso,
            slotTeoria.ambiente,
            slotTeoria,
            TipoClase.TEORIA,
            periodo,
          ),
        );

        if (curso.tiene_laboratorio) {
          const slotLab = this.buscarSlotLibre(
            docente,
            laboratorios,
            disponibilidades,
            preasignaciones,
            asignaciones,
            periodo,
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
                docente,
                curso,
                slotLab.ambiente,
                slotLab,
                TipoClase.LABORATORIO,
                periodo,
              ),
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

  async limpiarHorario(
    periodo: string,
  ): Promise<{ eliminados: number; conflictos_eliminados: number }> {
    const resultH = await this.horarioRepo.delete({
      periodo_academico: periodo,
    });
    const resultC = await this.conflictoRepo.delete({
      periodo_academico: periodo,
    });
    return {
      eliminados: resultH.affected ?? 0,
      conflictos_eliminados: resultC.affected ?? 0,
    };
  }

  private encontrarDocenteElegible(
    docentesOrdenados: any[],
    asignaciones: HorarioAsignado[],
    disponibilidades: DisponibilidadDocente[],
  ): any | null {
    const MAX_HORAS = 20;

    for (const d of docentesOrdenados) {
      const tieneDisponibilidad = disponibilidades.some(
        (disp) => disp.docente?.id === d.id,
      );
      if (!tieneDisponibilidad) continue;

      const horasAsignadas = asignaciones.filter(
        (a) => a.docente?.id === d.id,
      ).length;
      if (horasAsignadas < MAX_HORAS) return d;
    }

    return null;
  }

  private buscarSlotLibre(
    docente: any,
    ambientes: Ambiente[],
    disponibilidades: DisponibilidadDocente[],
    preasignaciones: Preasignacion[],
    asignaciones: HorarioAsignado[],
    periodo: string,
  ): SlotLibre | null {
    for (let dia = 1; dia <= 5; dia++) {
      for (let hora = 7; hora < 22; hora++) {
        const horaInicio = `${hora.toString().padStart(2, "0")}:00`;
        const horaFin = `${(hora + 1).toString().padStart(2, "0")}:00`;

        if (
          !this.validacionesService.verificarFranjaInstitucional(
            horaInicio,
            horaFin,
          )
        )
          continue;

        const disponible = disponibilidades.some(
          (d) =>
            d.docente?.id === docente.id &&
            d.dia_semana === dia &&
            this.min(d.hora_inicio) <= this.min(horaInicio) &&
            this.min(d.hora_fin) >= this.min(horaFin),
        );
        if (!disponible) continue;

        const cruceDoc = asignaciones.some(
          (a) =>
            a.docente?.id === docente.id &&
            a.dia_semana === dia &&
            this.solapan(a.hora_inicio, a.hora_fin, horaInicio, horaFin),
        );
        if (cruceDoc) continue;

        const crucePrea = preasignaciones.some(
          (p) =>
            p.docente?.id === docente.id &&
            p.dia_semana === dia &&
            this.solapan(p.hora_inicio, p.hora_fin, horaInicio, horaFin),
        );
        if (crucePrea) continue;

        for (const ambiente of ambientes) {
          const cruceAmb = asignaciones.some(
            (a) =>
              a.ambiente?.id === ambiente.id &&
              a.dia_semana === dia &&
              this.solapan(a.hora_inicio, a.hora_fin, horaInicio, horaFin),
          );
          if (!cruceAmb) {
            return {
              dia_semana: dia,
              hora_inicio: horaInicio,
              hora_fin: horaFin,
              ambiente,
            };
          }
        }
      }
    }
    return null;
  }

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

  private min(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  private solapan(s1: string, e1: string, s2: string, e2: string): boolean {
    return this.min(s1) < this.min(e2) && this.min(e1) > this.min(s2);
  }
}
