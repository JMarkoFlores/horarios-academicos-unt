import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampañaVentanas } from '../../entities/campaña-ventanas.entity';
import { PeriodoAcademico } from '../../entities/periodo-academico.entity';
import { VentanaAtencion, EstadoVentanaAtencion } from '../../entities/ventana-atencion.entity';
import { Docente } from '../../entities/docente.entity';
import { DiaNoLaborable } from '../../entities/dia-no-laborable.entity';
import { CrearCampañaDto } from './dto/crear-campaña.dto';
import { EstadoCampaña } from '../../common/enums/estado-campaña.enum';
import { EstadoCola } from '../../entities/cola-docentes.entity';
import { ReglasPrioridadGlobalesService } from './reglas-prioridad.service';

@Injectable()
export class CampañasVentanasService {
  private readonly logger = new Logger(CampañasVentanasService.name);

  constructor(
    @InjectRepository(CampañaVentanas)
    private readonly campañaRepo: Repository<CampañaVentanas>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(VentanaAtencion)
    private readonly ventanaRepo: Repository<VentanaAtencion>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(DiaNoLaborable)
    private readonly diaNoLaborableRepo: Repository<DiaNoLaborable>,
    private readonly reglasPrioridadService: ReglasPrioridadGlobalesService,
  ) {}

  async crearCampaña(dto: CrearCampañaDto, usuarioId: number): Promise<CampañaVentanas> {
    this.logger.log(`[crearCampaña] Creando campaña: ${dto.nombre}`);
    this.logger.log(`[crearCampaña] dias_habilitados recibido: ${JSON.stringify(dto.dias_habilitados)}, tipo: ${typeof dto.dias_habilitados}`);

    // Validar período
    const periodo = await this.periodoRepo.findOne({ where: { id: dto.idPeriodo } });
    if (!periodo) {
      throw new NotFoundException(`Período ${dto.idPeriodo} no encontrado`);
    }

    // Validar fechas
    const fechaInicio = new Date(dto.fecha_inicio);
    const fechaFin = new Date(dto.fecha_fin);
    if (fechaInicio >= fechaFin) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha fin');
    }

    // Validar que no haya una campaña activa para el mismo período
    const campañaActiva = await this.campañaRepo.findOne({
      where: {
        periodo_id: dto.idPeriodo,
        estado: EstadoCampaña.EN_CURSO,
      },
    });

    if (campañaActiva) {
      throw new BadRequestException('Ya existe una campaña en curso para este período');
    }

