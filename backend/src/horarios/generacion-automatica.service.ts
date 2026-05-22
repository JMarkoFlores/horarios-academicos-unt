import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { Docente } from "../entities/docente.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Grupo } from "../entities/grupo.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { CursoAmbiente } from "../entities/curso-ambiente.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { ModoAsignacion } from "../common/enums/modo-asignacion.enum";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";

interface SlotHorario {
  dia: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface ResultadoGeneracion {
  totalDocentes: number;
  docentesAtendidos: number;
  horariosGenerados: number;
  conflictos: string[];
  detallePorDocente: DetalleDocente[];
}

export interface DetalleDocente {
  docenteId: number;
  nombre: string;
  horariosGenerados: number;
  horariosPendientes: number;
  errores: string[];
}

@Injectable()
export class GeneracionAutomaticaService {
  private readonly logger = new Logger(GeneracionAutomaticaService.name);
  private readonly DIAS_SEMANA = [1, 2, 3, 4, 5, 6]; // Lun-Sáb
  private readonly HORAS_INICIO = [
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ];
  private readonly DURACION_BLOQUE = 2; // horas por bloque

  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(DocenteCurso)
    private readonly docenteCursoRepo: Repository<DocenteCurso>,
    @InjectRepository(CursoAmbiente)
    private readonly cursoAmbienteRepo: Repository<CursoAmbiente>,
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
    @InjectRepository(ParametrosCarga)
    private readonly parametrosCargaRepo: Repository<ParametrosCarga>,
  ) {}

