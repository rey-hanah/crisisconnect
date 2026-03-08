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
  ): Promise<ConversationDocument> {
    const u1 = new Types.ObjectId(userId1);
    const u2 = new Types.ObjectId(userId2);

    let conv = await this.convModel
      .findOne({
        $or: [
          { participant1: u1, participant2: u2 },
          { participant1: u2, participant2: u1 },
        ],
      })
      .populate('participant1', 'displayName')
      .populate('participant2', 'displayName');

    if (!conv) {
      conv = new this.convModel({ participant1: u1, participant2: u2 });
      await conv.save();
      await conv.populate('participant1', 'displayName');
      await conv.populate('participant2', 'displayName');
    }

    return conv;
  }

  async getUserConversations(userId: string): Promise<ConversationDocument[]> {
    const uid = new Types.ObjectId(userId);
    return this.convModel
      .find({ $or: [{ participant1: uid }, { participant2: uid }] })
      .populate('participant1', 'displayName')
      .populate('participant2', 'displayName')
      .sort({ lastMessageAt: -1, createdAt: -1 });
  }

  async getMessages(conversationId: string): Promise<MessageDocument[]> {
    return this.msgModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort('createdAt');
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

  async getConversationById(
    conversationId: string,
  ): Promise<ConversationDocument | null> {
    return this.convModel.findById(conversationId);
  }
}
