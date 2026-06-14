import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { Subscription, interval } from 'rxjs';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-cola-atencion',
  templateUrl: './cola-atencion.component.html',
  styleUrls: ['./cola-atencion.component.scss']
})
export class ColaAtencionComponent implements OnChanges, OnDestroy, OnInit {
  @Input() ventanaId!: string;
  @Output() docenteEnAtencion = new EventEmitter<any>();
  estadoCola: any = {};
  loading = false;
  private wsSub?: Subscription;
  private initialized = false;
  ventana: any = null;
  temporizador: any = null;
  segundosRestantes: number = 0;
  intervaloMinutos: number = 15;

  constructor(
    private api: ApiService,
    private socketService: SocketService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargarVentana();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ventanaId'] && this.ventanaId) {
      if (!this.initialized) {
        this.inicializar();
      }
      this.cargarVentana();
      this.cargarCola();
    }
  }

  private inicializar(): void {
    this.initialized = true;
    this.socketService.connect();
    this.socketService.joinVentana(this.ventanaId);
    this.wsSub = this.socketService.cola$.subscribe((data) => {
      this.estadoCola = data;
      if (data?.en_atencion) {
        this.docenteEnAtencion.emit(data.en_atencion.docente);
        this.iniciarTemporizador();
      } else {
        this.docenteEnAtencion.emit(null);
        this.detenerTemporizador();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.ventanaId) {
      this.socketService.leaveVentana(this.ventanaId);
    }
    this.wsSub?.unsubscribe();
    this.detenerTemporizador();
  }

  private cargarVentana(): void {
    if (!this.ventanaId) return;
    this.api.get<any>(`/ventanas/${this.ventanaId}`).subscribe({
      next: (r) => {
        this.ventana = r.data;
        this.intervaloMinutos = this.ventana?.intervalo_minutos || 15;
      }
    });
  }

  cargarCola(): void {
    if (!this.ventanaId) return;
    this.loading = true;
    this.api.get<any>(`/ventanas/${this.ventanaId}/cola`).subscribe({
      next: (r) => {
        this.estadoCola = r.data || {};
        this.loading = false;
        if (this.estadoCola?.en_atencion) {
          this.docenteEnAtencion.emit(this.estadoCola.en_atencion.docente);
          this.iniciarTemporizador();
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private iniciarTemporizador(): void {
    this.detenerTemporizador();
    this.segundosRestantes = this.intervaloMinutos * 60;
    this.temporizador = interval(1000).subscribe(() => {
      this.segundosRestantes--;
      if (this.segundosRestantes <= 0) {
        this.detenerTemporizador();
        this.llamarSiguiente();
      }
    });
  }

  private detenerTemporizador(): void {
    if (this.temporizador) {
      this.temporizador.unsubscribe();
      this.temporizador = null;
    }
  }

  get formatearTiempo(): string {
    const minutos = Math.floor(this.segundosRestantes / 60);
    const segundos = this.segundosRestantes % 60;
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }

  llamarSiguiente(): void {
    if (!this.ventanaId) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Llamar Siguiente',
        message: '¿Llamar al siguiente docente en la cola?',
        detail: 'El docente actual pasará al final de la cola si no ha sido atendido.',
        confirmLabel: 'Llamar',
        confirmColor: 'primary',
        icon: 'skip_next',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.loading = true;
      this.detenerTemporizador();
      this.api.post<any>(`/ventanas/${this.ventanaId}/siguiente`, {}).subscribe({
        next: (r) => {
          this.estadoCola = r.data;
          this.loading = false;
          if (this.estadoCola?.en_atencion) {
            this.docenteEnAtencion.emit(this.estadoCola.en_atencion.docente);
            this.iniciarTemporizador();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snack.open(err?.error?.message || 'Error al llamar al siguiente docente', 'Cerrar', { duration: 3000 });
        }
      });
    });
  }

  marcarAusente(docenteId: number): void {
    if (!this.ventanaId) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Marcar como Ausente',
        message: '¿Marcar a este docente como ausente?',
        detail: 'Se registrará la inasistencia y se llamará al siguiente en la cola.',
        confirmLabel: 'Ausente',
        confirmColor: 'warn',
        icon: 'person_off',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.loading = true;
      this.detenerTemporizador();
      this.api.post<any>(`/ventanas/${this.ventanaId}/ausente`, { docente_id: docenteId }).subscribe({
        next: (r) => {
          this.estadoCola = r.data;
          this.loading = false;
          if (!this.estadoCola?.en_atencion) {
            this.docenteEnAtencion.emit(null);
          } else {
            this.iniciarTemporizador();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snack.open(err?.error?.message || 'Error al marcar ausente', 'Cerrar', { duration: 3000 });
        }
      });
    });
  }
}
