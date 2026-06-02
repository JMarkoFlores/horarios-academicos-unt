import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { NotifToastService } from '../../core/services/notif-toast.service';
import { ApiResponse } from '../../core/interfaces/entities';
import { ConfiguracionGeneralService } from '../../core/services/configuracion-general.service';

interface TurnoHorario {
  id: number;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

interface DiaActivo {
  id: number;
  dia_semana: number;
  nombre: string;
  activo: boolean;
}

interface ParametrosCarga {
  id: number;
  periodo_academico: string;
  tipo_docente: string;
  categoria: string;
  modalidad: string;
  horas_min_semanal: number;
  horas_max_semanal: number;
  cursos_min_docente: number;
  cursos_max_docente: number;
}

interface ConfiguracionGeneral {
  id: number;
  nombre_institucional: string;
  logo_url: string;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
}

interface RestriccionInstitucional {
  id: number;
  tipo_restriccion: string;
  valor: Record<string, unknown>;
  periodo_academico: string;
  activo: boolean;
}

interface DiaNoLaborable {
  id: number;
  fecha: string;
  descripcion: string;
  tipo: string;
  afecta_aulas: boolean;
  afecta_laboratorios: boolean;
  periodo_academico: string;
}

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss'],
})
export class ConfiguracionComponent implements OnInit {
  // ─── Estado General ─────────────────────────────────────────────────────
  activeTab: string = 'restricciones';

  // ─── Turnos Horarios ─────────────────────────────────────────────────────
  turnos: TurnoHorario[] = [];
  loadingTurnos = false;
  guardandoTurno = false;
  turnoForm!: FormGroup;

  // ─── Días Activos ─────────────────────────────────────────────────────────
  diasActivos: DiaActivo[] = [];
  loadingDiasActivos = false;
  guardandoDiaActivo = false;

  // ─── Parámetros de Carga ──────────────────────────────────────────────────
  parametrosList: ParametrosCarga[] = [];
  parametrosFiltrados: ParametrosCarga[] = [];
  loadingParametros = false;
  guardandoParametros = false;
  eliminandoParametroId: number | null = null;
  editingParametroId: number | null = null;
  parametrosForm!: FormGroup;
  filtrosParametros = {
    tipo_docente: '',
    categoria: '',
    modalidad: ''
  };

  tiposDocente = [
    { value: 'ORDINARIO', label: 'Ordinario' },
    { value: 'CONTRATADO', label: 'Contratado' },
    { value: 'JEFE_PRACTICA_CONTRATADO', label: 'Jefe de práctica' },
  ];

  categoriasPorTipo: Record<string, { value: string; label: string }[]> = {
    ORDINARIO: [
      { value: 'PRINCIPAL', label: 'Principal' },
      { value: 'ASOCIADO', label: 'Asociado' },
      { value: 'AUXILIAR', label: 'Auxiliar' },
    ],
    CONTRATADO: [{ value: 'SIN_CATEGORIA', label: 'Sin categoría' }],
    JEFE_PRACTICA_CONTRATADO: [
      { value: 'SIN_CATEGORIA', label: 'Sin categoría' },
    ],
  };

  categoriasDisponibles: { value: string; label: string }[] = [];

  modalidades = [
    { value: 'DEDICACION_EXCLUSIVA', label: 'Dedicación exclusiva' },
    { value: 'TIEMPO_COMPLETO_40', label: 'Tiempo completo 40h' },
    { value: 'TIEMPO_PARCIAL_20', label: 'Tiempo parcial 20h' },
    { value: 'TIEMPO_PARCIAL_12', label: 'Tiempo parcial 12h' },
    { value: 'TIEMPO_PARCIAL_10', label: 'Tiempo parcial 10h' },
    { value: 'TIEMPO_PARCIAL_8', label: 'Tiempo parcial 8h' },
  ];

  modalidadesDisponibles: { value: string; label: string }[] = [];

  // ─── Configuración General ────────────────────────────────────────────────
  configuracionGeneral: ConfiguracionGeneral | null = null;
  loadingGeneral = false;
  guardandoGeneral = false;
  generalForm!: FormGroup;

  // ─── Restricciones ───────────────────────────────────────────────────────
  restricciones: RestriccionInstitucional[] = [];
  loadingRestricciones = false;
  guardandoRestriccion = false;
  restriccionForm!: FormGroup;

  // ─── Reglas de Prioridad ───────────────────────────────────────────────────
  guardandoReglasPrioridad = false;

  tiposRestriccion = [
    { value: 'FRANJA_HORARIA', label: 'Franja Horaria' },
    { value: 'BLOQUE_ALMUERZO', label: 'Bloque de Almuerzo' },
    { value: 'MAX_HORAS_DIARIAS', label: 'Máx. Horas Diarias' },
    { value: 'MAX_HORAS_SEMANALES', label: 'Máx. Horas Semanales' },
    { value: 'DURACION_BLOQUE', label: 'Duración de Bloque' },
  ];

  restriccionLabels: Record<string, string> = {
    FRANJA_HORARIA: 'Franja Horaria',
    BLOQUE_ALMUERZO: 'Bloque de Almuerzo',
    MAX_HORAS_DIARIAS: 'Horas Diarias Máximas',
    MAX_HORAS_SEMANALES: 'Horas Semanales Máximas',
    DURACION_BLOQUE: 'Duración de Bloque Estándar',
  };

  // ─── Días No Laborables ──────────────────────────────────────────────────
  diasNoLaborables: DiaNoLaborable[] = [];
  loadingDias = false;
  guardandoDia = false;
  diaForm!: FormGroup;

