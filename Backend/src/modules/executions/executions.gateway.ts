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
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({ namespace: '/executions', cors: { origin: process.env.CORS_ORIGIN ?? '*' }, pingInterval: 10000, pingTimeout: 60000 })
export class ExecutionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ExecutionsGateway.name);
  private subscriber: ReturnType<typeof createClient>;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.subscriber = createClient({ url: this.config.get<string>('REDIS_URL') });
    await this.subscriber.connect();

    // Suscribirse al canal de eventos de ejecuciones publicados por el worker
    await this.subscriber.pSubscribe('execution:*:events', (message: string, channel: string) => {
      try {
        const executionId = channel.split(':')[1];
        const payload = JSON.parse(message) as Record<string, unknown>;
        this.server.to(`execution:${executionId}`).emit(payload['event'] as string, payload);
      } catch (err) {
        this.logger.warn(`Discarding malformed event on ${channel}: ${String(err)}`);
      }
    });
  }

  async onModuleDestroy() {
    await this.subscriber?.disconnect();
  }

  handleConnection(client: Socket) {
    const user = this.authenticate(client);
    if (!user) {
      this.logger.debug(`Rejecting unauthenticated client: ${client.id}`);
      client.disconnect(true);
      return;
    }
    client.data.user = user;
    this.logger.debug(`Client connected: ${client.id} (org ${user.orgId})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('execution:subscribe')
  async handleSubscribe(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as JwtPayload | undefined;
    if (!user || !(await this.ownsExecution(data.executionId, user.orgId))) {
      this.logger.warn(`Denied subscribe to ${data?.executionId} for client ${client.id}`);
      return;
    }
    void client.join(`execution:${data.executionId}`);
  }

  @SubscribeMessage('execution:unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(`execution:${data.executionId}`);
  }

  /** Verifica el JWT del handshake. Devuelve el payload o null si es inválido. */
  private authenticate(client: Socket): JwtPayload | null {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    try {
      return this.jwt.verify<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  private async ownsExecution(executionId: string, orgId: string): Promise<boolean> {
    if (!executionId) return false;
    const execution = await this.prisma.execution.findFirst({
      where: { id: executionId, project: { organizationId: orgId } },
      select: { id: true },
    });
    return execution !== null;
  }
}
