import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { UsuarioAutenticado } from "../common/interfaces/contexto-academico.interface";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Curso } from "../entities/curso.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { AuditoriaHorario } from "../entities/auditoria-horario.entity";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { Departamento } from "../entities/departamento.entity";
import { DiaActivo } from "../entities/dia-activo.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { ConfiguracionGeneral } from "../entities/configuracion-general.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";
import { DashboardGateway } from "./dashboard.gateway";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(ConflictoAsignacion)
    private readonly conflictoRepo: Repository<ConflictoAsignacion>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Curso) private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(DisponibilidadDocente)
    private readonly disponibilidadRepo: Repository<DisponibilidadDocente>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(AuditoriaHorario)
    private readonly auditoriaRepo: Repository<AuditoriaHorario>,
    @InjectRepository(DeclaracionCargaHoraria)
    private readonly declaracionRepo: Repository<DeclaracionCargaHoraria>,
    @InjectRepository(Departamento)
    private readonly departamentoRepo: Repository<Departamento>,
    @InjectRepository(DiaActivo)
    private readonly diaActivoRepo: Repository<DiaActivo>,
    @InjectRepository(TurnoHorario)
    private readonly turnoHorarioRepo: Repository<TurnoHorario>,
    @InjectRepository(RestriccionInstitucional)
    private readonly restriccionRepo: Repository<RestriccionInstitucional>,
    @InjectRepository(ConfiguracionGeneral)
    private readonly configGeneralRepo: Repository<ConfiguracionGeneral>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly dashboardGateway: DashboardGateway,
  ) {}

  // Helper methods for time formatting with minute support
  private formatTime(decimalHours: number): string {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  async getKPIs(periodo: string, usuario?: UsuarioAutenticado, top = 5, recent = 10) {
    const ctx = usuario?.contextoAcademico;
    const deptoIds = (!ctx?.verTodo && ctx?.departamentoIds?.length) ? ctx.departamentoIds : null;

    // Temporarily disable cache to ensure configuration is always respected
    // const cacheKey = `dashboard_kpis_${periodo}_${top}_${recent}_${deptoIds?.join(',') ?? 'all'}`;
    // const cachedData = await this.cacheManager.get(cacheKey);
    // if (cachedData) return cachedData;

    let deptoDocenteIds: number[] | null = null;
    if (deptoIds) {
      const docentesDepto = await this.docenteRepo.find({
        where: { activo: true, departamento_id: In(deptoIds) },
        select: ['id'],
      });
      deptoDocenteIds = docentesDepto.map(d => d.id);
    }

    let horarios: HorarioAsignado[] = [];
    let docentes: Docente[] = [];
    let ambientes: Ambiente[] = [];

    const fetchSection = async <T>(
      label: string,
      fn: () => Promise<T>,
      fallback: T,
    ): Promise<T> => {
      try {
        return await fn();
      } catch (e) {
        return fallback;
      }
    };

    const [
      totalDocentes,
      totalAulas,
      totalLaboratorios,
      totalCursos,
      conflictosActivos,
      totalConflictos,
      docentesConDisponibilidad,
      periodoActivo,
      ultimaGeneracion,
    ] = await Promise.all([
      fetchSection(
        "totalDocentes",
        () => this.docenteRepo.count({
          where: deptoDocenteIds ? { activo: true, id: In(deptoDocenteIds) } : { activo: true }
        }),
        0,
      ),
      fetchSection(
        "totalAulas",
        () =>
          this.ambienteRepo.count({
            where: { tipo: TipoAmbiente.AULA, activo: true },
          }),
        0,
      ),
      fetchSection(
        "totalLaboratorios",
        () =>
          this.ambienteRepo.count({
            where: { tipo: TipoAmbiente.LABORATORIO, activo: true },
          }),
        0,
      ),
      fetchSection(
        "totalCursos",
        () => this.cursoRepo.count({ where: { activo: true } }),
        0,
      ),
      fetchSection(
        "conflictosActivos",
        () =>
          this.conflictoRepo.count({
            where: {
              periodo_academico: periodo,
              resuelto: false,
              ...(deptoDocenteIds ? { docente_id: In(deptoDocenteIds) } : {}),
            },
          }),
        0,
      ),
      fetchSection(
        "totalConflictos",
        () =>
          this.conflictoRepo.count({
            where: {
              periodo_academico: periodo,
              ...(deptoDocenteIds ? { docente_id: In(deptoDocenteIds) } : {}),
            },
          }),
        0,
      ),
      fetchSection(
        "docentesConDisponibilidad",
        () => {
          let qb = this.disponibilidadRepo
            .createQueryBuilder("d")
            .select("COUNT(DISTINCT d.docente_id)", "count")
            .where("d.periodo_academico = :periodo", { periodo });
          if (deptoDocenteIds) {
            qb = qb.andWhere("d.docente_id IN (:...ids)", { ids: deptoDocenteIds });
          }
          return qb.getRawOne().then((r) => Number(r?.count ?? 0));
        },
        0,
      ),
      fetchSection(
        "periodoActivo",
        () =>
          this.periodoRepo.findOne({
            where: { codigo: periodo },
            select: ["estado", "fecha_inicio", "fecha_fin"],
          }),
        null,
      ),
      fetchSection(
        "ultimaGeneracion",
        () =>
          this.auditoriaRepo
            .createQueryBuilder("a")
            .select(["a.accion", "a.creado_en"])
            .where("a.accion LIKE :accion", { accion: "%generar%" })
            .orderBy("a.creado_en", "DESC")
            .limit(1)
            .getOne(),
        null,
      ),
    ]);

    horarios = await fetchSection(
      "horarios",
      () => {
        let qb = this.horarioRepo
          .createQueryBuilder("horario")
          .leftJoinAndSelect("horario.docente", "docente")
          .leftJoinAndSelect("horario.curso", "curso")
          .leftJoinAndSelect("horario.ambiente", "ambiente")
          .leftJoinAndSelect("horario.grupo", "grupo")
          .where("horario.periodo = :periodo", { periodo });
        if (deptoDocenteIds) {
          qb = qb.andWhere("horario.docente_id IN (:...ids)", { ids: deptoDocenteIds });
        }
        return qb.cache(`horarios_periodo_${periodo}_dashboard_kpis_${deptoDocenteIds?.join(',') ?? 'all'}`, 60000).getMany();
      },
      [],
    );
    docentes = await fetchSection(
      "docentes",
      () => this.docenteRepo.find({
        where: deptoDocenteIds ? { activo: true, id: In(deptoDocenteIds) } : { activo: true }
      }),
      [],
    );
    ambientes = await fetchSection(
      "ambientes",
      () => this.ambienteRepo.find({ where: { activo: true } }),
      [],
    );

    const docentesConHorario = new Set(
      horarios.map((h) => h.docente?.id).filter(Boolean),
    ).size;
    const cursosAsignados = new Set(
      horarios.map((h) => h.curso?.id).filter(Boolean),
    ).size;
    const aulasOcupadas = new Set(
      horarios
        .filter((h) => h.ambiente?.tipo === TipoAmbiente.AULA)
        .map((h) => h.ambiente?.id),
    ).size;
    const laboratoriosOcupados = new Set(
      horarios
        .filter((h) => h.ambiente?.tipo === TipoAmbiente.LABORATORIO)
        .map((h) => h.ambiente?.id),
    ).size;

    const horasMap = new Map<number, number>();
    for (const h of horarios) {
      if (!h.docente?.id) continue;
      const dur = this.calcularDuracion(h.hora_inicio, h.hora_fin);
      horasMap.set(h.docente.id, (horasMap.get(h.docente.id) ?? 0) + dur);
    }
    const horasArr = [...horasMap.values()];
    const horasPromedio =
      horasArr.length > 0
        ? horasArr.reduce((a, b) => a + b, 0) / horasArr.length
        : 0;
    const horasMediana = this.calcularMediana(horasArr);

    // ── Distribucion por categoria ──
    const categorias = [...new Set(docentes.map((d) => d.categoria))];
    const distribucionCategoria = categorias.map((cat) => {
      const grupo = docentes.filter((d) => d.categoria === cat);
      const conHorario = grupo.filter((d) => horasMap.has(d.id)).length;
      const modalidades = [...new Set(grupo.map((d) => d.tipo_contrato))];
      return {
        categoria: cat,
        modalidad: modalidades.join(", "),
        total: grupo.length,
        con_horario: conHorario,
        porcentaje:
          grupo.length > 0 ? Math.round((conHorario / grupo.length) * 100) : 0,
      };
    });

    // ── Top / Bottom carga ──
    const docentesCarga = docentes
      .map((d) => ({
        nombre: `${d.apellidos}, ${d.nombres}`,
        categoria: d.categoria,
        horas: horasMap.get(d.id) ?? 0,
      }))
      .sort((a, b) => b.horas - a.horas);
    const topMayor = docentesCarga.slice(0, top);
    const topMenor = [...docentesCarga]
      .sort((a, b) => a.horas - b.horas)
      .slice(0, top);

    // ── Ocupación por ambiente ──
    const ambSchedules = await fetchSection(
      "ambSchedules",
      async () =>
        this.horarioRepo
          .createQueryBuilder("h")
          .select("h.ambiente_id", "ambiente_id")
          .addSelect("MIN(h.hora_inicio)", "min_hora")
          .addSelect("MAX(h.hora_fin)", "max_hora")
          .addSelect("COUNT(DISTINCT h.dia)", "dias")
          .where("h.periodo = :periodo", { periodo })
          .groupBy("h.ambiente_id")
          .getRawMany()
          .then((rows) =>
            rows.map((r) => ({
              ambiente_id: Number(r.ambiente_id ?? 0),
              min_hora: r.min_hora || "07:00",
              max_hora: r.max_hora || "22:00",
              dias: Number(r.dias ?? 5),
            })),
          ),
      [],
    );
    const ocupacionAmbiente = ambientes
      .map((a) => {
        const horasAmb = horarios
          .filter((h) => h.ambiente?.id === a.id)
          .reduce(
            (sum, h) => sum + this.calcularDuracion(h.hora_inicio, h.hora_fin),
            0,
          );
        const sched = ambSchedules.find((s) => s.ambiente_id === a.id);
        const span = sched
          ? this.calcularDuracion(sched.min_hora, sched.max_hora)
          : 15;
        const maxHours = Math.round(span * (sched?.dias ?? 5)) || 75;
        return {
          codigo: a.codigo,
          tipo: a.tipo,
          capacidad: a.capacidad,
          porcentaje_ocupacion: Math.round((horasAmb / maxHours) * 100),
        };
      })
      .sort((a, b) => b.porcentaje_ocupacion - a.porcentaje_ocupacion);

    // ── Mapa de calor ──
    // Get configuration for days and time slots
    let diasActivos: DiaActivo[] = [];
    let horaInicio = 7;
    let horaFin = 21;
    let duracionBloque = 1; // Default 1 hour blocks

    try {
      diasActivos = await this.diaActivoRepo.find({
        where: { activo: true },
        order: { dia_semana: "ASC" },
      });
      console.log('[Dashboard] Días activos encontrados:', diasActivos.map(d => ({ nombre: d.nombre, dia_semana: d.dia_semana })));
    } catch (e) {
      console.error('[Dashboard] Error cargando días activos:', e);
      // Fallback to default days
      diasActivos = [
        { id: 1, nombre: "Lunes", dia_semana: 1, activo: true } as any,
        { id: 2, nombre: "Martes", dia_semana: 2, activo: true } as any,
        { id: 3, nombre: "Miércoles", dia_semana: 3, activo: true } as any,
        { id: 4, nombre: "Jueves", dia_semana: 4, activo: true } as any,
        { id: 5, nombre: "Viernes", dia_semana: 5, activo: true } as any,
      ];
    }

    if (diasActivos.length === 0) {
      console.log('[Dashboard] No hay días activos, usando defaults');
      diasActivos = [
        { id: 1, nombre: "Lunes", dia_semana: 1, activo: true } as any,
        { id: 2, nombre: "Martes", dia_semana: 2, activo: true } as any,
        { id: 3, nombre: "Miércoles", dia_semana: 3, activo: true } as any,
        { id: 4, nombre: "Jueves", dia_semana: 4, activo: true } as any,
        { id: 5, nombre: "Viernes", dia_semana: 5, activo: true } as any,
      ];
    }

    try {
      // First try to get from restricciones (FRANJA_HORARIA) as it's the primary config
      const franjaRestriccion = await this.restriccionRepo.findOne({
        where: {
          tipo_restriccion: "FRANJA_HORARIA",
          periodo_academico: periodo,
          activo: true,
        },
      });
      if (franjaRestriccion && franjaRestriccion.valor) {
        const valor = franjaRestriccion.valor as any;
        if (valor.hora_inicio && valor.hora_fin) {
          const [hi] = valor.hora_inicio.split(":").map(Number);
          const [hf, hfMin] = valor.hora_fin.split(":").map(Number);
          horaInicio = hi;
          horaFin = hf + (hfMin / 60);
          console.log('[Dashboard] Franja horaria desde restricción:', horaInicio, '-', horaFin, '(decimal)');
        }
      } else {
        // Fallback to turnos if no restriction found
        const turnos = await this.turnoHorarioRepo.find({
          where: { activo: true },
          order: { hora_inicio: "ASC" },
        });
        console.log('[Dashboard] Turnos horarios encontrados:', turnos.map(t => ({ nombre: t.nombre, hora_inicio: t.hora_inicio, hora_fin: t.hora_fin })));
        if (turnos.length > 0) {
          const [hi] = turnos[0].hora_inicio.split(":").map(Number);
          const [hf, hfMin] = turnos[turnos.length - 1].hora_fin.split(":").map(Number);
          horaInicio = hi;
          horaFin = hf + (hfMin / 60); // Include minutes in decimal
          console.log('[Dashboard] Franja horaria desde turnos:', horaInicio, '-', horaFin, '(decimal)');
        }
      }
    } catch (e) {
      console.error('[Dashboard] Error cargando configuración de franja horaria:', e);
      // Keep defaults
    }

    try {
      // Try multiple possible type names for duration block
      const tipos = ["DURACION_BLOQUE", "duracion_bloque_estandar", "duracion_bloque"];
      let restriccion = null;
      for (const tipo of tipos) {
        restriccion = await this.restriccionRepo.findOne({
          where: {
            tipo_restriccion: tipo,
            periodo_academico: periodo,
            activo: true,
          },
        });
        if (restriccion) break;
      }
      console.log('[Dashboard] Restricción duración bloque:', restriccion);
      if (restriccion && restriccion.valor) {
        // valor is jsonb, could be number or object
        const valor = restriccion.valor as any;
        if (typeof valor === "number") {
          duracionBloque = valor;
        } else if (typeof valor === "object" && valor !== null) {
          // Try to extract value from object - seed uses duracion_minutos
          if (valor.duracion_minutos) {
            duracionBloque = valor.duracion_minutos / 60; // Convert minutes to hours
          } else {
            duracionBloque = valor.valor || valor.duracion || valor.duracion_bloque || 1;
          }
        }
        console.log('[Dashboard] Duración bloque (en horas):', duracionBloque);
      }
    } catch (e) {
      console.error('[Dashboard] Error cargando restricción:', e);
      // Keep default
    }

    console.log('[Dashboard] Config final usada:', { dias: diasActivos.map(d => d.nombre), horaInicio, horaFin, duracionBloque });

    const diasNombre: Record<number, string> = {};
    diasActivos.forEach((d) => {
      diasNombre[d.dia_semana] = d.nombre;
    });

    const maxPorSlot = ambientes.length || 1;
    const mapaCalor: any[] = [];

    for (const diaActivo of diasActivos) {
      const dia = diaActivo.dia_semana;
      console.log('[Dashboard] Generando slots para día', dia, 'con horaInicio:', horaInicio, 'horaFin:', horaFin, 'duracionBloque:', duracionBloque);
      for (let hora = horaInicio; hora < horaFin; hora += duracionBloque) {
        // Support minute-based blocks (e.g., 0.5 for 30 minutes, 0.75 for 45 minutes)
        const hDecimal = hora;
        const hEndDecimal = hora + duracionBloque;
        
        // Don't create a slot if it would exceed horaFin
        // Allow slots that end exactly at horaFin (use > instead of >=)
        if (hEndDecimal > horaFin) {
          console.log('[Dashboard] Skipping slot', hDecimal, '-', hEndDecimal, 'because hEndDecimal > horaFin:', horaFin);
          break;
        }
        
        // Format hours with minutes support
        const hStr = this.formatTime(hDecimal);
        const sig = this.formatTime(hEndDecimal);
        const rangoHora = `${hStr}-${sig}`; // Full range for frontend
        const [slotIni, slotFin] = [hDecimal, hEndDecimal];
        console.log('[Dashboard] Creating slot:', rangoHora);
        const asig = horarios.filter(
          (h) => h.dia === dia && this.timeToMinutes(h.hora_fin) > this.timeToMinutes(hStr) && this.timeToMinutes(h.hora_inicio) < this.timeToMinutes(sig),
        );
        let totalHoras = 0,
          labHoras = 0;
        for (const h of asig) {
          const hiMinutes = this.timeToMinutes(h.hora_inicio);
          const hfMinutes = this.timeToMinutes(h.hora_fin);
          const slotIniMinutes = this.timeToMinutes(hStr);
          const slotFinMinutes = this.timeToMinutes(sig);
          const overlap = Math.min(hfMinutes, slotFinMinutes) - Math.max(hiMinutes, slotIniMinutes);
          const contribucion = Math.max(0, overlap) / 60; // Convert minutes to hours
          totalHoras += contribucion;
          if (h.tipo_clase === TipoClase.LABORATORIO) labHoras += contribucion;
        }
        const cursoInfo = asig.map((h) => h.curso?.nombre).filter(Boolean);
        const teoriaHoras = totalHoras - labHoras;
        let tipo_clase = null;
        if (totalHoras > 0) {
          if (labHoras > teoriaHoras) tipo_clase = "LABORATORIO";
          else if (teoriaHoras > labHoras) tipo_clase = "TEORIA";
          else tipo_clase = labHoras > 0 ? "MIXTO" : "TEORIA";
        }
        mapaCalor.push({
          dia: diasNombre[dia],
          hora: rangoHora, // Send full range to frontend
          intensidad: Math.min(
            100,
            Math.round((totalHoras / maxPorSlot) * 100),
          ),
          tipo_clase,
          cursos: [...new Set(cursoInfo)],
        });
      }
    }

    // ── Actividad reciente ──
    const ahora = new Date();
    const actividadReciente = horarios
      .filter((h) => h.created_at)
      .sort(
        (a, b) =>
          (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0),
      )
      .slice(0, recent)
      .map((h) => ({
        timestamp: h.created_at ?? ahora,
        descripcion: `Asignación: ${h.curso?.nombre || "Curso"} - ${h.docente?.apellidos || "Docente"} (${h.ambiente?.codigo || "Ambiente"})`,
        tipo: h.tipo_clase === TipoClase.LABORATORIO ? "LABORATORIO" : "TEORIA",
      }));

    const progresoSemanal = this.calcularProgresoSemanal(horarios);
    const docentesSinDisponibilidad = totalDocentes - docentesConDisponibilidad;
    const cursosSinAsignar = totalCursos - cursosAsignados;
    const conflictosResueltos = totalConflictos - conflictosActivos;
    const tasaResolucion =
      totalConflictos > 0
        ? Math.round((conflictosResueltos / totalConflictos) * 100)
        : 100;

    // ── Histograma carga docente ──
    const rangos = [
      { desde: 0, hasta: 10, label: "0-10h" },
      { desde: 10, hasta: 20, label: "10-20h" },
      { desde: 20, hasta: 30, label: "20-30h" },
      { desde: 30, hasta: 40, label: "30-40h" },
      { desde: 40, hasta: Infinity, label: "40h+" },
    ];
    const histogramaCarga = rangos.map((rango) => ({
      label: rango.label,
      count: horasArr.filter((h) => h >= rango.desde && h < rango.hasta).length,
    }));

    // ── Tiempo promedio resolución conflictos ──
    let tiempoPromedioResolucionHoras: number | null = null;
    try {
      const conflictosResueltos = totalConflictos - conflictosActivos;
      if (conflictosResueltos > 0 && totalConflictos > 0) {
        tiempoPromedioResolucionHoras = Math.round((1 / totalConflictos) * 24);
      }
    } catch (e) {}

    // ── Tendencias vs periodo anterior ──
    const tendencia: Record<string, number> = {};
    try {
      const periodoActual = await this.periodoRepo.findOne({
        where: { codigo: periodo },
      });
      if (periodoActual?.fecha_inicio) {
        const [anio, ciclo] = periodo.split("-");
        const periodosAnteriores =
          ciclo === "I" ? `${Number(anio) - 1}-II` : `${anio}-I`;
        const prevHorarios = await this.horarioRepo.count({
          where: { periodo: periodosAnteriores },
        });
        const currentHorarios = horarios.length;
        const prevConflictos = await this.conflictoRepo.count({
          where: { periodo_academico: periodosAnteriores },
        });
        if (prevHorarios > 0) {
          tendencia["asignaciones"] = Math.round(
            ((currentHorarios - prevHorarios) / prevHorarios) * 100,
          );
        }
        if (prevConflictos > 0) {
          tendencia["conflictos"] = Math.round(
            ((totalConflictos - prevConflictos) / prevConflictos) * 100,
          );
        }
        const prevDocentes = await this.docenteRepo.count({
          where: { activo: true },
        });
        if (prevDocentes > 0) {
          tendencia["docentes"] = Math.round(
            ((totalDocentes - prevDocentes) / prevDocentes) * 100,
          );
        }
      }
    } catch (e) {}

    const result = {
      total_docentes: totalDocentes,
      docentes_con_horario: docentesConHorario,
      docentes_pendientes: totalDocentes - docentesConHorario,
      porcentaje_docentes_asignados:
        totalDocentes > 0
          ? Math.round((docentesConHorario / totalDocentes) * 100)
          : 0,
      docentes_sin_disponibilidad: docentesSinDisponibilidad,
      porcentaje_docentes_con_disponibilidad:
        totalDocentes > 0
          ? Math.round((docentesConDisponibilidad / totalDocentes) * 100)
          : 0,
      total_aulas: totalAulas,
      aulas_ocupadas: aulasOcupadas,
      porcentaje_ocupacion_aulas:
        totalAulas > 0 ? Math.round((aulasOcupadas / totalAulas) * 100) : 0,
      total_laboratorios: totalLaboratorios,
      laboratorios_ocupados: laboratoriosOcupados,
      porcentaje_ocupacion_laboratorios:
        totalLaboratorios > 0
          ? Math.round((laboratoriosOcupados / totalLaboratorios) * 100)
          : 0,
      total_cursos: totalCursos,
      cursos_asignados: cursosAsignados,
      cursos_sin_asignar: cursosSinAsignar,
      conflictos_activos: conflictosActivos,
      conflictos_resueltos: conflictosResueltos,
      tasa_resolucion_conflictos: tasaResolucion,
      total_conflictos: totalConflictos,
      horas_promedio_por_docente: Math.round(horasPromedio * 10) / 10,
      horas_mediana_por_docente: Math.round(horasMediana * 10) / 10,
      distribucion_por_categoria: distribucionCategoria,
      top_docentes_mayor_carga: topMayor,
      top_docentes_menor_carga: topMenor,
      ocupacion_por_ambiente: ocupacionAmbiente,
      mapa_calor: mapaCalor,
      heatmap_config: {
        dias: diasActivos.map(d => d.nombre),
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        duracion_bloque: duracionBloque,
      },
      actividad_reciente: actividadReciente,
      progreso_semanal: progresoSemanal,
      estado_periodo: periodoActivo?.estado ?? "desconocido",
      fecha_inicio_periodo: periodoActivo?.fecha_inicio ?? null,
      fecha_fin_periodo: periodoActivo?.fecha_fin ?? null,
      ultima_generacion_horario: ultimaGeneracion?.creado_en ?? null,
      histograma_carga: histogramaCarga,
      tiempo_promedio_resolucion_horas: tiempoPromedioResolucionHoras,
      colores_config: await this.obtenerConfiguracionColores(),
      tendencia,
    };

    // await this.cacheManager.set(cacheKey, result, 60000);
    return result;
  }

  async getAlerts(periodo: string, usuario?: UsuarioAutenticado) {
    const ctx = usuario?.contextoAcademico;
    const deptoIds = (!ctx?.verTodo && ctx?.departamentoIds?.length) ? ctx.departamentoIds : null;

    let deptoDocenteIds: number[] | null = null;
    if (deptoIds) {
      const docentesDepto = await this.docenteRepo.find({
        where: { activo: true, departamento_id: In(deptoIds) },
        select: ['id'],
      });
      deptoDocenteIds = docentesDepto.map(d => d.id);
    }

    const fetchSection = async <T>(
      fn: () => Promise<T>,
      fallback: T,
    ): Promise<T> => {
      try {
        return await fn();
      } catch {
        return fallback;
      }
    };

    const [totalDocentes, totalCursos, conflictos, horarios] =
      await Promise.all([
        fetchSection(
          () => this.docenteRepo.count({
            where: deptoDocenteIds ? { activo: true, id: In(deptoDocenteIds) } : { activo: true }
          }),
          0,
        ),
        fetchSection(
          () => this.cursoRepo.count({ where: { activo: true } }),
          0,
        ),
        fetchSection(
          () =>
            this.conflictoRepo.find({
              where: {
                periodo_academico: periodo,
                resuelto: false,
                ...(deptoDocenteIds ? { docente_id: In(deptoDocenteIds) } : {}),
              },
              take: 20,
              order: { created_at: "DESC" },
            }),
          [],
        ),
        fetchSection(
          () => {
            const whereClause: any = { periodo };
            if (deptoDocenteIds) {
              whereClause.docente_id = In(deptoDocenteIds);
            }
            return this.horarioRepo.find({
              where: whereClause,
              select: ["docente_id", "curso_id"],
            });
          },
          [],
        ),
      ]);

    const docentesConHorario = new Set(
      horarios.map((h) => h.docente_id).filter(Boolean),
    ).size;
    const cursosAsignados = new Set(
      horarios.map((h) => h.curso_id).filter(Boolean),
    ).size;

    return {
      conflictos_activos: conflictos.length,
      conflictos_detalle: conflictos.map((c) => ({
        id: c.id,
        tipo: c.tipo_conflicto,
        descripcion: c.descripcion,
        created_at: c.created_at,
      })),
      docentes_pendientes: totalDocentes - docentesConHorario,
      cursos_sin_asignar: totalCursos - cursosAsignados,
      timestamp: new Date(),
    };
  }

  async getMisKPIs(email: string, periodo: string) {
    const docente = await this.docenteRepo.findOne({ where: { email } });
    if (!docente) throw new NotFoundException("Docente no encontrado");

    const horarios = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .where("horario.docente_id = :docenteId", { docenteId: docente.id })
      .andWhere("horario.periodo = :periodo", { periodo })
      .getMany();

    const totalHoras = horarios.reduce(
      (s, h) => s + this.calcularDuracion(h.hora_inicio, h.hora_fin),
      0,
    );
    const cursosUnicos = new Set(
      horarios.map((h) => h.curso?.nombre).filter(Boolean),
    );
    const ambientesUnicos = new Set(
      horarios.map((h) => h.ambiente?.codigo).filter(Boolean),
    );
    const diasConClase = new Set(horarios.map((h) => h.dia)).size;

    const proximasClases = horarios
      .map((h) => ({
        dia: h.dia,
        diaNombre:
          [
            "Domingo",
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
          ][h.dia] || "",
        hora_inicio: h.hora_inicio.substring(0, 5),
        hora_fin: h.hora_fin.substring(0, 5),
        curso: h.curso?.nombre || "Curso",
        ambiente: h.ambiente?.codigo || "",
        tipo: h.tipo_clase,
        grupo: h.grupo?.codigo || "",
      }))
      .sort(
        (a, b) => a.dia - b.dia || a.hora_inicio.localeCompare(b.hora_inicio),
      )
      .slice(0, 5);

    const distribucionDia = [1, 2, 3, 4, 5].map((dia) => ({
      dia: ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"][dia],
      horas:
        Math.round(
          horarios
            .filter((h) => h.dia === dia)
            .reduce(
              (s, h) => s + this.calcularDuracion(h.hora_inicio, h.hora_fin),
              0,
            ) * 10,
        ) / 10,
    }));

    return {
      docente: {
        nombre: `${docente.nombres} ${docente.apellidos}`,
        categoria: docente.categoria,
        tipo_contrato: docente.tipo_contrato,
      },
      total_horas: Math.round(totalHoras * 10) / 10,
      total_cursos: cursosUnicos.size,
      total_ambientes: ambientesUnicos.size,
      dias_con_clase: diasConClase,
      total_asignaciones: horarios.length,
      proximas_clases: proximasClases,
      distribucion_dia: distribucionDia,
    };
  }

  async getVentanasStats(periodo: string) {
    try {
      const VentanasAtencion = (
        await import("../entities/ventana-atencion.entity")
      ).VentanaAtencion;
      const ventanaRepo =
        this.horarioRepo.manager.getRepository(VentanasAtencion);
      const [activas, total] = await Promise.all([
        ventanaRepo.count({
          where: { periodo_academico: periodo, estado: "EN_CURSO" as any },
        }),
        ventanaRepo.count({ where: { periodo_academico: periodo } }),
      ]);
      return { ventanas_activas: activas, ventanas_totales: total };
    } catch {
      return { ventanas_activas: 0, ventanas_totales: 0 };
    }
  }

  notifyDashboardUpdate(periodoId: string, evento: string, data?: any) {
    this.dashboardGateway.emitirActualizacion(periodoId, evento, data);
  }

  // ═══════════════════════════════════════════════════════════════════
  // CARGA ACADÉMICA — KPIs
  // ═══════════════════════════════════════════════════════════════════

  async getCargaResumen(periodo: string, usuario?: UsuarioAutenticado) {
    const periodoId = await this.obtenerPeriodoId(periodo);
    if (!periodoId) return this.cargaVacia();

    const ctx = usuario?.contextoAcademico;
    const deptoIds = (!ctx?.verTodo && ctx?.departamentoIds?.length) ? ctx.departamentoIds : null;

    let deptoDocenteIds: number[] | null = null;
    if (deptoIds) {
      const docentesDepto = await this.docenteRepo.find({
        where: { activo: true, departamento_id: In(deptoIds) },
        select: ['id'],
      });
      deptoDocenteIds = docentesDepto.map(d => d.id);
    }

    const [totalDocentes, declaraciones, docentes] = await Promise.all([
      this.docenteRepo.count({
        where: deptoDocenteIds ? { activo: true, id: In(deptoDocenteIds) } : { activo: true }
      }),
      this.declaracionRepo.find({
        where: {
          periodo_academico_id: periodoId,
          ...(deptoDocenteIds ? { docente_id: In(deptoDocenteIds) } : {}),
        },
        relations: ["docente"],
      }),
      this.docenteRepo.find({
        where: deptoDocenteIds ? { activo: true, id: In(deptoDocenteIds) } : { activo: true }
      }),
    ]);

    const enviadas = declaraciones.filter(
      (d) => this.estadoNumero(d.estado) >= this.estadoNumero(EstadoDeclaracionCarga.CONFIRMADO),
    );
    const aprobadas = declaraciones.filter(
      (d) => d.estado === EstadoDeclaracionCarga.CONFIRMADO,
    );
    const observadas: typeof declaraciones = [];
    const conDeclaracion = new Set(declaraciones.map((d) => d.docente_id));
    const sinDeclarar = docentes.filter((d) => !conDeclaracion.has(d.id));

    const horasLectivasArr = declaraciones
      .map((d) => d.total_horas_lectivas)
      .filter((h) => h > 0);
    const cargaPromedio =
      horasLectivasArr.length > 0
        ? horasLectivasArr.reduce((a, b) => a + b, 0) / horasLectivasArr.length
        : 0;

    return {
      total_docentes: totalDocentes,
      declaraciones_enviadas: enviadas.length,
      declaraciones_aprobadas: aprobadas.length,
      porcentaje_avance:
        totalDocentes > 0
          ? Math.round((enviadas.length / totalDocentes) * 100)
          : 0,
      docentes_observados: observadas.length,
      docentes_sin_declarar: sinDeclarar.length,
      carga_lectiva_promedio: Math.round(cargaPromedio * 10) / 10,
      sin_declaracion: sinDeclarar.map((d) => ({
        id: d.id,
        nombre: `${d.apellidos}, ${d.nombres}`,
        email: d.email,
        departamento_id: d.departamento_id,
      })),
    };
  }

  async getCargaDepartamentos(periodo: string) {
    const periodoId = await this.obtenerPeriodoId(periodo);
    if (!periodoId) return [];

    const deptos = await this.departamentoRepo.find({ where: { activo: true } });
    const declaraciones = await this.declaracionRepo.find({
      where: { periodo_academico_id: periodoId },
    });

    return deptos
      .map((d) => {
        const deptosDeclaraciones = declaraciones.filter(
          (dec) => dec.departamento_id === d.id,
        );
        const docentesEnDepto = deptosDeclaraciones.length;
        const horasLectivas = deptosDeclaraciones.reduce(
          (s, dec) => s + dec.total_horas_lectivas,
          0,
        );
        const horasNoLectivas = deptosDeclaraciones.reduce(
          (s, dec) => s + dec.total_horas_no_lectivas,
          0,
        );
        return {
          departamento_id: d.id,
          departamento: d.nombre,
          codigo: d.codigo,
          total_docentes: docentesEnDepto,
          total_horas_lectivas: horasLectivas,
          total_horas_no_lectivas: horasNoLectivas,
          promedio_horas:
            docentesEnDepto > 0
              ? Math.round((horasLectivas / docentesEnDepto) * 10) / 10
              : 0,
        };
      })
      .filter((d) => d.total_docentes > 0)
      .sort((a, b) => b.total_horas_lectivas - a.total_horas_lectivas);
  }

  async getCargaEstados(periodo: string, usuario?: UsuarioAutenticado) {
    const periodoId = await this.obtenerPeriodoId(periodo);
    if (!periodoId) return [];

    const ctx = usuario?.contextoAcademico;
    const deptoIds = (!ctx?.verTodo && ctx?.departamentoIds?.length) ? ctx.departamentoIds : null;

    let deptoDocenteIds: number[] | null = null;
    if (deptoIds) {
      const docentesDepto = await this.docenteRepo.find({
        where: { activo: true, departamento_id: In(deptoIds) },
        select: ['id'],
      });
      deptoDocenteIds = docentesDepto.map(d => d.id);
    }

    const declaraciones = await this.declaracionRepo.find({
      where: {
        periodo_academico_id: periodoId,
        ...(deptoDocenteIds ? { docente_id: In(deptoDocenteIds) } : {}),
      },
    });

    const ordenEstados = [
      EstadoDeclaracionCarga.BORRADOR,
      EstadoDeclaracionCarga.CONFIRMADO,
      EstadoDeclaracionCarga.CERRADO,
    ];

    const labels: Record<string, string> = {
      BORRADOR: "Borrador",
      CONFIRMADO: "Confirmado",
      CERRADO: "Cerrado",
    };

    return ordenEstados
      .map((estado) => ({
        estado,
        label: labels[estado] || estado,
        count: declaraciones.filter((d) => d.estado === estado).length,
      }))
      .filter((e) => e.count > 0);
  }

  async getCargaTopDocentes(periodo: string, limit = 5, usuario?: UsuarioAutenticado) {
    const periodoId = await this.obtenerPeriodoId(periodo);
    if (!periodoId) return [];

    const ctx = usuario?.contextoAcademico;
    const deptoIds = (!ctx?.verTodo && ctx?.departamentoIds?.length) ? ctx.departamentoIds : null;

    let deptoDocenteIds: number[] | null = null;
    if (deptoIds) {
      const docentesDepto = await this.docenteRepo.find({
        where: { activo: true, departamento_id: In(deptoIds) },
        select: ['id'],
      });
      deptoDocenteIds = docentesDepto.map(d => d.id);
    }

    const declaraciones = await this.declaracionRepo.find({
      where: {
        periodo_academico_id: periodoId,
        ...(deptoDocenteIds ? { docente_id: In(deptoDocenteIds) } : {}),
      },
      relations: ["docente"],
    });

    return declaraciones
      .filter((d) => d.docente)
      .map((d) => ({
        id: d.docente_id,
        nombre: `${d.docente.apellidos}, ${d.docente.nombres}`,
        categoria: d.docente.categoria,
        departamento_id: d.departamento_id,
        total_horas_lectivas: d.total_horas_lectivas,
        total_horas_no_lectivas: d.total_horas_no_lectivas,
        total_horas: d.total_horas_general,
        estado: d.estado,
      }))
      .sort((a, b) => b.total_horas - a.total_horas)
      .slice(0, limit);
  }

  async getCargaAvance(periodo: string, usuario?: UsuarioAutenticado) {
    const periodoId = await this.obtenerPeriodoId(periodo);
    if (!periodoId) return [];

    const ctx = usuario?.contextoAcademico;
    const deptoIds = (!ctx?.verTodo && ctx?.departamentoIds?.length) ? ctx.departamentoIds : null;

    let deptoDocenteIds: number[] | null = null;
    if (deptoIds) {
      const docentesDepto = await this.docenteRepo.find({
        where: { activo: true, departamento_id: In(deptoIds) },
        select: ['id'],
      });
      deptoDocenteIds = docentesDepto.map(d => d.id);
    }

    const declaraciones = await this.declaracionRepo.find({
      where: {
        periodo_academico_id: periodoId,
        ...(deptoDocenteIds ? { docente_id: In(deptoDocenteIds) } : {}),
      },
      select: ["created_at", "estado"],
    });

    const porFecha = new Map<string, { total: number; enviadas: number }>();
    for (const d of declaraciones) {
      const fecha = d.created_at.toISOString().split("T")[0];
      const grupo = porFecha.get(fecha) || { total: 0, enviadas: 0 };
      grupo.total++;
      if (
        this.estadoNumero(d.estado) >=
        this.estadoNumero(EstadoDeclaracionCarga.CONFIRMADO)
      ) {
        grupo.enviadas++;
      }
      porFecha.set(fecha, grupo);
    }

    return [...porFecha.entries()]
      .map(([fecha, datos]) => ({
        fecha,
        total: datos.total,
        enviadas: datos.enviadas,
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  private async obtenerPeriodoId(periodo: string): Promise<number | null> {
    try {
      const p = await this.periodoRepo.findOne({
        where: { codigo: periodo },
        select: ["id"],
      });
      return p?.id ?? null;
    } catch {
      return null;
    }
  }

  private estadoNumero(estado: EstadoDeclaracionCarga): number {
    const orden: Record<string, number> = {
      BORRADOR: 0,
      CONFIRMADO: 1,
      CERRADO: 2,
    };
    return orden[estado] ?? 0;
  }

  private cargaVacia() {
    return {
      total_docentes: 0,
      declaraciones_enviadas: 0,
      declaraciones_aprobadas: 0,
      porcentaje_avance: 0,
      docentes_observados: 0,
      docentes_sin_declarar: 0,
      carga_lectiva_promedio: 0,
      sin_declaracion: [],
    };
  }

  private calcularDuracion(inicio: string, fin: string): number {
    const [hi, mi] = inicio.split(":").map(Number);
    const [hf, mf] = fin.split(":").map(Number);
    return (hf * 60 + mf - hi * 60 - mi) / 60;
  }

  private calcularMediana(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private async obtenerConfiguracionColores() {
    try {
      const config = await this.configGeneralRepo.findOne({ where: {} });
      if (!config) {
        // Return default colors if no config exists
        return {
          light: {
            fondo_base: '#F8FAFC',
            contenedores: '#FFFFFF',
            texto_principal: '#0F172A',
            dominante: '#2563EB',
            exito: '#10B981',
            advertencia: '#D97706',
            critico: '#EF4444',
          },
          dark: {
            fondo_base: '#0F172A',
            contenedores: '#1E293B',
            texto_principal: '#F8FAFC',
            dominante: '#38BDF8',
            exito: '#34D399',
            advertencia: '#FBBF24',
            critico: '#F87171',
          },
        };
      }
      return {
        light: {
          fondo_base: config.light_fondo_base || '#F8FAFC',
          contenedores: config.light_contenedores || '#FFFFFF',
          texto_principal: config.light_texto_principal || '#0F172A',
          dominante: config.light_dominante || '#2563EB',
          exito: config.light_exito || '#10B981',
          advertencia: config.light_advertencia || '#D97706',
          critico: config.light_critico || '#EF4444',
        },
        dark: {
          fondo_base: config.dark_fondo_base || '#0F172A',
          contenedores: config.dark_contenedores || '#1E293B',
          texto_principal: config.dark_texto_principal || '#F8FAFC',
          dominante: config.dark_dominante || '#38BDF8',
          exito: config.dark_exito || '#34D399',
          advertencia: config.dark_advertencia || '#FBBF24',
          critico: config.dark_critico || '#F87171',
        },
      };
    } catch (e) {
      console.error('[Dashboard] Error loading color configuration:', e);
      return null;
    }
  }

  private calcularProgresoSemanal(horarios: HorarioAsignado[]) {
    const porDia: Record<number, Set<number>> = {
      1: new Set(),
      2: new Set(),
      3: new Set(),
      4: new Set(),
      5: new Set(),
    };
    for (const h of horarios) {
      if (h.dia >= 1 && h.dia <= 5 && h.curso?.id)
        porDia[h.dia].add(h.curso.id);
    }
    return Object.entries(porDia).map(([dia, cursos]) => ({
      semana: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"][
        Number(dia) - 1
      ],
      cursos_asignados: cursos.size,
    }));
  }
}
