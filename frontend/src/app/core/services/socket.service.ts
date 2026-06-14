import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket!: Socket;
  private dashSocket!: Socket;
  connected = signal(false);
  dashboardConnected = signal(false);

  cola$ = new Subject<any>();
  celdaSeleccionada$ = new Subject<any>();
  celdaLiberada$ = new Subject<any>();
  horarioConfirmado$ = new Subject<any>();
  ventanaCompletada$ = new Subject<any>();
  dashboardKpiUpdate$ = new Subject<any>();

  constructor(private authService: AuthService) {}

  connect(): void {
    if (this.socket?.connected) return;
    const token = this.authService.getToken();
    this.socket = io(`${environment.apiUrl}/horarios`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('cola_actualizada', (data: any) => this.cola$.next(data));
    this.socket.on('celda_seleccionada', (data: any) => this.celdaSeleccionada$.next(data));
    this.socket.on('celda_liberada', (data: any) => this.celdaLiberada$.next(data));
    this.socket.on('horario_confirmado', (data: any) => this.horarioConfirmado$.next(data));
    this.socket.on('ventana_completada', (data: any) => this.ventanaCompletada$.next(data));
  }

  connectDashboard(periodo: string): void {
    if (this.dashSocket?.connected) {
      this.dashSocket.emit('suscribir_periodo', periodo);
      return;
    }
    const token = this.authService.getToken();
    this.dashSocket = io(`${environment.apiUrl}/dashboard`, {
      auth: { token },
      transports: ['websocket'],
      query: { periodo },
    });

    this.dashSocket.on('connect', () => {
      this.dashboardConnected.set(true);
      this.dashSocket.emit('suscribir_periodo', periodo);
    });
    this.dashSocket.on('disconnect', () => this.dashboardConnected.set(false));
    this.dashSocket.on('kpiUpdate', (data: any) => this.dashboardKpiUpdate$.next(data));
    this.dashSocket.on('connect_error', () => this.dashboardConnected.set(false));
  }

  subscribeDashboardPeriodo(periodo: string): void {
    this.dashSocket?.emit('suscribir_periodo', periodo);
  }

  unsubscribeDashboardPeriodo(periodo: string): void {
    this.dashSocket?.emit('desuscribir_periodo', periodo);
  }

  disconnectDashboard(): void {
    this.dashSocket?.disconnect();
  }

  joinVentana(ventanaId: string): void {
    this.socket?.emit('join_ventana', { ventanaId });
  }

  leaveVentana(ventanaId: string): void {
    this.socket?.emit('leave_ventana', { ventanaId });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.dashSocket?.disconnect();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
