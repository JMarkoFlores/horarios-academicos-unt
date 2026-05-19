import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cola-atencion',
  templateUrl: './cola-atencion.component.html',
  styleUrls: ['./cola-atencion.component.scss']
})
export class ColaAtencionComponent implements OnChanges, OnDestroy {
  @Input() ventanaId!: string;
  @Output() docenteEnAtencion = new EventEmitter<any>();
  estadoCola: any = {};
  loading = false;
  private wsSub?: Subscription;
  private initialized = false;

  constructor(
    private api: ApiService,
    private socketService: SocketService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ventanaId'] && this.ventanaId) {
      if (!this.initialized) {
        this.inicializar();
      }
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
      } else {
        this.docenteEnAtencion.emit(null);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.ventanaId) {
      this.socketService.leaveVentana(this.ventanaId);
    }
    this.wsSub?.unsubscribe();
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
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  llamarSiguiente(): void {
    if (!this.ventanaId) return;
    this.loading = true;
    this.api.post<any>(`/ventanas/${this.ventanaId}/siguiente`, {}).subscribe({
      next: (r) => {
        this.estadoCola = r.data;
        this.loading = false;
        if (this.estadoCola?.en_atencion) {
          this.docenteEnAtencion.emit(this.estadoCola.en_atencion.docente);
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  marcarAusente(docenteId: number): void {
    if (!this.ventanaId) return;
    this.loading = true;
    this.api.post<any>(`/ventanas/${this.ventanaId}/ausente`, { docente_id: docenteId }).subscribe({
      next: (r) => {
        this.estadoCola = r.data;
        this.loading = false;
        if (!this.estadoCola?.en_atencion) {
          this.docenteEnAtencion.emit(null);
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
