import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

export interface HeatmapDetailsData {
  dia: string;
  hora: string;
  horarios: any[];
}

@Component({
  selector: 'app-heatmap-details-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Detalles de Horario</h2>
    <mat-dialog-content>
      <div class="details-header">
        <p><strong>Día:</strong> {{ data.dia }}</p>
        <p><strong>Hora:</strong> {{ data.hora }}</p>
      </div>
      
      @if (data.horarios && data.horarios.length > 0) {
        <div class="horarios-list">
          @for (horario of data.horarios; track horario.id) {
            <div class="horario-card">
              <div class="horario-header">
                <span class="curso-nombre">{{ horario.curso?.nombre || 'Sin curso' }}</span>
                <span class="tipo-clase" [class.teoria]="horario.tipo_clase === 'TEORIA'" 
                      [class.laboratorio]="horario.tipo_clase === 'LABORATORIO'"
                      [class.mixto]="horario.tipo_clase === 'MIXTO'">
                  {{ horario.tipo_clase || 'TEORIA' }}
                </span>
              </div>
              <div class="horario-details">
                <p><strong>Docente:</strong> {{ horario.docente?.nombre_completo || horario.docente?.nombre || 'Sin asignar' }}</p>
                <p><strong>Ambiente:</strong> {{ horario.ambiente?.codigo || horario.ambiente?.nombre || 'Sin asignar' }}</p>
                <p><strong>Horario:</strong> {{ horario.hora_inicio }} - {{ horario.hora_fin }}</p>
                @if (horario.grupo) {
                  <p><strong>Grupo:</strong> {{ horario.grupo?.nombre || horario.grupo?.codigo || horario.grupo?.id || 'N/A' }}</p>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <p class="no-horarios">No hay horarios asignados para este bloque.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .details-header {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    .details-header p {
      margin: 4px 0;
      font-size: 14px;
    }
    .horarios-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
    }
    .horario-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px;
      background: #f9f9f9;
    }
    .horario-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .curso-nombre {
      font-weight: 600;
      font-size: 14px;
      color: #1e293b;
    }
    .tipo-clase {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .tipo-clase.teoria {
      background: #dbeafe;
      color: #1e40af;
    }
    .tipo-clase.laboratorio {
      background: #d1fae5;
      color: #065f46;
    }
    .tipo-clase.mixto {
      background: #f3e8ff;
      color: #7c3aed;
    }
    .horario-details {
      font-size: 13px;
      color: #64748b;
    }
    .horario-details p {
      margin: 4px 0;
    }
    .no-horarios {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      padding: 20px;
    }
  `]
})
export class HeatmapDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<HeatmapDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HeatmapDetailsData
  ) {}
}
