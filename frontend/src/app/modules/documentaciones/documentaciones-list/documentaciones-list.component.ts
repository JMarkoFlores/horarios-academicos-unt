import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { ROLES } from '../../../core/constants/roles';
import { AuthService } from '../../../core/services/auth.service';
import {
  ApiResponse,
  DocumentacionResumen,
} from '../../../core/interfaces/entities';

@Component({
  selector: 'app-documentaciones-list',
  templateUrl: './documentaciones-list.component.html',
  styleUrls: ['./documentaciones-list.component.scss'],
})
export class DocumentacionesListComponent implements OnInit {
  displayedColumns = ['docente', 'departamento', 'periodo', 'estado', 'fecha_envio', 'acciones'];
  items: DocumentacionResumen[] = [];
  filteredItems: DocumentacionResumen[] = [];
  loading = false;
  periodo = '';

  filtroEstado = '';
  filtroBusqueda = '';

  estadosVisibles = [
    'ENVIADO_DOCENTE',
    'OBSERVADO_DPTO',
    'SUBSANADO',
    'VALIDADO_DPTO',
    'OBSERVADO_FACULTAD',
    'APROBADO_FACULTAD',
    'CERRADO',
  ];

  constructor(
    private api: ApiService,
    private periodoService: PeriodoService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.periodo = this.periodoService.periodo;
    this.cargar();
  }

  get esDirector(): boolean {
    return this.authService.hasRole(ROLES.DIRECTOR_ESCUELA) || this.authService.hasRole(ROLES.DIRECTOR_DEPARTAMENTO);
  }

  get esDecano(): boolean {
    return this.authService.hasRole(ROLES.DECANO);
  }

  get pendientesDepartamento(): number {
    return this.items.filter(i => i.estado === 'ENVIADO_DOCENTE' || i.estado === 'SUBSANADO').length;
  }

  get observacionesPendientes(): number {
    return this.items.filter(i => i.estado === 'OBSERVADO_DPTO' || i.estado === 'OBSERVADO_FACULTAD').length;
  }

  cargar(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<DocumentacionResumen[]>>('/declaraciones/documentaciones', {
        periodo: this.periodo,
      })
      .subscribe({
        next: (res) => {
          this.items = res.data || [];
          this.aplicarFiltros();
          this.loading = false;
        },
        error: () => {
          this.items = [];
          this.filteredItems = [];
          this.loading = false;
        },
      });
  }

  aplicarFiltros(): void {
    this.filteredItems = this.items.filter((item) => {
      if (this.filtroEstado && item.estado !== this.filtroEstado) return false;
      if (this.filtroBusqueda) {
        const busqueda = this.filtroBusqueda.toLowerCase();
        const nombre = (item.docente_nombre || '').toLowerCase();
        const ibm = String(item.docente_ibm || '');
        if (!nombre.includes(busqueda) && !ibm.includes(busqueda)) return false;
      }
      return true;
    });
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      NO_INICIADO: 'No iniciado',
      BORRADOR: 'Borrador',
      PENDIENTE_ENVIO: 'Pendiente de envío',
      ENVIADO_DOCENTE: 'Enviado por docente',
      OBSERVADO_DPTO: 'Observado por departamento',
      SUBSANADO: 'Subsanado',
      VALIDADO_DPTO: 'Validado por departamento',
      OBSERVADO_FACULTAD: 'Observado por facultad',
      APROBADO_FACULTAD: 'Aprobado por facultad',
      CERRADO: 'Cerrado',
      ANULADO: 'Anulado',
    };
    return labels[estado] || estado;
  }

  getEstadoColorClass(estado: string): string {
    const colors: Record<string, string> = {
      ENVIADO_DOCENTE: 'estado-enviado',
      OBSERVADO_DPTO: 'estado-observado',
      SUBSANADO: 'estado-subsanado',
      VALIDADO_DPTO: 'estado-validado',
      OBSERVADO_FACULTAD: 'estado-observado-facultad',
      APROBADO_FACULTAD: 'estado-aprobado',
      CERRADO: 'estado-cerrado',
      BORRADOR: 'estado-borrador',
    };
    return colors[estado] || 'estado-cerrado';
  }

  getInitials(nombre: string): string {
    if (!nombre) return 'NN';
    const parts = nombre.split(',');
    if (parts.length >= 2) {
      const apellidos = parts[0].trim().split(' ');
      const nombres = parts[1].trim().split(' ');
      return (
        (apellidos[0]?.[0] || '') + (nombres[0]?.[0] || '')
      ).toUpperCase();
    }
    const words = nombre.split(' ');
    return (words[0]?.[0] || '') + (words[1]?.[0] || '').toUpperCase();
  }

  verificarDeclaracion(item: DocumentacionResumen): void {
    this.router.navigate(['/app/documentaciones', item.id]);
  }
}
