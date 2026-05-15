import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan } from 'typeorm';
import { VentanaAtencion } from '../entities/ventana-atencion.entity';
import { ColaDocentes, EstadoCola } from '../entities/cola-docentes.entity';
import { SeleccionTemporal } from '../entities/seleccion-temporal.entity';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { Docente } from '../entities/docente.entity';
import { Ambiente } from '../entities/ambiente.entity';
import { EstadoHorario } from '../common/enums/estado-horario.enum';
import { TipoClase } from '../common/enums/tipo-clase.enum';
import { DocentesService } from '../docentes/docentes.service';
import { HorariosGateway } from '../horarios/horarios.gateway';
import { CreateVentanaDto } from './dto/create-ventana.dto';
import { SeleccionarCeldaDto } from './dto/seleccionar-celda.dto';

@Injectable()
export class VentanasService {
  private readonly logger = new Logger(VentanasService.name);

  constructor(
    @InjectRepository(VentanaAtencion) private readonly ventanaRepo: Repository<VentanaAtencion>,
    @InjectRepository(ColaDocentes) private readonly colaRepo: Repository<ColaDocentes>,
    @InjectRepository(SeleccionTemporal) private readonly seleccionRepo: Repository<SeleccionTemporal>,
    @InjectRepository(HorarioAsignado) private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(Docente) private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Ambiente) private readonly ambienteRepo: Repository<Ambiente>,
    private readonly docentesService: DocentesService,
    private readonly gateway: HorariosGateway,
  ) {}

  async crearVentana(dto: CreateVentanaDto): Promise<VentanaAtencion> {
    const ventana = this.ventanaRepo.create({
      periodo_academico: dto.periodo,
      fecha: new Date(dto.fecha),
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      activo: true,
    });
    return this.ventanaRepo.save(ventana);
  }

  async iniciarVentana(ventanaId: number): Promise<VentanaAtencion> {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    if (!ventana) throw new NotFoundException(`Ventana ${ventanaId} no encontrada`);

    const docentes = await this.docentesService.findOrdenadosPorJerarquia(ventana.periodo_academico);

    const entradas = docentes.map((d, idx) =>
      this.colaRepo.create({
        orden: idx + 1,
        estado: EstadoCola.ESPERANDO,
        docente: d,
        ventana,
      }),
    );

    await this.colaRepo.save(entradas);
    this.gateway.emitirActualizacion(ventanaId, 'cola_actualizada', { evento: 'iniciada', ventanaId });

    return ventana;
  }

  async llamarSiguiente(ventanaId: number): Promise<ColaDocentes | null> {
    const actual = await this.colaRepo.findOne({
      where: { ventana: { id: ventanaId }, estado: EstadoCola.EN_ATENCION },
      relations: ['docente'],
    });
    if (actual) {
      actual.estado = EstadoCola.COMPLETADO;
      await this.colaRepo.save(actual);
    }

    const siguiente = await this.colaRepo.findOne({
      where: { ventana: { id: ventanaId }, estado: EstadoCola.ESPERANDO },
      order: { orden: 'ASC' },
      relations: ['docente'],
    });

    if (!siguiente) {
      this.gateway.emitirActualizacion(ventanaId, 'cola_actualizada', { evento: 'cola_terminada', ventanaId });
      return null;
    }

    siguiente.estado = EstadoCola.EN_ATENCION;
    siguiente.turno_llamado_at = new Date();
    await this.colaRepo.save(siguiente);

    this.gateway.emitirActualizacion(ventanaId, 'cola_actualizada', {
      evento: 'siguiente_docente',
      docente: {
        id: siguiente.docente.id,
        nombres: siguiente.docente.nombres,
        apellidos: siguiente.docente.apellidos,
        orden: siguiente.orden,
      },
    });

    return siguiente;
  }

  async confirmarSeleccion(ventanaId: number, docenteId: number): Promise<HorarioAsignado[]> {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    if (!ventana) throw new NotFoundException(`Ventana ${ventanaId} no encontrada`);

    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    if (!docente) throw new NotFoundException(`Docente ${docenteId} no encontrado`);

    const selecciones = await this.seleccionRepo.find({
      where: { docente: { id: docenteId } },
      relations: ['docente', 'ambiente'],
    });

    const horarios: HorarioAsignado[] = [];
    for (const sel of selecciones) {
      const h = new HorarioAsignado();
      h.docente = sel.docente;
      h.ambiente = sel.ambiente;
      h.dia_semana = sel.dia_semana;
      h.hora_inicio = sel.hora_inicio;
      h.hora_fin = sel.hora_fin;
      h.tipo_clase = TipoClase.TEORIA;
      h.periodo_academico = ventana.periodo_academico;
      h.estado = EstadoHorario.PUBLICADO;
      horarios.push(h);
    }

    const guardados = await this.horarioRepo.save(horarios);
    await this.seleccionRepo.remove(selecciones);

    const entrada = await this.colaRepo.findOne({
      where: { ventana: { id: ventanaId }, docente: { id: docenteId } },
    });
    if (entrada) {
      entrada.estado = EstadoCola.COMPLETADO;
      await this.colaRepo.save(entrada);
    }

    this.gateway.emitirActualizacion(ventanaId, 'horario_confirmado', {
      docenteId,
      horarios: guardados.length,
    });

    return guardados;
  }

  async getEstadoCola(ventanaId: number) {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    if (!ventana) throw new NotFoundException(`Ventana ${ventanaId} no encontrada`);

    const cola = await this.colaRepo.find({
      where: { ventana: { id: ventanaId } },
      relations: ['docente'],
      order: { orden: 'ASC' },
    });

    return {
      ventana,
      cola: cola.map((c) => ({
        orden: c.orden,
        estado: c.estado,
        turno_llamado_at: c.turno_llamado_at,
        docente: {
          id: c.docente.id,
          nombres: c.docente.nombres,
          apellidos: c.docente.apellidos,
          categoria: c.docente.categoria,
        },
      })),
      en_atencion: cola.find((c) => c.estado === EstadoCola.EN_ATENCION) ?? null,
      pendientes: cola.filter((c) => c.estado === EstadoCola.ESPERANDO).length,
    };
  }

  async seleccionarCelda(ventanaId: number, dto: SeleccionarCeldaDto): Promise<SeleccionTemporal> {
    const ambiente = await this.ambienteRepo.findOne({ where: { id: dto.ambiente_id } });
    if (!ambiente) throw new NotFoundException(`Ambiente ${dto.ambiente_id} no encontrado`);

    const docente = await this.docenteRepo.findOne({ where: { id: dto.docente_id } });
    if (!docente) throw new NotFoundException(`Docente ${dto.docente_id} no encontrado`);

    const existente = await this.seleccionRepo.findOne({
      where: {
        ambiente: { id: dto.ambiente_id },
        dia_semana: dto.dia_semana,
        hora_inicio: dto.hora_inicio,
      },
    });
    if (existente) throw new BadRequestException('Esa celda ya está seleccionada');

    const expira_at = new Date(Date.now() + 30 * 60 * 1000);
    const seleccion = this.seleccionRepo.create({
      dia_semana: dto.dia_semana,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      expira_at,
      docente,
      ambiente,
    });

    const guardada = await this.seleccionRepo.save(seleccion);

    this.gateway.emitirActualizacion(ventanaId, 'celda_seleccionada', {
      docenteId: dto.docente_id,
      dia_semana: dto.dia_semana,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      ambiente_id: dto.ambiente_id,
    });

    return guardada;
  }

  async liberarCelda(ventanaId: number, dto: Partial<SeleccionarCeldaDto>): Promise<void> {
    const seleccion = await this.seleccionRepo.findOne({
      where: {
        docente: { id: dto.docente_id },
        dia_semana: dto.dia_semana,
        hora_inicio: dto.hora_inicio,
      },
    });
    if (!seleccion) throw new NotFoundException('Selección no encontrada');

    await this.seleccionRepo.remove(seleccion);

    this.gateway.emitirActualizacion(ventanaId, 'celda_liberada', {
      dia_semana: dto.dia_semana,
      hora_inicio: dto.hora_inicio,
      ambiente_id: dto.ambiente_id,
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async liberarCeldasExpiradas(): Promise<void> {
    const expiradas = await this.seleccionRepo.find({
      where: { expira_at: LessThan(new Date()) },
      relations: ['ambiente'],
    });

    if (expiradas.length === 0) return;

    this.logger.log(`Liberando ${expiradas.length} celdas expiradas`);
    for (const sel of expiradas) {
      this.gateway.emitirGlobal('celda_liberada', {
        dia_semana: sel.dia_semana,
        hora_inicio: sel.hora_inicio,
        ambiente_id: sel.ambiente?.id,
        motivo: 'expiracion',
      });
    }
    await this.seleccionRepo.remove(expiradas);
  }
}
