import { Logger } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/horarios',
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket'],
  cors: { origin: process.env.FRONTEND_URL },
})
export class HorariosGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HorariosGateway.name);

  handleConnection(client: Socket) {
    try {
      const periodoId = this.getPeriodoId(client);
      if (periodoId) {
        const room = this.getPeriodoRoom(periodoId);
        client.join(room);
        this.logger.log(`Cliente conectado a /horarios: ${client.id} (room: ${room})`);
        return;
      }
      this.logger.warn(`Cliente conectado a /horarios sin periodoId: ${client.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error en conexión WS /horarios (${client.id}): ${message}`);
    }
  }

  handleDisconnect(client: Socket) {
    try {
      this.logger.log(`Cliente desconectado de /horarios: ${client.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error en desconexión WS /horarios (${client.id}): ${message}`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }

  @SubscribeMessage('suscribir_ventana')
  handleSuscribir(@ConnectedSocket() client: Socket, @MessageBody() ventanaId: number) {
    client.join(`ventana_${ventanaId}`);
    this.logger.log(`Cliente ${client.id} suscrito a ventana_${ventanaId}`);
    return { event: "suscrito", data: { ventanaId } };
  }

  @SubscribeMessage('suscribir_periodo')
  handleSuscribirPeriodo(
    @ConnectedSocket() client: Socket,
    @MessageBody() periodoId: string,
  ) {
    const room = this.getPeriodoRoom(periodoId);
    client.join(room);
    this.logger.log(`Cliente ${client.id} suscrito a /horarios ${room}`);
    return { event: 'suscrito_periodo', data: { periodoId } };
  }

  @SubscribeMessage('desuscribir_ventana')
  handleDesuscribir(@ConnectedSocket() client: Socket, @MessageBody() ventanaId: number) {
    client.leave(`ventana_${ventanaId}`);
    return { event: "desuscrito", data: { ventanaId } };
  }

  emitirActualizacion(periodoId: string, evento: string, data: unknown) {
    this.server.to(this.getPeriodoRoom(periodoId)).emit(evento, data);
  }

  emitirPeriodo(periodoId: string, evento: string, data: unknown) {
    this.server.to(this.getPeriodoRoom(periodoId)).emit(evento, data);
  }

  private getPeriodoId(client: Socket): string | null {
    const queryPeriodo = client.handshake.query?.periodoId ?? client.handshake.query?.periodo;
    if (typeof queryPeriodo === 'string' && queryPeriodo.trim().length > 0) {
      return queryPeriodo.trim();
    }

    const headerPeriodo = client.handshake.headers['x-periodo-id'];
    if (typeof headerPeriodo === 'string' && headerPeriodo.trim().length > 0) {
      return headerPeriodo.trim();
    }

    return null;
  }

  private getPeriodoRoom(periodoId: string): string {
    return `periodo_${periodoId}`;
  }
}
