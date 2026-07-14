import { Component, OnInit, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../../../core/services/api.service';
import { PeriodoService } from '../../../../../core/services/periodo.service';
import { DragDropScheduleComponent, DragDropScheduleData, HorarioEntry } from '../../../../declaraciones/dialogs/drag-drop-schedule.component';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface AsignarHorarioCargaLectivaData {
  asignacion: {
    id: number;
    docente: { id: number; nombres: string; apellidos: string; codigo: string };
    curso_plan: {
      curso: { id: number; codigo: string; nombre: string; ciclo: number };
    };
    tipo_clase: 'TEORIA' | 'PRACTICA' | 'LABORATORIO';
    seccion: string;
    horas_asignadas: number;
    nro_alumnos: number;
    grupo?: { id: number; codigo: string } | null;
  };
  horariosExistentes: any[];
}

@Component({
  selector: 'app-asignar-horario-carga-lectiva-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DragDropScheduleComponent,
  ],
  template: `
    <h2 mat-dialog-title>Asignar Horario - {{ data.asignacion.curso_plan.curso.nombre }}</h2>
    <mat-dialog-content>
      <div class="info-asignacion">
        <div class="info-item">
          <strong>Docente:</strong> {{ data.asignacion.docente.apellidos }}, {{ data.asignacion.docente.nombres }}
        </div>
        <div class="info-item">
          <strong>Código:</strong> {{ data.asignacion.curso_plan.curso.codigo }}
        </div>
        <div class="info-item">
          <strong>Tipo:</strong> {{ data.asignacion.tipo_clase }}
        </div>
        <div class="info-item">
          <strong>Sección:</strong> {{ data.asignacion.seccion }}
        </div>
        <div class="info-item">
          <strong>Horas requeridas:</strong> {{ data.asignacion.horas_asignadas }}h
        </div>
        <div class="info-item">
          <strong>Alumnos:</strong> {{ data.asignacion.nro_alumnos }}
        </div>
      </div>

      <div *ngIf="loading; else scheduleContent" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Cargando horarios existentes...</p>
      </div>

      <ng-template #scheduleContent>
        <!-- Panel de errores de validación -->
        <div *ngIf="erroresValidacion.length > 0" class="errores-panel" role="alert" aria-live="polite">
          <mat-icon class="error-icon" aria-hidden="true">error</mat-icon>
          <div class="errores-list">
            <strong>Errores de validación:</strong>
            <ul>
              <li *ngFor="let error of erroresValidacion">{{ error }}</li>
            </ul>
          </div>
        </div>

        <!-- Selector de ambiente por defecto para nuevos bloques -->
        <div class="ambiente-selector">
          <label for="ambiente-select" id="ambiente-label">Ambiente para nuevos bloques:</label>
          <select 
            id="ambiente-select" 
            (change)="onAmbienteChange($event)"
            aria-labelledby="ambiente-label"
            class="ambiente-select"
          >
            <option value="">-- Seleccionar ambiente --</option>
            <option *ngFor="let amb of ambientesDisponibles" [value]="amb.id" [selected]="ambienteSeleccionado === amb.id">
              {{ amb.codigo }} - {{ amb.nombre }} (Cap: {{ amb.capacidad }})
            </option>
          </select>
          <small *ngIf="!ambienteSeleccionado" class="warning-text">
            Se asignará el primer ambiente disponible si no seleccionas uno.
          </small>
        </div>

        <app-drag-drop-schedule
          [data]="dragDropData"
          [puedeEditar]="true"
          (horariosChange)="onHorariosChange($event)"
        ></app-drag-drop-schedule>
      </ng-template>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button 
        mat-button 
        (click)="cerrar()"
        aria-label="Cancelar y cerrar el diálogo"
        tabindex="2"
      >Cancelar</button>
      <button 
        mat-raised-button 
        color="primary" 
        (click)="guardar()"
        [disabled]="!tieneCambios || guardando"
        aria-label="Guardar horarios asignados"
        tabindex="1"
      >
        <mat-icon *ngIf="guardando" class="spinner-icon" aria-hidden="true">refresh</mat-icon>
        {{ guardando ? 'Guardando...' : 'Guardar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .info-asignacion {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .info-item {
      font-size: 14px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 15px;
    }

    .spinner-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .errores-panel {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      background: #fee2e2;
      border-left: 4px solid #dc2626;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .error-icon {
      color: #dc2626;
      font-size: 20px;
    }
    .errores-list {
      flex: 1;
      font-size: 13px;
      color: #991b1b;
    }
    .errores-list ul {
      margin: 8px 0 0 0;
      padding-left: 20px;
    }
    .errores-list li {
      margin: 4px 0;
    }

    .ambiente-selector {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 20px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      border: 1px solid #e9ecef;
    }

    .ambiente-selector label {
      font-weight: 500;
      font-size: 14px;
      color: #495057;
    }

    .ambiente-select {
      padding: 8px 12px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 14px;
      background-color: white;
      cursor: pointer;
    }

    .ambiente-select:focus {
      outline: 2px solid #1971c2;
      outline-offset: 2px;
      border-color: #1971c2;
    }

    .warning-text {
      color: #856404;
      font-size: 12px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 15px;
    }

    .spinner-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
})
export class AsignarHorarioCargaLectivaDialogComponent implements OnInit {
  dragDropData: DragDropScheduleData = {
    actividadId: 0,
    actividadNombre: '',
    horarios: [],
    horas: 0,
    maxHoras: 0,
    horariosLectivos: [],
    allActividades: [],
  };
  horariosNuevos: HorarioEntry[] = [];
  guardando = false;
  loading = false;
  tieneCambios = false;
  erroresValidacion: string[] = [];
  ambientesDisponibles: any[] = [];
  ambienteSeleccionado: number | null = null;

  public dialogRef = inject(MatDialogRef<AsignarHorarioCargaLectivaDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);
  private api = inject(ApiService);
  private periodoService = inject(PeriodoService);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    // Validar que la asignación tenga grupo
    if (!this.data.asignacion.grupo || !this.data.asignacion.grupo.id) {
      this.snackBar.open(
        'La asignación no tiene grupo asignado. No se puede crear horario.',
        'error',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
      this.dialogRef.close(null);
      return;
    }

    this.cargarAmbientes();
    this.inicializarDragDropData();

    // Manejo de teclado para accesibilidad
    this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        this.cerrar();
      }
      if (event.key === 'Enter' && !this.guardando && this.tieneCambios && this.erroresValidacion.length === 0) {
        this.guardar();
      }
    });
  }

  async cargarAmbientes(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.api.get<any>('/ambientes', { limit: 100 }).toPromise();
      this.ambientesDisponibles = response.data?.items || response.data || [];
    } catch (error) {
      this.snackBar.open('Error al cargar ambientes', 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  inicializarDragDropData(): void {
    const horariosConMetadata = this.data.horariosExistentes.map((h: any) => ({
      id: this.generarUuid(),
      horarioId: h.id,
      dia: this.diaNumeroACodigo(h.dia),
      hora_inicio: h.hora_inicio.substring(0, 5),
      hora_fin: h.hora_fin.substring(0, 5),
      ambiente_id: h.ambiente.id,
    }));

    this.dragDropData = {
      actividadId: this.data.asignacion.id,
      actividadNombre: `${this.data.asignacion.curso_plan.curso.codigo} - ${this.data.asignacion.tipo_clase}`,
      horarios: horariosConMetadata,
      horas: this.data.asignacion.horas_asignadas,
      maxHoras: this.data.asignacion.horas_asignadas,
      horariosLectivos: [], // Se cargará dinámicamente si es necesario
      allActividades: [],
    };
  }

  onHorariosChange(horarios: HorarioEntry[]): void {
    // Usar el ambiente seleccionado por el usuario, o el primero disponible como fallback
    const ambientePorDefecto = this.ambienteSeleccionado 
      ? this.ambienteSeleccionado 
      : (this.ambientesDisponibles.length > 0 ? this.ambientesDisponibles[0].id : null);

    // Preservar metadata de bloques existentes
    this.dragDropData.horarios = horarios.map((h, index) => {
      const bloqueExistente = this.dragDropData.horarios[index];
      if (bloqueExistente) {
        return {
          ...h,
          id: bloqueExistente.id || this.generarUuid(),
          horarioId: bloqueExistente.horarioId,
          ambiente_id: bloqueExistente.ambiente_id || ambientePorDefecto,
        };
      }
      return {
        ...h,
        id: this.generarUuid(),
        horarioId: undefined,
        ambiente_id: ambientePorDefecto,
      };
    });
    this.tieneCambios = true;
    
    // Validar en tiempo real (debounce para no saturar)
    this.validarHorarios();
  }

  private validarHorarios(): void {
    // Validación básica de superposición entre bloques
    const errores: string[] = [];
    
    for (let i = 0; i < this.dragDropData.horarios.length; i++) {
      for (let j = i + 1; j < this.dragDropData.horarios.length; j++) {
        const a = this.dragDropData.horarios[i];
        const b = this.dragDropData.horarios[j];
        
        if (this.seSuperponen(a.dia, a.hora_inicio, a.hora_fin, b.dia, b.hora_inicio, b.hora_fin)) {
          errores.push(`Conflicto: ${a.dia} ${a.hora_inicio}-${a.hora_fin} con ${b.dia} ${b.hora_inicio}-${b.hora_fin}`);
        }
      }
    }
    
    this.erroresValidacion = errores;
  }

  private seSuperponen(dia1: string, ini1: string, fin1: string, dia2: string, ini2: string, fin2: string): boolean {
    if (dia1 !== dia2) return false;
    return ini1 < fin2 && fin1 > ini2;
  }

  onAmbienteChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.ambienteSeleccionado = select.value ? Number(select.value) : null;
  }

  async guardar(): Promise<void> {
    this.guardando = true;

    try {
      // Validar errores de validación
      if (this.erroresValidacion.length > 0) {
        this.snackBar.open(
          'Corrija los errores antes de guardar: ' + this.erroresValidacion[0],
          'error',
          { duration: 5000, panelClass: ['error-snackbar'] }
        );
        return;
      }

      // Validar que todos los bloques tengan ambiente_id
      const bloquesSinAmbiente = this.dragDropData.horarios.filter(h => !h.ambiente_id);
      if (bloquesSinAmbiente.length > 0) {
        this.snackBar.open(
          'Todos los bloques deben tener un ambiente asignado antes de guardar.',
          'error',
          { duration: 5000, panelClass: ['error-snackbar'] }
        );
        return;
      }

      // Preparar payload batch
      const payload = {
        asignacion_lectiva_id: this.data.asignacion.id,
        bloques: this.dragDropData.horarios.map(h => ({
          horario_id: h.horarioId,
          ambiente_id: h.ambiente_id,
          dia: this.diaCodigoANumero(h.dia),
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
          operacion: h.horarioId ? 'UPDATE' : 'CREATE',
        })),
      };

      await this.api.post('/horarios/carga-lectiva/guardar-batch', payload).toPromise();

      this.snackBar.open('Horarios guardados correctamente', 'OK', { duration: 3000 });
      this.dialogRef.close(true);

    } catch (error: any) {
      this.snackBar.open(error?.error?.message || 'Error al guardar', 'Cerrar', { duration: 4000 });
    } finally {
      this.guardando = false;
    }
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }

  private diaNumeroACodigo(dia: number): string {
    const codigos = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
    return codigos[dia] || 'LU';
  }

  private diaCodigoANumero(codigo: string): number {
    const codigos: Record<string, number> = { 'DO': 0, 'LU': 1, 'MA': 2, 'MI': 3, 'JU': 4, 'VI': 5, 'SA': 6 };
    return codigos[codigo] || 1;
  }

  private generarUuid(): string {
    return 'bloque-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}
