import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

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

// Validator: hora inicio < hora fin
function horaValidaValidator(control: FormGroup): { [key: string]: boolean } | null {
  const inicio = control.get('hora_inicio')?.value;
  const fin = control.get('hora_fin')?.value;
  if (inicio && fin && inicio >= fin) {
    return { 'horaInvalida': true };
  }
  return null;
}

// Validator: no se superpone con otros horarios del mismo formulario
function noSuperposicionValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const formArray = control as FormArray;
  const horarios = formArray.controls as FormGroup[];
  for (let i = 0; i < horarios.length; i++) {
    for (let j = i + 1; j < horarios.length; j++) {
      const h1 = horarios[i].value;
      const h2 = horarios[j].value;
      if (h1.dia === h2.dia && seSuperponen(h1.hora_inicio, h1.hora_fin, h2.hora_inicio, h2.hora_fin)) {
        return { 'superposicion': true };
      }
    }
  }
  return null;
}

function seSuperponen(ini1: string, fin1: string, ini2: string, fin2: string): boolean {
  if (!ini1 || !fin1 || !ini2 || !fin2) return false;
  return ini1 < fin2 && ini2 < fin1;
}

@Component({
  selector: 'app-gestionar-horario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule
  ],
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

      <form [formGroup]="form">
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
          <tbody formArrayName="horarios">
            <tr *ngFor="let grupo of horariosFormArray.controls; let i = index" [formGroupName]="i" [class.row-error]="grupo.invalid || form.hasError('superposicion')">
              <td>
                <select formControlName="dia" class="dia-select">
                  <option *ngFor="let d of dias" [value]="d">{{ d }}</option>
                </select>
              </td>
              <td>
                <input type="time" formControlName="hora_inicio" class="time-input" />
                <div *ngIf="grupo.get('hora_inicio')?.invalid && grupo.get('hora_inicio')?.touched" class="error-text">
                  Requerido
                </div>
              </td>
              <td>
                <input type="time" formControlName="hora_fin" class="time-input" />
                <div *ngIf="grupo.get('hora_fin')?.invalid && grupo.get('hora_fin')?.touched" class="error-text">
                  Requerido
                </div>
              </td>
              <td class="horas-calc">{{ calcularHoras(grupo.value) }}h</td>
              <td>
                <button mat-icon-button color="warn" (click)="eliminar(i)" matTooltip="Eliminar">
                  <mat-icon>remove_circle</mat-icon>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="error-text-small">
          <div *ngIf="form.hasError('superposicion')" style="display: flex; align-items: center; gap: 4px;">
            <mat-icon color="warn">error</mat-icon>
            <span>Existe superposición de horarios en la misma actividad</span>
          </div>
          <div *ngIf="hayHoraInvalida()" style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
            <mat-icon color="warn">error</mat-icon>
            <span>La hora de inicio debe ser menor que la hora de fin</span>
          </div>
        </div>
      </form>

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
      <button mat-raised-button color="primary" (click)="guardar()" [disabled]="form.invalid || conflictos.length > 0">Guardar</button>
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
    .error-text { color: #f44336; font-size: 11px; margin-top: 2px; display: block; }
    .error-text-small { color: #f44336; font-size: 12px; display: flex; align-items: center; gap: 4px; margin-top: 4px; }
    .row-error { background-color: #ffebee; }
    .btn-add { margin-bottom: 12px; }
    .conflict-warning { display: flex; align-items: flex-start; gap: 8px; background: #fff3e0; border: 1px solid #ffe0b2; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #e65100; margin-top: 8px; }
    .conflict-warning ul { margin: 4px 0 0 16px; padding: 0; }
    .conflict-warning li { margin-bottom: 2px; }
    `
  ]
})
export class GestionarHorarioDialogComponent implements OnInit {
  dias = DIAS;
  conflictos: string[] = [];
  form!: FormGroup;

  get horariosFormArray(): FormArray {
    return this.form.get('horarios') as FormArray;
  }

  hayHoraInvalida(): boolean {
    return this.horariosFormArray.controls.some(grupo => grupo.hasError('horaInvalida'));
  }

  constructor(
    public dialogRef: MatDialogRef<GestionarHorarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GestionarHorarioData,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      horarios: this.fb.array(
        this.data.horarios.map(h => this.crearGrupoHorario(h)),
        [noSuperposicionValidator]
      )
    });

    this.horariosFormArray.valueChanges.subscribe(() => {
      this.onHorarioChange();
    });

    this.validarConflictos();
  }

  private crearGrupoHorario(h: HorarioEntry): FormGroup {
    return this.fb.group({
      dia: [h.dia, Validators.required],
      hora_inicio: [h.hora_inicio, Validators.required],
      hora_fin: [h.hora_fin, Validators.required]
    }, { validators: horaValidaValidator });
  }

  calcularHoras(h: HorarioEntry): number {
    if (!h.hora_inicio || !h.hora_fin) return 0;
    const [h1, m1] = h.hora_inicio.split(':').map(Number);
    const [h2, m2] = h.hora_fin.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    return Math.max(0, (h2 * 60 + m2 - h1 * 60 - m1) / 60);
  }

  calcularTotal(): number {
    return this.horariosFormArray.controls.reduce((sum, grupo) => sum + this.calcularHoras(grupo.value), 0);
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
    this.horariosFormArray.push(this.crearGrupoHorario({ dia: 'LU', hora_inicio: '08:00', hora_fin: '10:00' }));
  }

  eliminar(i: number): void {
    this.horariosFormArray.removeAt(i);
    this.onHorarioChange();
  }

  validarConflictos(): void {
    this.conflictos = [];
    const horariosActuales = this.horariosFormArray.value as HorarioEntry[];
    for (const otro of this.data.allHorarios) {
      if (otro.actividadId === this.data.actividadId) continue;
      for (const h1 of horariosActuales) {
        for (const h2 of otro.horarios) {
          if (h1.dia !== h2.dia) continue;
          if (seSuperponen(h1.hora_inicio, h1.hora_fin, h2.hora_inicio, h2.hora_fin)) {
            this.conflictos.push(
              `Actividad ${otro.actividadId}: ${h2.dia} ${h2.hora_inicio}-${h2.hora_fin}`
            );
          }
        }
      }
    }
  }

  guardar(): void {
    this.data.horarios = this.horariosFormArray.value as HorarioEntry[];
    if (!this.data.horasManual) {
      this.data.horas = this.calcularTotal();
    }
    this.dialogRef.close(this.data);
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }
}
