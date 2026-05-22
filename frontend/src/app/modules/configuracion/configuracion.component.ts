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
  activeTab:
    | 'restricciones'
    | 'diasNoLaborables'
    | 'turnos'
    | 'diasActivos'
    | 'parametrosCarga'
    | 'general' = 'restricciones';

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
  loadingParametros = false;
  guardandoParametros = false;
  eliminandoParametroId: number | null = null;
  editingParametroId: number | null = null;
  parametrosForm!: FormGroup;

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
    this.cargarDiasNoLaborables();
    this.cargarTurnos();
    this.cargarDiasActivos();
    this.cargarParametrosCarga();
    this.cargarConfiguracionGeneral();
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

    if (tipo === 'FRANJA_HORARIA' || tipo === 'BLOQUE_ALMUERZO') {
      horaInicioCtrl?.setValidators([Validators.required]);
      horaFinCtrl?.setValidators([Validators.required]);
      if (tipo === 'BLOQUE_ALMUERZO') {
        horaInicioCtrl?.setValue('12:00');
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
      maxHorasCtrl?.setValue(tipo === 'MAX_HORAS_DIARIAS' ? 8 : 40);
    } else if (tipo === 'DURACION_BLOQUE') {
      duracionCtrl?.setValidators([
        Validators.required,
        Validators.min(15),
        Validators.max(600),
      ]);
      duracionCtrl?.setValue(120);
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
          this.loadingParametros = false;
        },
        error: () => {
          this.loadingParametros = false;
        },
      });
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
}
