import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, Subscription, debounceTime, switchMap, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ROLES } from '../../../core/constants/roles';
import { AuthService } from '../../../core/services/auth.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { CargaAdicionalService, CargaAdicional } from '../../../core/services/carga-adicional.service';
import { Docente, ApiResponse, DeclaracionObservacion } from '../../../core/interfaces/entities';
import { GestionarHorarioDialogComponent, GestionarHorarioData, HorarioEntry as HorarioEntryType } from '../dialogs/gestionar-horario-dialog.component';
import { DragDropScheduleComponent, DragDropScheduleData, HorarioEntry } from '../dialogs/drag-drop-schedule.component';
import {
  DIA_CODIGO_A_CORTO,
  diaNumericoACodigo,
  esHorarioIdentico,
  HorarioLectivoRef,
  normalizarHora,
  seSuperponen,
} from '../horario.utils';

interface CursoLectivo {
  id: number;
  codigo: string;
  nombre: string;
  tipoCurso: string;
  seccion: string;
  escuela: string;
  ciclo: number;
  nroAlumnos: number;
  hrsTeo: number;
  hrsPra: number;
  hrsLab: number;
  totalHrs: number;
  plan_hours?: boolean;
}

interface HorarioNoLectiva {
  dia: string;
  hora_inicio: string;
  hora_fin: string;
}

interface ActividadNoLectiva {
  id: number;
  codigo: string;
  descripcion: string;
  detalle: string;
  horas: number;
  horarios: HorarioNoLectiva[];
  horasManual: boolean;
  excede?: boolean;
}

interface EstadoConfig {
  label: string;
  color: string;
  editable: boolean;
  etapa: number;
}

const ACTIVIDADES_NO_LECTIVAS: { id: number; descripcion: string }[] = [
  { id: 2, descripcion: '2. PREPARACIÓN Y EVALUACIÓN (Max 50% de Trabajo Lectivo)' },
  { id: 3, descripcion: '3. CONSEJERÍA Y TUTORÍA: señalar número de alumnos y ciclo académico' },
  { id: 4, descripcion: '4. INVESTIGACIÓN: Consignar el nro de inscripción, código, nombre y duración del proyecto' },
  { id: 5, descripcion: '5. CAPACITACIÓN: Señalar lo referente a este rubro en el marco de los planes de cada Facultad' },
  { id: 6, descripcion: '6. ACTIVIDADES DE GOBIERNO: Se desempeña cargo indique' },
  { id: 7, descripcion: '7. ACTIVIDADES DE ADMINISTRACIÓN: Si desempeña cargo indique' },
  { id: 8, descripcion: '8. ASESORÍA DE TESIS, EXÁMENES PROFESIONALES Y EXPERIENCIA PROFESIONAL' },
  { id: 9, descripcion: '9. RESPONSABILIDAD SOCIAL UNIVERSITARIA: Señalar actividad, proyecto a ejecutarse' },
  { id: 10, descripcion: '10. COMITÉS TÉCNICOS Y COMISIONES: Consignar el número de Resolución autorizativa' },
];

const MINIMO_NORMATIVO: Record<string, number> = {
  DEDICACION_EXCLUSIVA: 40,
  TIEMPO_COMPLETO_40: 40,
  TIEMPO_PARCIAL_20: 20,
  TIEMPO_PARCIAL_12: 12,
  TIEMPO_PARCIAL_10: 10,
  TIEMPO_PARCIAL_8: 8,
};

const ESTADOS_CONFIG: Record<string, EstadoConfig> = {
  BORRADOR:     { label: 'Borrador',      color: 'estado-borrador',     editable: true,  etapa: 0 },
  ENVIADO:      { label: 'Enviado',       color: 'estado-enviado',      editable: false, etapa: 1 },
  VALIDADO_DPTO: { label: 'Validado Dpto.',   color: 'estado-departamento', editable: false, etapa: 2 },
  APROBADO_FACULTAD: { label: 'Aprobado Facultad', color: 'estado-facultad',     editable: false, etapa: 3 },
  CERRADO:      { label: 'Cerrado',        color: 'estado-cerrado',      editable: false, etapa: 4 },
};

const STEPPER_ETAPAS = [
  { key: 'BORRADOR',     label: 'Borrador',      icon: 'edit_note' },
  { key: 'ENVIADO',      label: 'Enviado',       icon: 'send' },
  { key: 'VALIDADO_DPTO', label: 'Validado Dpto.',   icon: 'verified' },
  { key: 'APROBADO_FACULTAD', label: 'Aprobado Facultad', icon: 'approval' },
  { key: 'CERRADO',      label: 'Cerrado',        icon: 'lock' },
];

@Component({
  selector: 'app-verificar-declaracion',
  templateUrl: './verificar-declaracion.component.html',
  styleUrls: ['./verificar-declaracion.component.scss'],
})
export class VerificarDeclaracionComponent implements OnInit, OnDestroy {
  docenteId = 0;
  docente: Docente | null = null;
  declaracionId: number | null = null;
  loading = true;
  saving = false;
  periodoActivo = '';

  estadoDeclaracion: string = 'BORRADOR';

  cursosLectivos: CursoLectivo[] = [];
  horariosLectivos: HorarioLectivoRef[] = [];
  totalHorasLectivas = 0;