    const campaña = this.campañaRepo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      periodo: periodo,
      periodo_id: dto.idPeriodo,
      estado: EstadoCampaña.BORRADOR,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      dias_habilitados: dto.dias_habilitados ?? ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'],
      bloques_horarios: dto.bloques_horarios,
      duracion_turno_minutos: dto.duracion_turno_minutos ?? 15,
      buffer_minutos: dto.buffer_minutos ?? 5,
      cupos_maximos_ventana: dto.cupos_maximos_ventana ?? 20,
      porcentaje_reserva: dto.porcentaje_reserva ?? 15,
      reglas_prioridad: dto.reglas_prioridad ?? [
        { campo: 'categoria', orden: 'DESC' },
        { campo: 'tipo_contrato', orden: 'DESC' },
        { campo: 'fecha_ingreso', orden: 'ASC' },
      ],
      excluir_feriados: dto.excluir_feriados ?? true,
      excluir_eventos: dto.excluir_eventos ?? true,
      distribucion_equitativa: dto.distribucion_equitativa ?? true,
      creado_por_id: usuarioId,
    });

    return await this.campañaRepo.save(campaña);
  }

  async generarVentanas(campañaId: string): Promise<VentanaAtencion[]> {
    this.logger.log(`[generarVentanas] Generando ventanas para campaña: ${campañaId}`);

    const campaña = await this.campañaRepo.findOne({
      where: { id: campañaId },
      relations: ['periodo'],
    });

    if (!campaña) {
      throw new NotFoundException(`Campaña ${campañaId} no encontrada`);
    }

    if (campaña.estado !== EstadoCampaña.BORRADOR) {
      throw new BadRequestException('Solo se pueden generar ventanas para campañas en estado BORRADOR');
    }

    this.logger.log(`[generarVentanas] Configuración campaña:`, {
      fecha_inicio: campaña.fecha_inicio,
      fecha_fin: campaña.fecha_fin,
      dias_habilitados: campaña.dias_habilitados,
      bloques_horarios: campaña.bloques_horarios,
      duracion_turno_minutos: campaña.duracion_turno_minutos,
      buffer_minutos: campaña.buffer_minutos,
      cupos_maximos_ventana: campaña.cupos_maximos_ventana,
      porcentaje_reserva: campaña.porcentaje_reserva,
    });

    // Paso 1: Contar total de docentes activos
    const totalDocentes = await this.docenteRepo.count({ where: { activo: true } });
    this.logger.log(`[generarVentanas] Total de docentes activos: ${totalDocentes}`);

    // Paso 2: Calcular capacidad por ventana
    const capacidadPorBloque = this.calcularCapacidadPorBloque(campaña);
    const capacidadTotalPorDia = capacidadPorBloque * campaña.bloques_horarios.length;
    this.logger.log(`[generarVentanas] Capacidad por bloque: ${capacidadPorBloque}, por día: ${capacidadTotalPorDia}`);

    // Paso 3: Calcular ventanas necesarias según fórmula de capacidad
    const ventanasNecesarias = Math.ceil(totalDocentes / capacidadTotalPorDia);
    const ventanasReserva = Math.ceil(ventanasNecesarias * (campaña.porcentaje_reserva / 100));
    const totalVentanas = ventanasNecesarias + ventanasReserva;
    this.logger.log(`[generarVentanas] Ventanas base: ${ventanasNecesarias}, reserva: ${ventanasReserva}, total: ${totalVentanas}`);

    // Paso 4: Obtener días hábiles en el rango de fechas
    const diasHabilitados = this.obtenerDiasHabilitados(
      campaña.fecha_inicio,
      campaña.fecha_fin,
      campaña.dias_habilitados,
      campaña.excluir_feriados,
    );
    this.logger.log(`[generarVentanas] Días hábiles disponibles: ${diasHabilitados.length}`);

    if (diasHabilitados.length < totalVentanas) {
      throw new BadRequestException(
        `No hay suficientes días hábiles (${diasHabilitados.length}) para generar ${totalVentanas} ventanas. Extienda el rango de fechas o reduzca el porcentaje de reserva.`
      );
    }

    // Paso 5: Obtener docentes ordenados por prioridad
    // Usar reglas de la campaña o reglas globales de la base de datos
    let reglasPrioridad;
    if (campaña.reglas_prioridad && campaña.reglas_prioridad.length > 0) {
      reglasPrioridad = campaña.reglas_prioridad;
      this.logger.log(`[generarVentanas] Usando reglas específicas de la campaña`);
    } else {
      try {
        const reglasGlobales = await this.reglasPrioridadService.obtenerReglasActivas();
        reglasPrioridad = reglasGlobales.reglas;
        this.logger.log(`[generarVentanas] Usando reglas globales de la base de datos`);
      } catch (error) {
        // Fallback a reglas por defecto si no hay reglas globales
        reglasPrioridad = [
          { campo: 'tipo_contrato', orden: 'DESC' as const },
          { campo: 'categoria', orden: 'DESC' as const },
          { campo: 'fecha_ingreso', orden: 'ASC' as const },
          { campo: 'horas_asignadas', orden: 'ASC' as const },
        ];
        this.logger.log(`[generarVentanas] Usando reglas por defecto (normativa UNT)`);
      }
    }
    this.logger.log(`[generarVentanas] Reglas de prioridad:`, reglasPrioridad);

    const docentesOrdenados = await this.obtenerDocentesOrdenados(reglasPrioridad, totalDocentes);
    this.logger.log(`[generarVentanas] Docentes ordenados: ${docentesOrdenados.length}`);

    // Paso 6: Generar ventanas y distribuir docentes
    const ventanas: VentanaAtencion[] = [];
    let docenteIndex = 0;

    for (let i = 0; i < totalVentanas; i++) {
      const fecha = diasHabilitados[i];
      const esContingencia = i >= ventanasNecesarias;
      const diaSemana = this.obtenerDiaSemana(fecha);

      this.logger.log(`[generarVentanas] Generando ventana ${i + 1}/${totalVentanas} para ${fecha.toISOString().split('T')[0]} (${esContingencia ? 'CONTINGENCIA' : 'BASE'})`);

      // Generar ventanas para cada bloque horario
      for (const bloque of campaña.bloques_horarios) {
        const ventana = await this.generarVentanaParaBloqueConDocentes(
          campaña,
          bloque,
          fecha,
          docentesOrdenados,
          docenteIndex,
          capacidadPorBloque,
          esContingencia,
        );

        if (ventana) {
          ventanas.push(ventana);
          docenteIndex += capacidadPorBloque;
        }
      }
    }

    // Calcular docentes únicos asignados
    const docentesUnicos = await this.ventanaRepo
      .createQueryBuilder('ventana')
      .innerJoin('ventana.colas', 'cola')
      .select('COUNT(DISTINCT cola.docente_id)', 'count')
      .where('ventana.campaña_id = :id', { id: campañaId })
      .getRawOne();

    const totalDocentesUnicos = parseInt(docentesUnicos?.count || '0', 10);

    // Actualizar métricas de la campaña
    campaña.total_ventanas_generadas = ventanas.length;
    campaña.total_docentes_asignados = totalDocentesUnicos;
    campaña.estado = EstadoCampaña.GENERADO;
    await this.campañaRepo.save(campaña);

    this.logger.log(`[generarVentanas] Se generaron ${ventanas.length} ventanas (${ventanasNecesarias} base + ${ventanasReserva} contingencia) con ${totalDocentesUnicos} docentes únicos`);
    return ventanas;
  }

  private calcularCapacidadPorBloque(campaña: CampañaVentanas): number {
    // Calcular capacidad promedio por bloque
    let capacidadTotal = 0;
    for (const bloque of campaña.bloques_horarios) {
      const [horaInicio, minInicio] = bloque.hora_inicio.split(':').map(Number);
      const [horaFin, minFin] = bloque.hora_fin.split(':').map(Number);
      const duracionBloque = (horaFin * 60 + minFin) - (horaInicio * 60 + minInicio);
      const duracionTurno = campaña.duracion_turno_minutos + campaña.buffer_minutos;
      const capacidadBloque = Math.min(
        Math.floor(duracionBloque / duracionTurno),
        campaña.cupos_maximos_ventana,
      );
      capacidadTotal += capacidadBloque;
    }
    return Math.floor(capacidadTotal / campaña.bloques_horarios.length);
  }

  private obtenerDiasHabilitados(
    fechaInicio: Date,
    fechaFin: Date,
    diasHabilitados: string[],
    excluirFeriados: boolean,
  ): Date[] {
    const dias: Date[] = [];

    // Si diasHabilitados contiene fechas en formato YYYY-MM-DD, usarlas directamente
    if (diasHabilitados.length > 0 && diasHabilitados[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
      for (const fechaStr of diasHabilitados) {
        const fecha = new Date(fechaStr);
        const fechaInicioDate = new Date(fechaInicio);
        const fechaFinDate = new Date(fechaFin);

        // Verificar que la fecha esté dentro del rango
        if (fecha >= fechaInicioDate && fecha <= fechaFinDate) {
          dias.push(fecha);
        }
      }
      // Ordenar por fecha ascendente
      dias.sort((a, b) => a.getTime() - b.getTime());
      return dias;
    }

    // Si no, usar la lógica original de días de la semana
    let fechaActual = this.normalizarFecha(new Date(fechaInicio));
    const fechaFinDate = this.normalizarFecha(new Date(fechaFin));

    while (fechaActual <= fechaFinDate) {
      const diaSemana = this.obtenerDiaSemana(fechaActual);
      if (diasHabilitados.includes(diaSemana)) {
        dias.push(new Date(fechaActual));
      }
      fechaActual = this.siguienteDia(fechaActual);
    }

    return dias;
  }

  private normalizarFecha(fecha: Date): Date {
    const normalizada = new Date(fecha);
    normalizada.setHours(0, 0, 0, 0);
    return normalizada;
  }

  private async generarVentanaParaBloqueConDocentes(
    campaña: CampañaVentanas,
    bloque: { nombre: string; hora_inicio: string; hora_fin: string },
    fecha: Date,
    docentesOrdenados: Docente[],
    docenteIndex: number,
    capacidad: number,
    esContingencia: boolean,
  ): Promise<VentanaAtencion | null> {
    // Crear ventana
    const ventana = this.ventanaRepo.create({
      periodo: campaña.periodo.codigo,
      fecha: fecha,
      categoria: esContingencia ? 'CONTINGENCIA' : 'PRINCIPAL',
      modalidad: null,
      hora_inicio: bloque.hora_inicio,
      hora_fin: bloque.hora_fin,
      intervalo_minutos: campaña.duracion_turno_minutos,
      estado: EstadoVentanaAtencion.PROGRAMADA,
      campaña_id: campaña.id,
    });

    const savedVentana = await this.ventanaRepo.save(ventana);

    // Asignar docentes a la cola
    const docentesAsignar = docentesOrdenados.slice(docenteIndex, docenteIndex + capacidad);
    for (let i = 0; i < docentesAsignar.length; i++) {
      await this.ventanaRepo
        .createQueryBuilder()
        .insert()
        .into('cola_docentes')
        .values({
          ventana_id: savedVentana.id,
          docente_id: docentesAsignar[i].id,
          orden: i + 1,
          estado: EstadoCola.ESPERANDO,
        })
        .execute();
    }

    return savedVentana;
  }

  private async generarVentanaParaBloque(
    campaña: CampañaVentanas,
    bloque: { nombre: string; hora_inicio: string; hora_fin: string },
    fecha: Date,
  ): Promise<VentanaAtencion | null> {
    // Calcular capacidad del bloque
    const [horaInicio, minInicio] = bloque.hora_inicio.split(':').map(Number);
    const [horaFin, minFin] = bloque.hora_fin.split(':').map(Number);

    const inicioMinutos = horaInicio * 60 + minInicio;
    const finMinutos = horaFin * 60 + minFin;
    const duracionBloque = finMinutos - inicioMinutos;

    const duracionTurno = campaña.duracion_turno_minutos + campaña.buffer_minutos;
    const maxDocentes = Math.min(
      Math.floor(duracionBloque / duracionTurno),
      campaña.cupos_maximos_ventana,
    );

    if (maxDocentes <= 0) {
      return null;
    }

    // Obtener docentes según reglas de prioridad
    const docentes = await this.obtenerDocentesOrdenados(campaña.reglas_prioridad, maxDocentes);

    if (docentes.length === 0) {
      return null;
    }

    // Crear ventana
    const ventana = this.ventanaRepo.create({
      periodo: campaña.periodo.codigo,
      fecha: fecha,
      categoria: 'PRINCIPAL',
      modalidad: null,
      hora_inicio: bloque.hora_inicio,
      hora_fin: bloque.hora_fin,
      intervalo_minutos: campaña.duracion_turno_minutos,
      estado: EstadoVentanaAtencion.PROGRAMADA,
      campaña_id: campaña.id,
    });

    const savedVentana = await this.ventanaRepo.save(ventana);

    // Asignar docentes a la cola
    for (let i = 0; i < docentes.length; i++) {
      await this.ventanaRepo
        .createQueryBuilder()
        .insert()
        .into('cola_docentes')
        .values({
          ventana_id: savedVentana.id,
          docente_id: docentes[i].id,
          orden: i + 1,
          estado: EstadoCola.ESPERANDO,
        })
        .execute();
    }

    // Actualizar métricas (se calculará al final con docentes únicos)
    // campaña.total_docentes_asignados += docentes.length;

    return savedVentana;
  }

  private async obtenerDocentesOrdenados(
    reglasPrioridad: { campo: string; orden: 'ASC' | 'DESC' }[],
    limite: number,
  ): Promise<Docente[]> {
    const qb = this.docenteRepo.createQueryBuilder('docente').where('docente.activo = :activo', { activo: true });

    // Aplicar ordenamiento según reglas
    for (const regla of reglasPrioridad) {
      const order = regla.orden === 'ASC' ? 'ASC' : 'DESC';
      qb.addOrderBy(`docente.${regla.campo}`, order);
    }

    qb.limit(limite);

    return await qb.getMany();
  }

  private obtenerDiaSemana(fecha: Date): string {
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    return dias[fecha.getDay()];
  }

  private siguienteDia(fecha: Date): Date {
    const siguiente = new Date(fecha);
    siguiente.setDate(siguiente.getDate() + 1);
    return siguiente;
  }

  private esFeriado(fecha: Date, feriados: Date[]): boolean {
    const fechaNormalizada = new Date(fecha);
    fechaNormalizada.setHours(0, 0, 0, 0);

    return feriados.some(feriado => {
      const feriadoNormalizado = new Date(feriado);
      feriadoNormalizado.setHours(0, 0, 0, 0);
      return feriadoNormalizado.getTime() === fechaNormalizada.getTime();
    });
  }

  async publicarCampaña(campañaId: string): Promise<CampañaVentanas> {
    this.logger.log(`[publicarCampaña] Publicando campaña: ${campañaId}`);

    const campaña = await this.campañaRepo.findOne({ where: { id: campañaId } });
    if (!campaña) {
      throw new NotFoundException(`Campaña ${campañaId} no encontrada`);
    }

    if (campaña.estado !== EstadoCampaña.GENERADO) {
      throw new BadRequestException('Solo se pueden publicar campañas en estado GENERADO');
    }

    campaña.estado = EstadoCampaña.PUBLICADO;
    campaña.fecha_publicacion = new Date();
    return await this.campañaRepo.save(campaña);
  }

  async obtenerCampaña(campañaId: string): Promise<CampañaVentanas> {
    return await this.campañaRepo.findOne({
      where: { id: campañaId },
      relations: ['periodo', 'ventanas'],
    });
  }

  async listarCampañas(periodoId?: number): Promise<CampañaVentanas[]> {
    const where = periodoId ? { periodo_id: periodoId } : {};
    return await this.campañaRepo.find({
      where,
      relations: ['periodo'],
      order: { fecha_creacion: 'DESC' },
    });
  }
}
