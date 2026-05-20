import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

export interface CeldaMatriz {
  dia: number;
  horaInicio: string;
  horaFin: string;
  estado: string;
  metadata?: any;
}

@Component({
  selector: 'app-grilla-horarios',
  templateUrl: './grilla-horarios.component.html',
  styleUrl: './grilla-horarios.component.scss'
})
export class GrillaHorariosComponent implements OnInit, OnChanges, OnDestroy {
  @Input() ventanaId!: string;
  @Input() ambienteId!: number;
  @Input() sesionId!: string;
  @Input() docenteId!: number;
  @Input() cursoId!: number;
  @Input() tipoClase!: string;
  @Input() periodo!: string;
  @Output() seleccionCambiada = new EventEmitter<void>();

  matriz: CeldaMatriz[] = [];
  horas: string[] = [];
  dias = [
    { valor: 1, label: 'Lun' },
    { valor: 2, label: 'Mar' },
    { valor: 3, label: 'Mié' },
    { valor: 4, label: 'Jue' },
    { valor: 5, label: 'Vie' },
    { valor: 6, label: 'Sáb' },
  ];
  loading = false;

  private celdaSeleccionadaSub?: Subscription;
  private celdaLiberadaSub?: Subscription;

  constructor(
    private api: ApiService,
    private socketService: SocketService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.horas = [];
    for (let h = 7; h <= 21; h++) {
      this.horas.push(`${h.toString().padStart(2, '0')}:00`);
    }
    this.socketService.connect();
    this.socketService.joinVentana(this.ventanaId);
    this.celdaSeleccionadaSub = this.socketService.celdaSeleccionada$.subscribe(() => {
      this.cargarMatriz();
    });
    this.celdaLiberadaSub = this.socketService.celdaLiberada$.subscribe(() => {
      this.cargarMatriz();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ambienteId'] && this.ambienteId) {
      this.cargarMatriz();
    }
  }

  ngOnDestroy(): void {
    this.socketService.leaveVentana(this.ventanaId);
    this.celdaSeleccionadaSub?.unsubscribe();
    this.celdaLiberadaSub?.unsubscribe();
  }

  cargarMatriz(): void {
    if (!this.ambienteId || !this.ventanaId) return;
    this.loading = true;
    this.api.get<any>(`/ventanas/${this.ventanaId}/disponibilidad-matriz`, {
      ambiente_id: this.ambienteId,
      sesionId: this.sesionId
    }).subscribe({
      next: (r) => {
        this.matriz = r.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error al cargar disponibilidad', 'Error', { duration: 3000 });
      }
    });
  }

  getCelda(dia: number, hora: string): CeldaMatriz | undefined {
    return this.matriz.find(c => c.dia === dia && c.horaInicio === hora);
  }

  async onCeldaClick(dia: number, hora: string): Promise<void> {
    const celda = this.getCelda(dia, hora);
    if (!celda) return;

    const horaFin = `${(parseInt(hora.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`;

    if (celda.estado === 'TEMPORAL_PROPIO') {
      // Deseleccionar
      this.api.post<any>(`/ventanas/${this.ventanaId}/celda/deseleccionar`, {
        sesionId: this.sesionId,
        ambienteId: this.ambienteId,
        dia,
        horaInicio: hora,
        periodo: this.periodo
      }).subscribe({
        next: () => {
          this.seleccionCambiada.emit();
          this.cargarMatriz();
        },
        error: (err) => {
          this.snack.open(err.error?.message || 'Error al liberar celda', 'Error', { duration: 3000 });
        }
      });
      return;
    }

    if (celda.estado !== 'LIBRE') {
      return;
    }

    // Seleccionar
    this.api.post<any>(`/ventanas/${this.ventanaId}/celda`, {
      ventanaId: this.ventanaId,
      sesionId: this.sesionId,
      docenteId: this.docenteId,
      cursoId: this.cursoId,
      tipoClase: this.tipoClase,
      ambienteId: this.ambienteId,
      dia,
      horaInicio: hora,
      horaFin: horaFin,
      periodo: this.periodo
    }).subscribe({
      next: (r) => {
        if (r.data?.exito) {
          this.snack.open('Celda seleccionada', 'OK', { duration: 2000 });
          this.seleccionCambiada.emit();
          this.cargarMatriz();
        } else {
          const msg = r.data?.motivo || 'No se pudo seleccionar la celda';
          if (r.data?.alternativas?.length) {
            const nombres = r.data.alternativas.map((a: any) => a.codigo).join(', ');
            this.snack.open(`${msg}. Alternativas: ${nombres}`, 'Cerrar', { duration: 6000 });
          } else {
            this.snack.open(msg, 'Cerrar', { duration: 4000 });
          }
        }
      },
      error: (err) => {
        this.snack.open(err.error?.message || 'Error al seleccionar celda', 'Error', { duration: 3000 });
      }
    });
  }

  getClaseCelda(celda: CeldaMatriz | undefined): string {
    if (!celda) return '';
    switch (celda.estado) {
      case 'LIBRE': return 'celda-libre';
      case 'BLOQUEADO': return 'celda-bloqueada';
      case 'CONFIRMADO': return 'celda-confirmada';
      case 'TEMPORAL_OTRO': return 'celda-temporal-otro';
      case 'TEMPORAL_PROPIO': return 'celda-temporal-propio';
      default: return '';
    }
  }

  getTooltipCelda(celda: CeldaMatriz | undefined): string {
    if (!celda) return '';
    switch (celda.estado) {
      case 'LIBRE': return 'Disponible — Haz clic para seleccionar';
      case 'BLOQUEADO': return 'Fuera de franja institucional o restricción';
      case 'CONFIRMADO':
        const docente = celda.metadata?.docenteNombre || `Docente ${celda.metadata?.docenteId || ''}`;
        const curso = celda.metadata?.cursoNombre || '';
        return `Ocupado: ${docente}${curso ? ' — ' + curso : ''}`;
      case 'TEMPORAL_OTRO': return 'Reservado temporalmente por otro operador';
      case 'TEMPORAL_PROPIO': return 'Tu selección temporal — Haz clic para quitar';
      default: return '';
    }
  }
}