  // ─── Ventanas Automáticas ────────────────────────────────────────────────
  configurandoVentanas = false;
  creandoVentanasPendientes = false;
  ventanasForm!: FormGroup;
  ventanaConfig: any[] = [];
  modoAsignacionPeriodo: string = '';

  // ─── Modo de Período ─────────────────────────────────────────────────────
  nuevoModo: 'VENTANAS' | 'AUTOMATICA' | 'MIXTA' = 'VENTANAS';
  cambiandoModo = false;
  puedeCambiarModo: boolean | null = null;

  // ─── Campañas de Ventanas ─────────────────────────────────────────────────
  campanas: any[] = [];
  campanaForm!: FormGroup;
  bloquesHorarios: any[] = [];
  reglasPrioridad: any[] = [];
  creandoCampana = false;
  generandoVentanas = false;
  publicandoCampana = false;
  campanaSeleccionada: any = null;
  ventanasGeneradas: any[] = [];

  tiposDia = [
    { value: 'FERIADO', label: 'Feriado Nacional' },
    { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
    { value: 'SUSPENSION', label: 'Suspensión de Clases' },
    { value: 'EVENTO', label: 'Evento Institucional' },
  ];

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private notif: NotifToastService,
    private fb: FormBuilder,
    private cfgService: ConfiguracionGeneralService,
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.cargarRestricciones();
    this.cargarReglasPrioridad();
    this.cargarDiasNoLaborables();
    this.cargarTurnos();
    this.cargarDiasActivos();
    this.cargarParametrosCarga();
    this.cargarConfiguracionGeneral();
    this.cargarCampanas();

    // Suscribirse al período para cargar campañas cuando cambie
    this.periodoService.periodoActivo$.subscribe(() => {
      this.cargarCampanas();
    });
  }

