import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { ROLES } from '../../core/constants/roles';
import { AuthService } from '../../core/services/auth.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { Docente, ApiResponse } from '../../core/interfaces/entities';

interface EstadoDeclaracion {
  key: string;
  label: string;
  icon: string;
  etapa: number;
  color: string;
  description: string;
}

const ESTADOS_STEPPER: EstadoDeclaracion[] = [
  { key: 'BORRADOR',    label: 'Borrador',      icon: 'edit_note',  etapa: 1, color: '#1565c0', description: 'Declaración en borrador - complete los datos' },
  { key: 'ENVIADO',     label: 'Enviado',       icon: 'send',       etapa: 2, color: '#e65100', description: 'Enviada al departamento para revisión' },
  { key: 'VALIDADO_DPTO',label: 'Validado Dpto.',   icon: 'verified',   etapa: 3, color: '#2e7d32', description: 'Validada por el director de departamento' },
  { key: 'APROBADO_FACULTAD',    label: 'Aprobado Facultad',       icon: 'approval',   etapa: 4, color: '#4a148c', description: 'Aprobada por el decano de facultad' },
  { key: 'CERRADO',     label: 'Cerrado',        icon: 'lock',       etapa: 5, color: '#37474f', description: 'Proceso finalizado y cerrado' },
];

const ESTADO_A_ETAPA: Record<string, number> = {
  BORRADOR:     1,
  ENVIADO:      2,
  VALIDADO_DPTO: 3,
  APROBADO_FACULTAD:     4,
  CERRADO:      5,
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
  estadoDeclaracion: string = '';
  declaracionId: number | null = null;
  periodoActivo = '';

  stepperEtapas = ESTADOS_STEPPER;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private periodoService: PeriodoService,
    private router: Router,
  ) {
    this.declaracionesForm = this.fb.group({
      docenteSeleccionado: [{ value: null, disabled: true }],
    });
  }

  ngOnInit(): void {
    this.periodoActivo = this.periodoService.periodo;
    if (this.authService.hasRole(ROLES.DOCENTE)) {
      this.cargarDatosDocenteActual();
    } else {
      this.cargarDocentes();
    }

    this.searchCtrl.valueChanges.pipe(
      debounceTime(150),
      takeUntil(this.destroy$),
    ).subscribe(query => this.filtrarDocentes(query ?? ''));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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

  cargarDatosDocenteActual(): void {
    const user = this.authService.getUsuarioActual();
    if (user?.docenteId) {
      this.loading = true;
      this.apiService
        .get<ApiResponse<Docente>>(`/docentes/${user.docenteId}`)
        .subscribe({
          next: (response) => {
            this.selectedDocente = response.data;
            this.loading = false;
            this.cargarEstadoDeclaracion(user.docenteId!);
          },
          error: () => {
            this.loading = false;
            this.snackBar.open('Error al cargar información del docente', 'Cerrar', { duration: 3000 });
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
    this.estadoDeclaracion = '';
    this.declaracionId = null;
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
          this.estadoDeclaracion = res.data?.estado || '';
          this.declaracionId = res.data?.id || null;
          this.loadingEstado = false;
        },
        error: () => {
          this.estadoDeclaracion = '';
          this.declaracionId = null;
          this.loadingEstado = false;
        },
      });
  }

  irADeclaracion(): void {
    if (this.selectedDocente) {
      this.router.navigate(['/app/declaraciones/verificar', this.selectedDocente.id]);
    }
  }

  get isDocente(): boolean {
    return this.authService.hasRole(ROLES.DOCENTE);
  }

  get isDirectorOrCoord(): boolean {
    return this.authService.hasRole(ROLES.DIRECTOR_ESCUELA, ROLES.DIRECTOR_DEPARTAMENTO, ROLES.COORDINADOR_ACADEMICO);
  }

  get isDecano(): boolean {
    return this.authService.hasRole(ROLES.DECANO);
  }

  get isAdmin(): boolean {
    return this.authService.hasRole(ROLES.ADMINISTRADOR_SISTEMA);
  }

  get puedeVerDeclaracion(): boolean {
    return true;
  }

  get puedeVerificarFirma(): boolean {
    return this.isDocente;
  }

  get puedeVerificarAprobacion(): boolean {
    return this.isDecano || this.isAdmin;
  }

  get etapaActual(): number {
    return ESTADO_A_ETAPA[this.estadoDeclaracion] ?? 0;
  }

  getStepClass(etapa: EstadoDeclaracion): string {
    const actual = this.etapaActual;
    if (actual >= etapa.etapa) return 'step-done';
    if (actual === 0) return 'step-pending';
    return 'step-pending';
  }

  getStepActive(etapa: EstadoDeclaracion): boolean {
    return this.etapaActual === etapa.etapa;
  }

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
      BORRADOR: 'Borrador',
      ENVIADO: 'Enviado',
      VALIDADO_DPTO: 'Validado Dpto.',
      APROBADO_FACULTAD: 'Aprobado Facultad',
      CERRADO: 'Cerrado',
    };
    return labels[this.estadoDeclaracion] || 'Sin declaración';
  }

  get estadoBadgeClass(): string {
    const classes: Record<string, string> = {
      BORRADOR: 'badge-borrador',
      ENVIADO: 'badge-enviado',
      VALIDADO_DPTO: 'badge-departamento',
      APROBADO_FACULTAD: 'badge-facultad',
      CERRADO: 'badge-cerrado',
    };
    return classes[this.estadoDeclaracion] || 'badge-sin-estado';
  }

  get botonAccionLabel(): string {
    const labels: Record<string, string> = {
      BORRADOR: 'Continuar Declaración',
      ENVIADO: 'Ver Declaración',
      VALIDADO_DPTO: 'Ver Declaración',
      APROBADO_FACULTAD: 'Ver Declaración',
      CERRADO: 'Ver Declaración',
    };
    return labels[this.estadoDeclaracion] || 'Crear Declaración';
  }

  get botonAccionIcon(): string {
    const icons: Record<string, string> = {
      BORRADOR: 'edit_note',
      ENVIADO: 'visibility',
      VALIDADO_DPTO: 'visibility',
      APROBADO_FACULTAD: 'visibility',
      CERRADO: 'visibility',
    };
    return icons[this.estadoDeclaracion] || 'add_circle_outline';
  }
}
