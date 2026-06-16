import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { RecorderService } from './recorder.service';
import type { CapturedStep } from './recorder-session';

interface ActionEvent {
  sessionId: string;
  type: 'click' | 'dblclick' | 'fill' | 'press' | 'navigate' | 'hover' | 'select';
  x?: number;
  y?: number;
  selector?: string;
  value?: string;
  key?: string;
}

/** Identidad del socket: o un usuario del frontend (JWT) o el contenedor recorder (token de sesión). */
type SocketIdentity =
  | { kind: 'user'; user: JwtPayload }
  | { kind: 'recorder'; sessionId: string };

interface RecorderTokenPayload {
  kind: 'recorder';
  sessionId: string;
}

@WebSocketGateway({ namespace: '/recorder', cors: { origin: process.env.CORS_ORIGIN ?? '*' } })
export class RecorderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RecorderGateway.name);

  constructor(
    private readonly recorderService: RecorderService,
    private readonly jwt: JwtService,
  ) {}

  handleConnection(client: Socket) {
    const identity = this.authenticate(client);
    if (!identity) {
      this.logger.debug(`Rejecting unauthenticated recorder client: ${client.id}`);
      client.disconnect(true);
      return;
    }
    client.data.identity = identity;
    this.logger.debug(`Recorder client connected: ${client.id} (${identity.kind})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Recorder client disconnected: ${client.id}`);
  }

  @SubscribeMessage('session:join')
  handleJoin(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.canAccessSession(client, data.sessionId)) {
      this.logger.warn(`Denied session:join to ${data?.sessionId} for client ${client.id}`);
      return;
    }
    void client.join(`session:${data.sessionId}`);
  }

  @SubscribeMessage('action:perform')
  handleAction(@MessageBody() data: ActionEvent, @ConnectedSocket() client: Socket) {
    // Solo un usuario del frontend dueño de la sesión puede dirigir acciones al contenedor.
    const identity = client.data.identity as SocketIdentity | undefined;
    if (identity?.kind !== 'user' || !this.canAccessSession(client, data.sessionId)) {
      this.logger.warn(`Denied action:perform on ${data?.sessionId} for client ${client.id}`);
      return;
    }
    this.server.to(`session:${data.sessionId}`).emit('container:action', data);
  }

  // El recorder container emite 'frame' → gateway lo retransmite al frontend
  @SubscribeMessage('frame')
  handleFrame(
    @MessageBody() data: { sessionId: string; timestamp: number; data: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.isContainerOf(client, data.sessionId)) return;
    client.to(`session:${data.sessionId}`).emit('frame', data);
  }

  // El recorder container emite 'action:captured' → se acumula en el servicio y se retransmite al frontend
  @SubscribeMessage('action:captured')
  handleActionCaptured(
    @MessageBody() data: { sessionId: string; step: CapturedStep },
    @ConnectedSocket() client: Socket,
  ) {
    // Solo el contenedor de ESA sesión puede inyectar pasos (evita spoofing entre sesiones).
    if (!this.isContainerOf(client, data.sessionId)) return;
    this.recorderService.addStep(data.sessionId, data.step);
    client.to(`session:${data.sessionId}`).emit('action:captured', data);
  }

  /** Verifica el token del handshake: JWT de usuario o token de sesión del contenedor. */
  private authenticate(client: Socket): SocketIdentity | null {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    try {
      const payload = this.jwt.verify<JwtPayload & Partial<RecorderTokenPayload>>(token);
      if (payload.kind === 'recorder' && payload.sessionId) {
        return { kind: 'recorder', sessionId: payload.sessionId };
      }
      if (payload.sub && payload.orgId) {
        return { kind: 'user', user: payload };
      }
      return null;
    } catch {
      return null;
    }
  }

  /** ¿Puede este cliente acceder a la sesión? Usuario de la misma org o el contenedor de la sesión. */
  private canAccessSession(client: Socket, sessionId: string): boolean {
    if (!sessionId) return false;
    const identity = client.data.identity as SocketIdentity | undefined;
    if (!identity) return false;
    if (identity.kind === 'recorder') return identity.sessionId === sessionId;
    const session = this.recorderService.getSession(sessionId);
    return !!session && session.orgId === identity.user.orgId;
  }

  /** ¿Es este cliente el contenedor exacto de la sesión indicada? */
  private isContainerOf(client: Socket, sessionId: string): boolean {
    const identity = client.data.identity as SocketIdentity | undefined;
    return identity?.kind === 'recorder' && identity.sessionId === sessionId;
  }
}
