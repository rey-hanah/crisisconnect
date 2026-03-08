import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  participant1!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  participant2!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastMessageBy?: Types.ObjectId;

  @Prop({ type: String })
  lastMessage?: string;

  @Prop({ type: Date })
  lastMessageAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