  initForms(): void {
    this.restriccionForm = this.fb.group({
      tipo_restriccion: ['FRANJA_HORARIA', Validators.required],
      hora_inicio: ['07:00', Validators.required],
      hora_fin: ['22:00', Validators.required],
      max_horas: [
        8,
        [Validators.required, Validators.min(1), Validators.max(24)],
      ],
      duracion_minutos: [
        120,
        [Validators.required, Validators.min(15), Validators.max(600)],
      ],
    });

    this.diaForm = this.fb.group({
      fecha: ['', Validators.required],
      descripcion: ['', [Validators.required, Validators.maxLength(200)]],
      tipo: ['FERIADO', Validators.required],
      afecta_aulas: [true],
      afecta_laboratorios: [true],
    });

    // Cambiar dinámicamente validaciones y valores por defecto al cambiar tipo
    this.restriccionForm
      .get('tipo_restriccion')
      ?.valueChanges.subscribe((tipo) => {
        this.actualizarFormSegunTipo(tipo);
      });

    // Inicializar configuración
    this.actualizarFormSegunTipo('FRANJA_HORARIA');

    this.turnoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(50)]],
      hora_inicio: ['07:00', Validators.required],
      hora_fin: ['13:00', Validators.required],
    });

    this.parametrosForm = this.fb.group({
      tipo_docente: ['', Validators.required],
      categoria: [{ value: '', disabled: true }, Validators.required],
      modalidad: [{ value: '', disabled: true }, Validators.required],
      horas_min_semanal: [
        4,
        [Validators.required, Validators.min(1), Validators.max(40)],
      ],
      horas_max_semanal: [
        20,
        [Validators.required, Validators.min(1), Validators.max(80)],
      ],
      cursos_min_docente: [
        1,
        [Validators.required, Validators.min(0), Validators.max(20)],
      ],
      cursos_max_docente: [
        5,
        [Validators.required, Validators.min(1), Validators.max(20)],
      ],
    });

    this.generalForm = this.fb.group({
      nombre_institucional: [
        '',
        [Validators.required, Validators.maxLength(200)],
      ],
      logo_url: ['', Validators.maxLength(500)],
      color_primario: ['#1a237e', Validators.required],
      color_secundario: ['#283593', Validators.required],
      color_acento: ['#e91e63', Validators.required],
    });

    this.ventanasForm = this.fb.group({
      fechaInicio: ['', Validators.required],
    });

    this.campanaForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      diasHabilitados: [['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']],
      duracionTurnoMinutos: [15, [Validators.min(5)]],
      bufferMinutos: [5, [Validators.min(0)]],
      cuposMaximosVentana: [20, [Validators.min(1)]],
      porcentajeReserva: [15, [Validators.min(0), Validators.max(50)]],
      excluirFeriados: [true],
      excluirEventos: [true],
      distribucionEquitativa: [true],
    });

    // Bloque horario por defecto
    this.bloquesHorarios = [
      { nombre: 'Mañana', hora_inicio: '07:00', hora_fin: '14:00' },
      { nombre: 'Tarde', hora_inicio: '14:00', hora_fin: '23:00' },
    ];

    // Reglas de prioridad por defecto (normativa UNT)
    this.reglasPrioridad = [
      { campo: 'tipo_contrato', orden: 'DESC' }, // Nombrado > Contratado
      { campo: 'categoria', orden: 'DESC' }, // Principal > Asociado > Auxiliar
      { campo: 'modalidad', orden: 'DESC' }, // Dedicación Exclusiva > Tiempo Completo > Tiempo Parcial
      { campo: 'fecha_ingreso', orden: 'ASC' }, // Fecha más antigua
      { campo: 'horas_asignadas', orden: 'ASC' }, // Menos horas asignadas primero
      { campo: 'codigo', orden: 'ASC' }, // Código del docente
      { campo: 'apellidos', orden: 'ASC' }, // Apellidos
    ];
  }

  actualizarFormSegunTipo(tipo: string): void {
    const horaInicioCtrl = this.restriccionForm.get('hora_inicio');
    const horaFinCtrl = this.restriccionForm.get('hora_fin');
    const maxHorasCtrl = this.restriccionForm.get('max_horas');
    const duracionCtrl = this.restriccionForm.get('duracion_minutos');

    horaInicioCtrl?.clearValidators();
    horaFinCtrl?.clearValidators();
    maxHorasCtrl?.clearValidators();
    duracionCtrl?.clearValidators();

    // Buscar si existe una restricción de este tipo para el período actual
    const restriccionExistente = this.restricciones.find(
      r => r.tipo_restriccion === tipo && r.periodo_academico === this.periodoService.periodo
    );

    if (tipo === 'FRANJA_HORARIA' || tipo === 'BLOQUE_ALMUERZO') {
      horaInicioCtrl?.setValidators([Validators.required]);
      horaFinCtrl?.setValidators([Validators.required]);
      
      if (restriccionExistente && restriccionExistente.valor) {
        const val = restriccionExistente.valor as any;
        horaInicioCtrl?.setValue(val.hora_inicio || (tipo === 'BLOQUE_ALMUERZO' ? '13:00' : '07:00'));
        horaFinCtrl?.setValue(val.hora_fin || (tipo === 'BLOQUE_ALMUERZO' ? '14:00' : '22:00'));
      } else if (tipo === 'BLOQUE_ALMUERZO') {
        horaInicioCtrl?.setValue('13:00');
        horaFinCtrl?.setValue('14:00');
      } else {
        horaInicioCtrl?.setValue('07:00');
        horaFinCtrl?.setValue('22:00');
      }
    } else if (tipo === 'MAX_HORAS_DIARIAS' || tipo === 'MAX_HORAS_SEMANALES') {
      maxHorasCtrl?.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(tipo === 'MAX_HORAS_DIARIAS' ? 24 : 168),
      ]);
      
      if (restriccionExistente && restriccionExistente.valor) {
        const val = restriccionExistente.valor as any;
        maxHorasCtrl?.setValue(val.max_horas || (tipo === 'MAX_HORAS_DIARIAS' ? 8 : 40));
      } else {
        maxHorasCtrl?.setValue(tipo === 'MAX_HORAS_DIARIAS' ? 8 : 40);
      }
    } else if (tipo === 'DURACION_BLOQUE') {
      duracionCtrl?.setValidators([
        Validators.required,
        Validators.min(15),
        Validators.max(600),
      ]);
      
      if (restriccionExistente && restriccionExistente.valor) {
        const val = restriccionExistente.valor as any;
        duracionCtrl?.setValue(val.duracion_minutos || 120);
      } else {
        duracionCtrl?.setValue(120);
      }
    }

    horaInicioCtrl?.updateValueAndValidity();
    horaFinCtrl?.updateValueAndValidity();
    maxHorasCtrl?.updateValueAndValidity();
    duracionCtrl?.updateValueAndValidity();
  }

  // ─── RESTRICCIONES ──────────────────────────────────────────────────────

  get tipoActual(): string {
    return this.restriccionForm.get('tipo_restriccion')?.value ?? '';
  }

  cargarRestricciones(): void {
    this.loadingRestricciones = true;
    this.api
      .get<ApiResponse<RestriccionInstitucional[]>>(
        '/configuracion/restricciones',
        {
          periodo: this.periodoService.periodo,
        },
      )
      .subscribe({
        next: (r) => {
          this.restricciones = r.data ?? [];
          this.loadingRestricciones = false;
          // Cargar los valores de la restricción actual después de cargar las restricciones
          const tipoActual = this.restriccionForm.get('tipo_restriccion')?.value;
          if (tipoActual) {
            this.actualizarFormSegunTipo(tipoActual);
          }
        },
        error: () => {
          this.loadingRestricciones = false;
        },
      });
  }

  guardarRestriccion(): void {
    if (this.restriccionForm.invalid) return;

    const tipo = this.restriccionForm.value.tipo_restriccion;
    let valor: Record<string, unknown> = {};

    if (tipo === 'FRANJA_HORARIA' || tipo === 'BLOQUE_ALMUERZO') {
      valor = {
        hora_inicio: this.restriccionForm.value.hora_inicio,
        hora_fin: this.restriccionForm.value.hora_fin,
      };
    } else if (tipo === 'MAX_HORAS_DIARIAS' || tipo === 'MAX_HORAS_SEMANALES') {
      valor = {
        max_horas: Number(this.restriccionForm.value.max_horas),
      };
    } else if (tipo === 'DURACION_BLOQUE') {
      valor = {
        duracion_minutos: Number(this.restriccionForm.value.duracion_minutos),
      };
    }

    this.guardandoRestriccion = true;
    const payload = {
      tipo_restriccion: tipo,
      valor,
      periodo_academico: this.periodoService.periodo,
      activo: true,
    };

    this.api
      .post<ApiResponse<any>>('/configuracion/restricciones', payload)
      .subscribe({
        next: (r) => {
          this.guardandoRestriccion = false;
          this.notif.success(r.message ?? 'Restricción guardada correctamente');
          this.cargarRestricciones();
        },
        error: (err) => {
          this.guardandoRestriccion = false;
          this.notif.error(
            err?.error?.message ?? 'Error al guardar restricción',
          );
        },
      });
  }

  eliminarRestriccion(id: number): void {
    if (!confirm('¿Eliminar esta restricción institucional?')) return;
    this.api
      .delete<ApiResponse<any>>(`/configuracion/restricciones/${id}`)
      .subscribe({
        next: () => {
          this.notif.success('Restricción eliminada exitosamente');
          this.cargarRestricciones();
        },
        error: (err) => {
          this.notif.error(
            err?.error?.message ?? 'Error al eliminar la restricción',
          );
        },
      });
  }

  editarRestriccion(r: RestriccionInstitucional): void {
    this.restriccionForm.patchValue({
      tipo_restriccion: r.tipo_restriccion,
    });
    this.actualizarFormSegunTipo(r.tipo_restriccion);
    
    // Después de actualizar el tipo, cargar los valores específicos
    const val = r.valor as any;
    if (r.tipo_restriccion === 'FRANJA_HORARIA' || r.tipo_restriccion === 'BLOQUE_ALMUERZO') {
      this.restriccionForm.patchValue({
        hora_inicio: val.hora_inicio,
        hora_fin: val.hora_fin,
      });
    } else if (r.tipo_restriccion === 'MAX_HORAS_DIARIAS' || r.tipo_restriccion === 'MAX_HORAS_SEMANALES') {
      this.restriccionForm.patchValue({
        max_horas: val.max_horas,
      });
    } else if (r.tipo_restriccion === 'DURACION_BLOQUE') {
      this.restriccionForm.patchValue({
        duracion_minutos: val.duracion_minutos,
      });
    }
    
    // Scroll al formulario
    document.querySelector('.premium-form-card')?.scrollIntoView({ behavior: 'smooth' });
  }

  getRestriccionDescripcion(r: RestriccionInstitucional): string {
    const val = r.valor as any;
    if (!val) return '';
    switch (r.tipo_restriccion) {
      case 'FRANJA_HORARIA':
        return `Dictado general de clases permitido desde las ${val.hora_inicio || 'N/A'} hasta las ${val.hora_fin || 'N/A'}.`;
      case 'BLOQUE_ALMUERZO':
        return `Intervalo libre reservado para el almuerzo de ${val.hora_inicio || 'N/A'} a ${val.hora_fin || 'N/A'}.`;
      case 'MAX_HORAS_DIARIAS':
        return `Máximo de ${val.max_horas || 0} horas lectivas permitidas por día para cada docente.`;
      case 'MAX_HORAS_SEMANALES':
        return `Máximo de ${val.max_horas || 0} horas lectivas permitidas por semana para cada docente.`;
      case 'DURACION_BLOQUE':
        return `Duración estándar definida para cada bloque continuo de clase en ${val.duracion_minutos || 0} minutos.`;
      default:
        return JSON.stringify(r.valor);
    }
  }

  getRestriccionIcon(tipo: string): string {
    switch (tipo) {
      case 'FRANJA_HORARIA':
        return 'access_time';
      case 'BLOQUE_ALMUERZO':
        return 'restaurant';
      case 'MAX_HORAS_DIARIAS':
        return 'today';
      case 'MAX_HORAS_SEMANALES':
        return 'date_range';
      case 'DURACION_BLOQUE':
        return 'timer';
      default:
        return 'rule';
    }
  }

  // ─── DÍAS NO LABORABLES ────────────────────────────────────────────────

  cargarDiasNoLaborables(): void {
    this.loadingDias = true;
    this.api
      .get<ApiResponse<DiaNoLaborable[]>>('/configuracion/dias-no-laborables', {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (r) => {
          this.diasNoLaborables = r.data ?? [];
          this.loadingDias = false;
        },
        error: () => {
          this.loadingDias = false;
        },
      });
  }

  guardarDia(): void {
    if (this.diaForm.invalid) return;
    this.guardandoDia = true;

    const payload = {
      ...this.diaForm.value,
      periodo_academico: this.periodoService.periodo,
    };

    this.api
      .post<ApiResponse<any>>('/configuracion/dias-no-laborables', payload)
      .subscribe({
        next: () => {
          this.guardandoDia = false;
          this.notif.success('Día no laborable registrado con éxito');
          this.diaForm.reset({
            tipo: 'FERIADO',
            afecta_aulas: true,
            afecta_laboratorios: true,
          });
          this.cargarDiasNoLaborables();
        },
        error: (err) => {
          this.guardandoDia = false;
          this.notif.error(
            err?.error?.message ?? 'Error al registrar día no laborable',
          );
        },
      });
  }

  eliminarDia(id: number, descripcion: string): void {
    if (!confirm(`¿Eliminar "${descripcion}" del calendario?`)) return;
    this.api
      .delete<ApiResponse<any>>(`/configuracion/dias-no-laborables/${id}`)
      .subscribe({
        next: () => {
          this.notif.success('Día no laborable eliminado correctamente');
          this.cargarDiasNoLaborables();
        },
        error: (err) => {
          this.notif.error(
            err?.error?.message ?? 'Error al eliminar el día no laborable',
          );
        },
      });
  }

  onPeriodoChange(): void {
    this.cargarRestricciones();
    this.cargarDiasNoLaborables();
    this.cargarParametrosCarga();
    this.cargarPeriodoActual();
    this.cargarCampanas();
    // Recargar valores del formulario después de cambiar de período
    setTimeout(() => {
      const tipoActual = this.restriccionForm.get('tipo_restriccion')?.value;
      if (tipoActual) {
        this.actualizarFormSegunTipo(tipoActual);
      }
    }, 500);
  }

  // ─── TURNOS ───────────────────────────────────────────────────────────────────────

  cargarTurnos(): void {
    this.loadingTurnos = true;
    this.api
      .get<ApiResponse<TurnoHorario[]>>('/configuracion/turnos')
      .subscribe({
        next: (r) => {
          this.turnos = r.data ?? [];
          this.loadingTurnos = false;
        },
        error: () => {
          this.loadingTurnos = false;
        },
      });
  }

  guardarTurno(): void {
    if (this.turnoForm.invalid) return;
    this.guardandoTurno = true;
    this.api
      .post<ApiResponse<any>>('/configuracion/turnos', this.turnoForm.value)
      .subscribe({
        next: (r) => {
          this.guardandoTurno = false;
          this.notif.success(r.message ?? 'Turno creado exitosamente');
          this.turnoForm.reset({ hora_inicio: '07:00', hora_fin: '13:00' });
          this.cargarTurnos();
        },
        error: (err) => {
          this.guardandoTurno = false;
          this.notif.error(err?.error?.message ?? 'Error al crear el turno');
        },
      });
  }

  eliminarTurno(id: number, nombre: string): void {
    if (!confirm(`¿Eliminar el turno "${nombre}"?`)) return;
    this.api.delete<ApiResponse<any>>(`/configuracion/turnos/${id}`).subscribe({
      next: () => {
        this.notif.success('Turno eliminado correctamente');
        this.cargarTurnos();
      },
      error: (err) => {
        this.notif.error(err?.error?.message ?? 'Error al eliminar el turno');
      },
    });
  }

  // ─── DÍAS ACTIVOS ───────────────────────────────────────────────────────────────

  cargarDiasActivos(): void {
    this.loadingDiasActivos = true;
    this.api
      .get<ApiResponse<DiaActivo[]>>('/configuracion/dias-activos')
      .subscribe({
        next: (r) => {
          this.diasActivos = r.data ?? [];
          this.loadingDiasActivos = false;
        },
        error: () => {
          this.loadingDiasActivos = false;
        },
      });
  }

  toggleDiaActivo(dia: DiaActivo): void {
    this.guardandoDiaActivo = true;
    const payload = {
      dia_semana: dia.dia_semana,
      nombre: dia.nombre,
      activo: !dia.activo,
    };
    this.api
      .post<ApiResponse<any>>('/configuracion/dias-activos', payload)
      .subscribe({
        next: () => {
          this.guardandoDiaActivo = false;
          this.notif.success(
            `Día ${dia.nombre} ${!dia.activo ? 'activado' : 'desactivado'} correctamente`,
          );
          this.cargarDiasActivos();
        },
        error: (err) => {
          this.guardandoDiaActivo = false;
          this.notif.error(err?.error?.message ?? 'Error al actualizar día');
        },
      });
  }

  // ─── PARÁMETROS DE CARGA ────────────────────────────────────────────────────

  cargarParametrosCarga(): void {
    this.loadingParametros = true;
    this.api
      .get<ApiResponse<ParametrosCarga[]>>('/configuracion/parametros-carga', {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (r) => {
          this.parametrosList = r.data ?? [];
          this.aplicarFiltrosParametros();
          this.loadingParametros = false;
        },
        error: () => {
          this.loadingParametros = false;
        },
      });
  }

  aplicarFiltrosParametros(): void {
    this.parametrosFiltrados = this.parametrosList.filter(p => {
      const tipoDocenteOk = !this.filtrosParametros.tipo_docente || p.tipo_docente === this.filtrosParametros.tipo_docente;
      const categoriaOk = !this.filtrosParametros.categoria || p.categoria === this.filtrosParametros.categoria;
      const modalidadOk = !this.filtrosParametros.modalidad || p.modalidad === this.filtrosParametros.modalidad;
      return tipoDocenteOk && categoriaOk && modalidadOk;
    });
  }

  onFiltroChange(): void {
    this.aplicarFiltrosParametros();
  }

  guardarParametrosCarga(): void {
    if (this.parametrosForm.invalid) return;
    this.guardandoParametros = true;
    const payload = {
      ...this.parametrosForm.getRawValue(),
      periodo_academico: this.periodoService.periodo,
    };
    this.api
      .post<
        ApiResponse<ParametrosCarga>
      >('/configuracion/parametros-carga', payload)
      .subscribe({
        next: (r) => {
          this.guardandoParametros = false;
          this.editingParametroId = null;
          this.notif.success(r.message ?? 'Parámetros guardados correctamente');
          this.resetParametrosForm();
          this.cargarParametrosCarga();
        },
        error: (err) => {
          this.guardandoParametros = false;
          this.notif.error(
            err?.error?.message ?? 'Error al guardar parámetros',
          );
        },
      });
  }

  editarParametro(p: ParametrosCarga): void {
    this.editingParametroId = p.id;
    const tipo = p.tipo_docente;
    this.categoriasDisponibles = this.categoriasPorTipo[tipo] ?? [];
    this.modalidadesDisponibles =
      tipo === 'JEFE_PRACTICA_CONTRATADO'
        ? this.modalidades.filter((m) => m.value !== 'DEDICACION_EXCLUSIVA')
        : [...this.modalidades];
    this.parametrosForm.get('categoria')!.enable();
    this.parametrosForm.get('modalidad')!.enable();
    this.parametrosForm.patchValue({
      tipo_docente: p.tipo_docente,
      categoria: p.categoria,
      modalidad: p.modalidad,
      horas_min_semanal: p.horas_min_semanal,
      horas_max_semanal: p.horas_max_semanal,
      cursos_min_docente: p.cursos_min_docente,
      cursos_max_docente: p.cursos_max_docente,
    });
    document
      .querySelector('.parametros-form-card')
      ?.scrollIntoView({ behavior: 'smooth' });
  }

  cancelarEdicionParametro(): void {
    this.editingParametroId = null;
    this.resetParametrosForm();
  }

  eliminarParametro(id: number): void {
    this.eliminandoParametroId = id;
    this.api
      .delete<ApiResponse<null>>(`/configuracion/parametros-carga/${id}`)
      .subscribe({
        next: (r) => {
          this.eliminandoParametroId = null;
          this.notif.success(r.message ?? 'Parámetro eliminado');
          this.cargarParametrosCarga();
        },
        error: (err) => {
          this.eliminandoParametroId = null;
          this.notif.error(err?.error?.message ?? 'Error al eliminar');
        },
      });
  }

  onTipoDocenteChange(tipo: string): void {
    this.parametrosForm.get('categoria')!.reset('');
    this.parametrosForm.get('modalidad')!.reset('');
    this.parametrosForm.get('modalidad')!.disable();
    if (tipo) {
      this.categoriasDisponibles = this.categoriasPorTipo[tipo] ?? [];
      this.parametrosForm.get('categoria')!.enable();
      this.modalidadesDisponibles =
        tipo === 'JEFE_PRACTICA_CONTRATADO'
          ? this.modalidades.filter((m) => m.value !== 'DEDICACION_EXCLUSIVA')
          : [...this.modalidades];
      if (this.categoriasDisponibles.length === 1) {
        this.parametrosForm
          .get('categoria')!
          .setValue(this.categoriasDisponibles[0].value);
        this.parametrosForm.get('modalidad')!.enable();
      }
    } else {
      this.categoriasDisponibles = [];
      this.modalidadesDisponibles = [];
      this.parametrosForm.get('categoria')!.disable();
    }
  }

  onCategoriaChange(categoria: string): void {
    this.parametrosForm.get('modalidad')!.reset('');
    if (categoria) {
      this.parametrosForm.get('modalidad')!.enable();
    } else {
      this.parametrosForm.get('modalidad')!.disable();
    }
  }

  getTipoDocenteLabel(value: string): string {
    return this.tiposDocente.find((t) => t.value === value)?.label ?? value;
  }

  getCategoriaLabel(value: string): string {
    if (value === 'SIN_CATEGORIA') return 'Sin categoría';
    if (!value) return '—';
    return value.charAt(0) + value.slice(1).toLowerCase();
  }

  getModalidadLabel(value: string): string {
    return this.modalidades.find((m) => m.value === value)?.label ?? value;
  }

  formatModalidad(m: string): string {
    return this.getModalidadLabel(m);
  }

  private resetParametrosForm(): void {
    this.parametrosForm.reset({
      tipo_docente: '',
      horas_min_semanal: 4,
      horas_max_semanal: 20,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    });
    this.parametrosForm.get('categoria')!.disable();
    this.parametrosForm.get('modalidad')!.disable();
    this.categoriasDisponibles = [];
    this.modalidadesDisponibles = [];
  }

  // ─── CONFIGURACIÓN GENERAL ────────────────────────────────────────────────

  cargarConfiguracionGeneral(): void {
    this.loadingGeneral = true;
    this.api
      .get<ApiResponse<ConfiguracionGeneral>>('/configuracion/general')
      .subscribe({
        next: (r) => {
          this.configuracionGeneral = r.data ?? null;
          if (this.configuracionGeneral) {
            this.generalForm.patchValue(this.configuracionGeneral);
          }
          this.loadingGeneral = false;
        },
        error: () => {
          this.loadingGeneral = false;
        },
      });
  }

  guardarConfiguracionGeneral(): void {
    if (this.generalForm.invalid) return;
    this.guardandoGeneral = true;
    this.api
      .put<ApiResponse<any>>('/configuracion/general', this.generalForm.value)
      .subscribe({
        next: (r) => {
          this.guardandoGeneral = false;
          this.notif.success(
            r.message ?? 'Configuración guardada correctamente',
          );
          if (r.data) {
            this.cfgService.aplicar(r.data);
          }
          this.cargarConfiguracionGeneral();
        },
        error: (err) => {
          this.guardandoGeneral = false;
          this.notif.error(
            err?.error?.message ?? 'Error al guardar configuración',
          );
        },
      });
  }

  tipoDiaLabel(tipo: string): string {
    return this.tiposDia.find((t) => t.value === tipo)?.label ?? tipo;
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  // ─── VENTANAS AUTOMÁTICAS ────────────────────────────────────────────────

  cargarPeriodoActual(): void {
    if (this.periodoService.periodoActivo?.id) {
      this.api.get<ApiResponse<any>>(`/periodos/${this.periodoService.periodoActivo.id}`).subscribe({
        next: (r) => {
          this.modoAsignacionPeriodo = r.data?.modo_asignacion ?? 'VENTANAS';
          // Inicializar nuevoModo con el valor actual (default: VENTANAS)
          const modo = r.data?.modo_asignacion?.toUpperCase() as 'VENTANAS' | 'AUTOMATICA' | 'MIXTA';
          this.nuevoModo = modo || 'VENTANAS';
          this.verificarSiPuedeCambiarModo();
        },
        error: () => {
          this.modoAsignacionPeriodo = 'VENTANAS';
          this.nuevoModo = 'VENTANAS';
        },
      });
    }
  }

  verificarSiPuedeCambiarModo(): void {
    // Verificar si hay horarios asignados en el período
    this.api.get<ApiResponse<any>>(`/horarios`, {
      periodo: this.periodoService.periodo,
      limit: 1
    }).subscribe({
      next: (r) => {
        const horarios = r.data?.items ?? r.data ?? [];
        this.puedeCambiarModo = horarios.length === 0;
      },
      error: () => {
        this.puedeCambiarModo = true;
      }
    });
  }

  getModoLabel(): string {
    const labels: Record<string, string> = {
      'VENTANAS': 'Ventanas de Atención',
      'AUTOMATICA': 'Generación Automática',
      'MIXTA': 'Modo Mixto'
    };
    return labels[this.modoAsignacionPeriodo?.toUpperCase()] || 'Ventanas de Atención';
  }

  cambiarModoAsignacion(): void {
    if (!this.nuevoModo || !this.periodoService.periodoActivo?.id) return;
    if (this.nuevoModo === this.modoAsignacionPeriodo) return;

    this.cambiandoModo = true;
    this.api.patch<ApiResponse<any>>(`/periodos/${this.periodoService.periodoActivo.id}/modo-asignacion`, {
      modo_asignacion: this.nuevoModo.toLowerCase()
    }).subscribe({
      next: (r) => {
        this.cambiandoModo = false;
        this.modoAsignacionPeriodo = this.nuevoModo;
        this.notif.success(r.message || 'Modo de asignación actualizado correctamente');
      },
      error: (err) => {
        this.cambiandoModo = false;
        const msg = err?.error?.message || 'Error al cambiar modo de asignación';
        this.notif.error(msg);
      }
    });
  }

  agregarConfiguracionVentana(): void {
    this.ventanaConfig.push({
      categoria: 'PRINCIPAL',
      modalidad: 'NOMBRADO',
      hora_inicio: '08:00',
      intervalo_minutos: 30,
    });
  }

  eliminarConfiguracionVentana(index: number): void {
    this.ventanaConfig.splice(index, 1);
  }

  configurarVentanasPeriodo(): void {
    if (this.ventanasForm.invalid || this.ventanaConfig.length === 0) {
      this.notif.info('Complete el formulario y agregue al menos una configuración de ventana');
      return;
    }

    if (!this.periodoService.periodoActivo?.id) {
      this.notif.info('Seleccione un período académico');
      return;
    }

    this.configurandoVentanas = true;
    const payload = {
      idPeriodo: this.periodoService.periodoActivo.id,
      fechaInicio: this.ventanasForm.value.fechaInicio,
      config: this.ventanaConfig,
    };

    this.api.post<ApiResponse<any>>('/ventanas/configurar-periodo', payload).subscribe({
      next: (r) => {
        this.configurandoVentanas = false;
        this.notif.success(r.message ?? 'Ventanas configuradas correctamente');
        this.ventanaConfig = [];
        this.ventanasForm.reset();
      },
      error: (err) => {
        this.configurandoVentanas = false;
        this.notif.error(err?.error?.message ?? 'Error al configurar ventanas');
      },
    });
  }

  crearVentanasPendientes(): void {
    if (!this.periodoService.periodoActivo?.id) {
      this.notif.info('Seleccione un período académico');
      return;
    }

    if (this.modoAsignacionPeriodo !== 'MIXTA') {
      this.notif.info('Solo se pueden crear ventanas pendientes en modo MIXTA');
      return;
    }

    this.creandoVentanasPendientes = true;
    this.api.post<ApiResponse<any>>(`/periodos/${this.periodoService.periodoActivo.id}/crear-ventanas-pendientes`, {}).subscribe({
      next: (r) => {
        this.creandoVentanasPendientes = false;
        this.notif.success(r.message ?? 'Ventanas para docentes pendientes creadas correctamente');
      },
      error: (err) => {
        this.creandoVentanasPendientes = false;
        this.notif.error(err?.error?.message ?? 'Error al crear ventanas pendientes');
      },
    });
  }

  // ─── CAMPÑAS DE VENTANAS ─────────────────────────────────────────────────────

  cargarCampanas(): void {
    if (this.periodoService.periodoActivo?.id) {
      this.api.get<ApiResponse<any[]>>(`/campanas-ventanas?periodoId=${this.periodoService.periodoActivo.id}`).subscribe({
        next: (r) => {
          this.campanas = r.data ?? [];
        },
        error: () => {
          this.campanas = [];
        },
      });
    }
  }

  crearCampana(): void {
    if (this.campanaForm.invalid) {
      this.notif.info('Complete el formulario de campaña');
      return;
    }

    if (!this.periodoService.periodoActivo?.id) {
      this.notif.info('Seleccione un período académico');
      return;
    }

    this.creandoCampana = true;
    const formValue = this.campanaForm.value;
    const payload = {
      nombre: formValue.nombre,
      descripcion: formValue.descripcion,
      idPeriodo: this.periodoService.periodoActivo.id,
      fecha_inicio: formValue.fechaInicio,
      fecha_fin: formValue.fechaFin,
      dias_habilitados: Array.isArray(formValue.diasHabilitados) ? formValue.diasHabilitados : [formValue.diasHabilitados],
      duracion_turno_minutos: formValue.duracionTurnoMinutos,
      buffer_minutos: formValue.bufferMinutos,
      cupos_maximos_ventana: formValue.cuposMaximosVentana,
      porcentaje_reserva: formValue.porcentajeReserva,
      excluir_feriados: formValue.excluirFeriados,
      excluir_eventos: formValue.excluirEventos,
      distribucion_equitativa: formValue.distribucionEquitativa,
      bloques_horarios: this.bloquesHorarios,
    };

    this.api.post<ApiResponse<any>>('/campanas-ventanas', payload).subscribe({
      next: (r) => {
        this.creandoCampana = false;
        this.notif.success(r.message ?? 'Campaña creada correctamente');
        this.campanaSeleccionada = r.data;
        this.campanaForm.reset();
        this.cargarCampanas();
      },
      error: (err) => {
        this.creandoCampana = false;
        this.notif.error(err?.error?.message ?? 'Error al crear campaña');
      },
    });
  }

  generarVentanasCampana(): void {
    if (!this.campanaSeleccionada) {
      this.notif.info('Seleccione una campaña');
      return;
    }

    this.generandoVentanas = true;
    this.api.post<ApiResponse<any[]>>(`/campanas-ventanas/${this.campanaSeleccionada.id}/generar`, {}).subscribe({
      next: (r) => {
        this.generandoVentanas = false;
        this.ventanasGeneradas = r.data ?? [];
        this.notif.success(`Se generaron ${this.ventanasGeneradas.length} ventanas`);
        this.cargarCampanas();
      },
      error: (err) => {
        this.generandoVentanas = false;
        this.notif.error(err?.error?.message ?? 'Error al generar ventanas');
      },
    });
  }

  publicarCampana(): void {
    if (!this.campanaSeleccionada) {
      this.notif.info('Seleccione una campaña');
      return;
    }

    this.publicandoCampana = true;
    this.api.post<ApiResponse<any>>(`/campanas-ventanas/${this.campanaSeleccionada.id}/publicar`, {}).subscribe({
      next: (r) => {
        this.publicandoCampana = false;
        this.notif.success(r.message ?? 'Campaña publicada correctamente');
        this.cargarCampanas();
      },
      error: (err) => {
        this.publicandoCampana = false;
        this.notif.error(err?.error?.message ?? 'Error al publicar campaña');
      },
    });
  }

  seleccionarCampana(campana: any): void {
    console.log('[Configuración] seleccionarCampana llamada con:', campana);
    this.campanaSeleccionada = campana;
    this.ventanasGeneradas = [];
    console.log('[Configuración] campanaSeleccionada asignada:', this.campanaSeleccionada);
    
    // Cargar detalles completos de la campaña incluyendo bloques horarios
    this.api.get<ApiResponse<any>>(`/campanas-ventanas/${campana.id}`).subscribe({
      next: (r) => {
        console.log('[Configuración] Respuesta de API:', r);
        const campanaCompleta = r.data;
        this.campanaSeleccionada = campanaCompleta;
        
        // Cargar bloques horarios de la campaña
        if (campanaCompleta.bloques_horarios && Array.isArray(campanaCompleta.bloques_horarios)) {
          this.bloquesHorarios = [...campanaCompleta.bloques_horarios];
        } else {
          this.bloquesHorarios = [];
        }
        
        // Cargar reglas de prioridad de la campaña
        if (campanaCompleta.reglas_prioridad && Array.isArray(campanaCompleta.reglas_prioridad)) {
          this.reglasPrioridad = [...campanaCompleta.reglas_prioridad];
        } else {
          this.reglasPrioridad = [];
        }
        
        console.log('[Configuración] Campaña seleccionada:', campanaCompleta);
        console.log('[Configuración] Bloques horarios:', this.bloquesHorarios);
      },
      error: (err) => {
        console.error('[Configuración] Error al cargar detalles de campaña:', err);
        this.notif.error('Error al cargar detalles de la campaña');
      }
    });
  }

  eliminarVentanasCampana(): void {
    if (!this.campanaSeleccionada) {
      this.notif.info('Seleccione una campaña');
      return;
    }

    if (!confirm(`¿Está seguro de eliminar todas las ventanas de la campaña "${this.campanaSeleccionada.nombre}"?`)) {
      return;
    }

    this.api.post<ApiResponse<any>>(`/campanas-ventanas/${this.campanaSeleccionada.id}/eliminar-ventanas`, {}).subscribe({
      next: (r) => {
        this.notif.success(`Se eliminaron ${r.data.ventanasEliminadas} ventanas`);
        this.campanaSeleccionada = r.data.campañaActualizada;
        this.ventanasGeneradas = [];
        this.cargarCampanas();
      },
      error: (err) => {
        this.notif.error(err?.error?.message ?? 'Error al eliminar ventanas');
      }
    });
  }

  agregarBloqueHorario(): void {
    this.bloquesHorarios.push({
      nombre: `Bloque ${this.bloquesHorarios.length + 1}`,
      hora_inicio: '08:00',
      hora_fin: '12:00',
    });
  }

  eliminarBloqueHorario(index: number): void {
    this.bloquesHorarios.splice(index, 1);
  }

  agregarReglaPrioridad(): void {
    this.reglasPrioridad.push({
      campo: 'categoria',
      orden: 'DESC',
    });
  }

  eliminarReglaPrioridad(index: number): void {
    this.reglasPrioridad.splice(index, 1);
  }

  cargarReglasPrioridad(): void {
    this.api.get<ApiResponse<any>>('/reglas-prioridad').subscribe({
      next: (r) => {
        if (r && r.data && r.data.reglas) {
          this.reglasPrioridad = r.data.reglas;
        }
      },
      error: (error) => {
        console.error('Error al cargar reglas de prioridad:', error);
        // Mantener reglas por defecto si falla la carga
      },
    });
  }

  guardarReglasPrioridad(): void {
    this.guardandoReglasPrioridad = true;
    this.api.put<ApiResponse<any>>('/reglas-prioridad', {
      reglas: this.reglasPrioridad,
      descripcion: 'Reglas de prioridad actualizadas desde Configuración General',
    }).subscribe({
      next: () => {
        this.guardandoReglasPrioridad = false;
        this.notif.success('Reglas de prioridad guardadas correctamente');
      },
      error: (error) => {
        this.guardandoReglasPrioridad = false;
        console.error('Error al guardar reglas de prioridad:', error);
        this.notif.error('Error al guardar las reglas de prioridad');
      },
    });
  }
}