  actividadesNoLectivas: ActividadNoLectiva[] = [];
  totalHorasNoLectivas = 0;
  subtotalPreparacion = 0;
  subtotalInvestigacion = 0;
  subtotalGestion = 0;
  cargandoHorariosLectivos = false;

  totalHoras = 0;
  esEditable = true;

  horasModalidad = 0;
  gaugePercent = 0;

  autoSaving = false;
  autoSaveStatus = '';
  lastSaved: Date | null = null;

  periodoInfo: { codigo: string; nombre: string; fecha_inicio: string; fecha_fin: string; semestre: string; anio: string } | null = null;

  Math = Math;
  progresoPorcentaje = 0;
  rubrosCompletos = 0;
  rubrosVisibles = 0;

  observaciones: DeclaracionObservacion[] = [];
  textoObservacion = '';

  declaracionJurada: any = null;
  cargandoDeclaracionJurada = false;
  aceptaDeclaracionJurada = false;
  generandoDeclaracionJurada = false;

  stepperEtapas = STEPPER_ETAPAS;

  // Inline drag-drop schedule editing
  actividadSeleccionada: ActividadNoLectiva | null = null;
  dragDropData: DragDropScheduleData | null = null;

  // Carga Adicional
  cargaAdicional: CargaAdicional[] = [];
  totalHorasCargaAdicional = 0;
  mostrandoCargaAdicional = false;

