import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { Docente, ApiResponse } from '../../core/interfaces/entities';

// Configuración de estados del stepper
interface EstadoDeclaracion {
  key: string;
  label: string;
  icon: string;
  etapa: number;
  color: string;
  description: string;
}

const ESTADOS_STEPPER: EstadoDeclaracion[] = [
  { key: 'BORRADOR',         label: 'Borrador',      icon: 'edit_note', etapa: 1, color: '#1565c0', description: 'El docente está completando su declaración' },
  { key: 'ENVIADO_DOCENTE',  label: 'Enviado',       icon: 'send',      etapa: 2, color: '#e65100', description: 'Declaración enviada al departamento para revisión' },
  { key: 'VALIDADO_DPTO',    label: 'Departamento',  icon: 'verified',  etapa: 3, color: '#2e7d32', description: 'Validada por el director de departamento' },
  { key: 'APROBADO_FACULTAD',label: 'Facultad',      icon: 'approval',  etapa: 4, color: '#4a148c', description: 'Aprobada por el decano de facultad' },
  { key: 'CERRADO',          label: 'Cerrado',       icon: 'lock',      etapa: 5, color: '#37474f', description: 'Proceso finalizado y cerrado' },
];

// Estados que mapean a cada etapa del stepper
const ESTADO_A_ETAPA: Record<string, number> = {
  NO_INICIADO:       0,
  BORRADOR:          1,
  PENDIENTE_ENVIO:   1,
  ENVIADO_DOCENTE:   2,
  OBSERVADO_DPTO:    2,
  SUBSANADO:         2,
  VALIDADO_DPTO:     3,
  OBSERVADO_FACULTAD:3,
  APROBADO_FACULTAD: 4,
  CERRADO:           5,
  ANULADO:          -1,
};

@Component({
  selector: 'app-declaraciones',
  templateUrl: './declaraciones.component.html',
  styleUrls: ['./declaraciones.component.scss'],
})
export class DeclaracionesComponent implements OnInit, OnDestroy {
  declaracionesForm: FormGroup;
  searchCtrl = new FormControl('');

  docentes: Docente[] = [];
  docentesFiltrados: Docente[] = [];

  loading = false;
  loadingEstado = false;

  selectedDocente: Docente | null = null;
  estadoDeclaracion: string = 'NO_INICIADO';
  periodoActivo = '';

