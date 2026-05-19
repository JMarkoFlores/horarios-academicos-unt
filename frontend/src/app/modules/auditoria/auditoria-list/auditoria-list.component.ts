import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-auditoria-list',
  templateUrl: './auditoria-list.component.html',
  styleUrls: ['./auditoria-list.component.scss']
})
export class AuditoriaListComponent implements OnInit {
  registros: any[] = [];
  loading = false;
  displayedColumns = ['fecha', 'usuario', 'accion', 'docente', 'curso', 'periodo', 'datos_anteriores', 'datos_nuevos', 'motivo'];
  filtros = {
    periodo: this.periodoService.periodo,
    usuario_id: '',
    accion: '',
    desde: '',
    hasta: ''
  };

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarAuditoria();
  }

  cargarAuditoria(): void {
    this.loading = true;
    const params: any = {};
    if (this.filtros.periodo) params.periodo = this.filtros.periodo;
    if (this.filtros.usuario_id) params.usuario_id = this.filtros.usuario_id;
    if (this.filtros.accion) params.accion = this.filtros.accion;
    if (this.filtros.desde) params.desde = this.filtros.desde;
    if (this.filtros.hasta) params.hasta = this.filtros.hasta;

    this.api.get<any>('/auditoria', params).subscribe({
      next: (r) => {
        this.registros = r.data?.items || r.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error al cargar auditoría', 'Error', { duration: 3000 });
      }
    });
  }

  formatJson(obj: any): string {
    if (!obj) return '—';
    try {
      return JSON.stringify(obj, null, 2).substring(0, 120) + (JSON.stringify(obj).length > 120 ? '...' : '');
    } catch { return String(obj); }
  }
}
