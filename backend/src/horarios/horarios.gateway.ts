import { Logger } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({ cors: { origin: "*" } })
export class HorariosGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HorariosGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage("suscribir_ventana")
  handleSuscribir(client: Socket, ventanaId: number) {
    client.join(`ventana_${ventanaId}`);
    this.logger.log(`Cliente ${client.id} suscrito a ventana_${ventanaId}`);
    return { event: "suscrito", data: { ventanaId } };
  }

  @SubscribeMessage("desuscribir_ventana")
  handleDesuscribir(client: Socket, ventanaId: number) {
    client.leave(`ventana_${ventanaId}`);
    return { event: "desuscrito", data: { ventanaId } };
  }

  emitirActualizacion(ventanaId: number, evento: string, data: unknown) {
    this.server.to(`ventana_${ventanaId}`).emit(evento, data);
  }

  emitirGlobal(evento: string, data: unknown) {
    this.server.emit(evento, data);
  }
}
