import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { Docente, ApiResponse } from '../../core/interfaces/entities';

@Component({
  selector: 'app-declaraciones',
  templateUrl: './declaraciones.component.html',
  styleUrls: ['./declaraciones.component.scss'],
})
export class DeclaracionesComponent implements OnInit {
  declaracionesForm: FormGroup;
  docentes: Docente[] = [];
  loading = false;
  selectedDocente: Docente | null = null;
  periodoActivo = '';

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
  }

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
          },
          error: (error) => {
            console.error('Error al cargar datos del docente:', error);
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
          this.loading = false;
          this.declaracionesForm.get('docenteSeleccionado')?.enable();
        },
        error: (error) => {
          console.error('Error al cargar docentes:', error);
          this.snackBar.open('Error al cargar la lista de docentes', 'Cerrar', {
            duration: 3000,
          });
          this.loading = false;
        },
      });
  }

  onDocenteSeleccionado(docenteId: number): void {
    this.selectedDocente =
      this.docentes.find((d) => d.id === docenteId) || null;
    if (this.selectedDocente) {
      this.snackBar.open(
        `Docente seleccionado: ${this.selectedDocente.nombres} ${this.selectedDocente.apellidos}`,
        'Cerrar',
        { duration: 2000 },
      );
    }
  }

  get isDocente(): boolean {
    return this.authService.hasRole('docente');
  }

  get nombreCompletoDocente(): string {
    if (!this.selectedDocente) return '';
    return `${this.selectedDocente.apellidos}, ${this.selectedDocente.nombres}`.toUpperCase();
  }

  get condicionDocente(): string {
    const tc = this.selectedDocente?.tipo_contrato || '';
    return tc === 'NOMBRADO'
      ? 'Nombrado'
      : tc === 'CONTRATADO'
        ? 'Contratado'
        : tc;
  }

  get categoriaDocente(): string {
    const cat = this.selectedDocente?.categoria || '';
    return cat === 'PRINCIPAL'
      ? 'Principal'
      : cat === 'ASOCIADO'
        ? 'Asociado'
        : cat === 'AUXILIAR'
          ? 'Auxiliar'
          : cat === 'SIN_CATEGORIA'
            ? 'Sin categoría'
            : cat;
  }

  get dedicacionDocente(): string {
    const mod = this.selectedDocente?.modalidad || '';
    return mod === 'DEDICACION_EXCLUSIVA'
      ? 'Dedicación Exclusiva'
      : mod === 'TIEMPO_COMPLETO_40'
        ? 'Tiempo Completo 40 H'
        : mod === 'TIEMPO_PARCIAL_20'
          ? 'Tiempo Parcial 20 H'
          : mod === 'TIEMPO_PARCIAL_12'
            ? 'Tiempo Parcial 12 H'
            : mod === 'TIEMPO_PARCIAL_10'
              ? 'Tiempo Parcial 10 H'
              : mod === 'TIEMPO_PARCIAL_8'
                ? 'Tiempo Parcial 8 H'
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
}
