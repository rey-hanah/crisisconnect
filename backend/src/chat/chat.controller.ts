import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  getConversations(@Request() req: any) {
    return this.chatService.getUserConversations(req.user.id);
  }

  @Post()
  createConversation(
    @Request() req: any,
    @Body() body: { recipientId: string; postId?: string },
  ) {
    return this.chatService.getOrCreateConversation(
      req.user.id,
      body.recipientId,
      body.postId,
    );
  }

  @Get(':conversationId')
  getMessages(@Param('conversationId') conversationId: string) {
    return this.chatService.getMessages(conversationId);
  }
}
