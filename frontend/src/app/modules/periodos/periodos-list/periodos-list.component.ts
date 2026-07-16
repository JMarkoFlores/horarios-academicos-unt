import { Component, OnInit, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { NotifToastService } from '../../../core/services/notif-toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { ApiResponse, PeriodoAcademico } from '../../../core/interfaces/entities';

@Component({
  selector: 'app-periodos-list',
  templateUrl: './periodos-list.component.html',
  styleUrls: ['./periodos-list.component.scss'],
})
export class PeriodosListComponent implements OnInit {
  dataSource = signal<PeriodoAcademico[]>([]);
  loading = false;
  total = 0;
  currentPage = 0;
  pageSize = 10;

  searchTerm = signal('');
  searchSubject = new Subject<string>();
  filtroEstado = signal<string | null>(null);

  estadosDisponibles = [
    { value: 'planificacion', label: 'Planificación' },
    { value: 'asignacionhorarios', label: 'Asignación Horarios' },
    { value: 'encurso', label: 'En curso' },
    { value: 'finalizado', label: 'Finalizado' },
  ];

  estadoLabels: Record<string, string> = {
    planificacion: 'Planificación',
    asignacionhorarios: 'Asignación Horarios',
    encurso: 'En curso',
    finalizado: 'Finalizado',
  };

  estadoColors: Record<string, string> = {
    planificacion: '#f59e0b',
    asignacionhorarios: '#3b82f6',
    encurso: '#10b981',
    finalizado: '#64748b',
  };

  filtered = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const estado = this.filtroEstado();
    return this.dataSource().filter(p => {
      const matchSearch = !term || p.codigo.toLowerCase().includes(term) || p.nombre.toLowerCase().includes(term);
      const matchEstado = !estado || p.estado === estado;
      return matchSearch && matchEstado;
    });
  });

  stats = computed(() => {
    const all = this.filtered();
    return {
      total: all.length,
      planificacion: all.filter(p => p.estado === 'planificacion').length,
      encurso: all.filter(p => p.estado === 'encurso').length,
      finalizado: all.filter(p => p.estado === 'finalizado').length,
      activos: all.filter(p => p.activo).length,
    };
  });

  displayedColumns = ['codigo', 'nombre', 'duracion', 'estado', 'acciones'];

  constructor(
    private api: ApiService,
    private notif: NotifToastService,
    private periodoService: PeriodoService,
    private dialog: MatDialog,
    private destroyRef: DestroyRef,
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(term => {
      this.searchTerm.set(term);
    });
  }

  ngOnInit(): void {
    this.loadPeriodos();
  }

  loadPeriodos(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<{ items: PeriodoAcademico[]; total: number }>>('/periodos', {
        page: this.currentPage + 1,
        limit: this.pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.dataSource.set(res.data.items);
          this.total = res.data.total;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.notif.error(err?.error?.message ?? 'Error al cargar períodos');
        },
      });
  }

  onSearch(value: string): void {
    this.searchSubject.next(value);
  }

  setFiltroEstado(estado: string | null): void {
    this.filtroEstado.set(estado);
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPeriodos();
  }

  getDuracion(inicio: string, fin: string): string {
    const d1 = new Date(inicio);
    const d2 = new Date(fin);
    const diff = Math.abs(d2.getTime() - d1.getTime());
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const remaining = days % 7;
    let result = '';
    if (weeks > 0) result += `${weeks} sem`;
    if (remaining > 0) result += `${weeks > 0 ? ' ' : ''}${remaining} d`;
    return result || '0 d';
  }

  confirmarEliminar(p: PeriodoAcademico): void {
    const data: ConfirmDialogData = {
      title: 'Eliminar Período',
      message: `¿Estás seguro de eliminar "${p.nombre}" (${p.codigo})?`,
      detail: 'Esta acción no se puede deshacer. Se eliminarán todos los horarios y declaraciones asociados.',
      confirmLabel: 'Eliminar',
      confirmColor: 'warn',
      icon: 'delete_forever',
    };
    const ref = this.dialog.open(ConfirmDialogComponent, { data, width: '400px' });
    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.delete<ApiResponse<any>>(`/periodos/${p.id}`)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.notif.success('Período eliminado correctamente');
            this.periodoService.cargarPeriodos();
            this.loadPeriodos();
          },
          error: (err) => {
            this.notif.error(err?.error?.message ?? 'Error al eliminar el período');
          },
        });
    });
  }

  confirmarFinalizar(p: PeriodoAcademico): void {
    const data: ConfirmDialogData = {
      title: '¿Finalizar Período?',
      message: `Estás a punto de finalizar "${p.nombre}" (${p.codigo})`,
      detail: 'Esta acción es IRREVERSIBLE:\n• Cierra todas las declaraciones aprobadas\n• Anula las declaraciones en otros estados\n• Bloquea nuevas cargas horarias',
      confirmLabel: 'Finalizar ahora',
      confirmColor: 'warn',
      icon: 'flag',
    };
    const ref = this.dialog.open(ConfirmDialogComponent, { data, width: '420px' });
    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.post<ApiResponse<any>>(`/periodos/${p.id}/finalizar`, {})
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.notif.success(res.message || 'Período finalizado con éxito');
            this.periodoService.cargarPeriodos();
            this.loadPeriodos();
          },
          error: (err) => {
            this.notif.error(err?.error?.message ?? 'Error al finalizar el período');
          },
        });
    });
  }
}
