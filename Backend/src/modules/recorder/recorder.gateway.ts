import { Logger } from '@nestjs/common';
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
import { RecorderService } from './recorder.service';

interface ActionEvent {
  sessionId: string;
  type: 'click' | 'dblclick' | 'fill' | 'press' | 'navigate' | 'hover' | 'select';
  x?: number;
  y?: number;
  selector?: string;
  value?: string;
  key?: string;
}

@WebSocketGateway({ namespace: '/recorder', cors: { origin: '*' } })
export class RecorderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RecorderGateway.name);

  constructor(private readonly recorderService: RecorderService) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Recorder client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Recorder client disconnected: ${client.id}`);
  }

  @SubscribeMessage('session:join')
  handleJoin(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.recorderService.getSession(data.sessionId);
    if (session) {
      void client.join(`session:${data.sessionId}`);
    }
  }

  @SubscribeMessage('action:perform')
  handleAction(@MessageBody() data: ActionEvent) {
    this.server.to(`session:${data.sessionId}`).emit('container:action', data);
  }

  // El recorder container emite 'frame' → gateway lo retransmite al frontend
  @SubscribeMessage('frame')
  handleFrame(
    @MessageBody() data: { sessionId: string; timestamp: number; data: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`session:${data.sessionId}`).emit('frame', data);
  }

  // El recorder container emite 'action:captured' → gateway lo retransmite al frontend
  @SubscribeMessage('action:captured')
  handleActionCaptured(
    @MessageBody() data: { sessionId: string; step: object },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`session:${data.sessionId}`).emit('action:captured', data);
  }
}
