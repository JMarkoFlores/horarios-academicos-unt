import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket!: Socket;

  cola$ = new Subject<any>();
  celdaSeleccionada$ = new Subject<any>();
  celdaLiberada$ = new Subject<any>();
  horarioConfirmado$ = new Subject<any>();
  ventanaCompletada$ = new Subject<any>();

  constructor(private authService: AuthService) {}

  connect(): void {
    if (this.socket?.connected) return;
    const token = this.authService.getToken();
    this.socket = io(`${environment.apiUrl}/horarios`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('cola_actualizada', (data: any) => this.cola$.next(data));
    this.socket.on('celda_seleccionada', (data: any) => this.celdaSeleccionada$.next(data));
    this.socket.on('celda_liberada', (data: any) => this.celdaLiberada$.next(data));
    this.socket.on('horario_confirmado', (data: any) => this.horarioConfirmado$.next(data));
    this.socket.on('ventana_completada', (data: any) => this.ventanaCompletada$.next(data));
  }

  joinVentana(ventanaId: string): void {
    this.socket?.emit('join_ventana', { ventanaId });
  }

  leaveVentana(ventanaId: string): void {
    this.socket?.emit('leave_ventana', { ventanaId });
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
