import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HorarioAsignado } from '../../entities/horario-asignado.entity';
import { DisponibilidadDocente } from '../../entities/disponibilidad-docente.entity';
import { Ambiente } from '../../entities/ambiente.entity';
import { Curso } from '../../entities/curso.entity';
import { Grupo } from '../../entities/grupo.entity';
import { Docente } from '../../entities/docente.entity';
import { PeriodoAcademico } from '../../entities/periodo-academico.entity';
import { ParametrosCarga } from '../../entities/parametros-carga.entity';
import { EstadoHorario } from '../../common/enums/estado-horario.enum';
import { TipoClase } from '../../common/enums/tipo-clase.enum';
import { TipoAmbiente } from '../../common/enums/tipo-ambiente.enum';

export type SeveridadRegla = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
export type TipoRegla = 'DURA' | 'BLANDA';

export interface ReglaDura {
  codigo: string;
  nombre: string;
  severidad: 'CRITICA' | 'ALTA';
  descripcion: string;
  mensajeError: string;
  validar: (contexto: ContextoValidacion) => Promise<boolean>;
}

export interface ReglaBlanca {
  codigo: string;
  nombre: string;
  severidad: 'MEDIA' | 'BAJA';
  descripcion: string;
  sugerirAlternativa?: boolean;
  validar: (contexto: ContextoValidacion) => Promise<boolean>;
  obtenerSugerencia?: (contexto: ContextoValidacion) => Promise<string>;
}

export interface RestriccionesPeriodo {
  id?: number;
  periodo_id: number;
  dias_habiles: number[]; // [1,2,3,4,5,6] = Lun-Sab
  franja_inicio: string; // "07:00"
  franja_fin: string; // "22:00"
  franjas_vetadas: Array<{ inicio: string; fin: string }>; // almuerzo, etc.
  duracion_minima_bloque: number; // minutos
  ambientes_mantenimiento: number[]; // IDs
  ambientes_externos: number[]; // compartidos, posgrado
  bloqueo_simultaneidad: boolean; // 2 grupos ≠ mismo lab
  horas_max_diarias: number; // 8 horas/día
  permitir_sabado: boolean;
  permitir_electivos_cruzados: boolean;
  permite_teoria_lab_simultanea: boolean;
  creado_en?: Date;
  actualizado_en?: Date;
  creado_por?: string;
  actualizado_por?: string;
  motivo_cambio?: string;
}

export interface ContextoValidacion {
  docenteId: number;
  cursoId: number;
  grupoId: number;
  ambienteId: number;
  tipoClase: string;
  dia: number; // 1=Lun, 6=Sab
  horaInicio: string;
  horaFin: string;
  periodo: string;
  sesionId: string;
}

export interface ResultadoValidacionDura {
  valido: boolean;
  reglas_pasadas: ReglaDura[];
  reglas_fallidas: Array<ReglaDura & { motivo: string }>;
}

export interface ResultadoValidacionBlanda {
  advertencias: Array<ReglaBlanca & { advertencia: string }>;
  sugerencias: Array<{
    codigo: string;
    sugerencia: string;
    tipo: string;
  }>;
}

@Injectable()
export class RestriccionesValidacionService {
  private reglasHardcodeadas: Map<string, ReglaDura> = new Map();
  private reglasBlancas: Map<string, ReglaBlanca> = new Map();
  private restriccionesCache: Map<number, RestriccionesPeriodo> = new Map();

