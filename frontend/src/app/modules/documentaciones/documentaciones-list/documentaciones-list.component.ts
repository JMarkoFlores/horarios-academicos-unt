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

  getEstadoColorClass(estado: string): string {
    const colors: Record<string, string> = {
      ENVIADO_DOCENTE: 'estado-enviado',
      OBSERVADO_DPTO: 'estado-observado',
      SUBSANADO: 'estado-enviado',
      VALIDADO_DPTO: 'estado-validado',
      OBSERVADO_FACULTAD: 'estado-observado',
      APROBADO_FACULTAD: 'estado-aprobado',
      CERRADO: 'estado-cerrado',
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
