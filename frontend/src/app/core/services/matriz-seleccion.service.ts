import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { SocketService } from './socket.service';

export interface CeldaSeleccionada {
  dia: number;
  horaInicio: string;
  horaFin: string;
  docenteId?: number;
  cursoId?: number;
  grupoId?: number;
  ambienteId?: number;
  tipoClase?: string;
  periodo?: string;
}

export interface LockStatus {
  ambienteId: number;
  dia: number;
  horaInicio: string;
  periodo: string;
  sesionId?: string;
  operadorNombre?: string;
}

export interface ValidationFeedback {
  valido: boolean;
  reglasFallidas: { codigo: string; motivo: string }[];
  advertencias: { codigo: string; mensaje: string }[];
  sugerencias: { codigo: string; sugerencia: string }[];
  alternativas?: Array<{
    tipo: 'ambiente' | 'bloque';
    id: number;
    descripcion: string;
    preferencia: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class MatrizSeleccionService {
  private seleccionesSubject = new BehaviorSubject<CeldaSeleccionada[]>([]);
  selecciones$ = this.seleccionesSubject.asObservable();

  private validationSubject = new BehaviorSubject<ValidationFeedback | null>(null);
  validation$ = this.validationSubject.asObservable();

  private locksSubject = new BehaviorSubject<LockStatus[]>([]);
  locks$ = this.locksSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  constructor(
    private api: ApiService,
    private socket: SocketService,
  ) {
    this.listenToSocketEvents();
  }

  /**
   * Add a selection to the temporary list
   */
  addSeleccion(celda: CeldaSeleccionada): void {
    const actuales = this.seleccionesSubject.value;
    const existe = actuales.some(
      (s) => s.dia === celda.dia && s.horaInicio === celda.horaInicio,
    );

    if (!existe) {
      this.seleccionesSubject.next([...actuales, celda]);
    }
  }

  /**
   * Remove a selection from the temporary list
   */
  removeSeleccion(dia: number, horaInicio: string): void {
    const actuales = this.seleccionesSubject.value;
    const filtradas = actuales.filter(
      (s) => !(s.dia === dia && s.horaInicio === horaInicio),
    );
    this.seleccionesSubject.next(filtradas);
  }

  /**
   * Clear all selections
   */
  clearSelecciones(): void {
    this.seleccionesSubject.next([]);
  }

  /**
   * Get current selections
   */
  getSelecciones(): CeldaSeleccionada[] {
    return this.seleccionesSubject.value;
  }

  /**
   * Validate a cell selection through backend
   */
  async validarSeleccion(
    ventanaId: string,
    dto: Partial<CeldaSeleccionada>,
  ): Promise<ValidationFeedback> {
    try {
      this.loadingSubject.next(true);

      const response = await this.api
        .post<{
          data: ValidationFeedback;
        }>(`/ventanas/${ventanaId}/validar-seleccion`, dto)
        .toPromise();

      const validation = response?.data || {
        valido: true,
        reglasFallidas: [],
        advertencias: [],
        sugerencias: [],
      };

      this.validationSubject.next(validation);
      return validation;
    } catch (error) {
      const fallback: ValidationFeedback = {
        valido: false,
        reglasFallidas: [
          {
            codigo: 'ERROR_VALIDACION',
            motivo: 'Error al validar la selección',
          },
        ],
        advertencias: [],
        sugerencias: [],
      };

      this.validationSubject.next(fallback);
      return fallback;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Get current lock status for a cell
   */
  async obtenerLockStatus(
    ambienteId: number,
    dia: number,
    horaInicio: string,
    periodo: string,
  ): Promise<LockStatus | null> {
    try {
      const locks = this.locksSubject.value;
      return (
        locks.find(
          (l) =>
            l.ambienteId === ambienteId &&
            l.dia === dia &&
            l.horaInicio === horaInicio &&
            l.periodo === periodo,
        ) || null
      );
    } catch (error) {
      return null;
    }
  }

  /**
   * Get last validation result
   */
  getLastValidation(): ValidationFeedback | null {
    return this.validationSubject.value;
  }

  /**
   * Listen to real-time socket events
   */
  private listenToSocketEvents(): void {
    // Cell selected by another operator
    this.socket.celdaSeleccionada$?.subscribe((event: any) => {
      if (event?.locks) {
        const nuevoLocks = event.locks.map((lock: any) => ({
          ambienteId: lock.ambiente_id,
          dia: lock.dia,
          horaInicio: lock.hora_inicio,
          periodo: lock.periodo,
          sesionId: lock.sesion_id,
          operadorNombre: lock.operador_nombre,
        }));
        this.locksSubject.next(nuevoLocks);
      }
    });

    // Cell deselected / lock released
    this.socket.celdaLiberada$?.subscribe((event: any) => {
      if (event?.ambienteId && event?.dia && event?.horaInicio) {
        const locksActuales = this.locksSubject.value;
        const filtrados = locksActuales.filter(
          (l) =>
            !(
              l.ambienteId === event.ambienteId &&
              l.dia === event.dia &&
              l.horaInicio === event.horaInicio &&
              l.periodo === event.periodo
            ),
        );
        this.locksSubject.next(filtrados);
      }
    });

    // Validation feedback
    this.socket.validacionFallida$?.subscribe((event: any) => {
      if (event?.validation) {
        this.validationSubject.next(event.validation);
      }
    });
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.seleccionesSubject.next([]);
    this.validationSubject.next(null);
    this.locksSubject.next([]);
    this.loadingSubject.next(false);
  }
}
