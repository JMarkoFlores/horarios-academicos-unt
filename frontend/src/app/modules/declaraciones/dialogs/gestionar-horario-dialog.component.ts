import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface HorarioEntry {
  dia: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface GestionarHorarioData {
  actividadId: number;
  actividadNombre: string;
  horarios: HorarioEntry[];
  horas: number;
  horasManual: boolean;
  allHorarios: { actividadId: number; horarios: HorarioEntry[] }[];
}

export const DIAS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

@Component({
  selector: 'app-gestionar-horario-dialog',
  template: `
    <h2 mat-dialog-title>Horario — {{ data.actividadNombre }}</h2>
    <mat-dialog-content>
      <div class="horario-header">
        <span class="horario-horas-label">
          Total: <strong>{{ calcularTotal() }}h</strong>
          <span *ngIf="calcularTotal() !== data.horas" class="manual-badge">(manual: {{ data.horas }}h)</span>
        </span>
        <mat-slide-toggle [(ngModel)]="data.horasManual" (ngModelChange)="onToggleManual()" color="accent">
          Editar horas manualmente
        </mat-slide-toggle>
      </div>

      <div *ngIf="data.horasManual" class="manual-input-row">
        <mat-form-field appearance="outline" dense>
          <mat-label>Horas totales</mat-label>
          <input matInput type="number" [(ngModel)]="data.horas" min="0" max="80" />
        </mat-form-field>
      </div>

      <table class="horario-table">
        <thead>
          <tr>
            <th>Día</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Horas</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let h of data.horarios; let i = index">
            <td>
              <select [(ngModel)]="h.dia" class="dia-select">
                <option *ngFor="let d of dias" [value]="d">{{ d }}</option>
              </select>
            </td>
            <td>
              <input type="time" [(ngModel)]="h.hora_inicio" (ngModelChange)="onHorarioChange()" class="time-input" />
            </td>
            <td>
              <input type="time" [(ngModel)]="h.hora_fin" (ngModelChange)="onHorarioChange()" class="time-input" />
            </td>
            <td class="horas-calc">{{ calcularHoras(h) }}h</td>
            <td>
              <button mat-icon-button color="warn" (click)="eliminar(i)" matTooltip="Eliminar">
                <mat-icon>remove_circle</mat-icon>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <button mat-stroked-button color="accent" (click)="agregar()" class="btn-add">
        <mat-icon>add</mat-icon> Agregar horario
      </button>

      <div *ngIf="conflictos.length > 0" class="conflict-warning">
        <mat-icon>warning</mat-icon>
        <span>Conflicto con otras actividades:</span>
        <ul>
          <li *ngFor="let c of conflictos">{{ c }}</li>
        </ul>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cerrar()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="guardar()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
    .horario-header { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
    .horario-horas-label { font-size: 16px; }
    .manual-badge { font-size: 12px; color: #e65100; font-weight: 500; margin-left: 8px; }
    .manual-input-row { margin-bottom: 12px; }
    .manual-input-row mat-form-field { width: 120px; }
    .horario-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .horario-table th { background: #f5f5f5; padding: 8px 6px; font-size: 12px; text-align: center; border: 1px solid #ddd; }
    .horario-table td { border: 1px solid #ddd; padding: 6px; text-align: center; }
    .horas-calc { font-weight: 600; color: #6a1b9a; }
    .dia-select { padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 13px; width: 60px; text-align: center; }
    .time-input { width: 90px; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 13px; }
    .btn-add { margin-bottom: 12px; }
    .conflict-warning { display: flex; align-items: flex-start; gap: 8px; background: #fff3e0; border: 1px solid #ffe0b2; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #e65100; margin-top: 8px; }
    .conflict-warning ul { margin: 4px 0 0 16px; padding: 0; }
    .conflict-warning li { margin-bottom: 2px; }
    `
  ]
})
export class GestionarHorarioDialogComponent {
  dias = DIAS;
  conflictos: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<GestionarHorarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GestionarHorarioData,
    private snackBar: MatSnackBar,
  ) {}

  calcularHoras(h: HorarioEntry): number {
    if (!h.hora_inicio || !h.hora_fin) return 0;
    const [h1, m1] = h.hora_inicio.split(':').map(Number);
    const [h2, m2] = h.hora_fin.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    return Math.max(0, (h2 * 60 + m2 - h1 * 60 - m1) / 60);
  }

  calcularTotal(): number {
    return this.data.horarios.reduce((sum, h) => sum + this.calcularHoras(h), 0);
  }

  onToggleManual(): void {
    if (!this.data.horasManual) {
      this.data.horas = this.calcularTotal();
    }
  }

  onHorarioChange(): void {
    this.validarConflictos();
    if (!this.data.horasManual) {
      this.data.horas = this.calcularTotal();
    }
  }

  agregar(): void {
    this.data.horarios.push({ dia: 'LU', hora_inicio: '08:00', hora_fin: '10:00' });
  }

  eliminar(i: number): void {
    this.data.horarios.splice(i, 1);
    this.onHorarioChange();
  }

  validarConflictos(): void {
    this.conflictos = [];
    for (const otro of this.data.allHorarios) {
      if (otro.actividadId === this.data.actividadId) continue;
      for (const h1 of this.data.horarios) {
        for (const h2 of otro.horarios) {
          if (h1.dia !== h2.dia) continue;
          if (this.seSuperponen(h1.hora_inicio, h1.hora_fin, h2.hora_inicio, h2.hora_fin)) {
            this.conflictos.push(
              `Actividad ${otro.actividadId}: ${h2.dia} ${h2.hora_inicio}-${h2.hora_fin}`
            );
          }
        }
      }
    }
  }

  private seSuperponen(ini1: string, fin1: string, ini2: string, fin2: string): boolean {
    if (!ini1 || !fin1 || !ini2 || !fin2) return false;
    return ini1 < fin2 && ini2 < fin1;
  }

  guardar(): void {
    if (!this.data.horasManual) {
      this.data.horas = this.calcularTotal();
    }
    this.dialogRef.close(this.data);
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }
}
