
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { PeriodoService } from '../../../core/services/periodo.service';
import { ApiService } from '../../../core/services/api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiResponse } from '../../../core/interfaces/entities';

interface VentanaAtencion {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  proposito: string;
  estado: string;
  periodo: string;
  posicion_cola: number | null;
  estado_cola: string | null;
  total_docentes?: number;
}

@Component({
  selector: 'app-mis-ventanas',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    RouterModule,
  ],
  templateUrl: './mis-ventanas.component.html',
  styleUrls: ['./mis-ventanas.component.scss'],
})
export class MisVentanasComponent implements OnInit, OnDestroy {
  private periodoService = inject(PeriodoService);
  private apiService = inject(ApiService);

  ventanas: VentanaAtencion[] = [];
  displayedColumns: string[] = ['fecha', 'hora', 'proposito', 'estado', 'posicion', 'acciones'];
  isLoading = false;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.periodoService.periodo$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadVentanas();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadVentanas(): void {
    if (!this.periodoService.periodo) return;
    this.isLoading = true;
    this.apiService.get<ApiResponse<VentanaAtencion[]>>('/ventanas/mis-ventanas', {
      periodo: this.periodoService.periodo,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.ventanas = res.data || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading ventanas:', error);
        this.isLoading = false;
      }
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const map: Record<string, string> = {
      PROGRAMADA: 'badge-primary',
      EN_CURSO: 'badge-accent',
      COMPLETADA: 'badge-success',
      CANCELADA: 'badge-danger',
    };
    return map[estado] || 'badge-secondary';
  }

  getEstadoColaBadgeClass(estadoCola: string | null): string {
    if (!estadoCola) return 'badge-secondary';
    const map: Record<string, string> = {
      ESPERANDO: 'badge-warning',
      EN_ATENCION: 'badge-accent',
      COMPLETADO: 'badge-success',
      AUSENTE: 'badge-danger',
    };
    return map[estadoCola] || 'badge-secondary';
  }
}
