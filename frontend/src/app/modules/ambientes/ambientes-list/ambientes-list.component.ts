import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { Ambiente, ApiResponse } from '../../../core/interfaces/entities';
import { VerDisponibilidadDialogComponent } from '../dialogs/ver-disponibilidad-dialog/ver-disponibilidad-dialog.component';

const DEBOUNCE_MS = 300;

@Component({
  selector: 'app-ambientes-list',
  templateUrl: './ambientes-list.component.html',
  styleUrls: ['./ambientes-list.component.scss'],
})
export class AmbientesListComponent implements OnInit {
  displayedColumns = [
    'codigo',
    'nombre',
    'tipo',
    'capacidad',
    'equipamiento',
    'estado',
    'acciones',
  ];
  dataSource: Ambiente[] = [];
  total = 0;
  pageSize = 10;
  currentPage = 0;
  loading = false;

  // Filtros
  tipoFilter = '';
  estadoFilter = '';
  busqueda = '';
  pabellonFilter = '';
  sedeFilter = '';
  capacidadMin?: number;
  capacidadMax?: number;

  // Opciones únicas para filtros (se cargan dinámicamente)
  pabellones: string[] = [];
  sedes: string[] = [];

  // Mapa de ocupación por ambiente (se calcula al cargar)
  ocupacionMap: Record<number, number> = {};
  private busquedaTimer: any = null;

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    public periodoService: PeriodoService,
  ) {}

  ngOnInit(): void {
    this.loadAmbientes();
  }

  loadAmbientes(): void {
    this.loading = true;
    const params: Record<string, string | number> = {
      page: this.currentPage + 1,
      limit: this.pageSize,
    };
    if (this.tipoFilter) params['tipo'] = this.tipoFilter;
    if (this.estadoFilter) params['estado'] = this.estadoFilter;
    if (this.busqueda.trim()) params['busqueda'] = this.busqueda.trim();
    if (this.pabellonFilter) params['pabellon'] = this.pabellonFilter;
    if (this.sedeFilter) params['sede'] = this.sedeFilter;
    if (this.capacidadMin !== undefined && this.capacidadMin !== null) params['capacidadMin'] = this.capacidadMin;
    if (this.capacidadMax !== undefined && this.capacidadMax !== null) params['capacidadMax'] = this.capacidadMax;

    this.api
      .get<
        ApiResponse<{ items: Ambiente[]; total: number }>
      >('/ambientes', params)
      .subscribe({
        next: (res) => {
          this.dataSource = res.data.items;
          this.total = res.data.total;
          this.loading = false;
          this.extraerOpcionesFiltro();
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Error al cargar ambientes', 'Cerrar', { duration: 3000 });
        },
      });
  }

  private extraerOpcionesFiltro(): void {
    const pabs = new Set<string>();
    const seds = new Set<string>();
    for (const a of this.dataSource) {
      if (a.pabellon) pabs.add(a.pabellon);
      if (a.sede) seds.add(a.sede);
    }
    this.pabellones = Array.from(pabs).sort();
    this.sedes = Array.from(seds).sort();
  }

  onPageChange(e: PageEvent): void {
    this.currentPage = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadAmbientes();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    if (this.capacidadMin !== undefined && this.capacidadMax !== undefined && this.capacidadMax < this.capacidadMin) {
      this.snackBar.open('La capacidad máxima no puede ser menor que la mínima', 'Cerrar', { duration: 3000 });
      return;
    }
    this.loadAmbientes();
  }

  onBusquedaInput(): void {
    if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
    this.busquedaTimer = setTimeout(() => {
      this.currentPage = 0;
      this.loadAmbientes();
    }, DEBOUNCE_MS);
  }

  limpiarFiltros(): void {
    this.tipoFilter = '';
    this.estadoFilter = '';
    this.busqueda = '';
    this.pabellonFilter = '';
    this.sedeFilter = '';
    this.capacidadMin = undefined;
    this.capacidadMax = undefined;
    this.currentPage = 0;
    this.loadAmbientes();
  }

  verDisponibilidad(a: Ambiente): void {
    this.dialog.open(VerDisponibilidadDialogComponent, {
      width: '720px',
      maxWidth: '98vw',
      data: a,
    });
  }

  activar(a: Ambiente): void {
    this.api
      .patch<ApiResponse<any>>(`/ambientes/${a.id}`, { estado: 'ACTIVO' })
      .subscribe({
        next: () => {
          this.snackBar.open('Ambiente activado', 'OK', { duration: 2000 });
          this.loadAmbientes();
        },
        error: (err) => {
          const msg = err?.error?.message ?? 'Error al activar';
          this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        },
      });
  }

  desactivar(a: Ambiente): void {
    if (!confirm(`¿Desactivar "${a.nombre}"?`)) return;
    this.api.delete<ApiResponse<any>>(`/ambientes/${a.id}`, { periodo: this.periodoService.periodo }).subscribe({
      next: () => {
        this.snackBar.open('Ambiente desactivado', 'OK', { duration: 2000 });
        this.loadAmbientes();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Error al desactivar';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      },
    });
  }

  // Helpers para badges visuales
  getEstadoClass(estado?: string): string {
    switch (estado) {
      case 'ACTIVO': return 'estado-activo';
      case 'MANTENIMIENTO': return 'estado-mantenimiento';
      case 'RESERVADO': return 'estado-reservado';
      case 'INACTIVO': return 'estado-inactivo';
      default: return 'estado-activo';
    }
  }

  getEstadoLabel(estado?: string): string {
    switch (estado) {
      case 'ACTIVO': return 'Operativo';
      case 'MANTENIMIENTO': return 'Mantenimiento';
      case 'RESERVADO': return 'Reservado';
      case 'INACTIVO': return 'Inactivo';
      default: return 'Operativo';
    }
  }

  getTipoIcon(tipo: string): string {
    switch (tipo) {
      case 'AULA': return 'meeting_room';
      case 'LABORATORIO': return 'biotech';
      case 'AUDITORIO': return 'event_seat';
      case 'TALLER': return 'construction';
      case 'SEMINARIO': return 'groups';
      case 'SALA_COMPUTACION': return 'computer';
      default: return 'meeting_room';
    }
  }

  getTipoLabel(tipo: string): string {
    switch (tipo) {
      case 'AULA': return 'Aula';
      case 'LABORATORIO': return 'Laboratorio';
      case 'AUDITORIO': return 'Auditorio';
      case 'TALLER': return 'Taller';
      case 'SEMINARIO': return 'Seminario';
      case 'SALA_COMPUTACION': return 'Sala de cómputo';
      default: return tipo;
    }
  }
}
