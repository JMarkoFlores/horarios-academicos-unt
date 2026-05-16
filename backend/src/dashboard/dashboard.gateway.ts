import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  namespace: "/dashboard",
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket"],
  cors: { origin: process.env.FRONTEND_URL },
})
export class DashboardGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DashboardGateway.name);

  handleConnection(client: Socket): void {
    try {
      const periodoId = this.getPeriodoId(client);
      if (periodoId) {
        const room = this.getPeriodoRoom(periodoId);
        client.join(room);
        this.logger.log(
          `Cliente conectado a /dashboard: ${client.id} (room: ${room})`,
        );
        return;
      }
      this.logger.warn(
        `Cliente conectado a /dashboard sin periodoId: ${client.id}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error en conexión WS /dashboard (${client.id}): ${message}`,
      );
    }
  }

  handleDisconnect(client: Socket): void {
    try {
      this.logger.log(`Cliente desconectado de /dashboard: ${client.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error en desconexión WS /dashboard (${client.id}): ${message}`,
      );
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit("pong", { timestamp: Date.now() });
  }

  @SubscribeMessage("suscribir_periodo")
  handleSuscribirPeriodo(
    @ConnectedSocket() client: Socket,
    @MessageBody() periodoId: string,
  ) {
    const room = this.getPeriodoRoom(periodoId);
    client.join(room);
    this.logger.log(`Cliente ${client.id} suscrito a /dashboard ${room}`);
    return { event: "suscrito_periodo", data: { periodoId } };
  }

  @SubscribeMessage("desuscribir_periodo")
  handleDesuscribirPeriodo(
    @ConnectedSocket() client: Socket,
    @MessageBody() periodoId: string,
  ) {
    const room = this.getPeriodoRoom(periodoId);
    client.leave(room);
    this.logger.log(`Cliente ${client.id} desuscrito de /dashboard ${room}`);
    return { event: "desuscrito_periodo", data: { periodoId } };
  }

  emitirActualizacion(periodoId: string, evento: string, data: unknown) {
    this.server.to(this.getPeriodoRoom(periodoId)).emit(evento, data);
  }

  emitirPeriodo(periodoId: string, evento: string, data: unknown) {
    this.server.to(this.getPeriodoRoom(periodoId)).emit(evento, data);
  }

  private getPeriodoId(client: Socket): string | null {
    const queryPeriodo =
      client.handshake.query?.periodoId ?? client.handshake.query?.periodo;
    if (typeof queryPeriodo === "string" && queryPeriodo.trim().length > 0) {
      return queryPeriodo.trim();
    }

    const headerPeriodo = client.handshake.headers["x-periodo-id"];
    if (typeof headerPeriodo === "string" && headerPeriodo.trim().length > 0) {
      return headerPeriodo.trim();
    }

    return null;
  }

  private getPeriodoRoom(periodoId: string): string {
    return `periodo_${periodoId}`;
  }
}
