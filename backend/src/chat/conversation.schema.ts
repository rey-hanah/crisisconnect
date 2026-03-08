import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  participant1: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  participant2: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post' })
  postId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastMessageBy?: Types.ObjectId;

  @Prop()
  lastMessage?: string;

  @Prop()
  lastMessageAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
