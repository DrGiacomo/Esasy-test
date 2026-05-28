import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createClient } from 'redis';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ namespace: '/executions', cors: { origin: '*' }, pingInterval: 10000, pingTimeout: 60000 })
export class ExecutionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ExecutionsGateway.name);
  private subscriber: ReturnType<typeof createClient>;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.subscriber = createClient({ url: this.config.get<string>('REDIS_URL') });
    await this.subscriber.connect();

    // Suscribirse al canal de eventos de ejecuciones publicados por el worker
    await this.subscriber.pSubscribe('execution:*:events', (message: string, channel: string) => {
      const executionId = channel.split(':')[1];
      const payload = JSON.parse(message) as Record<string, unknown>;
      this.server.to(`execution:${executionId}`).emit(payload['event'] as string, payload);
    });
  }

  async onModuleDestroy() {
    await this.subscriber.disconnect();
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('execution:subscribe')
  handleSubscribe(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(`execution:${data.executionId}`);
  }

  @SubscribeMessage('execution:unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(`execution:${data.executionId}`);
  }
}
