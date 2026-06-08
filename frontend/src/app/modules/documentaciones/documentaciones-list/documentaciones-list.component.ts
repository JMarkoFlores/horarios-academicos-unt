import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import {
  ApiResponse,
  DeclaracionVista,
  DocumentacionResumen,
} from '../../../core/interfaces/entities';

@Component({
  selector: 'app-documentaciones-list',
  templateUrl: './documentaciones-list.component.html',
  styleUrls: ['./documentaciones-list.component.scss'],
})
export class DocumentacionesListComponent implements OnInit {
  displayedColumns = ['docente', 'ibm', 'periodo', 'estado', 'acciones'];
  items: DocumentacionResumen[] = [];
  loading = false;
  periodo = '';

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
      .get<ApiResponse<DocumentacionResumen[]>>('/declaraciones/documentaciones', {
        periodo: this.periodo,
      })
      .subscribe({
        next: (res) => {
          this.items = res.data || [];
          this.loading = false;
        },
        error: () => {
          this.items = [];
          this.loading = false;
        },
      });
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      ENVIADO_DOCENTE: 'Enviado por docente',
      OBSERVADO_DPTO: 'Observado por departamento',
      SUBSANADO: 'Subsanado',
      VALIDADO_DPTO: 'Validado por departamento',
      OBSERVADO_FACULTAD: 'Observado por facultad',
      APROBADO_FACULTAD: 'Aprobado por facultad',
      CERRADO: 'Cerrado',
    };
    return labels[estado] || estado;
  }

  verificarDeclaracion(item: DocumentacionResumen): void {
    if (item.estado !== 'ENVIADO_DOCENTE') {
      this.router.navigate(['/app/documentaciones', item.id]);
      return;
    }

    this.api
      .patch<ApiResponse<DeclaracionVista>>(`/declaraciones/${item.id}/observar`, {
        observaciones: 'Verificado por director de escuela',
      })
      .subscribe({
        next: () => {
          item.estado = 'OBSERVADO_DPTO';
          this.router.navigate(['/app/documentaciones', item.id]);
        },
        error: (err) => {
          this.snackBar.open(
            err?.error?.message || 'No se pudo verificar la declaracion',
            'Cerrar',
            { duration: 3000 },
          );
        },
      });
  }
}
