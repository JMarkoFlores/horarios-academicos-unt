import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface DetallesCeldaData {
  dia: number;
  horaInicio: string;
  horaFin: string;
  estado: string;
  metadata: any;
}

@Component({
  template: `
    <h2 mat-dialog-title>Detalles de la celda</h2>
    <mat-dialog-content>
      <div class="detalle-grid">
        <div class="detalle-item">
          <span class="detalle-label">Día</span>
          <span class="detalle-value">{{ diaLabels[data.dia] || 'Día ' + data.dia }}</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Horario</span>
          <span class="detalle-value">{{ data.horaInicio }} - {{ data.horaFin }}</span>
        </div>
        <div class="detalle-item">
          <span class="detalle-label">Estado</span>
          <span class="detalle-value estado-badge" [class]="'estado-' + (data.estado | lowercase)">{{ estadoLabels[data.estado] || data.estado }}</span>
        </div>
      </div>
      <mat-divider></mat-divider>
      <div *ngIf="data.metadata?.ocupaciones?.length > 0; else sinOcupaciones">
        <h3>Ocupaciones ({{ data.metadata.ocupaciones.length }})</h3>
        <mat-list>
          <mat-list-item *ngFor="let o of data.metadata.ocupaciones; let i = index">
            <mat-icon mat-list-icon>schedule</mat-icon>
            <div mat-line><strong>{{ o.cursoNombre || 'Curso #' + o.cursoId }}</strong></div>
            <div mat-line>Docente: {{ o.docenteNombre || 'Docente #' + o.docenteId }}</div>
            <div mat-line *ngIf="o.tipoClase">Tipo: {{ o.tipoClase }}</div>
            <div mat-line *ngIf="o.grupoCodigo">Grupo: {{ o.grupoCodigo }}</div>
            <div mat-line *ngIf="o.ambienteNombre">Ambiente: {{ o.ambienteNombre }}</div>
            <div mat-line *ngIf="o.otroAmbiente" class="text-warning">(Asignado a otro ambiente)</div>
            <mat-divider *ngIf="i < data.metadata.ocupaciones.length - 1"></mat-divider>
          </mat-list-item>
        </mat-list>
      </div>
      <ng-template #sinOcupaciones>
        <div *ngIf="data.metadata?.docenteNombre || data.metadata?.cursoNombre">
          <h3>Detalle</h3>
          <div class="detalle-item" *ngIf="data.metadata.docenteNombre">
            <span class="detalle-label">Docente</span>
            <span class="detalle-value">{{ data.metadata.docenteNombre }}</span>
          </div>
          <div class="detalle-item" *ngIf="data.metadata.cursoNombre">
            <span class="detalle-label">Curso</span>
            <span class="detalle-value">{{ data.metadata.cursoNombre }}</span>
          </div>
          <div class="detalle-item" *ngIf="data.metadata.tipoClase">
            <span class="detalle-label">Tipo</span>
            <span class="detalle-value">{{ data.metadata.tipoClase }}</span>
          </div>
          <div class="detalle-item" *ngIf="data.metadata.grupoCodigo">
            <span class="detalle-label">Grupo</span>
            <span class="detalle-value">{{ data.metadata.grupoCodigo }}</span>
          </div>
          <div class="detalle-item" *ngIf="data.metadata.ambienteNombre">
            <span class="detalle-label">Ambiente</span>
            <span class="detalle-value">{{ data.metadata.ambienteNombre }}</span>
          </div>
        </div>
        <p *ngIf="!data.metadata?.docenteNombre && !data.metadata?.cursoNombre">{{ mensajeLibre(data.estado) }}</p>
      </ng-template>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="cerrar()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .detalle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .detalle-item { display: flex; flex-direction: column; }
    .detalle-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .detalle-value { font-size: 14px; font-weight: 500; margin-top: 2px; }
    .estado-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; width: fit-content; }
    .text-warning { color: #f59e0b; font-style: italic; font-size: 12px; }
    mat-divider { margin: 12px 0; }
    h3 { margin: 8px 0; font-size: 14px; font-weight: 600; }
  `]
})
export class DetallesCeldaDialogComponent {
  diaLabels = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  estadoLabels: Record<string, string> = {
    'LIBRE': 'Disponible',
    'BLOQUEADO': 'Fuera de franja',
    'CONFIRMADO': 'Ocupado',
    'CONFIRMADO_DOCENTE': 'Tu horario',
    'CONFIRMADO_MULTIPLE': 'Múltiple',
    'CONFIRMADO_DOCENTE_MULTIPLE': 'Tu horario + otros',
    'TEMPORAL_OTRO': 'Reserva temporal',
    'TEMPORAL_PROPIO': 'Tu selección',
    'TEMPORAL_PROPIO_MULTIPLE': 'Selección múltiple',
  };

  constructor(
    public dialogRef: MatDialogRef<DetallesCeldaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DetallesCeldaData,
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }

  mensajeLibre(estado: string): string {
    if (estado === 'LIBRE') return 'Celda disponible para asignación.';
    if (estado === 'BLOQUEADO') return 'Esta celda está fuera de la franja horaria permitida.';
    return '';
  }
}
