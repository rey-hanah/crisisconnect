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
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>();

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    this.userSockets.set(userId, client.id);
    client.join(`user:${userId}`);
    return { event: 'joined', data: userId };
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { conversationId: string; senderId: string; content: string },
  ) {
    const msg = await this.chatService.addMessage(
      data.conversationId,
      data.senderId,
      data.content,
    );

    const conv = await this.chatService.getConversationById(data.conversationId);
    if (!conv) return msg;
    const recipientId =
      conv.participant1.toString() === data.senderId
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
