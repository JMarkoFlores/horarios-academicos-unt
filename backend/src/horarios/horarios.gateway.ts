import { Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@WebSocketGateway({
  namespace: "/horarios",
  cors: { origin: process.env.FRONTEND_URL || "*" },
  transports: ["websocket"],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class HorariosGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HorariosGateway.name);
  private pubClient: Redis;
  private subClient: Redis;
  private readonly redisChannel = "canal_disponibilidad";

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("REDIS_HOST", "localhost");
    const port = this.configService.get<number>("REDIS_PORT", 6379);
    // Cliente para publicar (sin restricciones)
    this.pubClient = new Redis({ host, port, lazyConnect: true });
    // Cliente para suscribirse (modo suscriptor)
    this.subClient = new Redis({ host, port, lazyConnect: true });
  }

  async onModuleInit() {
    // Conectar clientes Redis
    await this.pubClient.connect();
    await this.subClient.connect();
    // Suscribirse al canal
    await this.subClient.subscribe(this.redisChannel);
    this.subClient.on("message", (channel, message) => {
      if (channel === this.redisChannel) {
        try {
          const { ventanaId, event, data } = JSON.parse(message);
          this.server.to(`ventana_${ventanaId}`).emit(event, data);
        } catch (err) {
          this.logger.error("Error al procesar mensaje de Redis", err);
        }
      }
    });
  }

  async onModuleDestroy() {
    await this.pubClient.quit();
    await this.subClient.quit();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado a /horarios: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado de /horarios: ${client.id}`);
  }

  @SubscribeMessage("join_ventana")
  handleJoinVentana(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ventanaId: string | number },
  ) {
    if (payload?.ventanaId) {
      const room = `ventana_${payload.ventanaId}`;
      client.join(room);
      this.logger.log(`Cliente ${client.id} se unió a ${room}`);
    }
  }

  @SubscribeMessage("leave_ventana")
  handleLeaveVentana(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ventanaId: string | number },
  ) {
    if (payload?.ventanaId) {
      const room = `ventana_${payload.ventanaId}`;
      client.leave(room);
      this.logger.log(`Cliente ${client.id} salió de ${room}`);
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit("pong", { timestamp: Date.now() });
  }

  private publishEvent(ventanaId: string | number, event: string, data: any) {
    const payload = JSON.stringify({ ventanaId, event, data });
    this.pubClient.publish(this.redisChannel, payload);
  }

  emitirColaActualizada(ventanaId: string | number, estadoCola: any) {
    this.publishEvent(ventanaId, "cola_actualizada", estadoCola);
  }

  emitirCeldaSeleccionada(ventanaId: string | number, datos: any) {
    this.publishEvent(ventanaId, "celda_seleccionada", datos);
  }

  emitirCeldaLiberada(ventanaId: string | number, datos: any) {
    this.publishEvent(ventanaId, "celda_liberada", datos);
  }

  emitirHorarioConfirmado(ventanaId: string | number, datos: any) {
    this.publishEvent(ventanaId, "horario_confirmado", datos);
  }

  emitirVentanaCompletada(ventanaId: string | number, pendientes: any) {
    this.publishEvent(ventanaId, "ventana_completada", pendientes);
  }

  emitirAlertaCarga(ventanaId: string | number, datos: any) {
    this.publishEvent(ventanaId, "alerta_carga", datos);
  }

  // Compatibilidad con código existente
  emitirPeriodo(periodoId: string, evento: string, data: unknown) {
    this.server.to(`periodo_${periodoId}`).emit(evento, data);
  }
}