  async generarHorarios(periodoCodigo: string): Promise<ResultadoGeneracion> {
    this.logger.log(`[Generación] Iniciando para período ${periodoCodigo}`);

    const periodo = await this.periodoRepo.findOne({
      where: { codigo: periodoCodigo },
    });
    if (!periodo)
      throw new BadRequestException(`Período ${periodoCodigo} no encontrado`);

    // Solo permitir generación en modo AUTOMATICA o MIXTA
    if (periodo.modo_asignacion === ModoAsignacion.VENTANAS) {
      throw new BadRequestException(
        "Este período está configurado solo para ventanas de atención",
      );
    }

    // Limpiar horarios auto-generados previos del período
    const previos = await this.horarioRepo.find({
      where: {
        periodo: periodoCodigo,
        origen: OrigenHorario.GENERACION_AUTOMATICA,
      },
    });
    if (previos.length > 0) {
      this.logger.log(
        `[Generación] Eliminando ${previos.length} horarios auto-generados previos`,
      );
      await this.horarioRepo.remove(previos);
    }

    const resultado: ResultadoGeneracion = {
      totalDocentes: 0,
      docentesAtendidos: 0,
      horariosGenerados: 0,
      conflictos: [],
      detallePorDocente: [],
    };

    // Obtener docentes activos ordenados por jerarquía: categoría luego tipo_contrato luego fecha_ingreso
    const docentes = await this.docenteRepo.find({
      where: { activo: true },
      order: {
        categoria: "ASC",
        tipo_contrato: "ASC",
        fecha_ingreso: "ASC",
      },
    });

    resultado.totalDocentes = docentes.length;

    // Obtener todos los grupos del período
    const grupos = await this.grupoRepo.find({
      where: { periodo_academico: { id: periodo.id } },
      relations: ["curso"],
    });

    // Obtener disponibilidades del período
    const disponibilidades = await this.disponibilidadRepo.find({
      where: { periodo_academico: periodoCodigo },
    });

    // Obtener horarios existentes (para evitar cruces)
    const horariosExistentes = await this.horarioRepo.find({
      where: { periodo: periodoCodigo },
      relations: ["docente", "ambiente", "grupo"],
    });

    // Cargar parámetros de carga para el período
    const parametrosCarga = await this.parametrosCargaRepo.find({
      where: { periodo_academico: periodoCodigo },
    });
    const parametrosMap = new Map<string, ParametrosCarga>();
    for (const p of parametrosCarga) {
      parametrosMap.set(
        `${p.tipo_docente}_${p.categoria}_${p.modalidad ?? ""}`,
        p,
      );
    }

    // Rastreo de horas semanales y cursos por docente en este período
    const horasSemanalesDocente = new Map<number, number>();
    const cursosDocenteSet = new Map<number, Set<number>>();

    // Para cada docente, generar horarios
    for (const docente of docentes) {
      const detalle: DetalleDocente = {
        docenteId: docente.id,
        nombre: `${docente.apellidos}, ${docente.nombres}`,
        horariosGenerados: 0,
        horariosPendientes: 0,
        errores: [],
      };

      // Obtener parámetros para este docente
      const pKey = `${docente.tipo_docente}_${docente.categoria}_${docente.modalidad ?? ""}`;
      const parametro = parametrosMap.get(pKey);
      const maxHorasSemanal = parametro?.horas_max_semanal ?? 999;
      const maxCursos = parametro?.cursos_max_docente ?? 999;

      if (!horasSemanalesDocente.has(docente.id))
        horasSemanalesDocente.set(docente.id, 0);
      if (!cursosDocenteSet.has(docente.id))
        cursosDocenteSet.set(docente.id, new Set());

      // Obtener cursos asignados al docente en este período
      const docenteCursos = await this.docenteCursoRepo.find({
        where: { docenteId: docente.id, periodoId: periodo.id },
        relations: ["curso"],
      });

      if (docenteCursos.length === 0) {
        detalle.errores.push("No tiene cursos asignados");
        resultado.detallePorDocente.push(detalle);
        continue;
      }

      for (const dc of docenteCursos) {
        const curso = dc.curso;
        const tipoClase = dc.tipo_clase;

        // Obtener ambientes compatibles para este curso y tipo de clase
        const cursoAmbientes = await this.cursoAmbienteRepo.find({
          where: { cursoId: curso.id, tipo_clase: tipoClase },
          relations: ["ambiente"],
        });

        if (cursoAmbientes.length === 0) {
          detalle.errores.push(
            `Curso ${curso.nombre}: no tiene ambientes para ${tipoClase}`,
          );
          continue;
        }

        // Buscar grupo del curso en este período
        const gruposCurso = grupos.filter((g) => g.curso.id === curso.id);
        if (gruposCurso.length === 0) {
          detalle.errores.push(
            `Curso ${curso.nombre}: no hay grupos en este período`,
          );
          continue;
        }

        // Para cada grupo, asignar slots
        for (const grupo of gruposCurso) {
          // Determinar cuántas horas necesita
          const horasRequeridas =
            tipoClase === TipoClase.TEORIA
              ? curso.horas_teoria || 0
              : curso.horas_laboratorio || 0;

          if (horasRequeridas === 0) continue;

          const bloquesNecesarios = Math.ceil(
            horasRequeridas / this.DURACION_BLOQUE,
          );
          let bloquesAsignados = 0;

          for (const dia of this.DIAS_SEMANA) {
            if (bloquesAsignados >= bloquesNecesarios) break;

            for (const hora of this.HORAS_INICIO) {
              if (bloquesAsignados >= bloquesNecesarios) break;

              const horaFin = this.sumarHoras(hora, this.DURACION_BLOQUE);

              // Validar disponibilidad del docente
              const dispDocente = disponibilidades.filter(
                (d) =>
                  d.docente.id === docente.id &&
                  d.dia_semana === dia &&
                  d.hora_inicio <= hora &&
                  d.hora_fin >= horaFin &&
                  d.disponible,
              );
              // Si tiene disponibilidades registradas pero ninguna cubre este slot, saltar
              const tieneDisponibilidades = disponibilidades.some(
                (d) => d.docente.id === docente.id,
              );
              if (tieneDisponibilidades && dispDocente.length === 0) continue;

              // Validar límite de horas semanales según ParametrosCarga
              const horasActuales = horasSemanalesDocente.get(docente.id) ?? 0;
              if (horasActuales + this.DURACION_BLOQUE > maxHorasSemanal) break;

              // Validar límite de cursos según ParametrosCarga
              const cursosSet = cursosDocenteSet.get(docente.id) ?? new Set();
              const esCursoNuevo = !cursosSet.has(curso.id);
              if (esCursoNuevo && cursosSet.size >= maxCursos) break;

              // Validar cruce de docente
              const cruceDocente = horariosExistentes.some(
                (h) =>
                  h.docente.id === docente.id &&
                  h.dia === dia &&
                  h.hora_inicio < horaFin &&
                  h.hora_fin > hora,
              );
              if (cruceDocente) continue;

              // Buscar ambiente libre
              let ambienteAsignado: Ambiente | null = null;
              for (const ca of cursoAmbientes) {
                const amb = ca.ambiente;
                const cruceAmbiente = horariosExistentes.some(
                  (h) =>
                    h.ambiente.id === amb.id &&
                    h.dia === dia &&
                    h.hora_inicio < horaFin &&
                    h.hora_fin > hora,
                );
                if (!cruceAmbiente) {
                  ambienteAsignado = amb;
                  break;
                }
              }

              if (!ambienteAsignado) {
                continue; // Ningún ambiente libre
              }

              // Validar cruce de grupo
              const cruceGrupo = horariosExistentes.some(
                (h) =>
                  h.grupo.id === grupo.id &&
                  h.dia === dia &&
                  h.hora_inicio < horaFin &&
                  h.hora_fin > hora,
              );
              if (cruceGrupo) continue;

              // Crear horario
              const nuevoHorario = this.horarioRepo.create({
                docente_id: docente.id,
                curso_id: curso.id,
                grupo_id: grupo.id,
                ambiente_id: ambienteAsignado.id,
                periodo: periodoCodigo,
                dia,
                hora_inicio: hora,
                hora_fin: horaFin,
                tipo_clase: tipoClase,
                estado: EstadoHorario.BORRADOR,
                origen: OrigenHorario.GENERACION_AUTOMATICA,
              });

              const guardado = await this.horarioRepo.save(nuevoHorario);
              horariosExistentes.push(guardado as any);
              horasSemanalesDocente.set(
                docente.id,
                (horasSemanalesDocente.get(docente.id) ?? 0) +
                  this.DURACION_BLOQUE,
              );
              cursosDocenteSet.get(docente.id).add(curso.id);
              detalle.horariosGenerados++;
              resultado.horariosGenerados++;
              bloquesAsignados++;
            }
          }

          if (bloquesAsignados < bloquesNecesarios) {
            detalle.horariosPendientes += bloquesNecesarios - bloquesAsignados;
            detalle.errores.push(
              `Curso ${curso.nombre} (${tipoClase}): solo se asignaron ${bloquesAsignados * this.DURACION_BLOQUE}h de ${horasRequeridas}h`,
            );
          }
        }
      }

      if (detalle.horariosGenerados > 0) {
        resultado.docentesAtendidos++;
      }
      resultado.detallePorDocente.push(detalle);
    }

    this.logger.log(
      `[Generación] Finalizado: ${resultado.horariosGenerados} horarios para ${resultado.docentesAtendidos} docentes`,
    );

    return resultado;
  }

  async publicarHorariosAutoGenerados(
    periodoCodigo: string,
  ): Promise<{ publicados: number }> {
    const result = await this.horarioRepo.update(
      {
        periodo: periodoCodigo,
        origen: OrigenHorario.GENERACION_AUTOMATICA,
        estado: EstadoHorario.BORRADOR,
      },
      { estado: EstadoHorario.PUBLICADO },
    );
    return { publicados: result.affected || 0 };
  }

  private sumarHoras(hora: string, horas: number): string {
    const [h, m] = hora.split(":").map(Number);
    const total = (h || 0) + horas;
    return `${total.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }
}
