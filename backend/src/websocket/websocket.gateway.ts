import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws',
})
export class WebSocketGatewayService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private projectRooms: Map<string, Set<string>> = new Map();
  private socketToProject: Map<string, string> = new Map();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'supersecretjwtkey',
      });

      client.data.userId = payload.sub;
      console.log(`Client connected: ${client.id}, user: ${payload.sub}`);
    } catch (error) {
      console.log('WebSocket connection error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const projectId = this.socketToProject.get(client.id);
    if (projectId) {
      const room = this.projectRooms.get(projectId);
      if (room) {
        room.delete(client.id);
        if (room.size === 0) {
          this.projectRooms.delete(projectId);
        }
      }
      this.socketToProject.delete(client.id);
      client.leave(`project:${projectId}`);
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_project')
  async handleJoinProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { error: 'Not authenticated' };
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: data.projectId, userId },
      },
    });

    if (!member) {
      return { error: 'No access to this project' };
    }

    const previousProject = this.socketToProject.get(client.id);
    if (previousProject) {
      client.leave(`project:${previousProject}`);
      const room = this.projectRooms.get(previousProject);
      if (room) {
        room.delete(client.id);
      }
    }

    client.join(`project:${data.projectId}`);
    this.socketToProject.set(client.id, data.projectId);

    if (!this.projectRooms.has(data.projectId)) {
      this.projectRooms.set(data.projectId, new Set());
    }
    this.projectRooms.get(data.projectId).add(client.id);

    return { success: true, projectId: data.projectId };
  }

  @SubscribeMessage('leave_project')
  handleLeaveProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`project:${data.projectId}`);
    this.socketToProject.delete(client.id);
    const room = this.projectRooms.get(data.projectId);
    if (room) {
      room.delete(client.id);
      if (room.size === 0) {
        this.projectRooms.delete(data.projectId);
      }
    }
    return { success: true };
  }

  async broadcastTaskEvent(projectId: string, event: string, data: any) {
    this.server.to(`project:${projectId}`).emit(event, data);
  }
}
