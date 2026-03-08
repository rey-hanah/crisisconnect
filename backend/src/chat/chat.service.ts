import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './conversation.schema';
import { Message, MessageDocument } from './message.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name) private convModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private msgModel: Model<MessageDocument>,
  ) {}

  async getOrCreateConversation(
    userId1: string,
    userId2: string,
    postId?: string,
  ): Promise<ConversationDocument> {
    let conv = await this.convModel.findOne({
      $or: [
        { participant1: userId1, participant2: userId2 },
        { participant1: userId2, participant2: userId1 },
      ],
    });

    if (!conv) {
      conv = new this.convModel({
        participant1: new Types.ObjectId(userId1),
        participant2: new Types.ObjectId(userId2),
        postId: postId ? new Types.ObjectId(postId) : undefined,
      });
      await conv.save();
    }

    return conv;
  }

  async getUserConversations(userId: string): Promise<ConversationDocument[]> {
    return this.convModel.find({
      $or: [{ participant1: userId }, { participant2: userId }],
    }).populate('participant1', 'displayName').populate('participant2', 'displayName');
  }

  async getMessages(conversationId: string): Promise<MessageDocument[]> {
    return this.msgModel.find({ conversationId }).sort('createdAt');
  }

  async addMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<MessageDocument> {
    const msg = new this.msgModel({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(senderId),
      content,
    });
    await msg.save();

    await this.convModel.findByIdAndUpdate(conversationId, {
      lastMessageBy: new Types.ObjectId(senderId),
      lastMessage: content,
      lastMessageAt: new Date(),
    });

    return msg;
  }
}
