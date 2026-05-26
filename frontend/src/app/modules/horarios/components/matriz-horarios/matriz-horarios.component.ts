import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { SocketService } from '../../../../core/services/socket.service';
import { NotifToastService } from '../../../../core/services/notif-toast.service';

export interface CeldaSeleccionada {
  dia: number;
  horaInicio: string;
  horaFin: string;
}

export interface ValidationFeedback {
  valido: boolean;
  reglasFallidas: { codigo: string; motivo: string }[];
  advertencias: { codigo: string; mensaje: string }[];
  sugerencias: { codigo: string; sugerencia: string }[];
}

export interface CeldaMatriz {
  dia: number;
  horaInicio: string;
  horaFin: string;
  estado: 'LIBRE' | 'OCUPADO' | 'TEMPORAL_PROPIO' | 'TEMPORAL_OTRO' | 'BLOQUEADO';
  lockStatus?: 'LOCKED' | 'AVAILABLE' | 'LOCKED_BY_OTHER';
  validationResult?: ValidationFeedback;
  metadata?: {
    docenteNombre?: string;
    cursoNombre?: string;
    grupo?: string;
    ambienteCodigo?: string;
  };
}

@Component({
  selector: 'app-matriz-horarios',
  templateUrl: './matriz-horarios.component.html',
  styleUrls: ['./matriz-horarios.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatrizHorariosComponent implements OnInit, OnDestroy {
  @Input() periodo!: string;
  @Input() ventanaId?: string;
  @Input() ambientes?: number[];
  @Input() viewMode: 'editable' | 'readonly' = 'editable';
  @Input() showValidationStatus = true;

  @Output() cellSelected = new EventEmitter<CeldaSeleccionada>();
  @Output() cellDeselected = new EventEmitter<{ dia: number; horaInicio: string }>();
  @Output() validationStatusChanged = new EventEmitter<ValidationFeedback>();

  horas: string[] = [];
  diasSemana = [
    { valor: 1, label: 'Lun' },
    { valor: 2, label: 'Mar' },
    { valor: 3, label: 'Mié' },
    { valor: 4, label: 'Jue' },
    { valor: 5, label: 'Vie' },
    { valor: 6, label: 'Sáb' },
  ];

  matriz: Map<string, CeldaMatriz> = new Map();
  lastValidation: ValidationFeedback | null = null;
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiService,
    private socketService: SocketService,
    private notif: NotifToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.generarHoras();
    this.cargarMatriz();
  }

  private generarHoras(): void {
    for (let h = 7; h <= 21; h++) {
      this.horas.push(`${h.toString().padStart(2, '0')}:00`);
    }
  }

  private cargarMatriz(): void {
    if (!this.periodo) {
      this.notif.error('Período no especificado');
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    const params: Record<string, string | number> = {
      periodo: this.periodo,
    };

    if (this.ambientes?.length) {
      params['ambientes'] = this.ambientes.join(',');
    }

    this.api
      .get<{ data: CeldaMatriz[] }>('/horarios/matriz-disponibilidad', params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.matriz.clear();
          response.data.forEach((celda) => {
            const clave = `${celda.dia}_${celda.horaInicio}`;
            this.matriz.set(clave, celda);
          });
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.notif.error(err.error?.message || 'Error cargando disponibilidad');
          this.cdr.markForCheck();
        },
      });
  }

  onCeldaClick(dia: number, hora: string): void {
    if (this.viewMode !== 'editable') return;

    const clave = `${dia}_${hora}`;
    const celda = this.matriz.get(clave);

    if (!celda) return;

    if (celda.estado === 'OCUPADO' || celda.estado === 'BLOQUEADO' || celda.estado === 'TEMPORAL_OTRO') {
      return;
    }

    if (celda.estado === 'TEMPORAL_PROPIO') {
      this.cellDeselected.emit({ dia, horaInicio: hora });
      return;
    }

    // Estado LIBRE
    const horaFin = this.calcularHoraFin(hora);
    this.cellSelected.emit({
      dia,
      horaInicio: hora,
      horaFin,
    });
  }

  private calcularHoraFin(horaInicio: string): string {
    const [h, m] = horaInicio.split(':').map(Number);
    const proximaHora = h + 1;
    return `${proximaHora.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  getCeldaClase(dia: number, hora: string): string {
    const clave = `${dia}_${hora}`;
    const celda = this.matriz.get(clave);

    if (!celda) return 'libre';

    switch (celda.estado) {
      case 'LIBRE':
        return 'libre';
      case 'OCUPADO':
        return 'ocupado';
      case 'TEMPORAL_PROPIO':
        return 'temporal-propio';
      case 'TEMPORAL_OTRO':
        return 'temporal-otro';
      case 'BLOQUEADO':
        return 'bloqueado';
      default:
        return 'libre';
    }
  }

  hasIcon(dia: number, hora: string): boolean {
    const clave = `${dia}_${hora}`;
    const celda = this.matriz.get(clave);

    if (!celda) return false;

    return (
      celda.estado === 'OCUPADO' ||
      celda.estado === 'TEMPORAL_PROPIO' ||
      celda.estado === 'TEMPORAL_OTRO' ||
      celda.estado === 'BLOQUEADO'
    );
  }

  getIcon(dia: number, hora: string): string {
    const clave = `${dia}_${hora}`;
    const celda = this.matriz.get(clave);

    if (!celda) return '';

    switch (celda.estado) {
      case 'TEMPORAL_PROPIO':
        return 'check';
      case 'OCUPADO':
      case 'TEMPORAL_OTRO':
        return 'lock';
      case 'BLOQUEADO':
        return 'block';
      default:
        return '';
    }
  }

  getTooltip(dia: number, hora: string): string {
    const clave = `${dia}_${hora}`;
    const celda = this.matriz.get(clave);

    if (!celda) return 'Disponible — Haz clic para seleccionar';

    switch (celda.estado) {
      case 'LIBRE':
        return 'Disponible — Haz clic para seleccionar';
      case 'OCUPADO':
        const docente = celda.metadata?.docenteNombre || 'Docente';
        const curso = celda.metadata?.cursoNombre || 'Curso';
        return `Ocupado: ${docente} — ${curso}`;
      case 'TEMPORAL_PROPIO':
        return 'Tu selección temporal — Haz clic para quitar';
      case 'TEMPORAL_OTRO':
        return 'Reservado temporalmente por otro operador';
      case 'BLOQUEADO':
        return 'Bloqueado por restricción institucional';
      default:
        return '';
    }
  }

  shouldShowLabel(dia: number, hora: string): boolean {
    const clave = `${dia}_${hora}`;
    const celda = this.matriz.get(clave);

    if (!celda) return false;
    if (celda.estado === 'OCUPADO') return true;
    if (celda.metadata?.docenteNombre) return true;

    return false;
  }

  getLabel(dia: number, hora: string): string {
    const clave = `${dia}_${hora}`;
    const celda = this.matriz.get(clave);

    if (!celda) return '';

    return celda.metadata?.docenteNombre || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
