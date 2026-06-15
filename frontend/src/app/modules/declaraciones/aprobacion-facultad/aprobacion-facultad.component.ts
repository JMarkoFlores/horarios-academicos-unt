import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { ApiResponse, DocumentacionResumen } from '../../../core/interfaces/entities';

@Component({
  selector: 'app-aprobacion-facultad',
  templateUrl: './aprobacion-facultad.component.html',
  styleUrls: ['./aprobacion-facultad.component.scss'],
})
export class AprobacionFacultadComponent implements OnInit {
  items: DocumentacionResumen[] = [];
  filteredItems: DocumentacionResumen[] = [];
  loading = false;
  saving: number | null = null;
  periodo = '';
  textoObservacion = '';
  observandoId: number | null = null;

  displayedColumns = ['docente', 'departamento', 'periodo', 'fecha_validacion', 'acciones'];

  constructor(
    private api: ApiService,
    private periodoService: PeriodoService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.periodo = this.periodoService.periodo;
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<DocumentacionResumen[]>>('/declaraciones/pendientes/facultad', {
        periodo: this.periodo,
      })
      .subscribe({
        next: (res) => {
          this.items = res.data || [];
          this.filteredItems = [...this.items];
          this.loading = false;
        },
        error: () => {
          this.items = [];
          this.filteredItems = [];
          this.loading = false;
        },
      });
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      VALIDADO_DPTO: 'Validado por departamento',
    };
    return labels[estado] || estado;
  }

  getEstadoColorClass(estado: string): string {
    return 'estado-validado';
  }

  getInitials(nombre: string): string {
    if (!nombre) return 'NN';
    const parts = nombre.split(',');
    if (parts.length >= 2) {
      const a = parts[0].trim().split(' ');
      const n = parts[1].trim().split(' ');
      return ((a[0]?.[0] || '') + (n[0]?.[0] || '')).toUpperCase();
    }
    const words = nombre.split(' ');
    return (words[0]?.[0] || '') + (words[1]?.[0] || '').toUpperCase();
  }

  aprobar(item: DocumentacionResumen): void {
    this.saving = item.id;
    this.api.patch<ApiResponse<any>>(`/declaraciones/${item.id}/aprobar`, {}).subscribe({
      next: () => {
        this.snackBar.open('Declaración aprobada correctamente', 'Cerrar', { duration: 3000 });
        this.saving = null;
        this.cargar();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al aprobar', 'Cerrar', { duration: 3000 });
        this.saving = null;
      },
    });
  }

  observar(item: DocumentacionResumen): void {
    if (!this.textoObservacion || this.textoObservacion.trim().length < 10) {
      this.snackBar.open('La observación debe tener al menos 10 caracteres', 'Cerrar', { duration: 3000 });
      return;
    }
    this.saving = item.id;
    this.api.patch<ApiResponse<any>>(`/declaraciones/${item.id}/observar`, {
      observaciones: this.textoObservacion,
    }).subscribe({
      next: () => {
        this.snackBar.open('Declaración observada correctamente', 'Cerrar', { duration: 3000 });
        this.textoObservacion = '';
        this.observandoId = null;
        this.saving = null;
        this.cargar();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al observar', 'Cerrar', { duration: 3000 });
        this.saving = null;
      },
    });
  }

  toggleObservar(id: number): void {
    this.observandoId = this.observandoId === id ? null : id;
    this.textoObservacion = '';
  }

  volver(): void {
    this.router.navigate(['/app/declaraciones']);
  }
}
