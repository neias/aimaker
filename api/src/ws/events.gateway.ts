import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:project')
  handleSubscribeProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    client.join(`project:${data.projectId}`);
    this.logger.log(`Client ${client.id} joined project:${data.projectId}`);
  }

  @SubscribeMessage('subscribe:terminal')
  handleSubscribeTerminal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { runId: string },
  ) {
    client.join(`terminal:${data.runId}`);
    this.logger.log(`Client ${client.id} joined terminal:${data.runId}`);
  }

  @SubscribeMessage('unsubscribe:terminal')
  handleUnsubscribeTerminal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { runId: string },
  ) {
    client.leave(`terminal:${data.runId}`);
  }

  emitToProject(projectId: string, event: string, data: unknown) {
    this.server.to(`project:${projectId}`).emit(event, {
      type: event,
      timestamp: Date.now(),
      data,
    });
  }

  emitTerminalOutput(runId: string, stream: string, line: string) {
    this.server.to(`terminal:${runId}`).emit('run:output', {
      type: 'run:output',
      timestamp: Date.now(),
      data: { runId, stream, line },
    });
  }
}