  private autoSaveSubject = new Subject<void>();
  private autoSaveSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private authService: AuthService,
    private periodoService: PeriodoService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cargaAdicionalService: CargaAdicionalService,
  ) { }

  ngOnInit(): void {
    this.docenteId = Number(this.route.snapshot.paramMap.get('id'));
    this.periodoActivo = this.periodoService.periodo;
    this.inicializarActividadesNoLectivas();
    this.cargarDocente();
    this.cargarCursosAsignados();
    this.cargarDeclaracion();

    this.cargarDeclaracionJurada();

    this.autoSaveSub = this.autoSaveSubject.pipe(
      debounceTime(10000),
      switchMap(() => this.ejecutarAutoSave()),
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.autoSaveSub?.unsubscribe();
  }

  get estadoConfig(): EstadoConfig {
    return ESTADOS_CONFIG[this.estadoDeclaracion] || ESTADOS_CONFIG['BORRADOR'];
  }

  get estadoLabel(): string {
    return this.estadoConfig.label;
  }

  get estadoColor(): string {
    return this.estadoConfig.color;
  }

  get etapaActual(): number {
    return this.estadoConfig.etapa;
  }

  get isDirector(): boolean {
    return this.authService.hasRole(ROLES.DIRECTOR_ESCUELA) || this.authService.hasRole(ROLES.DIRECTOR_DEPARTAMENTO);
  }

  get isDecano(): boolean {
    return this.authService.hasRole(ROLES.DECANO);
  }

  get isDocente(): boolean {
    return this.authService.hasRole(ROLES.DOCENTE);
  }

  get isAdmin(): boolean {
    return this.authService.hasRole(ROLES.ADMINISTRADOR_SISTEMA);
  }

  get puedeEnviar(): boolean {
    if (!this.declaracionId) return false;
    return this.isDocente && this.estadoDeclaracion === 'BORRADOR';
  }

  get puedeEditar(): boolean {
    return this.esEditable && this.estadoDeclaracion === 'BORRADOR';
  }

  private asignarPeriodoInfoFallback(): void {
    const p = this.periodoService.periodoActivo;
    const codigo = p?.codigo || this.periodoActivo;
    const partes = codigo.split('-');
    this.periodoInfo = {
      codigo,
      nombre: p?.nombre || '',
      fecha_inicio: p?.fecha_inicio || '',
      fecha_fin: p?.fecha_fin || '',
      semestre: partes.length > 1 ? partes[1] : '',
      anio: partes.length > 0 ? partes[0] : codigo,
    };
  }

  inicializarActividadesNoLectivas(): void {
    this.actividadesNoLectivas = ACTIVIDADES_NO_LECTIVAS.map((a) => ({
      id: a.id,
      codigo: a.id.toString().padStart(3, '0'),
      descripcion: a.descripcion,
      detalle: '',
      horas: 0,
      horarios: [],
      horasManual: false,
    }));
  }

  cargarDocente(): void {
    this.api.get<ApiResponse<Docente>>(`/docentes/${this.docenteId}`).subscribe({
      next: (res) => {
        this.docente = res.data;
        this.horasModalidad = MINIMO_NORMATIVO[res.data.modalidad] || 40;
        this.actualizarGauge();
      },
      error: () => {
        this.snackBar.open('Error al cargar datos del docente', 'Cerrar', { duration: 3000 });
      },
    });
  }

  cargarCursosAsignados(): void {
    this.api.get<ApiResponse<any[]>>(`/declaraciones/docentes/${this.docenteId}/cursos?periodo=${this.periodoActivo}`)
      .subscribe({
        next: (res) => {
          this.cursosLectivos = (res.data || []).map((c: any) => ({
            id: c.id,
            codigo: c.codigo || '',
            nombre: c.nombre || '',
            tipoCurso: c.tipoCurso || '',
            seccion: c.seccion || '',
            escuela: c.escuela || '',
            ciclo: c.ciclo || 0,
            nroAlumnos: c.nroAlumnos || 0,
            hrsTeo: c.hrsTeo || 0,
            hrsPra: c.hrsPra || 0,
            hrsLab: c.hrsLab || 0,
            totalHrs: c.totalHrs || 0,
            plan_hours: true,
          }));
          this.calcularTotales();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  cargarDeclaracion(): void {
    this.api.get<ApiResponse<any>>(`/declaraciones/docentes/${this.docenteId}/declaracion?periodo=${this.periodoActivo}`)
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.declaracionId = res.data.id;
            const estadosValidos = ['BORRADOR', 'ENVIADO', 'VALIDADO_DPTO', 'APROBADO_FACULTAD', 'CERRADO', 'OBSERVADO_DPTO', 'OBSERVADO_FACULTAD', 'REABIERTO'];
      this.estadoDeclaracion = estadosValidos.includes(res.data.estado) ? res.data.estado : 'BORRADOR';
            if (res.data.periodo_academico) {
              const p = res.data.periodo_academico;
              const codigo = p.codigo || this.periodoActivo;
              const partes = codigo.split('-');
              this.periodoInfo = {
                codigo,
                nombre: p.nombre || '',
                fecha_inicio: p.fecha_inicio || '',
                fecha_fin: p.fecha_fin || '',
                semestre: partes.length > 1 ? partes[1] : '',
                anio: partes.length > 0 ? partes[0] : codigo,
              };
            }
            if (res.data.carga_no_lectiva) {
              this.cargarCargaNoLectiva(res.data.carga_no_lectiva);
            }
            if (res.data.carga_adicional) {
              this.cargaAdicional = res.data.carga_adicional;
              this.totalHorasCargaAdicional = this.cargaAdicional.reduce((sum: number, c: CargaAdicional) => sum + (c.total_horas || 0), 0);
            }
            this.cargarObservaciones();
            this.cargarHorariosLectivos();
          } else {
            this.estadoDeclaracion = 'BORRADOR';
            this.cargarHorariosLectivos();
          }
          if (!this.periodoInfo) {
            this.asignarPeriodoInfoFallback();
          }
        },
        error: () => {
          this.estadoDeclaracion = 'BORRADOR';
          if (!this.periodoInfo) this.asignarPeriodoInfoFallback();
        },
      });
  }

  cargarObservaciones(): void {
    if (!this.declaracionId) return;
    this.api.get<ApiResponse<DeclaracionObservacion[]>>(`/declaraciones/${this.declaracionId}/observaciones`)
      .subscribe({
        next: (res) => {
          this.observaciones = res.data || [];
        },
        error: () => {
          this.observaciones = [];
        },
      });
  }

  cargarCargaNoLectiva(data: any): void {
    if (Array.isArray(data.actividades)) {
      data.actividades.forEach((a: any) => {
        const act = this.actividadesNoLectivas.find((x) => x.id === a.id);
        if (act) {
          act.detalle = a.detalle || '';
          act.horas = a.horas || 0;
          act.horasManual = a.horasManual === true;
          if (Array.isArray(a.horarios)) {
            act.horarios = a.horarios.map((h: any) => ({
              dia: h.dia || 'LU',
              hora_inicio: h.hora_inicio || '08:00',
              hora_fin: h.hora_fin || '10:00',
            }));
          } else if (a.horario) {
            // backward compatibility: parse old string format
            act.horarios = this.parseHorarioString(a.horario);
          }
        }
      });
      this.calcularTotales();
    }
  }

  private parseHorarioString(horario: string): HorarioEntryType[] {
    if (!horario || !horario.trim()) return [];
    const dias: Record<string, string> = {
      lun: 'LU', mar: 'MA', mié: 'MI', mie: 'MI', jue: 'JU', juv: 'JU', vie: 'VI', sáb: 'SA', sab: 'SA',
    };
    const partes = horario.split(',').map(p => p.trim()).filter(Boolean);
    const result: HorarioEntryType[] = [];
    for (const parte of partes) {
      const match = parte.match(/([A-Za-záéíóú]+)\s+(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?/);
      if (match) {
        const diaKey = match[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const dia = dias[diaKey] || match[1].toUpperCase().substring(0, 2);
        const h1 = match[2].padStart(2, '0');
        const m1 = match[3] || '00';
        const h2 = match[4].padStart(2, '0');
        const m2 = match[5] || '00';
        result.push({ dia, hora_inicio: `${h1}:${m1}`, hora_fin: `${h2}:${m2}` });
      }
    }
    return result;
  }

  getEtapaEstado(etapaKey: string): 'completada' | 'actual' | 'pendiente' {
    const etapaIdx = this.stepperEtapas.findIndex(e => e.key === etapaKey);
    if (etapaIdx === -1) return 'pendiente';
    const estadosMap: Record<string, number> = {
      BORRADOR: 0,
      ENVIADO: 1,
      VALIDADO_DPTO: 2,
      APROBADO_FACULTAD: 3,
      CERRADO: 4,
    };
    const current = estadosMap[this.estadoDeclaracion] ?? 0;
    if (current > etapaIdx) return 'completada';
    if (current === etapaIdx) return 'actual';
    return 'pendiente';
  }

  calcularTotales(): void {
    this.totalHorasLectivas = this.cursosLectivos.reduce((sum, c) => sum + (c.totalHrs || 0), 0);

    for (const act of this.actividadesNoLectivas) {
      if (!act.horasManual && (!act.horas || act.horas === 0)) {
        const calc = this.calcularHorasDesdeHorarios(act.horarios);
        if (calc > 0) act.horas = calc;
      }
    }

    this.totalHorasNoLectivas = this.actividadesNoLectivas
      .reduce((sum, a) => sum + (Number(a.horas) || 0), 0);
    this.totalHorasCargaAdicional = this.cargaAdicional.reduce((sum, c) => sum + (c.total_horas || 0), 0);
    this.totalHoras = this.totalHorasLectivas + this.totalHorasNoLectivas + this.totalHorasCargaAdicional;

    this.subtotalPreparacion = this.actividadesNoLectivas.filter(a => a.id === 2).reduce((s, a) => s + (Number(a.horas) || 0), 0);
    this.subtotalInvestigacion = this.actividadesNoLectivas.filter(a => a.id >= 3 && a.id <= 5).reduce((s, a) => s + (Number(a.horas) || 0), 0);
    this.subtotalGestion = this.actividadesNoLectivas.filter(a => a.id >= 6 && a.id <= 10).reduce((s, a) => s + (Number(a.horas) || 0), 0);

    this.actualizarGauge();
    this.actualizarProgreso();
  }

  private calcularHorasDesdeHorarios(horarios: HorarioEntryType[]): number {
    return horarios.reduce((sum, h) => {
      if (!h.hora_inicio || !h.hora_fin) return sum;
      const [h1, m1] = h.hora_inicio.split(':').map(Number);
      const [h2, m2] = h.hora_fin.split(':').map(Number);
      if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return sum;
      return sum + Math.max(0, (h2 * 60 + m2 - h1 * 60 - m1) / 60);
    }, 0);
  }

  getHorarioSummary(horarios: HorarioEntryType[]): string {
    if (!horarios || horarios.length === 0) return 'Sin horario';
    const porDia = new Map<string, HorarioEntryType[]>();
    for (const h of horarios) {
      const arr = porDia.get(h.dia) || [];
      arr.push(h);
      porDia.set(h.dia, arr);
    }
    const partes: string[] = [];
    for (const [dia, bloques] of porDia) {
      const ordenados = bloques
        .map(b => ({ ini: normalizarHora(b.hora_inicio), fin: normalizarHora(b.hora_fin) }))
        .sort((a, b) => a.ini.localeCompare(b.ini));
      let merged: { ini: string; fin: string }[] = [];
      for (const b of ordenados) {
        const last = merged[merged.length - 1];
        if (last && last.fin === b.ini) {
          last.fin = b.fin;
        } else {
          merged.push({ ...b });
        }
      }
      for (const r of merged) {
        partes.push(`${DIA_CODIGO_A_CORTO[dia] || dia} ${r.ini}–${r.fin}`);
      }
    }
    return partes.join(', ');
  }

  cargarHorariosLectivos(): void {
    this.obtenerHorariosLectivos().catch(() => {
      this.horariosLectivos = [];
    });
  }

  private obtenerHorariosLectivos(): Promise<HorarioLectivoRef[]> {
    const mapRegistro = (r: any): HorarioLectivoRef => {
      const rDia = r.dia ?? r.dia_semana ?? r.diaSemana ?? r.DIA ?? r.day;
      const rInicio = r.horaInicio ?? r.hora_inicio ?? r.HORA_INICIO ?? r.hora_inicio_real;
      const rFin = r.horaFin ?? r.hora_fin ?? r.HORA_FIN ?? r.hora_fin_real;
      const rCursoCodigo = r.codigoCurso ?? r.curso?.codigo ?? r.codigo_curso ?? '';
      const rCursoNombre = r.nombreCurso ?? r.curso?.nombre ?? r.nombre_curso ?? '';
      const rTipoClase = r.tipoClase ?? r.tipo_clase ?? r.TIPO_CLASE ?? '';
      const rSeccion = r.seccion ?? r.grupo?.codigo ?? r.grupo?.nombre ?? '';
      
      let mappedDia = diaNumericoACodigo(rDia);
      if (!['LU', 'MA', 'MI', 'JU', 'VI', 'SA'].includes(mappedDia)) {
        mappedDia = diaNumericoACodigo(String(rDia).trim());
      }

      return {
        dia: mappedDia,
        hora_inicio: normalizarHora(rInicio),
        hora_fin: normalizarHora(rFin),
        codigoCurso: rCursoCodigo,
        nombreCurso: rCursoNombre,
        tipoClase: rTipoClase,
        seccion: rSeccion,
      };
    };

    // Usar directamente los horarios vivos para la validación de superposición,
    // ya que la carga lectiva base o el snapshot pueden tener dia=0 u hora_inicio=null
    // si se asignaron cursos pero aún no se publicaron los horarios.
    return new Promise((resolve) => {
      this.cargarHorariosLectivosDesdeHorarios(mapRegistro).then(resolve);
    });
  }

  private cargarHorariosLectivosDesdeHorarios(
    mapRegistro: (r: any) => HorarioLectivoRef,
  ): Promise<HorarioLectivoRef[]> {
    return new Promise((resolve) => {
      this.api
        .get<ApiResponse<any>>(`/horarios/docente/${this.docenteId}?periodo=${this.periodoActivo}&limit=200`)
        .subscribe({
          next: (res) => {
            const items = res.data?.items ?? [];
            this.horariosLectivos = items.map((h: any) =>
              mapRegistro({
                dia: h.dia,
                hora_inicio: h.hora_inicio,
                hora_fin: h.hora_fin,
                curso: h.curso,
                tipo_clase: h.tipo_clase,
                grupo: h.grupo,
              }),
            );
            resolve(this.horariosLectivos);
          },
          error: () => {
            this.horariosLectivos = [];
            resolve(this.horariosLectivos);
          },
        });
    });
  }

  actividadTieneConflictoInterno(act: ActividadNoLectiva): boolean {
    if (!act.horarios?.length) return false;
    for (let i = 0; i < act.horarios.length; i++) {
      for (let j = i + 1; j < act.horarios.length; j++) {
        if (act.horarios[i].dia !== act.horarios[j].dia) continue;
        if (
          esHorarioIdentico(act.horarios[i], act.horarios[j]) ||
          seSuperponen(
            act.horarios[i].hora_inicio,
            act.horarios[i].hora_fin,
            act.horarios[j].hora_inicio,
            act.horarios[j].hora_fin,
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  actividadTieneConflictoLectiva(act: ActividadNoLectiva): boolean {
    if (!act.horarios?.length || !this.horariosLectivos.length) return false;
    return act.horarios.some((h) =>
      this.horariosLectivos.some(
        (lec) =>
          h.dia === lec.dia &&
          seSuperponen(h.hora_inicio, h.hora_fin, lec.hora_inicio, lec.hora_fin),
      ),
    );
  }

  actividadNecesitaDetalle(act: ActividadNoLectiva): boolean {
    const horas = Number(act.horas) || 0;
    return horas > 0 && act.id !== 1;
  }

  actividadDetalleInvalido(act: ActividadNoLectiva): boolean {
    return this.actividadNecesitaDetalle(act) && (!act.detalle || act.detalle.trim().length < 10);
  }

  actividadSinHorario(act: ActividadNoLectiva): boolean {
    const horas = Number(act.horas) || 0;
    return horas > 0 && (!act.horarios || act.horarios.length === 0);
  }

  tieneErroresDetalle(): boolean {
    return this.actividadesNoLectivas.some((act) => this.actividadDetalleInvalido(act));
  }

  tieneHorasIncompletas(): boolean {
    return Math.abs(this.totalHoras - this.horasModalidad) > 0.01;
  }

  tieneErroresEnviar(): boolean {
    return this.tieneErroresDetalle() || this.actividadesNoLectivas.some((act) => this.actividadSinHorario(act)) || this.tieneHorasIncompletas();
  }

  getTooltipConflictoHorario(act: ActividadNoLectiva): string {
    if (this.actividadTieneConflictoInterno(act)) {
      return 'Hay horarios duplicados o solapados en esta actividad';
    }
    if (this.actividadTieneConflictoLectiva(act)) {
      return 'El horario se solapa con la carga lectiva del docente';
    }
    if (this.actividadDetalleInvalido(act)) {
      return 'Complete el detalle con al menos 10 caracteres para esta actividad';
    }
    return this.getHorarioSummary(act.horarios);
  }

  actualizarGauge(): void {
    if (this.horasModalidad > 0) {
      this.gaugePercent = Math.min(100, Math.round((this.totalHoras / this.horasModalidad) * 100));
    }
  }

  actualizarProgreso(): void {
    this.rubrosVisibles = this.actividadesNoLectivas.length;
    this.rubrosCompletos = this.actividadesNoLectivas.filter((a) => {
      const horas = Number(a.horas) || 0;
      if (horas === 0) return true;
      const tieneDetalle = a.detalle && a.detalle.trim().length >= 10;
      const tieneHorario = a.horarios && a.horarios.length > 0;
      return tieneDetalle && tieneHorario;
    }).length;
    this.progresoPorcentaje = this.rubrosVisibles > 0
      ? Math.round((this.rubrosCompletos / this.rubrosVisibles) * 100)
      : 0;
  }

  preventNegative(event: KeyboardEvent): void {
    if (event.key === '-' || event.key === 'e' || event.key === 'E') {
      event.preventDefault();
    }
  }

  sanitizeNumero(valor: any): number {
    return Math.max(0, Number(valor) || 0);
  }

  onCursoChange(): void {
    this.cursosLectivos.forEach(curso => {
      curso.nroAlumnos = this.sanitizeNumero(curso.nroAlumnos);
    });
    this.calcularTotales();
  }

  onActividadChange(actividad?: ActividadNoLectiva): void {
    if (!actividad) return;
    actividad.horas = this.sanitizeNumero(actividad.horas);
    
    // Activar modo manual cuando el usuario cambia las horas manualmente
    actividad.horasManual = true;

    if (actividad.id === 2) {
      const maxPermitido = Math.floor(this.totalHorasLectivas * 0.5);
      if (actividad.horas > maxPermitido) {
        actividad.excede = true;
        actividad.horas = maxPermitido;
        this.snackBar.open(
          `LÍMITE DE PREPARACIÓN: No puede exceder el 50% del Trabajo Lectivo (${maxPermitido}h).`,
          'ENTENDIDO',
          {
            duration: 6000,
            panelClass: ['snackbar-error-prominent'],
            horizontalPosition: 'center',
            verticalPosition: 'top',
          },
        );
        setTimeout(() => { actividad.excede = false; }, 1500);
      } else {
        actividad.excede = false;
      }
    }

    if (actividad.horas > 0 && (!actividad.horarios || actividad.horarios.length === 0)) {
      this.snackBar.open(
        `El rubro ${actividad.id} tiene ${actividad.horas}h pero no tiene horario registrado.`,
        'OK',
        { duration: 4000, panelClass: ['snackbar-warning'] },
      );
    }
    
    // Validación: si horas es 0 pero hay horarios asignados
    if (actividad.horas === 0 && actividad.horarios && actividad.horarios.length > 0) {
      const horasDesdeHorarios = this.calcularHorasDesdeHorarios(actividad.horarios);
      this.snackBar.open(
        `Ha asignado horarios pero las horas están en 0. Los horarios suman ${horasDesdeHorarios.toFixed(2)}h.`,
        'OK',
        { duration: 5000, panelClass: ['snackbar-warning'] },
      );
    }
    
    this.calcularTotales();
    this.triggerAutoSave();
  }

  async abrirGestionHorario(actividad: ActividadNoLectiva): Promise<void> {
    if (!this.horariosLectivos.length) {
      this.cargandoHorariosLectivos = true;
      await this.obtenerHorariosLectivos();
      this.cargandoHorariosLectivos = false;
    }

    // Toggle off if same activity
    if (this.actividadSeleccionada?.id === actividad.id) {
      this.actividadSeleccionada = null;
      this.dragDropData = null;
      return;
    }

    // Save current activity's schedule before switching
    if (this.actividadSeleccionada) {
      this.triggerAutoSave();
    }

    let maxHoras: number | undefined;
    if (actividad.id === 2) {
      maxHoras = Math.floor(this.totalHorasLectivas * 0.5);
    }

    this.actividadSeleccionada = actividad;

    const allActividades = this.actividadesNoLectivas.map(a => ({
      id: a.id,
      nombre: a.descripcion.replace(/^[0-9]+\.\s*/, '').split(':')[0].trim(),
      horarios: a.horarios.map(h => ({ dia: h.dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin })),
    }));

    this.dragDropData = {
      actividadId: actividad.id,
      actividadNombre: allActividades.find(a => a.id === actividad.id)?.nombre || actividad.descripcion,
      horarios: actividad.horarios.map(h => ({ dia: h.dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin })),
      horas: actividad.horas,
      maxHoras,
      totalHorasLectivas: this.totalHorasLectivas,
      horariosLectivos: this.horariosLectivos.map(h => ({ ...h })),
      allActividades,
    };
  }

  onDragDropHorariosChange(horarios: HorarioEntry[]): void {
    if (!this.actividadSeleccionada) return;
    this.actividadSeleccionada.horarios = horarios.map(h => ({
      dia: h.dia,
      hora_inicio: h.hora_inicio,
      hora_fin: h.hora_fin,
    }));
    this.calcularTotales();
    this.triggerAutoSave();
  }

  onDragDropHorasChange(horas: number): void {
    if (!this.actividadSeleccionada) return;
    this.actividadSeleccionada.horas = horas;
    this.calcularTotales();
    this.triggerAutoSave();
  }

  cerrarDragDrop(): void {
    if (this.actividadSeleccionada) {
      this.triggerAutoSave();
    }
    this.actividadSeleccionada = null;
    this.dragDropData = null;
  }

  triggerAutoSave(): void {
    if (this.esEditable && !this.tieneErroresDetalle()) {
      this.autoSaveSubject.next();
    }
  }

  private ejecutarAutoSave(): Promise<void> {
    if (!this.esEditable || this.saving || this.tieneErroresDetalle()) return Promise.resolve();
    this.autoSaving = true;
    this.autoSaveStatus = 'Guardando...';

    const payload = {
      docente_id: this.docenteId,
      periodo: this.periodoActivo,
      estado: this.estadoDeclaracion,
      carga_no_lectiva: {
        actividades: this.actividadesNoLectivas.map((a) => ({
          id: a.id,
          codigo: a.codigo,
          descripcion: a.descripcion,
          detalle: a.detalle,
          horas: Number(a.horas) || 0,
          horarios: a.horarios.map(h => ({ dia: h.dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin })),
          horasManual: a.horasManual,
        })),
        total_horas: this.totalHorasNoLectivas,
      },
      total_horas: this.totalHoras,
    };

    return new Promise((resolve) => {
      this.api.post<ApiResponse<any>>('/declaraciones/guardar', payload).subscribe({
        next: () => {
          this.lastSaved = new Date();
          this.autoSaveStatus = 'Guardado';
          this.autoSaving = false;
          resolve();
        },
        error: () => {
          this.autoSaveStatus = 'Error al guardar';
          this.autoSaving = false;
          resolve();
        },
      });
    });
  }

  guardar(): void {
    if (!this.esEditable) {
      this.snackBar.open('La declaración no se puede modificar en este estado', 'Cerrar', { duration: 3000 });
      return;
    }

    this.saving = true;
    const payload = {
      docente_id: this.docenteId,
      periodo: this.periodoActivo,
      estado: this.estadoDeclaracion,
      carga_no_lectiva: {
        actividades: this.actividadesNoLectivas.map((a) => ({
          id: a.id,
          codigo: a.codigo,
          descripcion: a.descripcion,
          detalle: a.detalle,
          horas: Number(a.horas) || 0,
          horarios: a.horarios.map(h => ({ dia: h.dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin })),
          horasManual: a.horasManual,
        })),
        total_horas: this.totalHorasNoLectivas,
      },
      total_horas: this.totalHoras,
    };

    if (this.tieneErroresDetalle()) {
      this.snackBar.open('Complete el detalle de al menos 10 caracteres para cada actividad con horas.', 'Cerrar', { duration: 5000 });
      this.saving = false;
      return;
    }

    this.api.post<ApiResponse<any>>('/declaraciones/guardar', payload).subscribe({
      next: () => {
        this.lastSaved = new Date();
        this.snackBar.open('Declaración guardada correctamente', 'Cerrar', { duration: 3000 });
        this.saving = false;
        this.cargarDeclaracion();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al guardar la declaración', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
    });
  }

  enviar(): void {
    if (this.tieneErroresDetalle()) {
      this.snackBar.open('Complete el detalle de al menos 10 caracteres para cada actividad con horas antes de enviar.', 'Cerrar', { duration: 5000 });
      return;
    }

    if (this.declaracionId) {
      this.saving = true;
      this.api.patch<ApiResponse<any>>(`/declaraciones/${this.declaracionId}/enviar`, {}).subscribe({
        next: () => {
          this.estadoDeclaracion = 'ENVIADO';
          this.snackBar.open('Declaración enviada correctamente', 'Cerrar', { duration: 3000 });
          this.saving = false;
          this.cargarDeclaracion();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Error al enviar la declaración', 'Cerrar', { duration: 3000 });
          this.saving = false;
        },
      });
    } else {
      this.saving = true;
      this.api.post<ApiResponse<any>>(`/declaraciones/docentes/${this.docenteId}/enviar`, { periodo: this.periodoActivo })
        .subscribe({
          next: () => {
            this.estadoDeclaracion = 'ENVIADO';
            this.snackBar.open('Declaración enviada correctamente', 'Cerrar', { duration: 3000 });
            this.saving = false;
            this.cargarDeclaracion();
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Error al confirmar la declaración', 'Cerrar', { duration: 3000 });
            this.saving = false;
          },
        });
    }
  }

  cerrar(): void {
    if (!this.declaracionId) return;
    this.saving = true;
    this.api.post<ApiResponse<any>>(`/declaraciones/${this.declaracionId}/cerrar`, {}).subscribe({
      next: () => {
        this.snackBar.open('Declaración aprobada y cerrada correctamente', 'Cerrar', { duration: 3000 });
        this.saving = false;
        this.cargarDeclaracion();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al cerrar la declaración', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
    });
  }

  validarDepartamento(): void {
    if (!this.declaracionId) return;
    this.saving = true;
    this.api.post<ApiResponse<any>>(`/declaraciones/${this.declaracionId}/validar-departamento`, {}).subscribe({
      next: () => {
        this.snackBar.open('Declaración validada por departamento', 'Cerrar', { duration: 3000 });
        this.saving = false;
        this.cargarDeclaracion();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al validar la declaración', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
    });
  }

  aprobarFacultad(): void {
    if (!this.declaracionId) return;
    this.saving = true;
    this.api.post<ApiResponse<any>>(`/declaraciones/${this.declaracionId}/validar-facultad`, {}).subscribe({
      next: () => {
        this.snackBar.open('Declaración aprobada por facultad', 'Cerrar', { duration: 3000 });
        this.saving = false;
        this.cargarDeclaracion();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al aprobar la declaración', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
    });
  }

  guardarObservacion(): void {
    if (!this.declaracionId) return;
    if (!this.textoObservacion || this.textoObservacion.trim().length < 10) {
      this.snackBar.open('La observación debe tener al menos 10 caracteres', 'Cerrar', { duration: 3000 });
      return;
    }
    this.saving = true;
    this.api.post<ApiResponse<any>>(`/declaraciones/${this.declaracionId}/observaciones`, {
      observacion: this.textoObservacion,
    }).subscribe({
      next: () => {
        this.snackBar.open('Observación guardada correctamente', 'Cerrar', { duration: 3000 });
        this.textoObservacion = '';
        this.saving = false;
        this.cargarDeclaracion();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al observar la declaración', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
    });
  }

  generarPDF(tipo: 'declaracion' | 'f03cad' = 'declaracion'): void {
    if (!this.docente) return;
    this.snackBar.open('Generando documento...', '', { duration: 2000 });
    const endpoint = tipo === 'f03cad'
      ? `/reportes/docente/${this.docenteId}/f03-cad?periodo=${this.periodoActivo}`
      : `/reportes/f01-cad/${this.docenteId}/pdf?periodo=${this.periodoActivo}`;
    const filename = tipo === 'f03cad'
      ? `f03-cad_${this.docente?.apellidos}_${this.periodoActivo}.pdf`
      : `f01-cad_docente_${this.docente?.apellidos}_${this.periodoActivo}.pdf`;
    this.api.getBlob(endpoint)
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          this.snackBar.open('PDF generado con éxito', 'Cerrar', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Error al generar el PDF', 'Cerrar', { duration: 3000 });
        }
      });
  }

  cargarDeclaracionJurada(): void {
    this.cargandoDeclaracionJurada = true;
    this.api.get<any>(`/declaraciones/docentes/${this.docenteId}/declaracion-jurada?periodo=${this.periodoActivo}`)
      .subscribe({
        next: (res) => {
          this.declaracionJurada = res.data;
          this.cargandoDeclaracionJurada = false;
        },
        error: () => {
          this.declaracionJurada = null;
          this.cargandoDeclaracionJurada = false;
        },
      });
  }

  get tipoDeclaracionLabel(): string {
    if (!this.docente?.modalidad) return '';
    const modalidad = this.docente.modalidad;
    if (modalidad === 'DEDICACION_EXCLUSIVA') return 'EXCLUSIVIDAD';
    if (modalidad.startsWith('TIEMPO_COMPLETO')) return 'COMPATIBILIDAD_TOTAL';
    return 'COMPATIBILIDAD_PARCIAL';
  }

  get textoDeclaracionJurada(): string {
    if (!this.docente) return '';
    const nombre = `${this.docente.apellidos.toUpperCase()}, ${this.docente.nombres.toUpperCase()}`;
    const ibm = this.docente.ibm || this.docente.codigo || '';
    const dep = this.docente.departamento?.nombre || 'No asignado';
    const fac = this.docente.facultad?.nombre || 'No asignada';
    const modalidad = this.docente.modalidad || '';

    const modalidadLabels: Record<string, string> = {
      DEDICACION_EXCLUSIVA: 'DEDICACIÓN EXCLUSIVA',
      TIEMPO_COMPLETO_40: 'TIEMPO COMPLETO 40 H',
      TIEMPO_PARCIAL_20: 'TIEMPO PARCIAL 20 H',
      TIEMPO_PARCIAL_12: 'TIEMPO PARCIAL 12 H',
      TIEMPO_PARCIAL_10: 'TIEMPO PARCIAL 10 H',
      TIEMPO_PARCIAL_8: 'TIEMPO PARCIAL 8 H',
    };
    const modalidadDisplay = modalidadLabels[modalidad] || modalidad;

    let textoSegunModalidad = '';
    if (modalidad === 'DEDICACION_EXCLUSIVA') {
      textoSegunModalidad = 'Declaro no tener otro empleo ni ejercer actividad profesional fuera de la Universidad Nacional de Trujillo, y que mi horario académico es exclusivo para la UNT, no existiendo incompatibilidad horaria con ninguna otra actividad laboral, cargo público o actividad privada durante el horario académico establecido.';
    } else if (modalidad.startsWith('TIEMPO_COMPLETO')) {
      textoSegunModalidad = 'Declaro que mi horario académico es compatible con mi actividad laboral, no existiendo superposición de horarios con otras actividades profesionales, cargos públicos o actividades privadas que pudieran generar incompatibilidad laboral.';
    } else {
      textoSegunModalidad = 'Declaro que mi horario académico es compatible parcialmente con mi actividad laboral externa, la cual se desarrolla fuera del horario establecido por la Universidad Nacional de Trujillo, no existiendo incompatibilidad horaria.';
    }

    return `Yo, ${nombre}, identificado con DNI/IBM N° ${ibm}, Docente del Departamento Académico de ${dep}, con modalidad ${modalidadDisplay}, DECLARO BAJO JURAMENTO: ${textoSegunModalidad}`;
  }

  generarDeclaracionJuradaPDF(): void {
    if (!this.docente || !this.aceptaDeclaracionJurada) return;
    this.generandoDeclaracionJurada = true;

    this.api.post<any>(`/declaraciones/docentes/${this.docenteId}/declaracion-jurada`, {
      periodo: this.periodoActivo,
    }).pipe(
      tap(() => this.cargarDeclaracionJurada()),
      switchMap(() => this.api.getBlob(`/reportes/declaracion-jurada/${this.docenteId}/pdf?periodo=${this.periodoActivo}`)),
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `declaracion_jurada_incompatibilidad_${this.docente?.apellidos}_${this.periodoActivo}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        this.generandoDeclaracionJurada = false;
        this.snackBar.open('Declaración Jurada generada con éxito', 'Cerrar', { duration: 3000 });
      },
      error: () => {
        this.generandoDeclaracionJurada = false;
        this.snackBar.open('Error al generar la declaración jurada', 'Cerrar', { duration: 3000 });
      },
    });
  }

  descargarDeclaracionJuradaExistente(): void {
    if (!this.docente) return;
    this.snackBar.open('Descargando...', '', { duration: 2000 });
    this.api.getBlob(`/reportes/declaracion-jurada/${this.docenteId}/pdf?periodo=${this.periodoActivo}`)
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `declaracion_jurada_incompatibilidad_${this.docente?.apellidos}_${this.periodoActivo}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          this.snackBar.open('PDF descargado con éxito', 'Cerrar', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Error al descargar el PDF', 'Cerrar', { duration: 3000 });
        },
      });
  }

  volver(): void {
    this.router.navigate(['/app/declaraciones']);
  }

  formatHorarioSemanal(ca: CargaAdicional): string {
    if (!ca.horario_semanal?.length) {
      return 'Sin horario';
    }
    return ca.horario_semanal
      .map((h) => `${h.dia} ${h.hora_inicio}-${h.hora_fin}`)
      .join(', ');
  }
}