  constructor(
    @InjectRepository(HorarioAsignado)
    private horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(Docente)
    private docenteRepo: Repository<Docente>,
    @InjectRepository(Grupo)
    private grupoRepo: Repository<Grupo>,
    @InjectRepository(Ambiente)
    private ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Curso)
    private cursoRepo: Repository<Curso>,
    @InjectRepository(PeriodoAcademico)
    private periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(ParametrosCarga)
    private parametrosCargaRepo: Repository<ParametrosCarga>,
  ) {
    this.inicializarReglasHardcodeadas();
    this.inicializarReglasBlancas();
  }

  private inicializarReglasHardcodeadas(): void {
    // REGLA 1: Cruce de docente
    this.reglasHardcodeadas.set('cruce_docente', {
      codigo: 'cruce_docente',
      nombre: 'Cruce de Docente',
      severidad: 'CRITICA',
      descripcion: 'El docente no puede estar en dos lugares simultáneamente',
      mensajeError: 'El docente ya tiene asignación en este horario',
      validar: async (ctx: ContextoValidacion) => {
        const cruce = await this.horarioRepo.findOne({
          where: {
            docente_id: ctx.docenteId,
            periodo: ctx.periodo,
            dia: ctx.dia,
            estado: EstadoHorario.CONFIRMADO,
          },
        });
        if (!cruce) return true;
        return !this.hayTraslape(cruce.hora_inicio, cruce.hora_fin, ctx.horaInicio, ctx.horaFin);
      },
    });

    // REGLA 2: Cruce de grupo
    this.reglasHardcodeadas.set('cruce_grupo', {
      codigo: 'cruce_grupo',
      nombre: 'Cruce de Grupo',
      severidad: 'CRITICA',
      descripcion: 'El grupo no puede tener dos clases simultáneamente',
      mensajeError: 'El grupo ya tiene asignación en este horario',
      validar: async (ctx: ContextoValidacion) => {
        const cruce = await this.horarioRepo.findOne({
          where: {
            grupo_id: ctx.grupoId,
            periodo: ctx.periodo,
            dia: ctx.dia,
            estado: EstadoHorario.CONFIRMADO,
          },
        });
        if (!cruce) return true;
        return !this.hayTraslape(cruce.hora_inicio, cruce.hora_fin, ctx.horaInicio, ctx.horaFin);
      },
    });

    // REGLA 3: Ocupación de ambiente
    this.reglasHardcodeadas.set('ocupacion_ambiente', {
      codigo: 'ocupacion_ambiente',
      nombre: 'Ocupación de Ambiente',
      severidad: 'CRITICA',
      descripcion: 'El ambiente no puede estar en dos clases a la vez',
      mensajeError: 'El ambiente ya está ocupado en este horario',
      validar: async (ctx: ContextoValidacion) => {
        const ocupado = await this.horarioRepo.findOne({
          where: {
            ambiente_id: ctx.ambienteId,
            periodo: ctx.periodo,
            dia: ctx.dia,
            estado: EstadoHorario.CONFIRMADO,
          },
        });
        if (!ocupado) return true;
        return !this.hayTraslape(ocupado.hora_inicio, ocupado.hora_fin, ctx.horaInicio, ctx.horaFin);
      },
    });

    // REGLA 4: Ambiente válido para curso y tipo
    this.reglasHardcodeadas.set('ambiente_valido_curso', {
      codigo: 'ambiente_valido_curso',
      nombre: 'Ambiente Válido para Curso',
      severidad: 'CRITICA',
      descripcion: 'El ambiente debe ser compatible con el tipo de clase y curso',
      mensajeError: 'Este ambiente no está asociado al curso o no es válido para este tipo de clase',
      validar: async (ctx: ContextoValidacion) => {
        const curso = await this.cursoRepo
          .createQueryBuilder('c')
          .leftJoinAndSelect('c.ambientes', 'a')
          .where('c.id = :cursoId', { cursoId: ctx.cursoId })
          .andWhere('a.id = :ambienteId', { ambienteId: ctx.ambienteId })
          .getOne();

        if (!curso) return false;
        const ambiente = curso.ambientes[0];
        if (!ambiente) return false;

        // Si es laboratorio, el ambiente debe ser laboratorio
        if (ctx.tipoClase === TipoClase.LABORATORIO) {
          return ambiente.tipo === TipoAmbiente.LABORATORIO;
        }
        // Si es práctica o teoría, el ambiente debe ser aula
        if (ctx.tipoClase === TipoClase.PRACTICA || ctx.tipoClase === TipoClase.TEORIA) {
          return ambiente.tipo === TipoAmbiente.AULA;
        }
        return true;
      },
    });

    // REGLA 5: Franja institucional válida
    this.reglasHardcodeadas.set('franja_institucional', {
      codigo: 'franja_institucional',
      nombre: 'Franja Institucional',
      severidad: 'ALTA',
      descripcion: 'El horario debe estar dentro de la franja permitida del período',
      mensajeError: 'Horario fuera de la franja institucional permitida',
      validar: async (ctx: ContextoValidacion) => {
        const restricciones = await this.obtenerRestriccionesPeriodo(
          await this.obtenerPeriodoId(ctx.periodo),
        );
        const inicio = this.stringAMinutos(ctx.horaInicio);
        const fin = this.stringAMinutos(ctx.horaFin);
        const franjaInicio = this.stringAMinutos(restricciones.franja_inicio);
        const franjaFin = this.stringAMinutos(restricciones.franja_fin);

        return inicio >= franjaInicio && fin <= franjaFin;
      },
    });

    // REGLA 6: Día habilitado del período
    this.reglasHardcodeadas.set('dia_habilitado', {
      codigo: 'dia_habilitado',
      nombre: 'Día Habilitado',
      severidad: 'CRITICA',
      descripcion: 'El día debe estar habilitado en el período académico',
      mensajeError: 'Este día no está habilitado en el período',
      validar: async (ctx: ContextoValidacion) => {
        const restricciones = await this.obtenerRestriccionesPeriodo(
          await this.obtenerPeriodoId(ctx.periodo),
        );
        return restricciones.dias_habiles.includes(ctx.dia);
      },
    });

    // REGLA 7: Horas máximas del curso
    this.reglasHardcodeadas.set('horas_maximas_curso', {
      codigo: 'horas_maximas_curso',
      nombre: 'Horas Máximas del Curso',
      severidad: 'ALTA',
      descripcion: 'No exceder horas requeridas del curso',
      mensajeError: 'Este bloque excedería las horas necesarias del curso',
      validar: async (ctx: ContextoValidacion) => {
        const curso = await this.cursoRepo.findOne({
          where: { id: ctx.cursoId },
        });
        if (!curso) return false;

        let horasRequeridas =
          ctx.tipoClase === 'TEORIA' ? curso.horas_teoria : (ctx.tipoClase === 'PRACTICA' ? curso.horas_laboratorio : curso.horas_laboratorio);

        // Si es laboratorio, dividir las horas requeridas por el número de grupos
        if (ctx.tipoClase === 'LABORATORIO' && ctx.grupoId) {
          const gruposCurso = await this.grupoRepo.find({
            where: { curso_id: ctx.cursoId }
          });
          const numGrupos = gruposCurso.length || 1;
          horasRequeridas = horasRequeridas / numGrupos;
        }

        const whereClause: any = {
          curso_id: ctx.cursoId,
          tipo_clase: ctx.tipoClase as TipoClase,
          estado: EstadoHorario.CONFIRMADO,
        };

        if (ctx.docenteId) {
          whereClause.docente_id = ctx.docenteId;
        }

        if (ctx.grupoId) {
          whereClause.grupo_id = ctx.grupoId;
        }

        const horarios = await this.horarioRepo.find({
          where: whereClause,
        });

        // Sumar las horas reales en lugar de contar bloques
        const horasAsignadas = horarios.reduce((sum, h) => {
          const [h1, m1] = h.hora_inicio.split(':').map(Number);
          const [h2, m2] = h.hora_fin.split(':').map(Number);
          return sum + ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
        }, 0);

        const duracionBloque = this.calcularDuracion(ctx.horaInicio, ctx.horaFin);
        return horasAsignadas + duracionBloque / 60 <= horasRequeridas;
      },
    });
  }

  private inicializarReglasBlancas(): void {
    // REGLA 1: Sábado no preferente
    this.reglasBlancas.set('sabado_no_preferente', {
      codigo: 'sabado_no_preferente',
      nombre: 'Sábado No Preferente',
      severidad: 'MEDIA',
      descripcion: 'Sábado está permitido pero no es preferente',
      validar: async (ctx: ContextoValidacion) => {
        return ctx.dia !== 6; // 6 = Sábado
      },
      sugerirAlternativa: true,
      obtenerSugerencia: async (ctx: ContextoValidacion) => {
        return 'Considere asignar en día de lunes a viernes si es posible';
      },
    });

    // REGLA 2: Franja tardía
    this.reglasBlancas.set('franja_tardia', {
      codigo: 'franja_tardia',
      nombre: 'Franja Tardía',
      severidad: 'BAJA',
      descripcion: 'Asignación después de 19:00',
      validar: async (ctx: ContextoValidacion) => {
        const inicio = this.stringAMinutos(ctx.horaInicio);
        const limite = this.stringAMinutos('19:00');
        return inicio < limite;
      },
      sugerirAlternativa: true,
      obtenerSugerencia: async () => 'Franja tardía: considere alternativa más preferente',
    });
  }

  async validarReglaDura(
    contexto: ContextoValidacion,
  ): Promise<ResultadoValidacionDura> {
    const reglasPasadas: ReglaDura[] = [];
    const reglasFallidas: Array<ReglaDura & { motivo: string }> = [];

    const promesas = Array.from(this.reglasHardcodeadas.values()).map(async (regla) => {
      try {
        const resultado = await regla.validar(contexto);
        if (resultado) {
          reglasPasadas.push(regla);
        } else {
          reglasFallidas.push({
            ...regla,
            motivo: regla.mensajeError,
          });
        }
      } catch (error) {
        reglasFallidas.push({
          ...regla,
          motivo: `Error al validar: ${(error as any).message}`,
        });
      }
    });

    await Promise.all(promesas);

    return {
      valido: reglasFallidas.length === 0,
      reglas_pasadas: reglasPasadas,
      reglas_fallidas: reglasFallidas,
    };
  }

  async validarReglasBlancas(
    contexto: ContextoValidacion,
  ): Promise<ResultadoValidacionBlanda> {
    const advertencias: Array<ReglaBlanca & { advertencia: string }> = [];
    const sugerencias: Array<{ codigo: string; sugerencia: string; tipo: string }> = [];

    for (const regla of this.reglasBlancas.values()) {
      try {
        const resultado = await regla.validar(contexto);
        if (!resultado) {
          advertencias.push({
            ...regla,
            advertencia: `⚠️ ${regla.nombre}: ${regla.descripcion}`,
          });

          if (regla.sugerirAlternativa && regla.obtenerSugerencia) {
            const sugerencia = await regla.obtenerSugerencia(contexto);
            sugerencias.push({
              codigo: regla.codigo,
              sugerencia,
              tipo: 'ALTERNATIVA',
            });
          }
        }
      } catch (error) {
        // No fallar por error en reglas blancas
      }
    }

    return { advertencias, sugerencias };
  }

  async obtenerRestriccionesPeriodo(periodoId: number): Promise<RestriccionesPeriodo> {
    if (this.restriccionesCache.has(periodoId)) {
      return this.restriccionesCache.get(periodoId);
    }

    // Buscar en BD o usar defaults
    const restricciones: RestriccionesPeriodo = {
      periodo_id: periodoId,
      dias_habiles: [1, 2, 3, 4, 5, 6], // Lun-Sab
      franja_inicio: '07:00',
      franja_fin: '22:00',
      franjas_vetadas: [{ inicio: '12:00', fin: '13:00' }],
      duracion_minima_bloque: 30,
      ambientes_mantenimiento: [],
      ambientes_externos: [],
      bloqueo_simultaneidad: true,
      horas_max_diarias: 8,
      permitir_sabado: true,
      permitir_electivos_cruzados: false,
      permite_teoria_lab_simultanea: true,
    };

    this.restriccionesCache.set(periodoId, restricciones);
    return restricciones;
  }

  private hayTraslape(
    inicio1: string,
    fin1: string,
    inicio2: string,
    fin2: string,
  ): boolean {
    const i1 = this.stringAMinutos(inicio1);
    const f1 = this.stringAMinutos(fin1);
    const i2 = this.stringAMinutos(inicio2);
    const f2 = this.stringAMinutos(fin2);

    return i1 < f2 && i2 < f1;
  }

  private stringAMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  private minutosAString(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private calcularDuracion(horaInicio: string, horaFin: string): number {
    return this.stringAMinutos(horaFin) - this.stringAMinutos(horaInicio);
  }

  private async obtenerPeriodoId(periodoCodigo: string): Promise<number> {
    const periodo = await this.periodoRepo.findOne({
      where: { codigo: periodoCodigo },
    });
    return periodo?.id || 0;
  }
}
