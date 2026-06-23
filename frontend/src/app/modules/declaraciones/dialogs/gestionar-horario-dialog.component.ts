import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  DIAS_SEMANA,
  DIA_CODIGO_A_ETIQUETA,
  diaNumericoACodigo,
  esHorarioIdentico,
  formatearBloqueHorario,
  HorarioLectivoRef,
  normalizarHora,
  seSuperponen,
} from '../horario.utils';

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
  allHorarios: { actividadId: number; actividadNombre?: string; horarios: HorarioEntry[] }[];
  horariosLectivos: HorarioLectivoRef[];
  maxHoras?: number;
  totalHorasLectivas?: number;
  horasActualizadas?: boolean;
}

export const DIAS = [...DIAS_SEMANA];

function horaValidaValidator(control: FormGroup): { [key: string]: boolean } | null {
  const inicio = control.get('hora_inicio')?.value;
  const fin = control.get('hora_fin')?.value;
  if (inicio && fin && inicio >= fin) {
    return { horaInvalida: true };
  }
  return null;
}

function noSuperposicionValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const formArray = control as FormArray;
  const horarios = formArray.controls as FormGroup[];
  for (let i = 0; i < horarios.length; i++) {
    for (let j = i + 1; j < horarios.length; j++) {
      const h1 = horarios[i].value;
      const h2 = horarios[j].value;
      if (h1.dia === h2.dia && seSuperponen(h1.hora_inicio, h1.hora_fin, h2.hora_inicio, h2.hora_fin)) {
        return { superposicion: true };
      }
    }
  }
  return null;
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
    MatDialogModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>Horario — {{ data.actividadNombre }}</h2>
    <mat-dialog-content>
      <div class="horario-header">
        <span class="horario-horas-label">
          Total: <strong [class.excede-max]="excedeMaxHoras()">{{ calcularTotal() }}h</strong>
          <span *ngIf="data.maxHoras != null" class="max-badge" [class.excede-max]="excedeMaxHoras()">
            / {{ data.maxHoras }}h máx.
          </span>
          <span *ngIf="calcularTotal() !== data.horas" class="manual-badge">(manual: {{ data.horas }}h)</span>
        </span>
        <mat-slide-toggle [(ngModel)]="data.horasManual" (ngModelChange)="onToggleManual()" color="accent">
          Editar horas manualmente
        </mat-slide-toggle>
      </div>
      <div *ngIf="excedeMaxHoras()" class="limit-error">
        <mat-icon>error</mat-icon>
        <span>Las horas programadas ({{ calcularTotal() }}h) exceden el máximo permitido ({{ data.maxHoras }}h).
          <ng-container *ngIf="data.actividadId === 2"> Preparación no puede superar el 50% de las horas lectivas ({{ data.totalHorasLectivas }}h).</ng-container>
          Elimine o reduzca bloques horarios.
        </span>
      </div>

      <div *ngIf="data.horariosLectivos.length > 0" class="lectiva-panel">
        <div class="lectiva-panel-title">
          <mat-icon>school</mat-icon>
          <span>Carga lectiva del docente (referencia)</span>
        </div>
        <p class="lectiva-panel-hint">Los bloques indican horas ya ocupadas por cursos. Evite asignar actividades no lectivas en esos rangos.</p>
        <div class="lectiva-dias">
          <div *ngFor="let grupo of horariosLectivosPorDia" class="lectiva-dia">
            <span class="lectiva-dia-label">{{ grupo.etiqueta }}</span>
            <div class="lectiva-bloques">
              <span *ngFor="let h of grupo.items" class="lectiva-bloque" [matTooltip]="h.nombreCurso">
                {{ normalizarHora(h.hora_inicio) }}-{{ normalizarHora(h.hora_fin) }}
                <small>{{ h.codigoCurso }}</small>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="data.horasManual" class="manual-input-row">
        <mat-form-field appearance="outline" dense>
          <mat-label>Horas totales</mat-label>
          <input matInput type="number" [(ngModel)]="data.horas" min="0" [max]="data.maxHoras ?? 80"
            (ngModelChange)="validarHorasManual()" />
        </mat-form-field>
        <span *ngIf="data.maxHoras != null && data.horas > data.maxHoras" class="manual-excede">
          Excede el máximo de {{ data.maxHoras }}h
        </span>
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
            <ng-container *ngFor="let grupo of horariosFormArray.controls; let i = index">
              <tr
                [formGroupName]="i"
                [class.row-error]="grupo.invalid || getAlertasFila(i).length > 0"
              >
                <td>
                  <select formControlName="dia" class="dia-select">
                    <option *ngFor="let d of dias" [value]="d">{{ d }}</option>
                  </select>
                </td>
                <td>
                  <input type="time" formControlName="hora_inicio" class="time-input" />
                </td>
                <td>
                  <input type="time" formControlName="hora_fin" class="time-input" />
                </td>
                <td class="horas-calc">{{ calcularHoras(grupo.value) }}h</td>
                <td>
                  <button mat-icon-button color="warn" type="button" (click)="eliminar(i)" matTooltip="Eliminar">
                    <mat-icon>remove_circle</mat-icon>
                  </button>
                </td>
              </tr>
              <tr *ngIf="getAlertasFila(i).length > 0" class="row-alerts">
                <td colspan="5">
                  <div *ngFor="let alerta of getAlertasFila(i)" class="fila-alerta" [class.alerta-lectiva]="alerta.tipo === 'lectiva'">
                    <mat-icon>{{ alerta.tipo === 'lectiva' ? 'school' : 'warning' }}</mat-icon>
                    <span>{{ alerta.mensaje }}</span>
                  </div>
                </td>
              </tr>
            </ng-container>
          </tbody>
        </table>
        <div class="error-text-small">
          <div *ngIf="tieneDuplicados()" class="error-line">
            <mat-icon color="warn">error</mat-icon>
            <span>Hay horarios idénticos repetidos en esta actividad</span>
          </div>
          <div *ngIf="horariosFormArray.hasError('superposicion') && !tieneDuplicados()" class="error-line">
            <mat-icon color="warn">error</mat-icon>
            <span>Existen horarios que se solapan dentro de la misma actividad</span>
          </div>
          <div *ngIf="form.hasError('solapamientoLectiva')" class="error-line">
            <mat-icon color="warn">error</mat-icon>
            <span>Hay solapamiento con horarios de carga lectiva del docente</span>
          </div>
          <div *ngIf="hayHoraInvalida()" class="error-line">
            <mat-icon color="warn">error</mat-icon>
            <span>La hora de inicio debe ser menor que la hora de fin</span>
          </div>
        </div>
      </form>

      <button mat-stroked-button color="accent" type="button" (click)="agregar()" class="btn-add">
        <mat-icon>add</mat-icon> Agregar horario
      </button>

      <div *ngIf="conflictosOtrasActividades.length > 0" class="conflict-warning conflict-blocking">
        <mat-icon>block</mat-icon>
        <div>
          <strong>Conflicto con otras actividades no lectivas</strong>
          <ul>
            <li *ngFor="let c of conflictosOtrasActividades">{{ c }}</li>
          </ul>
        </div>
      </div>

      <div *ngIf="conflictosLectiva.length > 0" class="conflict-warning conflict-lectiva">
        <mat-icon>info</mat-icon>
        <div>
          <strong>Solapamiento con carga lectiva</strong>
          <p class="conflict-note">Debe corregir estos cruces antes de guardar la actividad:</p>
          <ul>
            <li *ngFor="let c of conflictosLectiva">{{ c }}</li>
          </ul>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cerrar()">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        type="button"
        (click)="guardar()"
        [disabled]="form.invalid || tieneDuplicados() || conflictosOtrasActividades.length > 0 || conflictosLectiva.length > 0 || excedeMaxHoras() || excedeHorasManual()"
      >
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
    .horario-header { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
    .horario-horas-label { font-size: 16px; }
    .manual-badge { font-size: 12px; color: #e65100; font-weight: 500; margin-left: 8px; }
    .manual-input-row { margin-bottom: 12px; }
    .manual-input-row mat-form-field { width: 120px; }
    .lectiva-panel {
      background: #e8eaf6;
      border: 1px solid #c5cae9;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }
    .lectiva-panel-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 13px;
      color: #283593;
      margin-bottom: 4px;
    }
    .lectiva-panel-title mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .lectiva-panel-hint { font-size: 11px; color: #5c6bc0; margin: 0 0 8px; }
    .lectiva-dias { display: flex; flex-direction: column; gap: 6px; }
    .lectiva-dia { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; }
    .lectiva-dia-label { min-width: 72px; font-weight: 600; color: #3949ab; }
    .lectiva-bloques { display: flex; flex-wrap: wrap; gap: 6px; }
    .lectiva-bloque {
      background: #fff;
      border: 1px solid #9fa8da;
      border-radius: 4px;
      padding: 2px 8px;
      color: #1a237e;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .lectiva-bloque small { color: #5c6bc0; font-weight: 600; }
    .horario-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .horario-table th { background: #f5f5f5; padding: 8px 6px; font-size: 12px; text-align: center; border: 1px solid #ddd; }
    .horario-table td { border: 1px solid #ddd; padding: 6px; text-align: center; vertical-align: middle; }
    .horas-calc { font-weight: 600; color: #6a1b9a; }
    .dia-select { padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 13px; width: 60px; text-align: center; }
    .time-input { width: 90px; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 13px; }
    .error-text-small { margin-top: 4px; }
    .error-line { color: #f44336; font-size: 12px; display: flex; align-items: center; gap: 4px; margin-top: 4px; }
    .error-line mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .row-error { background-color: #ffebee; }
    .row-alerts td { border-top: none; padding-top: 0; text-align: left; background: #fff8e1; }
    .fila-alerta {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 11px;
      color: #e65100;
      margin-bottom: 4px;
    }
    .fila-alerta mat-icon { font-size: 14px; width: 14px; height: 14px; margin-top: 1px; }
    .fila-alerta.alerta-lectiva { color: #1565c0; }
    .btn-add { margin-bottom: 12px; }
    .conflict-warning {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      margin-top: 8px;
    }
    .conflict-blocking { background: #ffebee; border: 1px solid #ffcdd2; color: #c62828; }
    .conflict-lectiva { background: #e3f2fd; border: 1px solid #bbdefb; color: #1565c0; }
    .conflict-warning ul { margin: 4px 0 0 16px; padding: 0; }
    .conflict-warning li { margin-bottom: 2px; }
    .conflict-note { margin: 4px 0; font-size: 11px; opacity: 0.9; }
    .max-badge { font-size: 13px; color: #666; margin-left: 4px; }
    .max-badge.excede-max { color: #c62828; font-weight: 600; }
    .excede-max { color: #c62828 !important; }
    .limit-error {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: #ffebee;
      border: 1px solid #ffcdd2;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      color: #c62828;
      font-size: 12px;
    }
    .limit-error mat-icon { font-size: 18px; width: 18px; height: 18px; margin-top: 1px; }
    .manual-excede { color: #c62828; font-size: 12px; font-weight: 600; margin-left: 8px; }
    `,
  ],
})
export class GestionarHorarioDialogComponent implements OnInit {
  dias = DIAS;
  conflictosOtrasActividades: string[] = [];
  conflictosLectiva: string[] = [];
  form!: FormGroup;
  normalizarHora = normalizarHora;

  get horariosFormArray(): FormArray {
    return this.form.get('horarios') as FormArray;
  }

  get horariosLectivosPorDia(): { dia: string; etiqueta: string; items: HorarioLectivoRef[] }[] {
    return DIAS_SEMANA.map((dia) => ({
      dia,
      etiqueta: DIA_CODIGO_A_ETIQUETA[dia] || dia,
      items: this.data.horariosLectivos.filter((h) => h.dia === dia),
    })).filter((g) => g.items.length > 0);
  }

  constructor(
    public dialogRef: MatDialogRef<GestionarHorarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GestionarHorarioData,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    if (!this.data.horariosLectivos) {
      this.data.horariosLectivos = [];
    } else {
      this.data.horariosLectivos = this.data.horariosLectivos.map((lec) => ({
        ...lec,
        dia: diaNumericoACodigo(lec.dia),
        hora_inicio: normalizarHora(lec.hora_inicio),
        hora_fin: normalizarHora(lec.hora_fin),
      }));
    }

    const horariosIniciales = this.data.horarios.map((h) => ({
      ...h,
      dia: diaNumericoACodigo(h.dia),
      hora_inicio: normalizarHora(h.hora_inicio),
      hora_fin: normalizarHora(h.hora_fin),
    }));

    this.form = this.fb.group({
      horarios: this.fb.array(
        horariosIniciales.map((h) => this.crearGrupoHorario(h)),
        [noSuperposicionValidator],
      ),
    });

    this.horariosFormArray.valueChanges.subscribe(() => {
      this.onHorarioChange();
    });

    this.validarConflictos();
  }

  private crearGrupoHorario(h: HorarioEntry): FormGroup {
    return this.fb.group(
      {
        dia: [h.dia, Validators.required],
        hora_inicio: [normalizarHora(h.hora_inicio), Validators.required],
        hora_fin: [normalizarHora(h.hora_fin), Validators.required],
      },
      { validators: horaValidaValidator },
    );
  }

  calcularHoras(h: HorarioEntry): number {
    if (!h.hora_inicio || !h.hora_fin) return 0;
    const [h1, m1] = h.hora_inicio.split(':').map(Number);
    const [h2, m2] = h.hora_fin.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    return Math.max(0, (h2 * 60 + m2 - h1 * 60 - m1) / 60);
  }

  calcularTotal(): number {
    return this.horariosFormArray.controls.reduce(
      (sum, grupo) => sum + this.calcularHoras(grupo.value),
      0,
    );
  }

  onToggleManual(): void {
    if (!this.data.horasManual) {
      this.data.horas = this.calcularTotal();
    }
  }

  onHorarioChange(): void {
    this.validarConflictos();
    if (!this.data.horasManual && (!this.data.horas || this.data.horas === 0)) {
      this.data.horas = this.calcularTotal();
    }
  }

  agregar(): void {
    const nuevo = { dia: 'LU', hora_inicio: '08:00', hora_fin: '10:00' };
    this.horariosFormArray.push(this.crearGrupoHorario(nuevo));
    this.onHorarioChange();

    const idx = this.horariosFormArray.length - 1;
    const alertas = this.getAlertasFila(idx);
    if (alertas.length > 0) {
      this.snackBar.open(alertas[0].mensaje, 'OK', { duration: 4000 });
    }
  }

  eliminar(i: number): void {
    this.horariosFormArray.removeAt(i);
    this.onHorarioChange();
  }

  tieneDuplicados(): boolean {
    const horarios = this.horariosFormArray.value as HorarioEntry[];
    for (let i = 0; i < horarios.length; i++) {
      for (let j = i + 1; j < horarios.length; j++) {
        if (esHorarioIdentico(horarios[i], horarios[j])) return true;
      }
    }
    return false;
  }

  hayHoraInvalida(): boolean {
    return this.horariosFormArray.controls.some((grupo) => grupo.hasError('horaInvalida'));
  }

  excedeMaxHoras(): boolean {
    if (this.data.maxHoras == null) return false;
    return this.calcularTotal() > this.data.maxHoras;
  }

  excedeHorasManual(): boolean {
    if (!this.data.horasManual || this.data.maxHoras == null) return false;
    return this.data.horas > this.data.maxHoras;
  }

  validarHorasManual(): void {
    if (this.data.horasManual && this.data.maxHoras != null && this.data.horas > this.data.maxHoras) {
      this.data.horas = this.data.maxHoras;
    }
  }

  private diaNormalizada(dia?: string): string {
    return diaNumericoACodigo(dia ?? '');
  }

  getAlertasFila(i: number): { tipo: 'interno' | 'lectiva'; mensaje: string }[] {
    const alertas: { tipo: 'interno' | 'lectiva'; mensaje: string }[] = [];
    const current = this.horariosFormArray.at(i)?.value as HorarioEntry;
    if (!current?.dia) return alertas;

    const currentDia = this.diaNormalizada(current.dia);
    const currentInicio = normalizarHora(current.hora_inicio);
    const currentFin = normalizarHora(current.hora_fin);
    const all = this.horariosFormArray.value as HorarioEntry[];

    for (let j = 0; j < all.length; j++) {
      if (i === j) continue;
      const other = all[j];
      const otherDia = this.diaNormalizada(other.dia);
      if (currentDia !== otherDia) continue;
      if (
        esHorarioIdentico(
          { dia: currentDia, hora_inicio: currentInicio, hora_fin: currentFin },
          { dia: otherDia, hora_inicio: normalizarHora(other.hora_inicio), hora_fin: normalizarHora(other.hora_fin) },
        )
      ) {
        alertas.push({
          tipo: 'interno',
          mensaje: 'Horario duplicado: ya existe el mismo día y rango horario en esta actividad',
        });
        break;
      }
      if (
        seSuperponen(
          currentInicio,
          currentFin,
          normalizarHora(other.hora_inicio),
          normalizarHora(other.hora_fin),
        )
      ) {
        alertas.push({
          tipo: 'interno',
          mensaje: `Se solapa con la fila ${j + 1} (${formatearBloqueHorario({ dia: otherDia, hora_inicio: normalizarHora(other.hora_inicio), hora_fin: normalizarHora(other.hora_fin) })})`,
        });
      }
    }

    for (const lec of this.data.horariosLectivos) {
      const lecDia = this.diaNormalizada(lec.dia);
      if (currentDia !== lecDia) continue;
      if (seSuperponen(currentInicio, currentFin, normalizarHora(lec.hora_inicio), normalizarHora(lec.hora_fin))) {
        const curso = lec.codigoCurso ? `${lec.codigoCurso} — ${lec.nombreCurso}` : lec.nombreCurso;
        alertas.push({
          tipo: 'lectiva',
          mensaje: `Carga lectiva ocupada: ${DIA_CODIGO_A_ETIQUETA[lecDia] || lecDia} ${normalizarHora(lec.hora_inicio)}-${normalizarHora(lec.hora_fin)} (${curso})`,
        });
      }
    }

    return alertas;
  }

  validarConflictos(): void {
    this.conflictosOtrasActividades = [];
    this.conflictosLectiva = [];
    const horariosActuales = this.horariosFormArray.value as HorarioEntry[];
    const filaConflictoLectiva = new Array(horariosActuales.length).fill(false);

    for (const otro of this.data.allHorarios) {
      if (otro.actividadId === this.data.actividadId) continue;
      const nombre = otro.actividadNombre ? `Rubro ${otro.actividadId}` : `Actividad ${otro.actividadId}`;
      for (const h1 of horariosActuales) {
        const h1Dia = this.diaNormalizada(h1.dia);
        const h1Inicio = normalizarHora(h1.hora_inicio);
        const h1Fin = normalizarHora(h1.hora_fin);
        for (const h2 of otro.horarios) {
          const h2Dia = this.diaNormalizada(h2.dia);
          if (h1Dia !== h2Dia) continue;
          if (seSuperponen(h1Inicio, h1Fin, normalizarHora(h2.hora_inicio), normalizarHora(h2.hora_fin))) {
            this.conflictosOtrasActividades.push(`${nombre}: ${formatearBloqueHorario({ dia: h2Dia, hora_inicio: normalizarHora(h2.hora_inicio), hora_fin: normalizarHora(h2.hora_fin) })}`);
          }
        }
      }
    }

    horariosActuales.forEach((h1, index) => {
      const h1Dia = this.diaNormalizada(h1.dia);
      const h1Inicio = normalizarHora(h1.hora_inicio);
      const h1Fin = normalizarHora(h1.hora_fin);
      for (const lec of this.data.horariosLectivos) {
        const lecDia = this.diaNormalizada(lec.dia);
        if (h1Dia !== lecDia) continue;
        if (seSuperponen(h1Inicio, h1Fin, normalizarHora(lec.hora_inicio), normalizarHora(lec.hora_fin))) {
          filaConflictoLectiva[index] = true;
          const curso = lec.codigoCurso ? `${lec.codigoCurso} (${lec.nombreCurso})` : lec.nombreCurso;
          this.conflictosLectiva.push(
            `${formatearBloqueHorario({ dia: h1Dia, hora_inicio: h1Inicio, hora_fin: h1Fin })} coincide con lectiva ${normalizarHora(lec.hora_inicio)}-${normalizarHora(lec.hora_fin)} — ${curso}`,
          );
        }
      }
    });

    this.horariosFormArray.controls.forEach((grupo, index) => {
      const group = grupo as FormGroup;
      const errors = { ...(group.errors || {}) } as Record<string, unknown>;
      if (filaConflictoLectiva[index]) {
        errors['conflictoLectiva'] = true;
      } else {
        delete errors['conflictoLectiva'];
      }
      group.setErrors(Object.keys(errors).length > 0 ? errors : null, { emitEvent: false });
    });

    if (this.conflictosLectiva.length > 0) {
      this.form.setErrors({ ...this.form.errors, solapamientoLectiva: true }, { emitEvent: false });
    } else {
      const errors = this.form.errors as Record<string, unknown> | null;
      if (errors) {
        const updatedErrors = { ...errors };
        delete updatedErrors['solapamientoLectiva'];
        this.form.setErrors(Object.keys(updatedErrors).length > 0 ? updatedErrors : null, { emitEvent: false });
      }
    }
  }

  guardar(): void {
    if (
      this.tieneDuplicados() ||
      this.conflictosOtrasActividades.length > 0 ||
      this.conflictosLectiva.length > 0
    ) return;

    this.data.horarios = (this.horariosFormArray.value as HorarioEntry[]).map((h) => ({
      dia: h.dia,
      hora_inicio: normalizarHora(h.hora_inicio),
      hora_fin: normalizarHora(h.hora_fin),
    }));
    
    const horasCalculadas = this.calcularTotal();
    
    // Validación: si horas es 0 pero hay horarios asignados, bloquear guardado
    if (this.data.horas === 0 && this.data.horarios.length > 0) {
      this.snackBar.open(
        `No puede guardar con horas en 0 si tiene horarios asignados. Los horarios suman ${horasCalculadas.toFixed(2)}h. Actualice las horas o elimine los horarios.`,
        'ENTENDIDO',
        {
          duration: 6000,
          panelClass: ['snackbar-error'],
        },
      );
      return;
    }
    
    // Validar que las horas coincidan con los horarios si no está en modo manual
    if (!this.data.horasManual && this.data.horas > 0) {
      if (Math.abs(this.data.horas - horasCalculadas) > 0.01) {
        const snackBarRef = this.snackBar.open(
          `Las horas ingresadas (${this.data.horas}h) no coinciden con los horarios asignados (${horasCalculadas.toFixed(2)}h). ¿Desea actualizar las horas automáticamente?`,
          'ACTUALIZAR',
          {
            duration: 6000,
            panelClass: ['snackbar-warning'],
          },
        );
        
        let dialogoCerrado = false;
        
        snackBarRef.onAction().subscribe(() => {
          if (!dialogoCerrado) {
            dialogoCerrado = true;
            this.data.horas = horasCalculadas;
            this.data.horasActualizadas = true;
            this.dialogRef.close(this.data);
          }
        });
        
        snackBarRef.afterDismissed().subscribe(() => {
          if (!dialogoCerrado) {
            dialogoCerrado = true;
            this.dialogRef.close(this.data);
          }
        });
        return;
      }
    } else if (!this.data.horasManual && (!this.data.horas || this.data.horas === 0)) {
      this.data.horas = horasCalculadas;
    }
    
    // Advertencia si hay horas pero no horarios
    if (this.data.horas > 0 && (!this.data.horarios || this.data.horarios.length === 0)) {
      this.snackBar.open(
        `Advertencia: Tiene ${this.data.horas}h asignadas pero no hay horarios registrados. Se recomienda asignar horarios.`,
        'ENTENDIDO',
        {
          duration: 5000,
          panelClass: ['snackbar-warning'],
        },
      );
    }
    
    this.dialogRef.close(this.data);
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }
}
