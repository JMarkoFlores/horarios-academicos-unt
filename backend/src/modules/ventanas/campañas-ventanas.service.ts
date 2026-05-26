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

    // Validar fechas (crearlas en la zona horaria local para evitar errores
    const parsearFecha = (fechaStr: string): Date => {
      const partes = fechaStr.split('-');
      if (partes.length !== 3) {
        throw new BadRequestException(`Fecha inválida: ${fechaStr}`);
      }
      const anio = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10);
      const dia = parseInt(partes[2], 10);
      if (isNaN(anio) || isNaN(mes) || isNaN(dia)) {
        throw new BadRequestException(`Fecha inválida: ${fechaStr}`);
      }
      return new Date(anio, mes - 1, dia);
    };
    const fechaInicio = parsearFecha(dto.fecha_inicio);
    const fechaFin = parsearFecha(dto.fecha_fin);
    if (fechaInicio >= fechaFin) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha fin');
    }

    // Validar bloques horarios
    if (!dto.bloques_horarios || dto.bloques_horarios.length === 0) {
      throw new BadRequestException('Debe especificar al menos un bloque horario');
    }

    // Validar días hábiles
    const diasHabilitados = dto.dias_habilitados ?? ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    if (diasHabilitados.length === 0) {
      throw new BadRequestException('Debe especificar al menos un día hábil');
    }

    // Contar docentes activos
    const totalDocentes = await this.docenteRepo.count({ where: { activo: true } });
    this.logger.log(`[crearCampaña] Total de docentes activos: ${totalDocentes}`);

    if (totalDocentes === 0) {
      throw new BadRequestException('No hay docentes activos para generar la campaña');
    }

    // Crear un objeto temporal para calcular la capacidad
    const tempCampaña = {
      bloques_horarios: dto.bloques_horarios,
      duracion_turno_minutos: dto.duracion_turno_minutos ?? 15,
      buffer_minutos: dto.buffer_minutos ?? 5,
      cupos_maximos_ventana: dto.cupos_maximos_ventana ?? 20,
    } as CampañaVentanas;

    const capacidadPorBloque = this.calcularCapacidadPorBloque(tempCampaña);
    this.logger.log(`[crearCampaña] Capacidad por bloque: ${capacidadPorBloque}`);

    // Obtener días hábiles para calcular la capacidad total
    const diasHabilitadosCalculados = this.obtenerDiasHabilitados(
      fechaInicio,
      fechaFin,
      diasHabilitados,
      dto.excluir_feriados ?? true,
    );
    this.logger.log(`[crearCampaña] Días hábiles disponibles: ${diasHabilitadosCalculados.length}`);

    const capacidadPorDia = capacidadPorBloque * tempCampaña.bloques_horarios.length;
    const capacidadTotal = capacidadPorDia * diasHabilitadosCalculados.length;
    this.logger.log(`[crearCampaña] Capacidad por día: ${capacidadPorDia}, Capacidad total: ${capacidadTotal}`);

    // Validar que la capacidad sea suficiente
    if (capacidadTotal < totalDocentes) {
      throw new BadRequestException(
        `Capacidad insuficiente: tienes ${totalDocentes} docentes activos, pero la capacidad total es de ${capacidadTotal} docentes. ` +
        `Aumenta los días hábiles, los bloques horarios, o reduce la duración del turno + buffer.`
      );
    }

    // Calcular ventanas necesarias
    const ventanasNecesarias = Math.ceil(totalDocentes / capacidadPorDia);
    const ventanasReserva = Math.ceil(ventanasNecesarias * ((dto.porcentaje_reserva ?? 15) / 100));
    const totalVentanasRecomendadas = ventanasNecesarias + ventanasReserva;
    const totalVentanasPosibles = diasHabilitadosCalculados.length * tempCampaña.bloques_horarios.length;
    
    this.logger.log(`[crearCampaña] Ventanas necesarias: ${ventanasNecesarias}, reserva: ${ventanasReserva}, total recomendado: ${totalVentanasRecomendadas}, total posibles: ${totalVentanasPosibles}`);

    if (totalVentanasRecomendadas > totalVentanasPosibles) {
      this.logger.warn(`[crearCampaña] Las ventanas recomendadas (${totalVentanasRecomendadas}) superan las posibles (${totalVentanasPosibles})`);
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
      dias_habilitados: diasHabilitados,
      bloques_horarios: dto.bloques_horarios,
      duracion_turno_minutos: dto.duracion_turno_minutos ?? 15,
      buffer_minutos: dto.buffer_minutos ?? 5,
      cupos_maximos_ventana: dto.cupos_maximos_ventana ?? 20,
      porcentaje_reserva: dto.porcentaje_reserva ?? 15,
      reglas_prioridad: dto.reglas_prioridad ?? [
        { campo: 'tipo_contrato', orden: 'DESC' },
        { campo: 'categoria', orden: 'DESC' },
        { campo: 'modalidad', orden: 'DESC' },
        { campo: 'fecha_ingreso', orden: 'ASC' },
        { campo: 'horas_asignadas', orden: 'ASC' },
        { campo: 'codigo', orden: 'ASC' },
        { campo: 'apellidos', orden: 'ASC' },
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

    // Función para parsear fechas robustamente
    const parsearFecha = (fechaStr: string | Date): Date => {
      if (fechaStr instanceof Date) {
        return fechaStr;
      }
      const partes = fechaStr.split('-');
      if (partes.length !== 3) {
        throw new BadRequestException(`Fecha inválida: ${fechaStr}`);
      }
      const anio = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10);
      const dia = parseInt(partes[2], 10);
      if (isNaN(anio) || isNaN(mes) || isNaN(dia)) {
        throw new BadRequestException(`Fecha inválida: ${fechaStr}`);
      }
      return new Date(anio, mes - 1, dia);
    };

    // Parsear fechas de la campaña
    campaña.fecha_inicio = parsearFecha(campaña.fecha_inicio);
    campaña.fecha_fin = parsearFecha(campaña.fecha_fin);

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

    const totalVentanasPosibles = diasHabilitados.length * campaña.bloques_horarios.length;
    this.logger.log(`[generarVentanas] Total de ventanas posibles: ${totalVentanasPosibles} (${diasHabilitados.length} días × ${campaña.bloques_horarios.length} bloques)`);
    
    if (totalVentanas > totalVentanasPosibles) {
      throw new BadRequestException(
        `No hay suficientes días y bloques horarios (${totalVentanasPosibles} ventanas posibles) para generar ${totalVentanas} ventanas. Extienda el rango de fechas, agregue más bloques horarios o reduzca el porcentaje de reserva.`
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
          { campo: 'modalidad', orden: 'DESC' as const },
          { campo: 'fecha_ingreso', orden: 'ASC' as const },
          { campo: 'horas_asignadas', orden: 'ASC' as const },
          { campo: 'codigo', orden: 'ASC' as const },
          { campo: 'apellidos', orden: 'ASC' as const },
        ];
        this.logger.log(`[generarVentanas] Usando reglas por defecto (normativa UNT)`);
      }
    }
    this.logger.log(`[generarVentanas] Reglas de prioridad:`, reglasPrioridad);

    const docentesOrdenados = await this.obtenerDocentesOrdenados(reglasPrioridad, totalDocentes);
    this.logger.log(`[generarVentanas] Docentes ordenados: ${docentesOrdenados.length}`);

    // Paso 6: Generar ventanas y distribuir docentes respetando orden jerárquico
    const ventanas: VentanaAtencion[] = [];
    const ventanasPorFecha = new Map<string, VentanaAtencion[]>();
    
    // Primero generar todas las ventanas sin docentes
    let ventanaIndex = 0;
    for (const fecha of diasHabilitados) {
      if (ventanaIndex >= totalVentanas) {
        break;
      }
      
      const fechaStr = fecha.toISOString().split('T')[0];
      
      for (const bloque of campaña.bloques_horarios) {
        if (ventanaIndex >= totalVentanas) {
          break;
        }
        
        const esContingencia = ventanaIndex >= ventanasNecesarias;
        this.logger.log(`[generarVentanas] Generando ventana ${ventanaIndex + 1}/${totalVentanas} para ${fechaStr} ${bloque.hora_inicio}-${bloque.hora_fin} (${esContingencia ? 'CONTINGENCIA' : 'BASE'})`);
        
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
        ventanas.push(savedVentana);
        
        // Agrupar ventanas por fecha
        if (!ventanasPorFecha.has(fechaStr)) {
          ventanasPorFecha.set(fechaStr, []);
        }
        ventanasPorFecha.get(fechaStr)!.push(savedVentana);
        
        ventanaIndex++;
      }
    }
    
    // Distribuir docentes respetando orden jerárquico y equitativamente
    // LOS DOCENTES YA ESTÁN ORDENADOS COMPLETAMENTE por todas las reglas de prioridad
    this.logger.log(`[generarVentanas] Distribuyendo ${docentesOrdenados.length} docentes respetando orden jerárquico y equitativamente`);
    
    // Creamos un array para cada ventana donde pondremos los docentes
    const docentesPorVentana: Docente[][] = [];
    ventanas.forEach(() => docentesPorVentana.push([]));
    
    const capacidadPorVentana = capacidadPorBloque;
    this.logger.log(`[generarVentanas] Capacidad por ventana: ${capacidadPorVentana}`);
    
    // Calcular cuántos docentes por ventana para distribución equitativa
    const numDocentes = docentesOrdenados.length;
    const numVentanas = ventanas.length;
    const docentesPorVentanaMin = Math.floor(numDocentes / numVentanas);
    const docentesExtra = numDocentes % numVentanas;
    
    this.logger.log(`[generarVentanas] Distribución equitativa: ${docentesPorVentanaMin} docentes por ventana, ${docentesExtra} ventanas con 1 extra`);
    
    // DIVIDIR LA LISTA COMPLETA ORDENADA DE FORMA EQUITATIVA entre todas las ventanas
    // Ejemplo: 28 docentes, 3 ventanas → 10, 9, 9
    let docenteIndex = 0;
    for (let v = 0; v < numVentanas; v++) {
      const numDocentesEstaVentana = v < docentesExtra ? docentesPorVentanaMin + 1 : docentesPorVentanaMin;
      
      for (let i = 0; i < numDocentesEstaVentana; i++) {
        if (docenteIndex >= numDocentes) {
          break;
        }
        
        const docente = docentesOrdenados[docenteIndex];
        
        // Verificar si la ventana tiene espacio (solo como seguridad)
        if (docentesPorVentana[v].length < capacidadPorVentana) {
          docentesPorVentana[v].push(docente);
          const ventana = ventanas[v];
          this.logger.log(`[generarVentanas] Asignando docente ${docente.nombres} ${docente.apellidos} (${docente.categoria}) a ventana ${ventana.id} (orden ${docentesPorVentana[v].length})`);
        }
        
        docenteIndex++;
      }
    }
    
    // Log de distribución final
    this.logger.log(`[generarVentanas] Distribución final de docentes por ventana:`);
    for (let v = 0; v < ventanas.length; v++) {
      this.logger.log(`[generarVentanas]   Ventana ${v + 1} (${ventanas[v].fecha.toISOString().split('T')[0]} ${ventanas[v].hora_inicio}-${ventanas[v].hora_fin}): ${docentesPorVentana[v].length} docentes`);
    }
    
    // Ahora, creamos las entradas en la BD con el orden correcto
    for (let v = 0; v < ventanas.length; v++) {
      const ventana = ventanas[v];
      const docentesEnEstaVentana = docentesPorVentana[v];
      
      for (let o = 0; o < docentesEnEstaVentana.length; o++) {
        const docente = docentesEnEstaVentana[o];
        const orden = o + 1;
        
        await this.ventanaRepo
          .createQueryBuilder()
          .insert()
          .into('cola_docentes')
          .values({
            ventana_id: ventana.id,
            docente_id: docente.id,
            orden: orden,
            estado: EstadoCola.ESPERANDO,
          })
          .execute();
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
    // Calcular capacidad por bloque individual (no promedio)
    // Retorna la capacidad de un solo bloque para poder asignar docentes por bloque
    if (campaña.bloques_horarios.length === 0) {
      return 0;
    }

    // Usar el primer bloque como referencia para calcular la capacidad
    const bloque = campaña.bloques_horarios[0];
    const [horaInicio, minInicio] = bloque.hora_inicio.split(':').map(Number);
    const [horaFin, minFin] = bloque.hora_fin.split(':').map(Number);
    const duracionBloque = (horaFin * 60 + minFin) - (horaInicio * 60 + minInicio);
    const duracionTurno = campaña.duracion_turno_minutos + campaña.buffer_minutos;
    const capacidadBloque = Math.min(
      Math.floor(duracionBloque / duracionTurno),
      campaña.cupos_maximos_ventana,
    );

    return capacidadBloque;
  }

  private obtenerDiasHabilitados(
    fechaInicio: Date | string,
    fechaFin: Date | string,
    diasHabilitados: string[],
    excluirFeriados: boolean,
  ): Date[] {
    const dias: Date[] = [];

    // Función para parsear fechas robustamente
    const parsearFecha = (fechaStr: string | Date): Date => {
      if (fechaStr instanceof Date) {
        return fechaStr;
      }
      const partes = fechaStr.split('-');
      if (partes.length !== 3) {
        throw new BadRequestException(`Fecha inválida: ${fechaStr}`);
      }
      const anio = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10);
      const dia = parseInt(partes[2], 10);
      if (isNaN(anio) || isNaN(mes) || isNaN(dia)) {
        throw new BadRequestException(`Fecha inválida: ${fechaStr}`);
      }
      return new Date(anio, mes - 1, dia);
    };

    // Parsear fechas de entrada
    const fechaInicioDate = parsearFecha(fechaInicio);
    const fechaFinDate = parsearFecha(fechaFin);

    // Si diasHabilitados contiene fechas en formato YYYY-MM-DD, usarlas directamente
    if (diasHabilitados.length > 0 && diasHabilitados[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
      for (const fechaStr of diasHabilitados) {
        const fecha = parsearFecha(fechaStr);
        const fechaInicioNormalizada = this.normalizarFecha(fechaInicioDate);
        const fechaFinNormalizada = this.normalizarFecha(fechaFinDate);

        // Verificar que la fecha esté dentro del rango
        if (fecha >= fechaInicioNormalizada && fecha <= fechaFinNormalizada) {
          dias.push(fecha);
        }
      }
      // Ordenar por fecha ascendente
      dias.sort((a, b) => a.getTime() - b.getTime());
      return dias;
    }

    // Si no, usar la lógica original de días de la semana
    let fechaActual = this.normalizarFecha(fechaInicioDate);
    const fechaFinNormalizada = this.normalizarFecha(fechaFinDate);

    while (fechaActual <= fechaFinNormalizada) {
      const diaSemana = this.obtenerDiaSemana(fechaActual);
      if (diasHabilitados.includes(diaSemana)) {
        dias.push(new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate()));
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
      
      // Para tipo_contrato (condición docente: nombrado vs contratado)
      if (regla.campo === 'tipo_contrato') {
        qb.addOrderBy(
          `CASE docente.tipo_contrato 
            WHEN 'NOMBRADO' THEN 2
            WHEN 'CONTRATADO' THEN 1
            ELSE 0
          END`,
          order
        );
      } 
      // Para categoria, usar CASE para orden jerárquico correcto
      else if (regla.campo === 'categoria') {
        qb.addOrderBy(
          `CASE docente.categoria 
            WHEN 'PRINCIPAL' THEN 4
            WHEN 'ASOCIADO' THEN 3
            WHEN 'AUXILIAR' THEN 2
            WHEN 'SIN_CATEGORIA' THEN 1
            ELSE 0
          END`,
          order
        );
      } 
      // Para tipo_docente, usar CASE para orden jerárquico correcto
      else if (regla.campo === 'tipo_docente') {
        qb.addOrderBy(
          `CASE docente.tipo_docente 
            WHEN 'ORDINARIO' THEN 3
            WHEN 'CONTRATADO' THEN 2
            WHEN 'JEFE_PRACTICA_CONTRATADO' THEN 1
            ELSE 0
          END`,
          order
        );
      }
      // Para modalidad (régimen de dedicación), usar CASE para orden jerárquico correcto
      else if (regla.campo === 'modalidad') {
        qb.addOrderBy(
          `CASE docente.modalidad 
            WHEN 'DEDICACION_EXCLUSIVA' THEN 6
            WHEN 'TIEMPO_COMPLETO_40' THEN 5
            WHEN 'TIEMPO_PARCIAL_20' THEN 4
            WHEN 'TIEMPO_PARCIAL_12' THEN 3
            WHEN 'TIEMPO_PARCIAL_10' THEN 2
            WHEN 'TIEMPO_PARCIAL_8' THEN 1
            ELSE 0
          END`,
          order
        );
      } else {
        qb.addOrderBy(`docente.${regla.campo}`, order);
      }
    }

    // Añadir desempates estables para garantizar consistencia
    qb.addOrderBy('docente.codigo', 'ASC');
    qb.addOrderBy('docente.apellidos', 'ASC');

    // No aplicar límite para obtener todos los docentes activos
    // El límite se usa solo para validar, no para restringir resultados
    // qb.limit(limite);

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

  async actualizarCampaña(campañaId: string, dto: any): Promise<CampañaVentanas> {
    this.logger.log(`[actualizarCampaña] Actualizando campaña: ${campañaId}`);

    const campaña = await this.campañaRepo.findOne({ where: { id: campañaId } });
    if (!campaña) {
      throw new NotFoundException(`Campaña ${campañaId} no encontrada`);
    }

    // Solo se puede editar campañas en estado BORRADOR
    if (campaña.estado !== EstadoCampaña.BORRADOR) {
      throw new BadRequestException('Solo se pueden editar campañas en estado BORRADOR. Elimina las ventanas primero.');
    }

    // Función para parsear fechas robustamente
    const parsearFecha = (fechaStr?: string): Date | undefined => {
      if (!fechaStr) {
        return undefined;
      }
      const partes = fechaStr.split('-');
      if (partes.length !== 3) {
        throw new BadRequestException(`Fecha inválida: ${fechaStr}`);
      }
      const anio = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10);
      const dia = parseInt(partes[2], 10);
      if (isNaN(anio) || isNaN(mes) || isNaN(dia)) {
        throw new BadRequestException(`Fecha inválida: ${fechaStr}`);
      }
      return new Date(anio, mes - 1, dia);
    };

    // Validar fechas si se están actualizando
    if (dto.fecha_inicio || dto.fecha_fin) {
      const fechaInicio = dto.fecha_inicio ? parsearFecha(dto.fecha_inicio) : campaña.fecha_inicio;
      const fechaFin = dto.fecha_fin ? parsearFecha(dto.fecha_fin) : campaña.fecha_fin;
      if (fechaInicio && fechaFin && fechaInicio >= fechaFin) {
        throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha fin');
      }
    }

    // Actualizar campos
    if (dto.nombre !== undefined) {
      campaña.nombre = dto.nombre;
    }
    if (dto.descripcion !== undefined) {
      campaña.descripcion = dto.descripcion;
    }
    if (dto.fecha_inicio !== undefined) {
      campaña.fecha_inicio = parsearFecha(dto.fecha_inicio)!;
    }
    if (dto.fecha_fin !== undefined) {
      campaña.fecha_fin = parsearFecha(dto.fecha_fin)!;
    }
    if (dto.dias_habilitados !== undefined) {
      campaña.dias_habilitados = dto.dias_habilitados;
    }
    if (dto.bloques_horarios !== undefined) {
      campaña.bloques_horarios = dto.bloques_horarios;
    }
    if (dto.duracion_turno_minutos !== undefined) {
      campaña.duracion_turno_minutos = dto.duracion_turno_minutos;
    }
    if (dto.buffer_minutos !== undefined) {
      campaña.buffer_minutos = dto.buffer_minutos;
    }
    if (dto.cupos_maximos_ventana !== undefined) {
      campaña.cupos_maximos_ventana = dto.cupos_maximos_ventana;
    }
    if (dto.porcentaje_reserva !== undefined) {
      campaña.porcentaje_reserva = dto.porcentaje_reserva;
    }
    if (dto.reglas_prioridad !== undefined) {
      campaña.reglas_prioridad = dto.reglas_prioridad;
    }
    if (dto.excluir_feriados !== undefined) {
      campaña.excluir_feriados = dto.excluir_feriados;
    }
    if (dto.excluir_eventos !== undefined) {
      campaña.excluir_eventos = dto.excluir_eventos;
    }
    if (dto.distribucion_equitativa !== undefined) {
      campaña.distribucion_equitativa = dto.distribucion_equitativa;
    }

    // Si se actualizaron fechas, bloques, días o capacidad, recalcular y validar
    if (dto.fecha_inicio || dto.fecha_fin || dto.dias_habilitados || dto.bloques_horarios || 
        dto.duracion_turno_minutos || dto.buffer_minutos || dto.cupos_maximos_ventana) {
      
      // Contar docentes activos
      const totalDocentes = await this.docenteRepo.count({ where: { activo: true } });
      
      if (totalDocentes > 0) {
        // Crear un objeto temporal para calcular la capacidad
        const tempCampaña = {
          bloques_horarios: dto.bloques_horarios ?? campaña.bloques_horarios,
          duracion_turno_minutos: dto.duracion_turno_minutos ?? campaña.duracion_turno_minutos,
          buffer_minutos: dto.buffer_minutos ?? campaña.buffer_minutos,
          cupos_maximos_ventana: dto.cupos_maximos_ventana ?? campaña.cupos_maximos_ventana,
        } as CampañaVentanas;

        const capacidadPorBloque = this.calcularCapacidadPorBloque(tempCampaña);
        const fechaInicio = dto.fecha_inicio ? parsearFecha(dto.fecha_inicio)! : campaña.fecha_inicio;
        const fechaFin = dto.fecha_fin ? parsearFecha(dto.fecha_fin)! : campaña.fecha_fin;
        const diasHabilitados = dto.dias_habilitados ?? campaña.dias_habilitados;
        const diasHabilitadosCalculados = this.obtenerDiasHabilitados(
          fechaInicio,
          fechaFin,
          diasHabilitados,
          dto.excluir_feriados ?? campaña.excluir_feriados,
        );
        const capacidadPorDia = capacidadPorBloque * tempCampaña.bloques_horarios.length;
        const capacidadTotal = capacidadPorDia * diasHabilitadosCalculados.length;

        // Validar que la capacidad sea suficiente
        if (capacidadTotal < totalDocentes) {
          throw new BadRequestException(
            `Capacidad insuficiente: tienes ${totalDocentes} docentes activos, pero la capacidad total es de ${capacidadTotal} docentes. ` +
            `Aumenta los días hábiles, los bloques horarios, o reduce la duración del turno + buffer.`
          );
        }
      }
    }

    return await this.campañaRepo.save(campaña);
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
      relations: ['periodo', 'ventanas', 'ventanas.colas', 'ventanas.colas.docente'],
    });
  }

  async listarCampañas(periodoId?: number): Promise<CampañaVentanas[]> {
    const where = periodoId ? { periodo_id: periodoId } : {};
    return await this.campañaRepo.find({
      where,
      relations: ['periodo', 'ventanas', 'ventanas.colas', 'ventanas.colas.docente'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  async eliminarVentanas(campañaId: string): Promise<{ ventanasEliminadas: number; campañaActualizada: CampañaVentanas }> {
    this.logger.log(`[eliminarVentanas] Eliminando ventanas de campaña: ${campañaId}`);
    
    const campaña = await this.campañaRepo.findOne({ where: { id: campañaId } });
    if (!campaña) {
      throw new NotFoundException(`Campaña ${campañaId} no encontrada`);
    }

    // Eliminar docentes de la cola de las ventanas
    const ventanas = await this.ventanaRepo.find({ where: { campaña_id: campañaId } });
    const ventanaIds = ventanas.map(v => v.id);
    
    if (ventanaIds.length > 0) {
      await this.ventanaRepo
        .createQueryBuilder()
        .delete()
        .from('cola_docentes')
        .where('ventana_id IN (:...ids)', { ids: ventanaIds })
        .execute();
    }

    // Eliminar ventanas
    const result = await this.ventanaRepo.delete({ campaña_id: campañaId });
    const ventanasEliminadas = result.affected || 0;

    // Actualizar estado de la campaña a BORRADOR
    campaña.estado = EstadoCampaña.BORRADOR;
    campaña.total_ventanas_generadas = 0;
    campaña.total_docentes_asignados = 0;
    await this.campañaRepo.save(campaña);

    this.logger.log(`[eliminarVentanas] Se eliminaron ${ventanasEliminadas} ventanas de la campaña ${campañaId}`);
    
    return { ventanasEliminadas, campañaActualizada: campaña };
  }
}
