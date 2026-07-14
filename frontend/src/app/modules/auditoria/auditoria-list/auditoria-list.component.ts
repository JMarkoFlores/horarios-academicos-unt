import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-auditoria-list',
  templateUrl: './auditoria-list.component.html',
  styleUrls: ['./auditoria-list.component.scss'],
})
export class AuditoriaListComponent implements OnInit, OnDestroy {
  selectedTab = 0;
  registrosHorarios: any[] = [];
  registrosCarga: any[] = [];
  loading = false;
  totalHorarios = 0;
  totalCarga = 0;
  currentPage = 1;
  pageSize = 20;

  displayedColumnsHorarios = [
    'fecha', 'usuario', 'accion', 'docente', 'curso', 'periodo',
    'datos_anteriores', 'datos_nuevos', 'motivo',
  ];
  displayedColumnsCarga = [
    'fecha', 'usuario', 'entidad', 'accion',
    'estado_anterior', 'estado_nuevo',
    'datos_anteriores', 'datos_nuevos', 'motivo',
  ];

  filtros = {
    periodo: this.periodoService.periodo,
    usuario_id: '',
    accion: '',
    entidad: '',
    desde: '',
    hasta: '',
  };

  accionOptions = [
    { value: '', label: 'Todas' },
    { value: 'CREAR', label: 'Crear' },
    { value: 'ACTUALIZAR', label: 'Actualizar' },
    { value: 'CONFIRMAR', label: 'Confirmar' },
    { value: 'RECHAZAR', label: 'Rechazar' },
    { value: 'ELIMINAR', label: 'Eliminar' },
    { value: 'ENVIAR', label: 'Enviar' },
    { value: 'OBSERVAR', label: 'Observar' },
    { value: 'VALIDAR', label: 'Validar' },
    { value: 'APROBAR', label: 'Aprobar' },
    { value: 'SUBSANAR', label: 'Subsanar' },
  ];

  entidadOptions = [
    { value: '', label: 'Todas' },
    { value: 'ASIGNACION_LECTIVA', label: 'Asignación Lectiva' },
    { value: 'DECLARACION_CARGA', label: 'Declaración de Carga' },
  ];

  private periodSub?: Subscription;

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarAuditoria();
    this.periodSub = this.periodoService.periodo$.subscribe((p) => {
      this.filtros.periodo = p;
      this.cargarAuditoria();
    });
  }

  ngOnDestroy(): void {
    this.periodSub?.unsubscribe();
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
    this.currentPage = 1;
    this.cargarAuditoria();
  }

  cargarAuditoria(): void {
    if (this.selectedTab === 0) {
      this.cargarAuditoriaHorarios();
    } else {
      this.cargarAuditoriaCarga();
    }
  }

  private buildParams(): any {
    const p: any = { page: String(this.currentPage), limit: String(this.pageSize) };
    if (this.filtros.periodo) p.periodo = this.filtros.periodo;
    if (this.filtros.usuario_id) p.usuario_id = this.filtros.usuario_id;
    if (this.filtros.accion) p.accion = this.filtros.accion;
    if (this.filtros.desde) p.desde = this.filtros.desde;
    if (this.filtros.hasta) p.hasta = this.filtros.hasta;
    if (this.selectedTab === 1 && this.filtros.entidad) p.entidad = this.filtros.entidad;
    return p;
  }

  cargarAuditoriaHorarios(): void {
    this.loading = true;
    this.api.get<any>('/auditoria', this.buildParams()).subscribe({
      next: (r) => {
        const inner = r.data || r;
        this.registrosHorarios = inner.data ?? inner.items ?? inner ?? [];
        this.totalHorarios = inner.total ?? this.registrosHorarios.length;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.registrosHorarios = [];
        this.snack.open('Error al cargar auditoría de horarios', 'Cerrar', { duration: 3000 });
      },
    });
  }

  cargarAuditoriaCarga(): void {
    this.loading = true;
    this.api.get<any>('/auditoria/carga', this.buildParams()).subscribe({
      next: (r) => {
        const inner = r.data || r;
        this.registrosCarga = inner.data ?? inner.items ?? inner ?? [];
        this.totalCarga = inner.total ?? this.registrosCarga.length;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.registrosCarga = [];
        this.snack.open('Error al cargar auditoría de carga académica', 'Cerrar', { duration: 3000 });
      },
    });
  }

  cambiarPagina(delta: number): void {
    this.currentPage = Math.max(1, this.currentPage + delta);
    this.cargarAuditoria();
  }

  formatJson(obj: any): string {
    if (!obj) return '—';
    try {
      const str = JSON.stringify(obj);
      return JSON.stringify(obj, null, 2).substring(0, 120) + (str.length > 120 ? '...' : '');
    } catch {
      return String(obj);
    }
  }

  accionBadgeClass(accion: string): string {
    const map: Record<string, string> = {
      CREAR: 'badge-crear',
      ACTUALIZAR: 'badge-actualizar',
      CONFIRMAR: 'badge-confirmar',
      RECHAZAR: 'badge-rechazar',
      ELIMINAR: 'badge-eliminar',
      ENVIAR: 'badge-enviar',
      OBSERVAR: 'badge-observar',
      VALIDAR: 'badge-validar',
      APROBAR: 'badge-aprobar',
      SUBSANAR: 'badge-subsanar',
    };
    return map[accion] || '';
  }
}
