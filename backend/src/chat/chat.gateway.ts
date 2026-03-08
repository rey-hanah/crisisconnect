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
import { UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets = new Map<string, string>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromHandshake(client);
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
      });

      client.userId = payload.sub;
      this.userSockets.set(payload.sub, client.id);
      client.join(`user:${payload.sub}`);
      
      this.logger.log(`Client authenticated: ${client.id} (user: ${payload.sub})`);
    } catch (error) {
      this.logger.warn(`Connection rejected: Invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.userSockets.delete(client.userId);
      this.logger.log(`Client disconnected: ${client.id} (user: ${client.userId})`);
    }
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    const token = client.handshake.auth?.token;
    if (token) {
      return token;
    }

    return null;
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      throw new UnauthorizedException('Not authenticated');
    }
    return { event: 'joined', data: client.userId };
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { conversationId: string; content: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const msg = await this.chatService.addMessage(
      data.conversationId,
      client.userId,
      data.content,
    );

    const conv = await this.chatService.getConversationById(data.conversationId);
    if (!conv) return msg;
    
    const recipientId =
      conv.participant1.toString() === client.userId
        ? conv.participant2.toString()
        : conv.participant1.toString();

    const recipientSocket = this.userSockets.get(recipientId);
    if (recipientSocket) {
      this.server.to(recipientSocket).emit('newMessage', msg);
    }

    return msg;
  }

  emitNewPost(post: any) {
    this.server.emit('post:created', post);
  }

  emitPostUpdate(post: any) {
    this.server.emit('post:updated', post);
  }
}
