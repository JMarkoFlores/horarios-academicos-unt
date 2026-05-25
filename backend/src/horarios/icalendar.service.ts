import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { PeriodoAcademico } from '../entities/periodo-academico.entity';

@Injectable()
export class ICalendarService {
  constructor(
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
  ) {}

  async generarICalendarDocente(
    docenteId: number,
    periodo: string,
  ): Promise<string> {
    const horarios = await this.horarioRepo.find({
      where: { docente_id: docenteId, periodo },
      relations: ['docente', 'curso', 'ambiente', 'grupo'],
    });

    if (horarios.length === 0) {
      throw new NotFoundException(
        `No se encontraron horarios para el docente ${docenteId} en el período ${periodo}`,
      );
    }

    const periodoEntity = await this.periodoRepo.findOne({
      where: { codigo: periodo },
    });

    const fechaInicio = periodoEntity?.fecha_inicio
      ? new Date(periodoEntity.fecha_inicio)
      : new Date();
    const fechaFin = periodoEntity?.fecha_fin
      ? new Date(periodoEntity.fecha_fin)
      : new Date(fechaInicio.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 días después

    return this.generarICalendar(horarios, fechaInicio, fechaFin);
  }

  private generarICalendar(
    horarios: HorarioAsignado[],
    fechaInicio: Date,
    fechaFin: Date,
  ): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//UNT Sistema de Horarios//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Horarios Académicos',
      'X-WR-TIMEZONE:America/Lima',
      'X-WR-CALDESC:Horarios de clases generados por el sistema',
    ];

    // Agregar definición de timezone
    lines.push(...this.generarVTimezone());

    for (const horario of horarios) {
      const event = this.generarEvento(horario, fechaInicio, fechaFin);
      lines.push(...event);
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  private generarVTimezone(): string[] {
    return [
      'BEGIN:VTIMEZONE',
      'TZID:America/Lima',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:-0500',
      'TZOFFSETTO:-0500',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:-0500',
      'TZOFFSETTO:-0500',
      'END:DAYLIGHT',
      'END:VTIMEZONE',
    ];
  }

  private generarEvento(
    horario: HorarioAsignado,
    fechaInicio: Date,
    fechaFin: Date,
  ): string[] {
    const docente = horario.docente;
    const curso = horario.curso;
    const ambiente = horario.ambiente;
    const grupo = horario.grupo;

    const uid = `${horario.id}@unt.edu.pe`;
    const summary = `${curso.codigo} - ${curso.nombre} (${horario.tipo_clase})`;
    const description = `Docente: ${docente?.nombres} ${docente?.apellidos}\n` +
      `Curso: ${curso.nombre}\n` +
      `Grupo: ${grupo?.nombre}\n` +
      `Ambiente: ${ambiente?.nombre}\n` +
      `Tipo: ${horario.tipo_clase}`;
    const location = ambiente?.nombre || 'Por asignar';

    // Calcular primera fecha del evento (primera ocurrencia del día de la semana)
    const primeraFecha = this.calcularPrimeraFecha(horario.dia, fechaInicio);
    const startDate = this.formatoICalDate(primeraFecha);
    const endDate = this.formatoICalDate(fechaFin);
    const startTime = this.formatoICalTime(horario.hora_inicio);
    const endTime = this.formatoICalTime(horario.hora_fin);
    const diaSemana = this.obtenerDiaSemanaICal(horario.dia);

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${this.formatoICalDateTime(new Date())}`,
      `DTSTART;TZID=America/Lima:${startDate}T${startTime}`,
      `DTEND;TZID=America/Lima:${startDate}T${endTime}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${diaSemana};UNTIL=${endDate}T${endTime}`,
      `SUMMARY:${this.escapeICalText(summary)}`,
      `DESCRIPTION:${this.escapeICalText(description)}`,
      `LOCATION:${this.escapeICalText(location)}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT',
    ];
  }

  private obtenerDiaSemanaICal(dia: number): string {
    const dias: Record<number, string> = {
      1: 'MO',
      2: 'TU',
      3: 'WE',
      4: 'TH',
      5: 'FR',
      6: 'SA',
    };
    return dias[dia] || 'MO';
  }

  private formatoICalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private formatoICalTime(time: string): string {
    return time.replace(/:/g, '');
  }

  private formatoICalDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/"/g, '\\"');
  }

  private calcularPrimeraFecha(dia: number, fechaInicio: Date): Date {
    // dia: 1=Lunes, 2=Martes, ..., 6=Sábado
    // JavaScript getDay(): 0=Domingo, 1=Lunes, ..., 6=Sábado
    const fecha = new Date(fechaInicio);
    const diaSemanaInicio = fecha.getDay(); // 0-6

    // Convertir nuestro dia (1-6) a JavaScript day (1-6, domingo es 0)
    const diaObjetivo = dia; // Ya está en formato correcto (1=Lunes, 6=Sábado)

    // Calcular días a sumar
    let diasASumar = diaObjetivo - diaSemanaInicio;
    if (diasASumar < 0) {
      diasASumar += 7; // Sumar una semana si el día ya pasó
    }

    fecha.setDate(fecha.getDate() + diasASumar);
    return fecha;
  }

  private calcularPrimeraFechaUTC(dia: number, fechaInicio: Date, hora: string): Date {
    // Calcular la primera fecha en UTC considerando el offset
    const primeraFecha = this.calcularPrimeraFecha(dia, fechaInicio);
    const [h, m] = hora.split(':').map(Number);
    const fechaUTC = new Date(primeraFecha);
    fechaUTC.setHours(h + 5, m, 0, 0); // Sumar 5 horas para UTC

    // Si la hora cruzó la medianoche, ajustar la fecha
    if (fechaUTC.getDate() !== primeraFecha.getDate()) {
      // La hora cruzó al día siguiente, ajustar para que el evento siga en el día correcto
      // Restar un día para mantener el evento en el día original
      fechaUTC.setDate(fechaUTC.getDate() - 1);
    }

    return fechaUTC;
  }

  private convertirAUTC(fecha: Date, hora: string): string {
    // America/Lima es UTC-5, así que sumamos 5 horas para convertir a UTC
    const [h, m] = hora.split(':').map(Number);
    const fechaUTC = new Date(fecha);
    fechaUTC.setHours(h + 5, m, 0, 0); // Sumar 5 horas para UTC
    return this.formatoICalDateTime(fechaUTC);
  }
}