  stepperEtapas = ESTADOS_STEPPER;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private periodoService: PeriodoService,
  ) {
    this.declaracionesForm = this.fb.group({
      docenteSeleccionado: [{ value: null, disabled: true }],
    });
  }

  ngOnInit(): void {
    this.periodoActivo = this.periodoService.periodo;
    if (this.authService.hasRole('docente')) {
      this.cargarDatosDocenteActual();
    } else {
      this.cargarDocentes();
    }

    // Suscribirse a cambios del buscador
    this.searchCtrl.valueChanges.pipe(
      debounceTime(150),
      takeUntil(this.destroy$),
    ).subscribe(query => this.filtrarDocentes(query ?? ''));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Filtrado ────────────────────────────────────────────────────────────────

  filtrarDocentes(query: string): void {
    if (!query.trim()) {
      this.docentesFiltrados = [...this.docentes];
      return;
    }
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    this.docentesFiltrados = this.docentes.filter(d => {
      const texto = `${d.apellidos} ${d.nombres} ${d.codigo}`.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return texto.includes(q);
    });
  }

  // ── Carga de datos ──────────────────────────────────────────────────────────

  cargarDatosDocenteActual(): void {
    const user = this.authService.getUsuarioActual();
    if (user?.docenteId) {
      this.loading = true;
      this.apiService
        .get<ApiResponse<Docente>>(`/declaraciones/docentes/${user.docenteId}`)
        .subscribe({
          next: (response) => {
            this.selectedDocente = response.data;
            this.loading = false;
            this.cargarEstadoDeclaracion(user.docenteId!);
          },
          error: () => {
            this.loading = false;
          },
        });
    }
  }

  cargarDocentes(): void {
    this.loading = true;
    this.apiService
      .get<ApiResponse<Docente[]>>('/declaraciones/docentes')
      .subscribe({
        next: (response) => {
          this.docentes = response.data;
          this.docentesFiltrados = [...this.docentes];
          this.loading = false;
          this.declaracionesForm.get('docenteSeleccionado')?.enable();
        },
        error: () => {
          this.snackBar.open('Error al cargar la lista de docentes', 'Cerrar', { duration: 3000 });
          this.loading = false;
        },
      });
  }

  onDocenteSeleccionado(docenteId: number): void {
    this.selectedDocente = this.docentes.find((d) => d.id === docenteId) || null;
    this.estadoDeclaracion = 'NO_INICIADO';
    if (this.selectedDocente) {
      this.cargarEstadoDeclaracion(docenteId);
    }
  }

  cargarEstadoDeclaracion(docenteId: number): void {
    this.loadingEstado = true;
    this.apiService
      .get<ApiResponse<any>>(`/declaraciones/docentes/${docenteId}/declaracion?periodo=${this.periodoActivo}`)
      .subscribe({
        next: (res) => {
          this.estadoDeclaracion = res.data?.estado || 'NO_INICIADO';
          this.loadingEstado = false;
        },
        error: () => {
          this.estadoDeclaracion = 'NO_INICIADO';
          this.loadingEstado = false;
        },
      });
  }

  // ── Roles ───────────────────────────────────────────────────────────────────

  get isDocente(): boolean {
    return this.authService.hasRole('docente');
  }

  get isDirectorOrCoord(): boolean {
    return this.authService.hasRole('directorescuela', 'directordepartamento', 'coordinador');
  }

  get isDecano(): boolean {
    return this.authService.hasRole('decano');
  }

  get isAdmin(): boolean {
    return this.authService.hasRole('administradorsistema');
  }

  /** Puede ver la propia declaración del docente / abrir verificar-declaracion */
  get puedeVerDeclaracion(): boolean {
    return true; // todos los roles
  }

  /** Director, Coordinador, Decano, Admin */
  get puedeVerificarFirma(): boolean {
    return this.isDirectorOrCoord || this.isDecano || this.isAdmin;
  }

  /** Solo Decano y Admin */
  get puedeVerificarAprobacion(): boolean {
    return this.isDecano || this.isAdmin;
  }

  // ── Stepper ─────────────────────────────────────────────────────────────────

  get etapaActual(): number {
    return ESTADO_A_ETAPA[this.estadoDeclaracion] ?? 0;
  }

  get estadoEsAnulado(): boolean {
    return this.estadoDeclaracion === 'ANULADO';
  }

  getStepClass(etapa: EstadoDeclaracion): string {
    if (this.estadoEsAnulado) return 'step-anulado';
    const actual = this.etapaActual;
    if (actual >= etapa.etapa) return 'step-done';
    if (actual === etapa.etapa - 1) return 'step-active'; // próximo
    return 'step-pending';
  }

  // ── Getters de info del docente ─────────────────────────────────────────────

  get nombreCompletoDocente(): string {
    if (!this.selectedDocente) return '';
    return `${this.selectedDocente.apellidos}, ${this.selectedDocente.nombres}`.toUpperCase();
  }

  get condicionDocente(): string {
    const tc = this.selectedDocente?.tipo_contrato || '';
    return tc === 'NOMBRADO' ? 'Nombrado' : tc === 'CONTRATADO' ? 'Contratado' : tc;
  }

  get categoriaDocente(): string {
    const cat = this.selectedDocente?.categoria || '';
    return cat === 'PRINCIPAL' ? 'Principal'
      : cat === 'ASOCIADO' ? 'Asociado'
      : cat === 'AUXILIAR' ? 'Auxiliar'
      : cat === 'SIN_CATEGORIA' ? 'Sin categoría'
      : cat;
  }

  get dedicacionDocente(): string {
    const mod = this.selectedDocente?.modalidad || '';
    return mod === 'DEDICACION_EXCLUSIVA' ? 'Dedicación Exclusiva'
      : mod === 'TIEMPO_COMPLETO_40' ? 'Tiempo Completo 40 H'
      : mod === 'TIEMPO_PARCIAL_20' ? 'Tiempo Parcial 20 H'
      : mod === 'TIEMPO_PARCIAL_12' ? 'Tiempo Parcial 12 H'
      : mod === 'TIEMPO_PARCIAL_10' ? 'Tiempo Parcial 10 H'
      : mod === 'TIEMPO_PARCIAL_8' ? 'Tiempo Parcial 8 H'
      : mod;
  }

  get departamentoDocente(): string {
    if (!this.selectedDocente?.departamento) return 'No asignado';
    return 'Dpto. de ' + this.selectedDocente.departamento.nombre;
  }

  get facultadDocente(): string {
    if (!this.selectedDocente?.facultad) return 'No asignada';
    return this.selectedDocente.facultad.nombre;
  }

  get estadoLabelActual(): string {
    const labels: Record<string, string> = {
      NO_INICIADO: 'No Iniciado',
      BORRADOR: 'Borrador',
      PENDIENTE_ENVIO: 'Pendiente de Envío',
      ENVIADO_DOCENTE: 'Enviado por Docente',
      OBSERVADO_DPTO: 'Observado (Departamento)',
      SUBSANADO: 'Subsanado',
      VALIDADO_DPTO: 'Validado por Departamento',
      OBSERVADO_FACULTAD: 'Observado (Facultad)',
      APROBADO_FACULTAD: 'Aprobado por Facultad',
      CERRADO: 'Cerrado',
      ANULADO: 'Anulado',
    };
    return labels[this.estadoDeclaracion] || this.estadoDeclaracion;
  }
}
